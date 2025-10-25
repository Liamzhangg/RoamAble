import { useEffect, useMemo, useState } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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
  const [isPanelOpen, setIsPanelOpen] = useState(true);

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

  return (
    <>
      {/* Top nav overlay */}
      <div className="nav-overlay">
        <NavBar onSignIn={() => setIsLoginOpen(true)} />
      </div>

      {/* Full-screen map background layer */}
      <div className="map-bg" aria-hidden={false}>
        <MapContainer
          center={[43.6532, -79.3832]}
          zoom={13}
          scrollWheelZoom={!isModalOpen}
          dragging={!isModalOpen}
          doubleClickZoom={!isModalOpen}
          keyboard={!isModalOpen}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
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
      <div className="app-shell">
        {/* Search card (top-left) */}
        <div className="overlay-card overlay-search">
          <SearchBox initialQuery={searchQuery} onSearch={handleSearch} />
        </div>

        {/* Filters card (top-right) */}
        <div className="overlay-card overlay-filters">
          <FiltersBar filters={filters} onChange={setFilters} />
        </div>

        {/* Places list (left column) */}
        <div className={`overlay-panel ${isPanelOpen ? "" : "is-collapsed"}`}>
          <div className="overlay-header">
            <span className="overlay-title">Explore Accessible Places</span>
            <button className="btn btn-ghost" onClick={() => setIsPanelOpen((v) => !v)}>
              {isPanelOpen ? "Hide" : "Show"}
            </button>
          </div>
          <div className="overlay-panel__body">
            <PlaceList
              places={filteredPlaces}
              selectedPlaceId={selectedPlace?.id}
              onSelect={setSelectedPlace}
            />
          </div>
        </div>

        <button className="fab" onClick={() => setIsModalOpen(true)}>+ Review</button>

        <AddReviewModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmitReview}
          placeName={selectedPlace?.name}
        />
        {isLoginOpen && <LoginScreen onClose={() => setIsLoginOpen(false)} />}
      </div>
    </>
  );
}

export default App;
