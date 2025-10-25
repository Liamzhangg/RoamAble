import { useEffect, useMemo, useState } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";

import FiltersBar from "./ui_ux_design/filters_bar.jsx";
import SearchBox from "./ui_ux_design/search_box.jsx";
import AddReviewModal from "./ui_ux_design/add_review_modal.jsx";
import NavBar from "./ui_ux_design/nav_bar.jsx";
import PlaceList from "./ui_ux_design/place_list.jsx";
import LoginScreen from "./ui_ux_design/login_screen.jsx";

// Fix Leaflet marker icons for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url),
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url),
});

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000/api";

const PLACES = [
  {
    id: "p-1",
    name: "Harbourfront Centre",
    location: "Toronto, Canada",
    rating: 4.8,
    lat: 43.6376,
    lng: -79.3816,
    tags: ["Step-free", "Assistive audio"],
    features: { wheelchair: true, braille: false, assistiveAudio: true },
    description:
      "Waterfront arts hub with elevators, tactile markers, and staff trained in accessible guest support.",
  },
  {
    id: "p-2",
    name: "Royal Ontario Museum",
    location: "Toronto, Canada",
    rating: 4.7,
    lat: 43.6677,
    lng: -79.3948,
    tags: ["Braille menu", "Quiet hours"],
    features: { wheelchair: true, braille: true, assistiveAudio: false },
    description:
      "Museum with elevators, braille exhibits, and staff assistance for mobility access.",
  },
];

