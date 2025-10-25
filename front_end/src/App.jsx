import { useState } from "react";
import "./App.css";
import "leaflet/dist/leaflet.css";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Fix Leaflet marker icons (required in Vite)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url),
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url),
});

function App() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filters, setFilters] = useState({ wheelchair: false });

  const dummyPlaces = [
    { id: 1, name: "CN Tower", lat: 43.6426, lng: -79.3871, accessibility: 4 },
    { id: 2, name: "Royal Ontario Museum", lat: 43.6677, lng: -79.3948, accessibility: 5 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center p-6">
      {/* Header */}
      <header className="w-full max-w-5xl mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">Accessible Travel Finder</h1>
        <p className="text-gray-600">
          Find and review accessible places around the world 🌍
        </p>
      </header>

      {/* Map Container */}
      <div className="w-full max-w-5xl rounded-2xl shadow-md h-[500px] overflow-hidden mb-6">
        <MapContainer
          center={[43.6532, -79.3832]}
          zoom={13}
          scrollWheelZoom
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {dummyPlaces.map((place) => (
            <Marker key={place.id} position={[place.lat, place.lng]}>
              <Popup>
                <h3 className="font-semibold">{place.name}</h3>
                <p>Accessibility: {place.accessibility}/5</p>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Add Review Button */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="mt-4 px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
      >
        ➕ Add Review
      </button>
    </div>
  );
}

export default App;
