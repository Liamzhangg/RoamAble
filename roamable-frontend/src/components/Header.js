import React from 'react';

const Header = ({ currentView, onBack }) => {
  return (
    <header className="app-header">
      <div className="logo">
        <span className="logo-icon">♿</span>
        <span>Roamable</span>
      </div>
      
      {currentView !== 'planner' && (
        <button className="back-button" onClick={onBack}>
          ← Back to Planner
        </button>
      )}
    </header>
  );
};

export default Header;