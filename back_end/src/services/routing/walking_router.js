const fs = require('fs');
const path = require('path');
const { haversineDistance } = require('../../utils/geo');

const PROCESSED_SEGMENTS_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'processed',
  'accessible_segments.json',
);
const DEFAULT_MAX_SNAP_DISTANCE_METERS = 300;
const DEFAULT_SNAP_CANDIDATE_COUNT = 100;
const SAME_LOCATION_DISTANCE_METERS = 25;
const SNAP_DISTANCE_COST_MULTIPLIER = 5;

function loadAccessibleSegments(filepath = PROCESSED_SEGMENTS_PATH) {
  const abspath = path.resolve(filepath);
  if (!fs.existsSync(abspath)) {
    throw new Error(
      `Accessible segments not found at ${abspath}. Run npm run process:accessibility first.`,
    );
  }
  const payload = JSON.parse(fs.readFileSync(abspath, 'utf8'));
  if (!Array.isArray(payload.segments)) {
    throw new Error('Expected "segments" array in accessible_segments.json');
  }
  return payload.segments;
}

function toLatLon(coord) {
  if (!Array.isArray(coord) || coord.length < 2) {
    throw new Error(`Invalid coordinate: ${coord}`);
  }
  const [lon, lat] = coord;
  return [lat, lon];
}

function coordKey([lat, lon]) {
  return `${lat.toFixed(6)},${lon.toFixed(6)}`;
}

function computeSegmentLengthMeters(coords) {
  let length = 0;
  for (let i = 1; i < coords.length; i += 1) {
    const prev = toLatLon(coords[i - 1]);
    const cur = toLatLon(coords[i]);
    length += haversineDistance(prev, cur);
  }
  return length;
}

function computePenalty(attributes) {
  let penalty = Math.max(0, 1 - (attributes.accessibility_score ?? 0.5));
  const issues = attributes.issues || [];
  if (attributes.confidence === 'low') {
    penalty += 0.35;
  } else if (attributes.confidence === 'medium') {
    penalty += 0.15;
  }

  const issuePenaltyMap = {
    kerb_high: 0.3,
    surface_gravel: 0.25,
    surface_cobblestone: 0.3,
    narrow_width: 0.2,
    steep_incline: 0.35,
  };
  issues.forEach((issue) => {
    if (issuePenaltyMap[issue]) {
      penalty += issuePenaltyMap[issue];
    }
  });
  return penalty;
}

function buildGraph(segments, options = {}) {
  const {
    allowLimitedSegments = true,
    allowNonAccessible = false,
    limitedThreshold = 0.5,
  } = options;

  const nodes = new Map();
  const nodePositions = new Map();

  function addEdge(fromCoord, toCoord, segment, metadata) {
    const key = coordKey(fromCoord);
    if (!nodes.has(key)) {
      nodes.set(key, []);
      nodePositions.set(key, fromCoord);
    }
    nodes.get(key).push({
      to: coordKey(toCoord),
      toCoord,
      weight: metadata.weight,
      distance: metadata.distance,
      segment,
    });
  }

  segments.forEach((segment) => {
    if (!segment.geometry || segment.geometry.type !== 'LineString') {
      return;
    }
    const coords = segment.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) {
      return;
    }

    const attributes = segment.attributes || {};
    const accessible = attributes.is_wheelchair_passable === true;
    const score = attributes.accessibility_score ?? 0.5;
    if (!accessible) {
      if (allowNonAccessible) {
        // proceed with heavy penalty
      } else if (allowLimitedSegments && score >= limitedThreshold) {
        // keep but treat as limited
      } else {
        return;
      }
    }

    const pathLatLon = coords.map(toLatLon);
    const lengthMeters = computeSegmentLengthMeters(coords);
    const penalty = computePenalty(attributes);
    const weight = lengthMeters * (1 + penalty);
    const baseSegmentMeta = {
      id: segment.segment_id || null,
      score,
      accessible,
      confidence: attributes.confidence || 'low',
      issues: attributes.issues || [],
      weight,
      length: lengthMeters,
      tags: attributes.tags || {},
    };

    const start = pathLatLon[0];
    const end = pathLatLon[pathLatLon.length - 1];
    addEdge(
      start,
      end,
      { ...baseSegmentMeta, path: pathLatLon.slice(), direction: 'forward' },
      { weight, distance: lengthMeters },
    );
    addEdge(
      end,
      start,
      { ...baseSegmentMeta, path: pathLatLon.slice().reverse(), direction: 'reverse' },
      { weight, distance: lengthMeters },
    );
  });

  return { nodes, nodePositions };
}

