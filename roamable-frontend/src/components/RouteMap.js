import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icons
const createCustomIcon = (color, iconChar) => {
  return L.divIcon({
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${iconChar}</div>`,
    className: 'custom-marker',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// Map controller component to handle view adjustments
const MapController = ({ route }) => {
  const map = useMap();
  
  useEffect(() => {
    if (route && route.geometry && route.geometry.coordinates) {
      const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
      const bounds = L.latLngBounds(coordinates);
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [route, map]);

  return null;
};

const RouteMap = ({ route, destination }) => {
  const mapRef = useRef();

  if (!route || !route.geometry) {
    return (
      <div className="map-container" style={{ height: '400px', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
        <p>Route map not available</p>
      </div>
    );
  }

  // Convert GeoJSON coordinates to Leaflet format [lat, lng]
  const routeCoordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

  // Start and end points
  const startPoint = [route.start.coordinates.lat, route.start.coordinates.lng];
  const endPoint = [route.end.coordinates.lat, route.end.coordinates.lng];

  // Route line style based on accessibility rating
  const getRouteStyle = (rating) => {
    const styles = {
      5: { color: '#10b981', weight: 6, opacity: 0.8 }, // Green - Excellent
      4: { color: '#3b82f6', weight: 5, opacity: 0.8 }, // Blue - Good
      3: { color: '#f59e0b', weight: 5, opacity: 0.7 }, // Yellow - Moderate
      2: { color: '#f97316', weight: 4, opacity: 0.7 }, // Orange - Limited
      1: { color: '#ef4444', weight: 4, opacity: 0.6 }, // Red - Poor
    };
    return styles[rating] || styles[3];
  };

  const routeStyle = getRouteStyle(route.accessibility.rating);

  return (
    <div className="map-container" style={{ height: '400px', borderRadius: '8px', overflow: 'hidden', marginBottom: '1rem' }}>
      <MapContainer
        center={[43.6532, -79.3832]} // Toronto coordinates
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Route path */}
        <Polyline
          positions={routeCoordinates}
          color={routeStyle.color}
          weight={routeStyle.weight}
          opacity={routeStyle.opacity}
        />
        
        {/* Start marker */}
        <Marker 
          position={startPoint}
          icon={createCustomIcon('#10b981', 'A')}
        >
          <Popup>
            <div>
              <strong>Start Point</strong><br />
              Your current location
            </div>
          </Popup>
        </Marker>
        
        {/* End marker */}
        <Marker 
          position={endPoint}
          icon={createCustomIcon('#ef4444', 'B')}
        >
          <Popup>
            <div>
              <strong>Destination</strong><br />
              {destination.name}<br />
              <em>Accessibility: {route.accessibility.rating}★</em>
            </div>
          </Popup>
        </Marker>

        <MapController route={route} />
      </MapContainer>
      
      {/* Map legend */}
      <div style={{ 
        position: 'absolute', 
        bottom: '10px', 
        left: '10px', 
        background: 'white', 
        padding: '10px', 
        borderRadius: '5px', 
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        zIndex: 1000 
      }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Route Accessibility</div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
          <div style={{ width: '20px', height: '3px', background: '#10b981', marginRight: '5px' }}></div>
          <span>Excellent (5★)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
          <div style={{ width: '20px', height: '3px', background: '#3b82f6', marginRight: '5px' }}></div>
          <span>Good (4★)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
          <div style={{ width: '20px', height: '3px', background: '#f59e0b', marginRight: '5px' }}></div>
          <span>Moderate (3★)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2px' }}>
          <div style={{ width: '20px', height: '3px', background: '#f97316', marginRight: '5px' }}></div>
          <span>Limited (2★)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '20px', height: '3px', background: '#ef4444', marginRight: '5px' }}></div>
          <span>Poor (1★)</span>
        </div>
      </div>
    </div>
  );
};

export default RouteMap;