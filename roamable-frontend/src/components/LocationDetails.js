import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import AccessibilityBadge from './AccessibilityBadge';

const LocationDetails = ({ locationData, onBack }) => {
  const renderStars = (rating) => {
    return (
      <div className="star-rating">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''}`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const LocationMap = ({ coordinates }) => (
    <div style={{ height: '200px', borderRadius: '8px', overflow: 'hidden', marginTop: '1rem' }}>
      <MapContainer
        center={[coordinates.lat, coordinates.lng]}
        zoom={15}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={[coordinates.lat, coordinates.lng]}>
          <Popup>
            <strong>{locationData.name}</strong><br />
            {locationData.fullName}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1>{locationData.name}</h1>
          <p>{locationData.fullName}</p>
        </div>
        <AccessibilityBadge 
          score={locationData.accessibility.score} 
          rating={locationData.accessibility.starRating}
        />
      </div>

      {/* Location Map */}
      <div className="form-group">
        <h3>📍 Location Map</h3>
        <LocationMap coordinates={locationData.coordinates} />
      </div>

      {/* Basic Information */}
      <div className="form-group">
        <h3>ℹ️ Location Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div>
            <strong>Type:</strong> {locationData.type}
          </div>
          <div>
            <strong>City:</strong> {locationData.address?.city || 'Toronto'}
          </div>
          <div>
            <strong>Country:</strong> {locationData.address?.country || 'Canada'}
          </div>
        </div>
      </div>

      {/* Accessibility Details */}
      <div className="form-group">
        <h3>♿ Accessibility Details</h3>
        <div style={{ background: '#f0fff4', padding: '1.5rem', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <strong>Wheelchair:</strong> {locationData.accessibility.wheelchair || 'Unknown'}
            </div>
            <div>
              <strong>Ramp:</strong> {locationData.accessibility.ramp || 'Unknown'}
            </div>
            <div>
              <strong>Elevator:</strong> {locationData.accessibility.elevator || 'Unknown'}
            </div>
            <div>
              <strong>Entrance:</strong> {locationData.accessibility.entrance || 'Unknown'}
            </div>
          </div>
          <p>
            <strong>Description:</strong> {locationData.accessibility.description}
          </p>
          <p style={{ fontSize: '0.9rem', color: '#718096', marginTop: '0.5rem' }}>
            Data source: {locationData.accessibility.dataSource === 'osm' ? 'OpenStreetMap' : 'Estimated'}
          </p>
        </div>
      </div>

      {/* Amenities and Features */}
      {(locationData.details?.amenities?.length > 0 || locationData.details?.features?.length > 0) && (
        <div className="form-group">
          <h3>🏢 Amenities & Features</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {locationData.details.amenities?.map((amenity, index) => (
              <span key={index} className="feature-tag">
                {amenity}
              </span>
            ))}
            {locationData.details.features?.map((feature, index) => (
              <span key={index} className="feature-tag">
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      {locationData.reviews && locationData.reviews.length > 0 && (
        <div className="form-group">
          <h3>💬 User Reviews</h3>
          <div className="reviews-list">
            {locationData.reviews.map((review) => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <div className="review-author">{review.author}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {renderStars(review.rating)}
                    {review.verified && <span style={{ color: '#38a169' }}>✓ Verified</span>}
                  </div>
                </div>
                <p>{review.comment}</p>
                <div className="review-date">{review.date}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button className="btn btn-primary btn-full" onClick={onBack}>
        Back to Route Planner
      </button>
    </div>
  );
};

export default LocationDetails;