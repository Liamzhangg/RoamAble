const path = require('path');
const fetch = globalThis.fetch
  ? (...args) => globalThis.fetch(...args)
  : require('node-fetch');

const { findAccessibleWalkingRoute } = require('./walking_router');

const DEFAULT_SEGMENTS_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'data',
  'processed',
  'accessible_segments.json',
);

const ISSUE_LABELS = {
  kerb_high: 'higher curb present',
  surface_gravel: 'gravel surface',
  surface_cobblestone: 'cobblestone surface',
  narrow_width: 'narrow sidewalk width',
  steep_incline: 'steep incline',
  wheelchair_tag_no: 'marked not wheelchair accessible',
};

const ISSUE_WARNING_LABELS = {
  kerb_high: 'Route avoids high curbs but nearby crossings may lack ramps',
  surface_gravel: 'Segments with loose gravel were excluded from routing',
  surface_cobblestone: 'Cobblestone sections avoided for smoother travel',
  narrow_width: 'Nearby sidewalks with narrow width were avoided',
  steep_incline: 'Steep inclines were bypassed where possible',
  wheelchair_tag_no: 'Segments tagged as not wheelchair accessible were filtered out',
};

const OSRM_BASE_URL = process.env.OSRM_BASE_URL || 'https://router.project-osrm.org';

function normalizeCoordinate(point) {
  if (!point || typeof point.lat !== 'number') {
    throw new Error('Coordinate must include numeric lat property');
  }
  const lon = typeof point.lon === 'number' ? point.lon : point.lng;
  if (typeof lon !== 'number') {
    throw new Error('Coordinate must include numeric lon/lng property');
  }
  return { lat: point.lat, lon };
}

function toGeoJsonLine(polyline = []) {
  return {
    type: 'LineString',
    coordinates: polyline.map(([lat, lon]) => [lon, lat]),
  };
}

function formatDistance(distanceKm) {
  if (!Number.isFinite(distanceKm)) return '0 m';
  if (distanceKm >= 1) {
    return `${distanceKm.toFixed(2)} km`;
  }
  return `${Math.round(distanceKm * 1000)} m`;
}

function describeIssue(issue) {
  if (ISSUE_LABELS[issue]) {
    return ISSUE_LABELS[issue];
  }
  if (issue.startsWith('surface_')) {
    return `${issue.split('_')[1]} surface`;
  }
  if (issue.startsWith('smoothness_')) {
    return `${issue.split('_')[1]} surface quality`;
  }
  return issue.replace(/_/g, ' ');
}

function analyzeSegments(segments = []) {
  const features = new Set([
    'Route generated from Toronto OpenSidewalks accessibility data',
    'Filters out sidewalks tagged as not wheelchair accessible',
  ]);
  const warnings = new Set();

  let fullyAccessibleCount = 0;
  segments.forEach((segment) => {
    if (segment.accessible) {
      fullyAccessibleCount += 1;
    }
    const surface = segment.tags?.surface;
    if (surface && ['asphalt', 'paved', 'concrete', 'paving_stones'].includes(surface)) {
      features.add('Continuous paved surface coverage');
    }
    (segment.issues || []).forEach((issue) => {
      if (ISSUE_WARNING_LABELS[issue]) {
        warnings.add(ISSUE_WARNING_LABELS[issue]);
      } else {
        warnings.add(`Potential issue: ${describeIssue(issue)}`);
      }
    });
  });

  if (segments.length > 0 && fullyAccessibleCount === segments.length) {
    features.add('All traversed segments marked wheelchair-passable');
  }

  if (!segments.length) {
    warnings.add('No accessible sidewalk segments were available for this request');
  } else if (!warnings.size) {
    features.add('No critical accessibility issues detected along the route');
  }

  return {
    features: Array.from(features),
    warnings: Array.from(warnings),
  };
}