const DEFAULT_FILTERS = {
  wheelchair: false,
  braille: false,
  assistiveAudio: false,
};

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedPlace, setSelectedPlace] = useState(PLACES[0] ?? null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittedReviews, setSubmittedReviews] = useState([]);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [userLocation, setUserLocation] = useState([43.6532, -79.3832]);
  const [locationError, setLocationError] = useState("");
  const [destinationQuery, setDestinationQuery] = useState("");
  const [destinationResults, setDestinationResults] = useState([]);
  const [isSearchingDestination, setIsSearchingDestination] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [routeError, setRouteError] = useState("");

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleSubmitReview = (data) => {
    setSubmittedReviews((previous) => [
      ...previous,
      { ...data, id: `${Date.now()}`, createdAt: new Date().toISOString() },
    ]);
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation unavailable in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation([position.coords.latitude, position.coords.longitude]);
        setLocationError("");
      },
      (error) => {
        console.warn("Geolocation error", error);
        setLocationError("Using downtown Toronto as a starting point.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }, []);

  useEffect(() => {
    if (!destinationQuery) {
      setDestinationResults([]);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        setIsSearchingDestination(true);
        const response = await fetch(
          `${API_BASE_URL}/map/search?query=${encodeURIComponent(destinationQuery)}&limit=5`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error("Failed to search destinations");
        }
        const data = await response.json();
        setDestinationResults(data.results || []);
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error(error);
        }
      } finally {
        setIsSearchingDestination(false);
      }
    }, 350);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [destinationQuery]);

  const requestRoute = async (destination) => {
    if (!destination) return;
    setRouteError("");
    setRouteResult(null);
    try {
      const response = await fetch(`${API_BASE_URL}/routes/walking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: { lat: userLocation[0], lon: userLocation[1] },
          end: {
            lat: destination.lat,
            lon: destination.lon,
          },
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Routing failed");
      }
      const data = await response.json();
      setRouteResult(data.route);
    } catch (error) {
      console.error(error);
      setRouteError(error.message || "Unable to compute route.");
    }
  };

  const handleDestinationSelect = (result) => {
    const lat = Number(result.lat);
    const lon = Number(result.lon);
    const destination = {
      id: result.place_id,
      name: result.display_name,
      lat,
      lon,
    };
    setDestinationQuery(result.display_name);
    setDestinationResults([]);
    setSelectedDestination(destination);
    requestRoute(destination);
  };

  const filteredPlaces = useMemo(() => {
    return PLACES.filter((place) => {
      const matchesQuery =
        !searchQuery ||
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        return place.features[key];
      });

      return matchesQuery && matchesFilters;
    });
  }, [filters, searchQuery]);

  useEffect(() => {
    if (!filteredPlaces.length) {
      setSelectedPlace(null);
      return;
    }

    const stillVisible = filteredPlaces.some((place) => place.id === selectedPlace?.id);
    if (!stillVisible) {
      setSelectedPlace(filteredPlaces[0]);
    }
  }, [filteredPlaces, selectedPlace]);

  const routeMetrics = routeResult?.metrics;
  const routeDistanceKm =
    routeMetrics?.total_distance_m != null
      ? (routeMetrics.total_distance_m / 1000).toFixed(2)
      : null;
  const routeAverageScore =
    routeMetrics?.average_accessibility_score != null
      ? routeMetrics.average_accessibility_score.toFixed(2)
      : null;
  const routeAccessiblePercent =
    routeMetrics?.accessible_segment_ratio != null
      ? Math.round(routeMetrics.accessible_segment_ratio * 100)
      : null;

  return (
    <div className="app-shell">
      <NavBar onSignIn={() => setIsLoginOpen(true)} />
      <header className="hero text-center">
        <div>
          <p className="eyebrow">Plan inclusive journeys</p>
          <h1 className="text-3xl font-bold mb-2">Find Accessible Locations</h1>
          <p className="text-gray-600">
            Discover places with real accessibility reviews 🌍
          </p>
          <div className="hero__actions hero__actions--center">
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              Share a review
            </button>
            <button className="btn btn-ghost" onClick={() => setIsLoginOpen(true)}>
              Log in
            </button>
          </div>
        </div>
      </header>

      <main className="layout grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* 🗺️ Map Section */}
        <section className="map-panel rounded-xl overflow-hidden shadow-md">
          <MapContainer
            center={[43.6532, -79.3832]}
            zoom={13}
            scrollWheelZoom
            style={{ height: "400px", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={userLocation}>
              <Popup>Your location</Popup>
            </Marker>
            {selectedDestination && (
              <Marker position={[selectedDestination.lat, selectedDestination.lon]}>
                <Popup>{selectedDestination.name}</Popup>
              </Marker>
            )}
            {routeResult?.polyline && (
              <Polyline
                positions={routeResult.polyline.map(([lat, lon]) => [lat, lon])}
                color="#2563eb"
                weight={6}
                opacity={0.75}
              />
            )}
            {filteredPlaces.map((place) => (
              <Marker
                key={place.id}
                position={[place.lat, place.lng]}
                eventHandlers={{
                  click: () => setSelectedPlace(place),
                }}
              >
                <Popup>
                  <strong>{place.name}</strong>
                  <br />
                  Accessibility: {place.rating}/5
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          <div className="route-panel">
            <label className="route-panel__label">
              Where do you want to go?
              <input
                className="route-panel__input"
                type="text"
                value={destinationQuery}
                onChange={(event) => {
                  setDestinationQuery(event.target.value);
                  setRouteError("");
                }}
                placeholder="Search for an accessible destination"
              />
            </label>
            {destinationResults.length > 0 && (
              <ul className="route-panel__results">
                {destinationResults.map((result) => (
                  <li key={result.place_id}>
                    <button type="button" onClick={() => handleDestinationSelect(result)}>
                      <span className="label">{result.display_name}</span>
                      <span className="meta">
                        {Number(result.lat).toFixed(4)}, {Number(result.lon).toFixed(4)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {isSearchingDestination && (
              <p className="route-panel__hint">Searching destinations...</p>
            )}
            {locationError && <p className="route-panel__hint">{locationError}</p>}
            {routeError && <p className="route-panel__error">{routeError}</p>}
            {routeResult?.success && (
              <div className="route-panel__summary">
                <h4>Route summary</h4>
                {routeDistanceKm && (
                  <p>
                    Distance: <strong>{routeDistanceKm} km</strong>
                  </p>
                )}
                {routeAverageScore && (
                  <p>
                    Accessibility score: <strong>{routeAverageScore}</strong>
                  </p>
                )}
                {routeAccessiblePercent != null && (
                  <p>
                    Accessible segments: <strong>{routeAccessiblePercent}%</strong>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Selected Place Info */}
          {selectedPlace && (
            <div className="p-4 bg-white shadow-inner mt-2 rounded-xl">
              <h3 className="text-lg font-semibold">{selectedPlace.name}</h3>
              <p className="text-gray-600">{selectedPlace.description}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedPlace.tags?.map((tag) => (
                  <span key={tag} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    {tag}
                  </span>
                ))}
              </div>
              <button
                className="btn btn-primary mt-3"
                onClick={() => setIsModalOpen(true)}
              >
                Add Review
              </button>
            </div>
          )}
        </section>

        {/* 📋 List + Filters Section */}
        <section className="list-panel bg-white rounded-xl shadow-md p-4">
          <SearchBox initialQuery={searchQuery} onSearch={handleSearch} />
          <FiltersBar filters={filters} onChange={setFilters} />
          <PlaceList
            places={filteredPlaces}
            selectedPlaceId={selectedPlace?.id}
            onSelect={setSelectedPlace}
          />
          <button
            className="btn btn-outline full-width mt-4"
            onClick={() => setIsModalOpen(true)}
          >
            + Add a community review
          </button>
        </section>
      </main>

      {/* 📝 Review Modal */}
      <AddReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitReview}
        placeName={selectedPlace?.name}
      />

      {isLoginOpen && <LoginScreen onClose={() => setIsLoginOpen(false)} />}
    </div>
  );
}

export default App;
