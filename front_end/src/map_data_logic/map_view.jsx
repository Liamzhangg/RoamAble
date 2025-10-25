import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { usePlaces } from "./use_places";

// Fix Leaflet icon paths for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url),
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url),
});

export default function MapView({ onSelectPlace }) {
  const { places } = usePlaces();

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <MapContainer center={[43.6532, -79.3832]} zoom={13} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {places.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]}>
            <Popup>
              <h3>{p.name}</h3>
              <p>Accessibility Rating: {p.accessibility ?? "N/A"}</p>
              <button
                onClick={() => onSelectPlace(p)}
                style={{ color: "blue", textDecoration: "underline" }}
              >
                Add Review
              </button>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