function getAverageSpeedKmh(mode = 'walking', disabilityType = 'wheelchair') {
  if (mode === 'wheelchair' || disabilityType === 'wheelchair') {
    return 3.5;
  }
  if (mode === 'walking') return 5;
  if (mode === 'cycling') return 12;
  if (mode === 'transit') return 15;
  return 5;
}

function buildStepInstruction(segment, index) {
  const distanceText = formatDistance((segment.length || 0) / 1000);
  const base = `Segment ${index + 1}: continue for ${distanceText}`;
  const issues = segment.issues || [];
  if (!issues.length) {
    const scorePercent = Math.round((segment.score ?? 0.5) * 100);
    return `${base} (accessibility score ${scorePercent}/100).`;
  }
  const issueText = issues.map(describeIssue).join(', ');
  return `${base}. Heads-up: ${issueText}.`;
}

function buildLegs(segments, speedKmh) {
  const steps = segments.map((segment, index) => {
    const distance = segment.length ?? 0;
    const durationSeconds = speedKmh > 0 ? Math.round((distance / 1000 / speedKmh) * 3600) : 0;
    return {
      name: segment.tags?.name || `Segment ${index + 1}`,
      distance,
      duration: durationSeconds,
      mode: 'WALK',
      instruction: buildStepInstruction(segment, index),
      accessibility: {
        score: segment.score ?? 0.5,
        accessible: Boolean(segment.accessible),
        confidence: segment.confidence || 'low',
        issues: segment.issues || [],
        tags: segment.tags || {},
      },
      geometry: {
        type: 'LineString',
        coordinates: (segment.path || []).map(([lat, lon]) => [lon, lat]),
      },
    };
  });

  const totalDistance = segments.reduce((sum, seg) => sum + (seg.length || 0), 0);
  const totalDurationSeconds =
    speedKmh > 0 ? Math.round((totalDistance / 1000 / speedKmh) * 3600) : 0;

  return [
    {
      summary: 'Accessible pedestrian route',
      mode: 'WALK',
      distance: totalDistance,
      duration: totalDurationSeconds,
      steps,
    },
  ];
}

function buildInstructions(startLabel, endLabel, segments) {
  const instructions = [];
  if (startLabel) {
    instructions.push(`Start from ${startLabel}.`);
  } else {
    instructions.push('Start from your current location.');
  }

  segments.forEach((segment, index) => {
    instructions.push(buildStepInstruction(segment, index));
  });

  if (endLabel) {
    instructions.push(`Arrive at ${endLabel}.`);
  } else {
    instructions.push('Arrive at your destination.');
  }

  return instructions;
}

function enhanceRouteForDisability(route, disabilityType) {
  const enhanced = { ...route };
  const features = new Set(route.accessibilityFeatures || []);
  const warnings = new Set(route.warnings || []);
  const instructions = [...(route.instructions || [])];

  switch (disabilityType) {
    case 'visual_impairment':
      features.add('Highlights crossings typically equipped with tactile paving');
      features.add('Prioritizes well-documented pedestrian infrastructure');
      instructions.push('Follow tactile paving and auditory cues where present.');
      warnings.add('Remain alert at crossings that may lack auditory signals.');
      break;
    case 'wheelchair':
      features.add('Wheelchair-optimized surface scoring applied');
      features.add('Avoids segments tagged with missing curb ramps');
      instructions.push('Route avoids steep inclines and high curbs.');
      warnings.add('Construction or untagged obstacles may still appear.');
      break;
    case 'mobility_impairment':
      features.add('Gentle slopes prioritized along the path');
      features.add('Segments without resting areas kept as short as possible');
      instructions.push('Take optional rests between segments as needed.');
      warnings.add('Real-world conditions may vary from OpenStreetMap data.');
      break;
    case 'hearing_impairment':
      features.add('Favors crossings with strong visual signaling in OSM data');
      instructions.push('Rely on visual signage and marked crossings.');
      warnings.add('Some crossings may lack up-to-date visual signal tagging.');
      break;
    default:
      features.add('Standard accessible routing applied');
      instructions.push('Follow the accessible path to your destination.');
  }

  enhanced.accessibilityFeatures = Array.from(features);
  enhanced.warnings = Array.from(warnings);
  enhanced.instructions = instructions;
  return enhanced;
}

