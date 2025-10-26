import logo from "./assets/logo.png";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  ZoomControl,
} from "react-leaflet";
import L from "leaflet";
import AddReviewModal from "./ui_ux_design/add_review_modal.jsx";
import NavBar from "./ui_ux_design/nav_bar.jsx";
import PlaceList from "./ui_ux_design/place_list.jsx";
import LoginScreen from "./ui_ux_design/login_screen.jsx";
import FiltersModal from "./ui_ux_design/filters_modal.jsx";
import { supabase } from "./ui_ux_design/lib/supabaseClient.js";
import {
  fetchPlaceSearch,
  mapSearchResultToPlace,
  requestAccessibleRoute,
} from "./map_data_logic/api.js";

// Fix Leaflet marker icons for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url),
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url),
});

const DEFAULT_ORIGIN = { lat: 43.6529, lon: -79.3849, label: "Toronto City Hall" };

function buildSearchBlob(place) {
  return [
    place.name,
    place.location,
    place.description,
    place.searchLabel,
    ...(place.tags || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function buildSearchablePlace(rawPlace) {
  if (!rawPlace) return null;
  const lat =
    typeof rawPlace.lat === "number"
      ? rawPlace.lat
      : Array.isArray(rawPlace.coordinates)
      ? Number(rawPlace.coordinates[0])
      : Number(rawPlace.lat);
  const lonCandidate =
    typeof rawPlace.lon === "number"
      ? rawPlace.lon
      : typeof rawPlace.lng === "number"
      ? rawPlace.lng
      : Array.isArray(rawPlace.coordinates)
      ? Number(rawPlace.coordinates[1])
      : Number(rawPlace.lon);
  const lon = Number.isFinite(lonCandidate) ? lonCandidate : Number(rawPlace.lng);
  const coordinates =
    Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : rawPlace.coordinates || null;

  const tags = Array.isArray(rawPlace.tags)
    ? rawPlace.tags.filter(Boolean).slice(0, 6)
    : rawPlace.tags
    ? [rawPlace.tags].filter(Boolean)
    : [];

  const features = {
    wheelchair: Boolean(rawPlace.features?.wheelchair),
    braille: Boolean(rawPlace.features?.braille),
    assistiveAudio: Boolean(rawPlace.features?.assistiveAudio),
  };

  const rating =
    typeof rawPlace.rating === "number" && Number.isFinite(rawPlace.rating)
      ? rawPlace.rating
      : 4;
  const reviews =
    typeof rawPlace.reviews === "number" && Number.isFinite(rawPlace.reviews)
      ? rawPlace.reviews
      : undefined;

  const place = {
    ...rawPlace,
    lat,
    lon,
    lng: lon,
    coordinates,
    tags,
    features,
    rating,
    reviews,
  };

  place.searchBlob = buildSearchBlob(place);
  return place;
}

const STATIC_PLACES = [
  buildSearchablePlace({
    id: "p-1",
    name: "Harbourfront Centre",
    location: "Toronto, Canada",
    rating: 4.8,
    reviews: 214,
    lat: 43.6376,
    lng: -79.3816,
    tags: ["Step-free", "Assistive audio"],
    features: { wheelchair: true, braille: false, assistiveAudio: true },
    description:
      "Waterfront arts hub with elevators, tactile markers, and staff trained in accessible guest support.",
    searchLabel: "Harbourfront Centre Toronto waterfront",
  }),
  buildSearchablePlace({
    id: "p-2",
    name: "Royal Ontario Museum",
    location: "Toronto, Canada",
    rating: 4.7,
    reviews: 387,
    lat: 43.6677,
    lng: -79.3948,
    tags: ["Braille menu", "Quiet hours"],
    features: { wheelchair: true, braille: true, assistiveAudio: false },
    description:
      "Museum with elevators, braille exhibits, and staff assistance for mobility access.",
    searchLabel: "Royal Ontario Museum ROM",
  }),
].filter(Boolean);

const DEFAULT_FILTERS = {
  wheelchair: false,
  braille: false,
  assistiveAudio: false,
};

function formatDistance(distanceKm) {
  if (!Number.isFinite(distanceKm)) return "Distance unknown";
  if (distanceKm >= 1) {
    return `${distanceKm.toFixed(2)} km`;
  }
  return `${Math.round(distanceKm * 1000)} m`;
}

function formatDuration(minutes) {
  if (!Number.isFinite(minutes)) return "Duration unknown";
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!remainder) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [places, setPlaces] = useState(() => [...STATIC_PLACES]);
  const [selectedPlace, setSelectedPlace] = useState(STATIC_PLACES[0] ?? null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittedReviews, setSubmittedReviews] = useState([]);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAttractionsOpen, setIsAttractionsOpen] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [user, setUser] = useState(null);

  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [isLocatingStart, setIsLocatingStart] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const [activeRoute, setActiveRoute] = useState(null);
  const [isRouting, setIsRouting] = useState(false);
  const [routingError, setRoutingError] = useState(null);

  const isInteractionLocked = isModalOpen || isFiltersOpen || isLoginOpen;
  const inertProps = isInteractionLocked ? { "aria-hidden": "true", inert: "" } : {};

  const searchAbortRef = useRef(null);
  const routeAbortRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setUser(data.session?.user ?? null);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      active = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleSubmitReview = useCallback((data) => {
    setSubmittedReviews((previous) => [
      ...previous,
      { ...data, id: `${Date.now()}`, createdAt: new Date().toISOString() },
    ]);
  }, []);

  const handleSetStartLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is unavailable; using Toronto City Hall as the starting point.");
      setOrigin(DEFAULT_ORIGIN);
      return;
    }
    setIsLocatingStart(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextOrigin = {
          lat: Number(position.coords.latitude.toFixed(6)),
          lon: Number(position.coords.longitude.toFixed(6)),
          label: "Current location",
        };
        setOrigin(nextOrigin);
        setLocationError(null);
        setIsLocatingStart(false);
      },
      () => {
        setLocationError("Unable to determine your location; using Toronto City Hall as the starting point.");
        setOrigin(DEFAULT_ORIGIN);
        setIsLocatingStart(false);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const handleSearch = useCallback(
    async (rawQuery) => {
      const query = rawQuery.trim();
      setSearchQuery(query);

      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      if (routeAbortRef.current) {
        routeAbortRef.current.abort();
        routeAbortRef.current = null;
      }
      setActiveRoute(null);
      setRoutingError(null);

      if (!query) {
        setIsSearching(false);
        setSearchError(null);
        setPlaces([...STATIC_PLACES]);
        setSelectedPlace(STATIC_PLACES[0] ?? null);
        return;
      }

      const controller = new AbortController();
      searchAbortRef.current = controller;
      setIsSearching(true);
      setSearchError(null);
      setSelectedPlace(null);

      try {
        const rawResults = await fetchPlaceSearch(query, { signal: controller.signal });
        const mappedPlaces = rawResults
          .map((item) => buildSearchablePlace(mapSearchResultToPlace(item)))
          .filter(Boolean);

        if (controller.signal.aborted) return;

        if (!mappedPlaces.length) {
          setSearchError("No results found. Try searching for a nearby landmark.");
        }
        setPlaces(mappedPlaces);
        setSelectedPlace(mappedPlaces[0] ?? null);
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("map search failed", error);
        setSearchError("We could not reach the map service. Please try again.");
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
          if (searchAbortRef.current === controller) {
            searchAbortRef.current = null;
          }
        }
      }
    },
    [],
  );

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase();
    return places.filter((place) => {
      const matchesQuery = !normalizedQuery || place.searchBlob?.includes(normalizedQuery);
      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (!value) return true;
        return Boolean(place.features?.[key]);
      });
      return matchesQuery && matchesFilters;
    });
  }, [filters, places, searchQuery]);

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

  const searchStatusMessage = useMemo(() => {
    if (searchError) return searchError;
    if (searchQuery && filteredPlaces.length && !isSearching) {
      const label = filteredPlaces.length === 1 ? "result" : "results";
      return `Showing ${filteredPlaces.length} ${label} for "${searchQuery}"`;
    }
    if (searchQuery && !filteredPlaces.length && !isSearching) {
      return "No results match your filters.";
    }
    return null;
  }, [filteredPlaces.length, isSearching, searchError, searchQuery]);

  const combinedStatusMessage = useMemo(() => {
    const pieces = [searchStatusMessage];
    if (locationError && !isRouting) {
      pieces.push(locationError);
    }
    return pieces.filter(Boolean).join(" · ");
  }, [locationError, isRouting, searchStatusMessage]);

  useEffect(() => {
    return () => {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      if (routeAbortRef.current) routeAbortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (!selectedPlace) {
      if (routeAbortRef.current) {
        routeAbortRef.current.abort();
        routeAbortRef.current = null;
      }
      setActiveRoute(null);
      setRoutingError(null);
      setIsRouting(false);
      return;
    }

    const hasDestinationCoords =
      Number.isFinite(selectedPlace.lat) && Number.isFinite(selectedPlace.lon);
    const hasOriginCoords =
      Number.isFinite(origin?.lat) && Number.isFinite(origin?.lon ?? origin?.lng);

    if (!hasDestinationCoords || !hasOriginCoords) {
      return;
    }

    if (routeAbortRef.current) {
      routeAbortRef.current.abort();
    }
    setActiveRoute(null);
    setRoutingError(null);

    const controller = new AbortController();
    routeAbortRef.current = controller;
    setIsRouting(true);

    const currentLocation = {
      lat: origin.lat,
      lon: origin.lon ?? origin.lng,
      label: origin.label,
    };
    const destination = {
      lat: selectedPlace.lat,
      lon: selectedPlace.lon ?? selectedPlace.lng,
      name: selectedPlace.name,
    };

    (async () => {
      try {
        const route = await requestAccessibleRoute(
          {
            currentLocation,
            destination,
            disabilityType: "wheelchair",
            transportationMode: "walking",
          },
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;

        const geometryCoords = Array.isArray(route?.geometry?.coordinates)
          ? route.geometry.coordinates
          : [];
        const polyline =
          geometryCoords.length > 1
            ? geometryCoords.map(([lon, lat]) => [lat, lon])
            : [];

        setActiveRoute({
          ...route,
          polyline,
        });
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("route generation failed", error);
        setRoutingError(error.message || "Could not generate an accessible route.");
      } finally {
        if (!controller.signal.aborted) {
          setIsRouting(false);
          if (routeAbortRef.current === controller) {
            routeAbortRef.current = null;
          }
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [origin, selectedPlace]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (activeRoute?.polyline?.length >= 2) {
      const bounds = L.latLngBounds(activeRoute.polyline.map(([lat, lon]) => [lat, lon]));
      map.fitBounds(bounds, { padding: [48, 48] });
      return;
    }

    if (selectedPlace?.lat && selectedPlace?.lon) {
      map.flyTo([selectedPlace.lat, selectedPlace.lon], 15, { duration: 0.75 });
      return;
    }

    if (origin?.lat && origin?.lon) {
      map.setView([origin.lat, origin.lon], 13);
    }
  }, [activeRoute, origin, selectedPlace]);

  const handleSelectPlace = useCallback((place) => {
    if (!place) return;
    setSelectedPlace(place);
    const map = mapRef.current;
    if (map && place.coordinates) {
      map.flyTo(place.coordinates, 15, { duration: 0.6 });
    }
  }, []);

  const routeFeature = activeRoute?.accessibility?.features?.[0];
  const routeWarning = activeRoute?.accessibility?.warnings?.[0];

  const showRouteBanner = Boolean(activeRoute) || Boolean(isRouting) || Boolean(routingError);

  const mapInitialCenter = useMemo(() => {
    if (origin?.lat && origin?.lon) {
      return [origin.lat, origin.lon];
    }
    return [DEFAULT_ORIGIN.lat, DEFAULT_ORIGIN.lon];
  }, [origin]);

  const routeScore =
    typeof activeRoute?.accessibility?.score === "number"
      ? Math.round(activeRoute.accessibility.score)
      : null;

  const currentOriginLabel = origin?.label || "Toronto City Hall";

  const handleSignOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("supabase signOut failed", error);
    }
    setUser(null);
  }, []);

  return (
    <>
      <NavBar
        onSignIn={() => setIsLoginOpen(true)}
        onSignOut={handleSignOut}
        onSearch={handleSearch}
        onOpenFilters={() => setIsFiltersOpen((previous) => !previous)}
        onToggleAttractions={() => setIsAttractionsOpen((value) => !value)}
        searchQuery={searchQuery}
        user={user}
        isDisabled={isInteractionLocked}
        onSetStartLocation={handleSetStartLocation}
        originLabel={currentOriginLabel}
        isLocatingStart={isLocatingStart}
      />
      <div className={`interaction-scrim ${isInteractionLocked ? "is-visible" : ""}`} aria-hidden="true" />

      <div className="map-bg" aria-hidden={false}>
        <MapContainer
          center={mapInitialCenter}
          zoom={13}
          scrollWheelZoom={!isInteractionLocked}
          dragging={!isInteractionLocked}
          doubleClickZoom={!isInteractionLocked}
          keyboard={!isInteractionLocked}
          whenCreated={(mapInstance) => {
            mapRef.current = mapInstance;
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position="bottomright" />

          {origin?.lat && origin?.lon && (
            <CircleMarker
              center={[origin.lat, origin.lon]}
              radius={9}
              pathOptions={{ color: "#2563eb", fillColor: "#bfdbfe", fillOpacity: 0.9, weight: 3 }}
            >
              <Popup>
                <strong>Start</strong>
                <br />
                {currentOriginLabel}
              </Popup>
            </CircleMarker>
          )}

          {selectedPlace?.lat && selectedPlace?.lon && (
            <CircleMarker
              center={[selectedPlace.lat, selectedPlace.lon]}
              radius={10}
              pathOptions={{ color: "#16a34a", fillColor: "#bbf7d0", fillOpacity: 0.85, weight: 3 }}
            />
          )}

          {filteredPlaces.map((place) => {
            const coordinates = place.coordinates;
            if (!coordinates) return null;
            return (
              <Marker
                key={place.id}
                position={coordinates}
                eventHandlers={{
                  click: () => handleSelectPlace(place),
                }}
              >
                <Popup>
                  <strong>{place.name}</strong>
                  <br />
                  {place.location}
                  <br />
                  Accessibility: {place.rating?.toFixed(1) ?? "N/A"}
                  <br />
                  <button
                    type="button"
                    className="popup-link"
                    onClick={() => {
                      handleSelectPlace(place);
                      setIsModalOpen(true);
                    }}
                  >
                    Review this place
                  </button>
                </Popup>
              </Marker>
            );
          })}

          {activeRoute?.polyline?.length >= 2 && (
            <Polyline
              positions={activeRoute.polyline}
              pathOptions={{ color: "#2563eb", weight: 6, opacity: 0.85 }}
            />
          )}
        </MapContainer>
      </div>

      <img className="corner-logo" src={logo} alt="Accessible Travel Finder" />

      {showRouteBanner && (
        <div className={`route-banner ${routingError ? "route-banner--error" : ""}`}>
          <div className="route-banner__title">
            {routingError
              ? "Route unavailable"
              : isRouting
              ? "Calculating accessible route..."
              : `Route to ${selectedPlace?.name ?? "destination"}`}
          </div>
          <div className="route-banner__meta">
            {routingError
              ? routingError
              : isRouting
              ? `From ${currentOriginLabel}`
              : `${formatDistance(activeRoute?.distance)} · ${formatDuration(
                  activeRoute?.duration,
                )}${routeScore !== null ? ` · Accessibility score ${routeScore}` : ""}`}
          </div>
          {!routingError && !isRouting && activeRoute && (
            <>
              <div className="route-banner__note">From {currentOriginLabel}</div>
              {routeFeature && <div className="route-banner__note">{routeFeature}</div>}
              {routeWarning && (
                <div className="route-banner__note route-banner__note--warning">
                  Heads-up: {routeWarning}
                </div>
              )}
            </>
          )}
          {routingError && locationError && (
            <div className="route-banner__note route-banner__note--warning">{locationError}</div>
          )}
        </div>
      )}

      <div className="app-shell">
        <div className={`app-shell__content ${isInteractionLocked ? "is-blocked" : ""}`} {...inertProps}>
          {isAttractionsOpen && (
            <div className="overlay-panel">
              <div className="overlay-header">
                <span className="overlay-title">Top Results</span>
              </div>
              <div className="overlay-panel__body">
                <PlaceList
                  places={filteredPlaces}
                  selectedPlaceId={selectedPlace?.id}
                  onSelect={handleSelectPlace}
                  isLoading={isSearching}
                  statusMessage={combinedStatusMessage}
                />
              </div>
            </div>
          )}

          <button className="fab" onClick={() => setIsModalOpen(true)}>
            + Review
          </button>
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
