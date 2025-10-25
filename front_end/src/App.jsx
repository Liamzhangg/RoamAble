import { useState } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css"; // if you’ll include maps later
import FiltersBar from "./components/FiltersBar";
import SearchBox from "./components/SearchBox";
import AddReviewModal from "./components/AddReviewModal";

function App() {
  const [count, setCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({ wheelchair: false });

  const handleSearch = (query) => {
    console.log("Searching for:", query);
  };

  const handleSubmitReview = (data) => {
    console.log("Submitting review:", data);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center p-6">
      {/* Header */}
      <header className="w-full max-w-5xl mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">Accessible Travel Finder</h1>
        <p className="text-gray-600">
          Find and review accessible places around the world 🌍
        </p>
      </header>

      {/* Search + Filters */}
      <div className="w-full max-w-3xl flex flex-col gap-4 mb-6">
        <SearchBox onSearch={handleSearch} />
        <FiltersBar filters={filters} setFilters={setFilters} />
      </div>

      {/* Placeholder for map */}
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-md h-[400px] flex items-center justify-center">
        <p className="text-gray-400">🗺️ Map will appear here</p>
      </div>

      {/* Button to open Add Review Modal */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="mt-6 px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
      >
        ➕ Add Review
      </button>

      {/* Example Counter from original Vite template */}
      <div className="mt-8 text-center">
        <button
          onClick={() => setCount((count) => count + 1)}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Count is {count}
        </button>
        <p className="mt-2 text-sm text-gray-500">
          Edit <code>src/App.jsx</code> and save to test HMR.
        </p>
      </div>

      {/* Add Review Modal */}
      <AddReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmitReview}
      />
    </div>
  );
}

export default App;
