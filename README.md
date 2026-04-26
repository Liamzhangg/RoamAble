# RoamAble

RoamAble is a full-stack accessibility routing app built for NewHacks 2025. It helps users search Toronto locations, view accessibility-focused place information, and generate walking routes that prefer wheelchair-passable sidewalk segments.

## Why This Exists

Most maps optimize for speed or distance. RoamAble optimizes for accessibility signals such as curb conditions, sidewalk presence, surface quality, width, incline, and wheelchair-related OpenStreetMap tags. The backend turns sidewalk GeoJSON into a scored graph, then routes over that graph with accessibility penalties.

## Tech Stack

- Frontend: React, Vite, Leaflet, React Leaflet, Supabase
- Backend: Node.js, Express, OpenStreetMap Nominatim, Overpass API, osmtogeojson
- Data: OpenStreetMap/OpenSidewalks-style sidewalk GeoJSON and processed accessibility segment JSON

## Run Locally

Install and start the backend:

```bash
cd back_end
npm install
npm run dev
```

The API runs on `http://localhost:3000` by default. Health check:

```bash
curl http://localhost:3000/health
```

Install and start the frontend in another terminal:

```bash
cd front_end
npm install
cp .env.example .env
npm run dev
```

The frontend usually runs on `http://localhost:5173`.

## Environment Variables

The frontend reads Vite environment variables from `front_end/.env`:

```bash
VITE_API_BASE_URL=http://localhost:3000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Supabase anon keys are client-exposed by design, but they are still kept out of source control so the sample is easy to configure for a different project.

The backend can optionally use:

```bash
PORT=3000
ALLOWED_ORIGIN=http://localhost:5173
OSM_USER_AGENT=RoamAble/1.0 (your-email@example.com)
```

## Data Notes

This repository includes a small downtown Toronto sidewalk sample so the routing pipeline has data without making the code sample unnecessarily large. The sample is focused on the main demo area around City Hall, Eaton Centre, Union Station, Harbourfront, and the ROM area. To regenerate fuller Toronto coverage:

```bash
cd back_end
npm run fetch:opensidewalks
npm run process:accessibility
```

The fetch script uses Overpass API data for a Toronto bounding box, converts it to GeoJSON, and the processing script scores each segment into `back_end/data/processed/accessible_segments.json`.

## API Overview

- `GET /api/map/search?query=...` searches places through OpenStreetMap Nominatim.
- `GET /api/map/reverse?lat=...&lon=...` reverse geocodes coordinates.
- `POST /api/map/location-details` returns normalized location metadata.
- `POST /api/routes/walking` returns an accessibility-aware walking route.
- `POST /api/routes/transit` is scaffolded for multimodal routing and currently falls back to walking.
- `POST /api/routes/navigate` accepts location names or coordinates and returns a route envelope.

## Current Limitations

- The sample data is downtown Toronto-focused and intentionally small for reviewability.
- Transit routing is scaffolded but not fully implemented with GTFS or service alerts yet.
- Accessibility quality depends on available OpenStreetMap/OpenSidewalks tags, so some segments have low-confidence scores.
