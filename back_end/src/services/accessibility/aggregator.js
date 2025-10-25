/**
 * Accessibility data aggregator.
 *
 * Responsibility:
 *  - Load/refresh OpenSidewalks sidewalk segments for Toronto.
 *  - Merge venue-level accessibility signals from Wheelmap.org / AccessNow.
 *  - Produce normalized segment records for the routing engine.
 *
 * NOTE: This is currently a skeleton. Implementations should respect each
 * provider's usage policy and cache data locally to avoid repeated API calls.
 */

// TODO: replace with real data loaders once ETL scripts are ready.

/**
 * Loads raw OpenSidewalks data for the configured city.
 * @returns {Promise<Array>} Array of raw GeoJSON features.
 */
async function loadOpenSidewalksSegments() {
  throw new Error('loadOpenSidewalksSegments not implemented');
}

/**
 * Fetches Wheelmap / AccessNow venue accessibility data.
 * @returns {Promise<Array>} Array of POI accessibility records.
 */
async function loadVenueAccessibility() {
  throw new Error('loadVenueAccessibility not implemented');
}

/**
 * Normalizes raw data into the format expected by the routing engine.
 * @param {Array} sidewalkSegments
 * @param {Array} venueAccessibility
 * @returns {Array} Normalized segments with accessibility metadata.
 */
function buildAccessibleSegments(sidewalkSegments, venueAccessibility) {
  // Example shape returned by this function:
  // {
  //   segment_id: 'osm-12345',
  //   geometry: { type: 'LineString', coordinates: [...] },
  //   attributes: {
  //     curb_cut: true,
  //     surface: 'asphalt',
  //     slope_grade: 0.03,
  //     is_wheelchair_passable: true,
  //     confidence: 'medium',
  //     sources: ['opensidewalks', 'wheelmap']
  //   }
  // }
  return sidewalkSegments.map((segment) => ({
    segment_id: segment.properties?.id || segment.id,
    geometry: segment.geometry,
    attributes: {
      curb_cut: !!segment.properties?.kerb_lowered,
      surface: segment.properties?.surface || 'unknown',
      slope_grade: segment.properties?.incline ?? null,
      is_wheelchair_passable: Boolean(segment.properties?.wheelchair),
      confidence: 'low',
      sources: ['opensidewalks'],
      venue_scores: venueAccessibility
        .filter((venue) => venue.segment_id === segment.properties?.id)
        .map(({ source, score }) => ({ source, score })),
    },
  }));
}

module.exports = {
  loadOpenSidewalksSegments,
  loadVenueAccessibility,
  buildAccessibleSegments,
};
