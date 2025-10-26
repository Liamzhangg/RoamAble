import React from 'react';

const AccessibilityBadge = ({ score, rating }) => {
  const getBadgeClass = (score) => {
    if (score >= 70) return 'badge-high';
    if (score >= 40) return 'badge-medium';
    return 'badge-low';
  };

  const getRatingText = (rating) => {
    const texts = {
      5: 'Excellent',
      4: 'Good', 
      3: 'Moderate',
      2: 'Limited',
      1: 'Poor'
    };
    return texts[rating] || 'Unknown';
  };

  return (
    <div className={`accessibility-badge ${getBadgeClass(score)}`}>
      <span>♿</span>
      <span>{getRatingText(rating)}</span>
      <span>({score}/100)</span>
    </div>
  );
};

export default AccessibilityBadge;