const express = require('express');
const {
  searchPlaces,
  reverseGeocode,
} = require('../services/map_data/map_client');
const { findAccessibleWalkingRoute } = require('../services/routing/walking_router');
const { planAccessibleTrip } = require('../services/routing/transit_router');

const router = express.Router();

router.get('/map/search', async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'query parameter is required' });
  }
  try {
    const limit = Number(req.query.limit) || 5;
    const results = await searchPlaces(query, { limit });
    return res.json({ results });
  } catch (err) {
    console.error('map/search failed', err);
    return res.status(502).json({ error: 'failed_to_fetch_places' });
  }
});

router.get('/map/reverse', async (req, res) => {
  const { lat, lon } = req.query;
  if (lat == null || lon == null) {
    return res.status(400).json({ error: 'lat and lon parameters are required' });
  }
  try {
    const result = await reverseGeocode(Number(lat), Number(lon));
    return res.json({ result });
  } catch (err) {
    console.error('map/reverse failed', err);
    return res.status(502).json({ error: 'failed_to_reverse_geocode' });
  }
});

router.post('/routes/walking', async (req, res) => {
  const { start, end, options = {} } = req.body || {};
  if (!start || !end || typeof start.lat !== 'number' || typeof start.lon !== 'number') {
    return res.status(400).json({ error: 'start.lat and start.lon are required numbers' });
  }
  if (typeof end.lat !== 'number' || typeof end.lon !== 'number') {
    return res.status(400).json({ error: 'end.lat and end.lon are required numbers' });
  }
  try {
    const result = findAccessibleWalkingRoute([start.lat, start.lon], [end.lat, end.lon], options);
    if (!result.success) {
      return res.status(404).json({ error: result.reason || 'route_not_found' });
    }
    return res.json({ route: result });
  } catch (err) {
    console.error('routes/walking failed', err);
    return res.status(500).json({ error: 'routing_failed' });
  }
});

router.post('/routes/transit', async (req, res) => {
  const { start, end, options = {} } = req.body || {};
  if (!start || !end || typeof start.lat !== 'number' || typeof start.lon !== 'number') {
    return res.status(400).json({ error: 'start.lat and start.lon are required numbers' });
  }
  if (typeof end.lat !== 'number' || typeof end.lon !== 'number') {
    return res.status(400).json({ error: 'end.lat and end.lon are required numbers' });
  }
  try {
    const trip = await planAccessibleTrip(
      [start.lat, start.lon],
      [end.lat, end.lon],
      { ...options, useTransit: true },
    );
    return res.json({ trip });
  } catch (err) {
    console.error('routes/transit failed', err);
    return res.status(500).json({ error: 'transit_routing_failed' });
  }
});

module.exports = router;
