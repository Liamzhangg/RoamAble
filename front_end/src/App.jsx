import logo from "./assets/logo.png";
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from "react-leaflet";
import L from "leaflet";
import { signOut } from "firebase/auth";

import AddReviewModal from "./ui_ux_design/add_review_modal.jsx";
import NavBar from "./ui_ux_design/nav_bar.jsx";
import PlaceList from "./ui_ux_design/place_list.jsx";
import LoginScreen from "./ui_ux_design/login_screen.jsx";
import FiltersModal from "./ui_ux_design/filters_modal.jsx";
import { auth } from "./ui_ux_design/lib/firebase.js";

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

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedPlace, setSelectedPlace] = useState(PLACES[0] ?? null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittedReviews, setSubmittedReviews] = useState([]);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAttractionsOpen, setIsAttractionsOpen] = useState(true);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [user, setUser] = useState(null);
  const isInteractionLocked = isModalOpen || isFiltersOpen || isLoginOpen;
  const inertProps = isInteractionLocked ? { "aria-hidden": "true", inert: "" } : {};

  const handleSearch = (query) => setSearchQuery(query);

  const handleSubmitReview = (data) => {
    setSubmittedReviews((previous) => [
      ...previous,
      { ...data, id: `${Date.now()}`, createdAt: new Date().toISOString() },
    ]);
  };

  const filteredPlaces = useMemo(() => {
    return PLACES.filter((place) => {
      const matchesQuery =
        !searchQuery ||
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

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
    const stillVisible = filteredPlaces.some((p) => p.id === selectedPlace?.id);
    if (!stillVisible) setSelectedPlace(filteredPlaces[0]);
  }, [filteredPlaces, selectedPlace]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } finally {
      setUser(null);
    }
  };

  return (
    <>
      {/* Top nav overlay */}
      <NavBar
        onSignIn={() => setIsLoginOpen(true)}
        onSignOut={handleSignOut}
        onSearch={handleSearch}
        onOpenFilters={() => setIsFiltersOpen((previous) => !previous)}
        onToggleAttractions={() => setIsAttractionsOpen((v) => !v)}
        searchQuery={searchQuery}
        user={user}
        isDisabled={isInteractionLocked}
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
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ZoomControl position="bottomright" />
          {filteredPlaces.map((place) => (
            <Marker
              key={place.id}
              position={[place.lat, place.lng]}
              eventHandlers={{ click: () => setSelectedPlace(place) }}
            >
              <Popup>
                <strong>{place.name}</strong>
                <br />
                Accessibility: {place.rating}/5
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Overlay widgets */}
      <img className="corner-logo" src={logo} alt="Accessible Travel Finder" />
      <div className="app-shell">
        <div className={`app-shell__content ${isInteractionLocked ? "is-blocked" : ""}`} {...inertProps}>
          {/* Places list (right side panel) */}
          {isAttractionsOpen && (
            <div className="overlay-panel">
              <div className="overlay-header">
                <span className="overlay-title">Top Results</span>
              </div>
              <div className="overlay-panel__body">
                <PlaceList
                  places={filteredPlaces}
                  selectedPlaceId={selectedPlace?.id}
                  onSelect={setSelectedPlace}
                />
              </div>
            </div>
          )}

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