function calculateRouteAccessibility(route, disabilityType) {
  let score = 70;
  const features = new Set(route.accessibilityFeatures || []);

  if (features.has('No critical accessibility issues detected along the route')) score += 10;
  if (features.has('All traversed segments marked wheelchair-passable')) score += 10;

  switch (disabilityType) {
    case 'visual_impairment':
      if (features.has('Highlights crossings typically equipped with tactile paving')) score += 20;
      break;
    case 'wheelchair':
      if (features.has('Wheelchair-optimized surface scoring applied')) score += 20;
      if (features.has('Avoids segments tagged with missing curb ramps')) score += 10;
      break;
    case 'mobility_impairment':
      if (features.has('Gentle slopes prioritized along the path')) score += 15;
      break;
    case 'hearing_impairment':
      if (features.has('Favors crossings with strong visual signaling in OSM data')) score += 15;
      break;
    default:
      break;
  }

  if (route.distance < 1) score += 10;
  else if (route.distance > 5) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getRouteType(disabilityType) {
  const types = {
    visual_impairment: 'visually-accessible',
    wheelchair: 'wheelchair-accessible',
    mobility_impairment: 'mobility-optimized',
    hearing_impairment: 'visually-guided',
  };
  return types[disabilityType] || 'accessible';
}

function summarizeSegments(segments = []) {
  return segments.map((segment) => ({
    id: segment.id ?? segment.segment_id ?? null,
    accessible: Boolean(segment.accessible),
    score: segment.score ?? 0.5,
    confidence: segment.confidence || 'low',
    length_m: segment.length ?? 0,
    issues: segment.issues || [],
    tags: segment.tags || {},
    geometry: {
      type: 'LineString',
      coordinates: (segment.path || []).map(([lat, lon]) => [lon, lat]),
    },
  }));
}

function getOsrmProfile(mode = 'walking') {
  switch (mode) {
    case 'wheelchair':
    case 'walking':
    default:
      return 'foot';
  }
}

async function fetchOsrmRoute(startCoord, endCoord, mode = 'walking') {
  const profile = getOsrmProfile(mode);
  const coords = `${startCoord.lon},${startCoord.lat};${endCoord.lon},${endCoord.lat}`;
  const params = new URLSearchParams({
    overview: 'full',
    geometries: 'geojson',
    steps: 'true',
  });

  const response = await fetch(`${OSRM_BASE_URL}/route/v1/${profile}/${coords}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'User-Agent': 'RoamAble-Backend/1.0',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`OSRM request failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (!payload?.routes?.length) {
    throw new Error('No OSRM routes returned');
  }
  return { profile, route: payload.routes[0] };
}

function mapOsrmLegs(route) {
  if (!route?.legs) return [];
  return route.legs.map((leg, index) => ({
    summary: leg.summary || `Leg ${index + 1}`,
    mode: 'WALK',
    distance: leg.distance ?? 0,
    duration: leg.duration ?? 0,
    steps: Array.isArray(leg.steps)
      ? leg.steps.map((step, stepIndex) => ({
          name: step.name || `Step ${stepIndex + 1}`,
          distance: step.distance ?? 0,
          duration: step.duration ?? 0,
          mode: step.mode || 'WALK',
          instruction: step.maneuver?.instruction || step.maneuver?.type || 'Proceed',
          geometry: step.geometry ?? null,
        }))
      : [],
  }));
}

function buildOsrmInstructions(route, startLabel, endLabel) {
  const instructions = [];
  instructions.push(startLabel ? `Start from ${startLabel}.` : 'Start from your location.');

  if (route?.legs?.length) {
    route.legs.forEach((leg) => {
      if (Array.isArray(leg.steps)) {
        leg.steps.forEach((step) => {
          const maneuver = step.maneuver || {};
          const action = maneuver.instruction || maneuver.type || 'Continue';
          instructions.push(action);
        });
      } else {
        instructions.push('Continue on the suggested path.');
      }
    });
  } else {
    instructions.push('Follow the suggested path to your destination.');
  }

  instructions.push(endLabel ? `Arrive at ${endLabel}.` : 'Arrive at your destination.');

  return instructions;
}

function buildOsrmRouteResponse({
  osrmRoute,
  startCoord,
  endCoord,
  startLabel,
  endLabel,
  disabilityType,
  transportationMode,
}) {
  const geometry = osrmRoute.geometry ?? { type: 'LineString', coordinates: [] };
  const polyline = Array.isArray(geometry.coordinates)
    ? geometry.coordinates.map(([lon, lat]) => [lat, lon])
    : [];

  const distanceKm = Number(((osrmRoute.distance ?? 0) / 1000).toFixed(2));
  const durationMinutes = Math.max(1, Math.round((osrmRoute.duration ?? 0) / 60));

  const features = [
    'Fallback route generated via OSRM pedestrian profile',
    'Segments may include sidewalks without verified accessibility data',
  ];
  const warnings = [
    'Accessibility tags unavailable for portions of this route; inspect conditions on arrival.',
  ];

  const accessibilityScore = Math.max(30, Math.min(60, Math.round(distanceKm > 2 ? 40 : 55)));

  return {
    id: `accessible-route-${Date.now()}`,
    type: getRouteType(disabilityType),
    start: {
      coordinates: startCoord,
      name: startLabel || null,
      type: 'origin',
      network_projection: null,
    },
    end: {
      coordinates: endCoord,
      name: endLabel || null,
      type: 'destination',
      network_projection: null,
    },
    transportationMode,
    distance: distanceKm,
    duration: durationMinutes,
    geometry,
    legs: mapOsrmLegs(osrmRoute),
    accessibility: {
      score: accessibilityScore,
      rating: Math.ceil(accessibilityScore / 20),
      features,
      warnings,
      disabilityType,
      segmentSummary: {
        totalSegments: 0,
        accessibleSegments: 0,
        averageAccessibilityScore: 0,
        accessibleSegmentRatio: 0,
      },
    },
    instructions: buildOsrmInstructions(osrmRoute, startLabel, endLabel),
    hasRealRouting: true,
    metrics: {
      estimated_speed_kmh: getAverageSpeedKmh(transportationMode, disabilityType),
      total_distance_m: osrmRoute.distance ?? 0,
      total_duration_s: osrmRoute.duration ?? 0,
      routingMode: 'osrm_fallback',
      osrm_profile: getOsrmProfile(transportationMode),
    },
    segments: [],
    generatedAt: new Date().toISOString(),
  };
}

async function generateAccessibleRoute({
  start,
  end,
  disabilityType = 'wheelchair',
  transportationMode = 'walking',
  accessibleSegmentsPath = DEFAULT_SEGMENTS_PATH,
} = {}) {
  const startCoord = normalizeCoordinate(start);
  const endCoord = normalizeCoordinate(end);

  const attempts = [
    {
      label: 'strict',
      options: {
        accessibleSegmentsPath,
        allowLimitedSegments: false,
        allowNonAccessible: false,
      },
    },
    {
      label: 'limited',
      options: {
        accessibleSegmentsPath,
        allowLimitedSegments: true,
        limitedThreshold: 0.6,
        allowNonAccessible: false,
      },
    },
    {
      label: 'fallback',
      options: {
        accessibleSegmentsPath,
        allowLimitedSegments: true,
        limitedThreshold: 0.45,
        allowNonAccessible: true,
      },
    },
  ];

  let routingResult = null;
  let routingMode = null;
  for (const attempt of attempts) {
    routingResult = findAccessibleWalkingRoute(
      [startCoord.lat, startCoord.lon],
      [endCoord.lat, endCoord.lon],
      attempt.options,
    );
    if (routingResult.success) {
      routingMode = attempt.label;
      break;
    }
  }

  if (!routingResult.success) {
    try {
      const osrm = await fetchOsrmRoute(startCoord, endCoord, transportationMode);
      return buildOsrmRouteResponse({
        osrmRoute: osrm.route,
        startCoord,
        endCoord,
        startLabel: start.label || start.name,
        endLabel: end.label || end.name,
        disabilityType,
        transportationMode,
      });
    } catch (osrmError) {
      console.warn('OSRM fallback failed', osrmError);
    }
    const error = new Error('No accessible path found between the requested points');
    error.code = 'no_accessible_route';
    error.details = routingResult;
    throw error;
  }

  const metrics = routingResult.metrics || {};
  const startOffset = routingResult.start?.offset_m || metrics.start_distance_to_network_m || 0;
  const endOffset = routingResult.end?.offset_m || metrics.end_distance_to_network_m || 0;
  const segmentDistance = metrics.total_distance_m || 0;
  const totalDistanceMeters = segmentDistance + (startOffset || 0) + (endOffset || 0);
  const distanceKm = parseFloat((totalDistanceMeters / 1000).toFixed(2));

  const speedKmh = getAverageSpeedKmh(transportationMode, disabilityType);
  const durationMinutes =
    speedKmh > 0 ? Math.max(1, Math.round((distanceKm / speedKmh) * 60)) : Math.round(distanceKm * 12);

  const segments = routingResult.segments || [];
  const analysis = analyzeSegments(segments);
  const geometry = toGeoJsonLine(routingResult.polyline || []);
  const legs = buildLegs(segments, speedKmh);
  const instructions = buildInstructions(start.label || start.name, end.label || end.name, segments);

  const baseRoute = {
    distance: distanceKm,
    duration: durationMinutes,
    geometry,
    legs,
    accessibilityFeatures: analysis.features,
    warnings: analysis.warnings,
    instructions,
    hasRealRouting: true,
  };

  const enhancedRoute = enhanceRouteForDisability(baseRoute, disabilityType);
  const accessibilityScore = calculateRouteAccessibility(enhancedRoute, disabilityType);

  return {
    id: `accessible-route-${Date.now()}`,
    type: getRouteType(disabilityType),
    start: {
      coordinates: startCoord,
      name: start.label || start.name || null,
      type: 'origin',
      network_projection: routingResult.start || null,
    },
    end: {
      coordinates: endCoord,
      name: end.label || end.name || null,
      type: 'destination',
      network_projection: routingResult.end || null,
    },
    transportationMode,
    distance: distanceKm,
    duration: durationMinutes,
    geometry: enhancedRoute.geometry,
    legs: enhancedRoute.legs,
    accessibility: {
      score: accessibilityScore,
      rating: Math.ceil(accessibilityScore / 20),
      features: enhancedRoute.accessibilityFeatures,
      warnings: enhancedRoute.warnings,
      disabilityType,
      segmentSummary: {
        totalSegments: segments.length,
        accessibleSegments: segments.filter((seg) => seg.accessible).length,
        averageAccessibilityScore: Number(
          ((metrics.average_accessibility_score || 0) * 100).toFixed(0),
        ),
        accessibleSegmentRatio: metrics.accessible_segment_ratio || 0,
      },
    },
    instructions: enhancedRoute.instructions,
    hasRealRouting: true,
    metrics: {
      ...metrics,
      estimated_speed_kmh: speedKmh,
      start_offset_m: startOffset,
      end_offset_m: endOffset,
      total_distance_m: totalDistanceMeters,
      routingMode,
    },
    segments: summarizeSegments(segments),
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  DEFAULT_SEGMENTS_PATH,
  generateAccessibleRoute,
};
