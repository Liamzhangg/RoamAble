import { useMemo, useState } from "react";
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
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [submittedReviews, setSubmittedReviews] = useState([]);

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

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

  // 🔹 Show LoginScreen first
  if (!isLoggedIn) {
    return <LoginScreen onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="app-shell">
      <NavBar />
      <header className="hero text-center">
        <h1 className="text-3xl font-bold mb-2">Find Accessible Locations</h1>
        <p className="text-gray-600">
          Discover places with real accessibility reviews 🌍
        </p>
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
    </div>
  );
}

export default App;
