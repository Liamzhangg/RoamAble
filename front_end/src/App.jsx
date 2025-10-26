import logo from "./assets/logo.png";
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Popup,
  ZoomControl,
  Marker,
  ScaleControl,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import AddReviewModal from "./ui_ux_design/add_review_modal.jsx";
import NavBar from "./ui_ux_design/nav_bar.jsx";
import PlaceList from "./ui_ux_design/place_list.jsx";
import LoginScreen from "./ui_ux_design/login_screen.jsx";
import FiltersModal from "./ui_ux_design/filters_modal.jsx";
import ChangePasswordModal from "./ui_ux_design/change_password_modal.jsx";
import { supabase } from "./ui_ux_design/lib/supabaseClient.js";
import { searchPlaces as fetchPlaces, planWalkingRoute } from "./map_data_logic/api.js";
// Fix Leaflet marker icons for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url),
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url),
});

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

const DEFAULT_START_LOCATION = {
  label: "Toronto City Hall",
  lat: 43.6529,
  lon: -79.3849,
};

function normalizePlaceResult(result, index = 0) {
  const lat = Number(result.lat ?? result.latitude);
  const lon = Number(result.lon ?? result.lng ?? result.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return null;
  }
  const address = result.address || {};
  const displayName = result.display_name || "";
  const nameCandidates = [
    address.attraction,
    address.museum,
    address.mall,
    address.railway,
    address.townhall,
    address.road,
    displayName.split(",")[0]?.trim(),
  ].filter(Boolean);
  const name = nameCandidates[0] || `Place ${index + 1}`;
  const city = address.city || address.town || address.village || address.state;
  const typeLabel = (result.type || result.class || "Point of interest").replace(/_/g, " ");
  const tags = Array.from(
    new Set([typeLabel, city, address.road, address.neighbourhood].filter(Boolean)),
  );
  const features = {
    wheelchair: result.class === "tourism" || result.type === "museum",
    braille: result.type === "museum",
    assistiveAudio: result.class === "tourism" || result.type === "theatre",
  };

  return {
    id: result.place_id || `${lat}-${lon}-${index}`,
    name,
    location: displayName || `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
    rating: Number((3.5 + Math.random() * 1.4).toFixed(1)),
    reviews: Math.max(42, Math.round((result.importance ?? 0.5) * 200)),
    description: `Accessible ${typeLabel} in ${city || "this area"}.`,
    tags,
    features,
    lat,
    lng: lon,
  };
}

function formatDistance(meters) {
  if (!Number.isFinite(meters)) return "—";
  if (meters < 1000) return `${meters.toFixed(0)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatPercentage(value) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [places, setPlaces] = useState(PLACES);
  const [selectedPlace, setSelectedPlace] = useState(PLACES[0] ?? null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [, setSubmittedReviews] = useState([]);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [startLocation, setStartLocation] = useState(DEFAULT_START_LOCATION);
  const [isLocatingStart, setIsLocatingStart] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routeError, setRouteError] = useState("");
  const overlayLocked = isModalOpen || isFiltersOpen || isLoginOpen || isPasswordOpen;
  const isInteractionLocked = overlayLocked;
  const navDisabled = overlayLocked;
  const inertProps = isInteractionLocked ? { "aria-hidden": "true", inert: "" } : {};
  const startSummary =
    Number.isFinite(startLocation?.lat) && Number.isFinite(startLocation?.lon)
      ? `${startLocation.label} (${startLocation.lat.toFixed(3)}, ${startLocation.lon.toFixed(3)})`
      : startLocation.label;
  async function fetchRecent() {
    if (!user) { setRecentSearches([]); return; }
    const { data } = await supabase
      .from("recent_searches")
      .select("query")
      .eq("user_id", user.id || user.uid)
      .order("created_at", { ascending: false })
      .limit(6);
    setRecentSearches((data || []).map((r) => r.query));
  }

  const handleSearch = async (query) => {
    setSearchQuery(query);
    const trimmed = query?.trim();
    if (!trimmed) {
      setPlaces(PLACES);
      setSelectedPlace(PLACES[0] ?? null);
      setSearchError("");
      return;
    }

    setIsSearching(true);
    setSearchError("");
    try {
      const results = await fetchPlaces(trimmed, { limit: 8 });
      const normalized = results
        .map((item, index) => normalizePlaceResult(item, index))
        .filter(Boolean);
      setPlaces(normalized);
      setSelectedPlace(normalized[0] ?? null);

      if (user) {
        try {
          await supabase
            .from("recent_searches")
            .insert({ user_id: user.id || user.uid, query: trimmed });
          fetchRecent();
        } catch (error) {
          console.error("Unable to store recent search", error);
        }
      }
    } catch (error) {
      console.error("Place search failed", error);
      setSearchError(error.message || "Unable to fetch accessible places right now.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmitReview = (data) => {
    setSubmittedReviews((previous) => [
      ...previous,
      { ...data, id: `${Date.now()}`, createdAt: new Date().toISOString() },
    ]);
  };

  const filteredPlaces = useMemo(() => {
    return places.filter((place) => {
      const matchesQuery =
        !searchQuery ||
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        return place.features[key];
      });

      return matchesQuery && matchesFilters;
    });
  }, [filters, places, searchQuery]);

  useEffect(() => {
    if (!filteredPlaces.length) {
      setSelectedPlace(null);
      return;
    }
    const stillVisible = filteredPlaces.some((p) => p.id === selectedPlace?.id);
    if (!stillVisible) setSelectedPlace(filteredPlaces[0]);
  }, [filteredPlaces, selectedPlace]);

  useEffect(() => {
    if (
      !selectedPlace ||
      !Number.isFinite(selectedPlace?.lat) ||
      !Number.isFinite(selectedPlace?.lng) ||
      !Number.isFinite(startLocation?.lat) ||
      !Number.isFinite(startLocation?.lon)
    ) {
      setRouteInfo(null);
      return;
    }

    let isCancelled = false;
    setIsRouting(true);
    setRouteError("");

    (async () => {
      try {
        const route = await planWalkingRoute({
          start: { lat: startLocation.lat, lon: startLocation.lon },
          end: { lat: selectedPlace.lat, lon: selectedPlace.lng },
          options: { allowLimitedSegments: true, limitedThreshold: 0.45 },
        });
        if (!isCancelled) {
          setRouteInfo(route);
        }
      } catch (error) {
        if (!isCancelled) {
          setRouteInfo(null);
          setRouteError(
            error.message === "route_not_found"
              ? "No accessible path was found between these points."
              : error.message || "Unable to generate a route right now.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsRouting(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [selectedPlace, startLocation]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUser(null);
    }
  };

  const handleAvatarUpload = () => {
    if (!user) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const extension = file.name.split(".").pop();
      const path = `${user.id || user.uid}/${Date.now()}.${extension}`;
      const { data: uploaded, error } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (error || !uploaded?.path) return;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(uploaded.path);
      await supabase.auth.updateUser({ data: { avatar_url: urlData.publicUrl } });
      const { data: session } = await supabase.auth.getSession();
      setUser(session.session?.user ?? null);
    };
    input.click();
  };

  const handleSetStartLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setRouteError("Geolocation is not supported in this browser.");
      return;
    }
    setIsLocatingStart(true);
    setRouteError("");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setStartLocation({
          label: "Current location",
          lat: Number(coords.latitude.toFixed(6)),
          lon: Number(coords.longitude.toFixed(6)),
        });
        setIsLocatingStart(false);
      },
      (error) => {
        setIsLocatingStart(false);
        setRouteError(error.message || "Unable to access your current location.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleManualStartApply = async (input) => {
    const trimmed = (input || "").trim();
    if (!trimmed) {
      return false;
    }
    setIsLocatingStart(true);
    setRouteError("");
    let success = false;
    try {
      const results = await fetchPlaces(trimmed, { limit: 1 });
      const normalized = results
        .map((item, index) => normalizePlaceResult(item, index))
        .find(Boolean);
      if (!normalized) {
        setRouteError("We couldn't find that starting point. Try another landmark or city.");
      } else {
        setStartLocation({
          label: normalized.name,
          lat: normalized.lat,
          lon: normalized.lng,
        });
        success = true;
      }
    } catch (error) {
      console.error("manual start location lookup failed", error);
      setRouteError("Unable to set that starting point right now.");
    } finally {
      setIsLocatingStart(false);
    }
    return success;
  };

  function FlyToSelected({ coords }) {
    const map = useMap();
    useEffect(() => {
      if (!coords) return;
      const targetZoom = Math.max(map.getZoom(), 14);
      map.flyTo(coords, targetZoom, { duration: 0.6 });
    }, [coords, map]);
    return null;
  }

  function colorForPlace(p) {
    const f = p?.features || {};
    if (f.wheelchair) return "#14b8a6"; // teal
    if (f.braille) return "#8b5cf6"; // violet
    if (f.assistiveAudio) return "#f59e0b"; // amber
    return "#2563eb"; // blue fallback
  }

  function getPinIcon(color) {
    return L.divIcon({
      className: "pin-icon",
      html: `<div class="pin" style="--pin-color: ${color}"></div>`,
      iconSize: [24, 36],
      iconAnchor: [12, 28],
      popupAnchor: [0, -26],
    });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setIsLoginOpen(false);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    (async () => { if (user) await (async () => { const { data } = await supabase.from('recent_searches').select('query').eq('user_id', user.id || user.uid).order('created_at', { ascending: false }).limit(6); setRecentSearches((data||[]).map(r=>r.query)); })(); else setRecentSearches([]); })();
  }, [user]);

  return (
    <>
      {/* Top nav overlay */}
      <NavBar
        onProfileClick={() => setIsLoginOpen(true)}
        onSignOut={handleSignOut}
        onChangePassword={() => setIsPasswordOpen(true)}
        onUploadAvatar={handleAvatarUpload}
        onSearch={handleSearch}
        onOpenFilters={() => setIsFiltersOpen((previous) => !previous)}
        onSetStartLocation={handleSetStartLocation}
        onApplyStartLocation={handleManualStartApply}
        searchQuery={searchQuery}
        user={user}
        recentSearches={recentSearches}
        isDisabled={navDisabled}
        originLabel={startLocation.label}
        isLocatingStart={isLocatingStart}
      />

      <div className={`interaction-scrim ${isInteractionLocked ? "is-visible" : ""}`} aria-hidden="true" />

      {/* Full-screen map background layer */}
      <div className="map-bg" aria-hidden={false}>
        <MapContainer
          center={[43.6532, -79.3832]}
          zoom={13}
          scrollWheelZoom={!isInteractionLocked}
          dragging={!isInteractionLocked}
          doubleClickZoom={!isInteractionLocked}
          keyboard={!isInteractionLocked}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          <ScaleControl position="bottomleft" />
          <ZoomControl position="bottomright" />
          {Number.isFinite(startLocation?.lat) && Number.isFinite(startLocation?.lon) && (
            <CircleMarker
              center={[startLocation.lat, startLocation.lon]}
              radius={8}
              pathOptions={{ color: "#0f172a", weight: 2, fillColor: "#0f172a", fillOpacity: 0.9 }}
            >
              <Popup>Start: {startLocation.label || "Current location"}</Popup>
            </CircleMarker>
          )}
          {filteredPlaces.map((place) => {
            const color = colorForPlace(place);
            const position = [place.lat, place.lng];
            return (
              <Marker
                key={place.id}
                position={position}
                icon={getPinIcon(color)}
                eventHandlers={{ click: () => setSelectedPlace(place) }}
              >
                <Popup>
                  <strong>{place.name}</strong>
                  <br />
                  Accessibility: {place.rating}/5
                </Popup>
              </Marker>
            );
          })}
          {routeInfo?.polyline?.length ? (
            <Polyline
              positions={routeInfo.polyline.map(([lat, lon]) => [lat, lon])}
              pathOptions={{ color: "#0ea5e9", weight: 5, opacity: 0.85 }}
            />
          ) : null}
          <FlyToSelected coords={selectedPlace ? [selectedPlace.lat, selectedPlace.lng] : null} />
        </MapContainer>
      </div>

      {/* Overlay widgets */}
      <img className="corner-logo" src={logo} alt="Accessible Travel Finder" />
      <div className="app-shell">
        <div className={`app-shell__content ${isInteractionLocked ? "is-blocked" : ""}`} {...inertProps}>
          {/* Places list (left overlay panel) */}
          <div className="overlay-panel">
            <div className="overlay-header">
              <span className="overlay-title">Top Results</span>
            </div>
            <div className="overlay-panel__body">
              <PlaceList
                places={filteredPlaces}
                selectedPlaceId={selectedPlace?.id}
                onSelect={setSelectedPlace}
                isLoading={isSearching}
                errorMessage={searchError}
              />
            </div>
          </div>

          <div className="route-panel-container">
            <div className="route-panel">
              {selectedPlace ? (
                <div className="route-panel__destination">
                  <span className="route-panel__destination-label">Destination</span>
                  <h2 className="route-panel__destination-name">{selectedPlace.name}</h2>
                  <p className="route-panel__destination-meta">{selectedPlace.location}</p>
                  {selectedPlace.description ? (
                    <p className="route-panel__destination-description">{selectedPlace.description}</p>
                  ) : null}
                  {selectedPlace.tags?.length ? (
                    <div className="route-panel__destination-tags">
                      {selectedPlace.tags.map((tag) => (
                        <span key={tag} className="tag">
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="route-panel__hint">Select a place to preview its accessibility highlights.</p>
              )}

              <label className="route-panel__label">
                <span>Start point</span>
                <input className="route-panel__input" value={startSummary} readOnly title={startSummary} />
              </label>
              <p className="route-panel__hint">
                Use “Set Start Location” in the nav bar to update with your current position.
              </p>
              {!routeInfo && !isRouting && !routeError && (
                <p className="route-panel__hint">Select a destination to generate a pathway.</p>
              )}
              {routeError && <p className="route-panel__error">{routeError}</p>}
              {!routeError && isRouting && (
                <p className="route-panel__status">Mapping an accessible pathway…</p>
              )}
              {routeInfo && !routeError && (
                <>
                  <div className="route-panel__summary">
                    <strong>{selectedPlace?.name}</strong>
                    <span>Distance: {formatDistance(routeInfo.metrics?.total_distance_m)}</span>
                    <span>
                      Accessible coverage: {formatPercentage(routeInfo.metrics?.accessible_segment_ratio)}
                    </span>
                    <span>
                      Network offsets: start {formatDistance(routeInfo.start?.offset_m)} · end{" "}
                      {formatDistance(routeInfo.end?.offset_m)}
                    </span>
                  </div>
                  {routeInfo.segments?.length ? (
                    <>
                      <ul className="route-panel__results">
                        {routeInfo.segments.slice(0, 5).map((segment, index) => (
                          <li key={`${segment.id || "segment"}-${index}`}>
                            <button type="button" disabled>
                              <span className="label">Segment {index + 1}</span>
                              <span className="meta">
                                {formatDistance(segment.length)} · score {(segment.score ?? 0.5).toFixed(2)}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="route-panel__hint">Route computed successfully.</p>
                  )}
                </>
              )}
            </div>
          </div>

          <button className="fab" onClick={() => setIsModalOpen(true)}>+ Review</button>
        </div>

        <FiltersModal
          isOpen={isFiltersOpen}
          onClose={() => setIsFiltersOpen(false)}
          filters={filters}
          onChange={setFilters}
        />
        <AddReviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmitReview}
          placeName={selectedPlace?.name}
        />
        <ChangePasswordModal
          isOpen={isPasswordOpen}
          onClose={() => setIsPasswordOpen(false)}
          onSubmit={async (pwd) => { await supabase.auth.updateUser({ password: pwd }); }}
        />
        {isLoginOpen && (
          <LoginScreen
            onClose={() => setIsLoginOpen(false)}
            onSuccess={(authUser) => {
              setUser(authUser);
              setIsLoginOpen(false);
            }}
          />
        )}
      </div>
    </>
  );
}

export default App;
