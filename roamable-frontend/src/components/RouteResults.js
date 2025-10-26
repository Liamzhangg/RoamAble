import React from 'react';
import AccessibilityBadge from './AccessibilityBadge';
import RouteMap from './RouteMap';

const RouteResults = ({ routeData, onBack }) => {
  const { route, destination, userContext } = routeData.data;

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getDisabilityLabel = (type) => {
    const labels = {
      'wheelchair': 'Wheelchair Accessible',
      'visual_impairment': 'Visually Accessible',
      'mobility_impairment': 'Mobility Optimized',
      'hearing_impairment': 'Visually Guided'
    };
    return labels[type] || 'Accessible';
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1>Your Accessible Route</h1>
          <p>to {destination.name}</p>
        </div>
        <AccessibilityBadge 
          score={route.accessibility.score} 
          rating={route.accessibility.rating}
        />
      </div>

      {/* Interactive Map */}
      <div className="form-group">
        <h3>🗺️ Route Map</h3>
        <RouteMap route={route} destination={destination} />
        <div style={{ fontSize: '0.9rem', color: '#666', textAlign: 'center', marginTop: '0.5rem' }}>
          <strong>A:</strong> Start Point • <strong>B:</strong> Destination • Line color shows accessibility rating
        </div>
      </div>

      {/* Route Summary */}
      <div className="route-summary">
        <div className="summary-item">
          <div className="summary-value">{route.distance} km</div>
          <div className="summary-label">Distance</div>
        </div>
        <div className="summary-item">
          <div className="summary-value">{formatTime(route.duration)}</div>
          <div className="summary-label">Estimated Time</div>
        </div>
        <div className="summary-item">
          <div className="summary-value">{getDisabilityLabel(userContext.disabilityType)}</div>
          <div className="summary-label">Route Type</div>
        </div>
        <div className="summary-item">
          <div className="summary-value">{userContext.transportationMode}</div>
          <div className="summary-label">Transport</div>
        </div>
      </div>

      {/* Accessibility Features */}
      <div className="form-group">
        <h3>♿ Accessibility Features</h3>
        <div className="accessibility-features">
          {route.accessibility.features.map((feature, index) => (
            <span key={index} className="feature-tag">
              {feature}
            </span>
          ))}
        </div>
      </div>

      {/* Route Instructions */}
      <div className="form-group">
        <h3>📋 Route Guidance</h3>
        <div style={{ background: '#f7fafc', padding: '1rem', borderRadius: '8px' }}>
          {route.instructions.map((instruction, index) => (
            <div key={index} style={{ marginBottom: '0.5rem', padding: '0.5rem' }}>
              • {instruction}
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {route.accessibility.warnings.length > 0 && (
        <div className="form-group">
          <h3>⚠️ Important Notes</h3>
          <div style={{ background: '#fed7d7', padding: '1rem', borderRadius: '8px', color: '#742a2a' }}>
            {route.accessibility.warnings.map((warning, index) => (
              <div key={index} style={{ marginBottom: '0.5rem' }}>
                • {warning}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Destination Info */}
      <div className="form-group">
        <h3>📍 Destination Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <strong>Name:</strong> {destination.name}
          </div>
          <div>
            <strong>Type:</strong> {destination.type}
          </div>
          <div>
            <strong>Address:</strong> {destination.address?.city || 'Toronto'}
          </div>
          <div>
            <strong>Accessibility:</strong> {destination.accessibility?.description}
          </div>
        </div>
      </div>

      <button className="btn btn-primary btn-full" onClick={onBack}>
        Plan Another Route
      </button>
    </div>
  );
};

export default RouteResults;