function findNearestNode(coord, nodePositions) {
  return findNearestNodes(coord, nodePositions, 1)[0] || {
    key: null,
    distance: Infinity,
    coord: null,
  };
}

function findNearestNodes(coord, nodePositions, limit = DEFAULT_SNAP_CANDIDATE_COUNT) {
  const candidates = [];
  for (const [key, position] of nodePositions.entries()) {
    candidates.push({
      key,
      distance: haversineDistance(coord, position),
      coord: position,
    });
  }
  return candidates
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

class MinHeap {
  constructor() {
    this.data = [];
  }

  insert(item) {
    this.data.push(item);
    this.bubbleUp(this.data.length - 1);
  }

  bubbleUp(index) {
    let i = index;
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.data[parent].priority <= this.data[i].priority) break;
      [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
      i = parent;
    }
  }

  extractMin() {
    if (this.data.length === 0) return null;
    const min = this.data[0];
    const end = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = end;
      this.sinkDown(0);
    }
    return min;
  }

  sinkDown(index) {
    let i = index;
    const length = this.data.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;
      if (left < length && this.data[left].priority < this.data[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.data[right].priority < this.data[smallest].priority) {
        smallest = right;
      }
      if (smallest === i) break;
      [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
      i = smallest;
    }
  }

  isEmpty() {
    return this.data.length === 0;
  }
}

function dijkstra(graph, startKey, endKey) {
  const distances = new Map();
  const previous = new Map();
  const edgeUsed = new Map();
  const queue = new MinHeap();

  for (const key of graph.nodes.keys()) {
    distances.set(key, Infinity);
  }
  distances.set(startKey, 0);
  queue.insert({ node: startKey, priority: 0 });

  while (!queue.isEmpty()) {
    const { node: currentKey } = queue.extractMin();
    if (currentKey === endKey) break;
    const neighbors = graph.nodes.get(currentKey) || [];
    neighbors.forEach((edge) => {
      const alt = distances.get(currentKey) + edge.weight;
      if (alt < distances.get(edge.to)) {
        distances.set(edge.to, alt);
        previous.set(edge.to, currentKey);
        edgeUsed.set(edge.to, edge);
        queue.insert({ node: edge.to, priority: alt });
      }
    });
  }

  if (!previous.has(endKey) && startKey !== endKey) {
    return null;
  }

  const pathKeys = [];
  const segments = [];
  let current = endKey;
  while (current && current !== startKey) {
    pathKeys.push(current);
    const edge = edgeUsed.get(current);
    if (edge) {
      segments.push(edge.segment);
    }
    current = previous.get(current);
  }
  pathKeys.push(startKey);
  pathKeys.reverse();
  segments.reverse();

  const pathCoords = pathKeys.map((key) => graph.nodePositions.get(key));
  const totalDistance = segments.reduce((sum, seg) => sum + (seg.length || 0), 0);
  const avgScore =
    segments.reduce((sum, seg) => sum + (seg.score ?? 0.5), 0) / (segments.length || 1);
  const accessibleSegments = segments.filter((seg) => seg.accessible).length;

  const polyline = [];
  segments.forEach((seg, segIndex) => {
    seg.path.forEach((coord, coordIndex) => {
      if (segIndex > 0 && coordIndex === 0) return;
      polyline.push(coord);
    });
  });

  return {
    path: pathCoords,
    segments,
    polyline,
    metrics: {
      total_distance_m: totalDistance,
      total_cost: distances.get(endKey),
      average_accessibility_score: avgScore,
      accessible_segment_ratio: segments.length
        ? accessibleSegments / segments.length
        : 0,
    },
  };
}

