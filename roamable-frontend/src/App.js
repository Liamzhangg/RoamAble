import React, { useState } from 'react';
import Header from './components/Header';
import RoutePlanner from './components/RoutePlanner';
import RouteResults from './components/RouteResults';
import LocationDetails from './components/LocationDetails';
import './styles/App.css';

function App() {
  const [currentView, setCurrentView] = useState('planner');
  const [routeData, setRouteData] = useState(null);
  const [locationDetails, setLocationDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRouteGenerated = (data) => {
    setRouteData(data);
    setCurrentView('results');
    setError(null);
  };

  const handleLocationDetails = (details) => {
    setLocationDetails(details);
    setCurrentView('details');
    setError(null);
  };

  const handleBackToPlanner = () => {
    setCurrentView('planner');
    setRouteData(null);
    setLocationDetails(null);
    setError(null);
  };

  return (
    <div className="App">
      <Header 
        currentView={currentView} 
        onBack={handleBackToPlanner}
      />
      
      <main className="main-content">
        {error && (
          <div className="error-banner">
            {error}
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p>Finding your accessible route...</p>
          </div>
        )}

        {currentView === 'planner' && (
          <RoutePlanner
            onRouteGenerated={handleRouteGenerated}
            onLocationDetails={handleLocationDetails}
            onLoading={setLoading}
            onError={setError}
          />
        )}

        {currentView === 'results' && routeData && (
          <RouteResults 
            routeData={routeData}
            onBack={handleBackToPlanner}
          />
        )}

        {currentView === 'details' && locationDetails && (
          <LocationDetails
            locationData={locationDetails}
            onBack={handleBackToPlanner}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>♿ Roamable - Making the world more accessible, one route at a time</p>
      </footer>
    </div>
  );
}

export default App;