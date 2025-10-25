import { useMemo, useState } from "react";
import "./App.css";
import FiltersBar from "./ui_ux_design/filters_bar.jsx";
import SearchBox from "./ui_ux_design/search_box.jsx";
import AddReviewModal from "./ui_ux_design/add_review_modal.jsx";
import NavBar from "./ui_ux_design/nav_bar.jsx";
import PlaceList from "./ui_ux_design/place_list.jsx";
import LoginScreen from "./ui_ux_design/login_screen.jsx";

const PLACES = [
  {
    id: "p-1",
    name: "Harbourfront Centre",
    location: "Toronto, Canada",
    rating: 4.8,
    reviews: 214,
    tags: ["Step-free", "Assistive audio"],
    features: {
      wheelchair: true,
      braille: false,
      assistiveAudio: true,
    },
    description:
      "Waterfront arts hub with elevators, tactile markers, and staff trained in accessible guest support.",
    photo:
      "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=400&q=60",
  },
  {
    id: "p-2",
    name: "Sunflower Cafe",
    location: "Lisbon, Portugal",
    rating: 4.6,
    reviews: 97,
    tags: ["Braille menu", "Quiet hours"],
    features: {
      wheelchair: true,
      braille: true,
      assistiveAudio: false,
    },
    description:
      "Neighborhood cafe with wider aisles, braille menus, and quiet hours for sensory-sensitive guests.",
    photo:
      "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=400&q=60",
  },
  {
    id: "p-3",
    name: "Aurora Gallery",
    location: "Reykjavík, Iceland",
    rating: 4.9,
    reviews: 162,
    tags: ["Guided touch tour", "Audio guides"],
    features: {
      wheelchair: true,
      braille: true,
      assistiveAudio: true,
    },
    description:
      "Modern art space highlighting Nordic artists with guided touch tours and descriptive audio.",
    photo:
      "https://images.unsplash.com/photo-1465310477141-6fb93167a273?auto=format&fit=crop&w=400&q=60",
  },
  {
    id: "p-4",
    name: "Skyline Rooftop",
    location: "Chicago, USA",
    rating: 4.4,
    reviews: 58,
    tags: ["Reserved seating", "Wide pathways"],
    features: {
      wheelchair: true,
      braille: false,
      assistiveAudio: false,
    },
    description:
      "Elevator-accessible rooftop with movable seating, textured wayfinding, and staff assistance.",
    photo:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=60",
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
  const [selectedPlace, setSelectedPlace] = useState(PLACES[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submittedReviews, setSubmittedReviews] = useState([]);

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleSubmitReview = (data) => {
    setSubmittedReviews((previous) => [
      ...previous,
      {
        ...data,
        id: `${Date.now()}`,
        createdAt: new Date().toISOString(),
      },
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

  return (
    <div className="app-shell">
      <NavBar />
      <header className="hero">
        <div>
          <p className="eyebrow">Plan inclusive journeys</p>
          <h1>Find spots that welcome every traveler</h1>
          <p className="hero__subtitle">
            Curated accessibility notes, crowdsourced in real-time by locals and
            travelers who care.
          </p>
          <div className="hero__actions">
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              Share a review
            </button>
            <button className="btn btn-ghost">Explore cities</button>
          </div>
        </div>
        <div className="hero__stats">
          <div>
            <strong>2,400+</strong>
            <span>verified listings</span>
          </div>
          <div>
            <strong>38</strong>
            <span>cities mapped</span>
          </div>
          <div>
            <strong>{submittedReviews.length}</strong>
            <span>new reviews today</span>
          </div>
        </div>
      </header>

      <main className="layout">
        <section className="map-panel" id="map">
          <div className="map-panel__placeholder">
            <p>Map view coming soon.</p>
            {selectedPlace && (
              <div className="selected-place">
                <p className="eyebrow">Pinned</p>
                <h3>{selectedPlace.name}</h3>
                <p className="selected-place__location">
                  {selectedPlace.location}
                </p>
                <p>{selectedPlace.description}</p>
                <div className="selected-place__tags">
                  {selectedPlace.tags?.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(true)}
                >
                  Review this place
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="list-panel" id="list">
          <SearchBox initialQuery={searchQuery} onSearch={handleSearch} />
          <FiltersBar filters={filters} onChange={setFilters} />
          <PlaceList
            places={filteredPlaces}
            selectedPlaceId={selectedPlace?.id}
            onSelect={setSelectedPlace}
          />
          <button
            className="btn btn-outline full-width"
            onClick={() => setIsModalOpen(true)}
          >
            + Add a community review
          </button>
        </section>
      </main>

      <LoginScreen />

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
