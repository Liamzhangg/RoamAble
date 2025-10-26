import React, { useState } from 'react';
import { searchLocation, getRoute } from '../services/api';

const RoutePlanner = ({ onRouteGenerated, onLocationDetails, onLoading, onError }) => {
  const [formData, setFormData] = useState({
    currentLocation: '',
    destination: '',
    disabilityType: 'wheelchair',
    transportationMode: 'walking'
  });

  const [currentLocationType, setCurrentLocationType] = useState('address');
  const [searchQuery, setSearchQuery] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUseCurrentLocation = () => {
    onLoading(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setFormData(prev => ({
            ...prev,
            currentLocation: coords
          }));
          setCurrentLocationType('gps');
          onLoading(false);
        },
        (error) => {
          onError('Unable to get your current location. Please enter an address instead.');
          onLoading(false);
        }
      );
    } else {
      onError('Geolocation is not supported by your browser.');
      onLoading(false);
    }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) {
      onError('Please enter a location to search');
      return;
    }

    onLoading(true);
    try {
      const details = await searchLocation(searchQuery);
      if (details) {
        onLocationDetails(details);
      } else {
        onError('Location not found. Please try a different search term.');
      }
    } catch (error) {
      onError('Failed to search location. Please try again.');
    } finally {
      onLoading(false);
    }
  };

  const handleGenerateRoute = async (e) => {
    e.preventDefault();
    
    if (!formData.currentLocation || !formData.destination) {
      onError('Please provide both current location and destination');
      return;
    }

    onLoading(true);
    try {
      const routeData = await getRoute(formData);
      onRouteGenerated(routeData);
    } catch (error) {
      onError('Failed to generate route. Please try again.');
    } finally {
      onLoading(false);
    }
  };

  return (
    <div className="card">
      <h1>Plan Your Accessible Route</h1>
      <p className="subtitle">Find the best route tailored to your accessibility needs</p>

      {/* Location Search */}
      <div className="form-group">
        <label className="form-label">Search Location Details</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Enter a location name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <button 
            className="btn btn-secondary"
            onClick={handleSearchLocation}
          >
            Search
          </button>
        </div>
      </div>

      <form onSubmit={handleGenerateRoute}>
        {/* Current Location */}
        <div className="form-group">
          <label className="form-label">Current Location</label>
          {currentLocationType === 'address' ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Enter your address or location..."
                value={typeof formData.currentLocation === 'string' ? formData.currentLocation : ''}
                onChange={(e) => handleInputChange('currentLocation', e.target.value)}
                style={{ flex: 1 }}
              />
              <button 
                type="button"
                className="btn btn-secondary"
                onClick={handleUseCurrentLocation}
              >
                Use GPS
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ flex: 1, padding: '0.75rem', background: '#f7fafc', borderRadius: '8px' }}>
                📍 Using your current location
              </span>
              <button 
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setCurrentLocationType('address');
                  handleInputChange('currentLocation', '');
                }}
              >
                Change
              </button>
            </div>
          )}
        </div>

        {/* Destination */}
        <div className="form-group">
          <label className="form-label">Destination</label>
          <input
            type="text"
            className="form-input"
            placeholder="Where do you want to go?"
            value={formData.destination}
            onChange={(e) => handleInputChange('destination', e.target.value)}
            required
          />
        </div>

        {/* Disability Type */}
        <div className="form-group">
          <label className="form-label">Accessibility Needs</label>
          <select
            className="form-select"
            value={formData.disabilityType}
            onChange={(e) => handleInputChange('disabilityType', e.target.value)}
          >
            <option value="wheelchair">Wheelchair User</option>
            <option value="visual_impairment">Visual Impairment</option>
            <option value="mobility_impairment">Mobility Impairment</option>
            <option value="hearing_impairment">Hearing Impairment</option>
          </select>
        </div>

        {/* Transportation Mode */}
        <div className="form-group">
          <label className="form-label">Transportation Mode</label>
          <select
            className="form-select"
            value={formData.transportationMode}
            onChange={(e) => handleInputChange('transportationMode', e.target.value)}
          >
            <option value="walking">Walking</option>
            <option value="wheelchair">Wheelchair</option>
            <option value="transit">Public Transit</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary btn-full">
          🧭 Generate Accessible Route
        </button>
      </form>
    </div>
  );
};

export default RoutePlanner;