/**
 * Finds an accessible walking route between two coordinates.
 * @param {[number, number]} startLatLon [lat, lon]
 * @param {[number, number]} endLatLon [lat, lon]
 * @param {object} options
 */
function findAccessibleWalkingRoute(startLatLon, endLatLon, options = {}) {
  const segments = loadAccessibleSegments(options.accessibleSegmentsPath);
  const graph = buildGraph(segments, options);
  const maxSnapDistanceMeters =
    options.maxSnapDistanceMeters ?? DEFAULT_MAX_SNAP_DISTANCE_METERS;
  const candidateLimit = options.snapCandidateCount || DEFAULT_SNAP_CANDIDATE_COUNT;
  const startCandidates = findNearestNodes(startLatLon, graph.nodePositions, candidateLimit);
  const endCandidates = findNearestNodes(endLatLon, graph.nodePositions, candidateLimit);
  const start = startCandidates[0] || { key: null, distance: Infinity, coord: null };
  const end = endCandidates[0] || { key: null, distance: Infinity, coord: null };

  if (!start.key || !end.key) {
    throw new Error('Unable to project start or end coordinate onto the accessible network.');
  }

  const startSnapCandidates = startCandidates.filter(
    (candidate) => candidate.distance <= maxSnapDistanceMeters,
  );
  const endSnapCandidates = endCandidates.filter(
    (candidate) => candidate.distance <= maxSnapDistanceMeters,
  );

  if (!startSnapCandidates.length || !endSnapCandidates.length) {
    return {
      success: false,
      reason: 'route_not_near_accessible_network',
      start: { ...start, requested: startLatLon },
      end: { ...end, requested: endLatLon },
      metrics: {
        max_snap_distance_m: maxSnapDistanceMeters,
        start_distance_to_network_m: start.distance,
        end_distance_to_network_m: end.distance,
      },
    };
  }

  const candidatePairs = [];
  startSnapCandidates.forEach((startCandidate) => {
    endSnapCandidates.forEach((endCandidate) => {
      candidatePairs.push({
        start: startCandidate,
        end: endCandidate,
        snapDistance: startCandidate.distance + endCandidate.distance,
      });
    });
  });
  candidatePairs.sort((a, b) => a.snapDistance - b.snapDistance);

  let selectedRoute = null;
  let selectedStart = null;
  let selectedEnd = null;
  let selectedCost = Infinity;

  candidatePairs.forEach(({ start: startCandidate, end: endCandidate, snapDistance }) => {
    const result = dijkstra(graph, startCandidate.key, endCandidate.key);
    if (!result) return;
    if (
      result.segments.length === 0 &&
      haversineDistance(startLatLon, endLatLon) > SAME_LOCATION_DISTANCE_METERS
    ) {
      return;
    }
    const cost = (result.metrics.total_cost || 0) + snapDistance * SNAP_DISTANCE_COST_MULTIPLIER;
    if (cost < selectedCost) {
      selectedCost = cost;
      selectedRoute = result;
      selectedStart = startCandidate;
      selectedEnd = endCandidate;
    }
  });

  if (!selectedRoute) {
    return {
      success: false,
      reason: 'no_path_found',
      start: { ...start, requested: startLatLon },
      end: { ...end, requested: endLatLon },
    };
  }

  const fullPolyline = [
    startLatLon,
    ...(selectedRoute.polyline.length ? selectedRoute.polyline : []),
    endLatLon,
  ];

  return {
    success: true,
    start: { ...selectedStart, requested: startLatLon, offset_m: selectedStart.distance },
    end: { ...selectedEnd, requested: endLatLon, offset_m: selectedEnd.distance },
    path: selectedRoute.path,
    segments: selectedRoute.segments,
    polyline: fullPolyline,
    metrics: {
      ...selectedRoute.metrics,
      start_distance_to_network_m: selectedStart.distance,
      end_distance_to_network_m: selectedEnd.distance,
      max_snap_distance_m: maxSnapDistanceMeters,
    },
  };
}

module.exports = {
  loadAccessibleSegments,
  buildGraph,
  findAccessibleWalkingRoute,
};
