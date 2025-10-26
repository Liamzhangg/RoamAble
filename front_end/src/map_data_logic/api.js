const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.replace(/\/$/, "")) ||
  "http://localhost:3000";

export async function fetchPlaceSearch(query, { signal } = {}) {
  if (!query) return [];

  const params = new URLSearchParams({ query });
  const response = await fetch(`${API_BASE_URL}/api/map/search?${params.toString()}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Place search failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (!payload || !Array.isArray(payload.results)) {
    return [];
  }
  return payload.results;
}

export function mapSearchResultToPlace(result) {
  if (!result) return null;

  const lat = parseFloat(result.lat);
  const lon = parseFloat(result.lon ?? result.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }

  const displayName = result.display_name || result.name || "Unknown location";
  const primaryName =
    result.name ||
    (typeof displayName === "string" ? displayName.split(",")[0]?.trim() : null) ||
    "Point of interest";
  const address = result.address || {};
  const extratags = result.extratags || {};

  const tags = new Set();
  if (result.type) tags.add(result.type.replace(/_/g, " "));
  if (result.category) tags.add(result.category);
  if (result.class) tags.add(result.class);
  if (address.neighbourhood) tags.add(address.neighbourhood);
  if (address.suburb) tags.add(address.suburb);

  const wheelchairTag = extratags.wheelchair || result.wheelchair;
  const features = {
    wheelchair: wheelchairTag === "yes",
    braille: extratags.braille === "yes",
    assistiveAudio: extratags.hearing_loop === "yes" || extratags.audio === "yes",
  };

  const baseRating = result.importance
    ? Math.min(5, Math.max(3.2, 3 + Number(result.importance) * 1.5))
    : 4.1;

  const place = {
    id: `osm-${result.place_id}`,
    name: primaryName,
    location:
      [address.house_number, address.road, address.city, address.state]
        .filter(Boolean)
        .join(" ") || displayName,
    rating: Number(baseRating.toFixed(1)),
    reviews: undefined,
    lat,
    lon,
    lng: lon,
    coordinates: [lat, lon],
    tags: Array.from(tags).filter(Boolean).slice(0, 5),
    features,
    description: extratags?.short_description || displayName,
    searchLabel: displayName,
    source: "nominatim",
  };

  return place;
}

export async function requestAccessibleRoute(
  {
    currentLocation,
    destination,
    disabilityType = "wheelchair",
    transportationMode = "walking",
  },
  { signal } = {},
) {
  const response = await fetch(`${API_BASE_URL}/api/routes/navigate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      currentLocation,
      destination,
      disabilityType,
      transportationMode,
    }),
    signal,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (error) {
    // ignore parse error; handled below
  }

  if (!response.ok || !payload?.success || !payload.route) {
    const message =
      payload?.error || `Route request failed with status ${response.status}`;
    const routeError = new Error(message);
    if (payload?.details) {
      routeError.details = payload.details;
    }
    throw routeError;
  }

  return payload.route;
}
