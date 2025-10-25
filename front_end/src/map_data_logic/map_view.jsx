import { useEffect, useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const DEFAULT_CENTER = [43.6532, -79.3832];

// Fix Leaflet icon paths for Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: new URL(
    "leaflet/dist/images/marker-icon-2x.png",
    import.meta.url
  ),
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url),
});

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

function MapView({
  places = [],
  selectedPlaceId,
  onSelectPlace,
  onAddReview,
  zoom = 12,
}) {
  const selectedPlace = places.find((place) => place.id === selectedPlaceId);

  const mapCenter = useMemo(() => {
    if (selectedPlace?.coordinates) {
      return selectedPlace.coordinates;
    }

    if (places.length && places[0].coordinates) {
      return places[0].coordinates;
    }

    return DEFAULT_CENTER;
  }, [places, selectedPlace]);

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      scrollWheelZoom
      className="leaflet-map"
    >
      <MapRecenter center={mapCenter} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((place) =>
        place.coordinates ? (
          <Marker key={place.id} position={place.coordinates}>
            <Popup>
              <strong>{place.name}</strong>
              <p>{place.location}</p>
              <p>Rating: {place.rating?.toFixed(1) ?? "N/A"}</p>
              <button
                type="button"
                className="popup-link"
                onClick={() => {
                  onSelectPlace?.(place);
                  onAddReview?.();
                }}
              >
                Review this place
              </button>
            </Popup>
          </Marker>
        ) : null
      )}
    </MapContainer>
  );
}

export default MapView;
