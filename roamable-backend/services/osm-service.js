// OpenStreetMap Data Service with Enhanced Location Details
const axios = require('axios');

class OSMService {
  constructor() {
    this.overpassURL = 'https://overpass-api.de/api/interpreter';
    this.nominatimURL = 'https://nominatim.openstreetmap.org';
    this.osrmURL = 'http://router.project-osrm.org';
    this.userAgent = 'RoamableApp/2.0 (contact@example.com)';
  }

  // Get detailed location information including accessibility and simulated reviews
  async getLocationDetails(locationName) {
    try {
      console.log(`🔍 Getting detailed information for: "${locationName}"`);
      
      // First, geocode the location
      const geocodedLocation = await this.geocodeLocation(locationName);
      if (!geocodedLocation) return null;

      // Enhance with accessibility data
      const accessibilityData = await this.getRealAccessibilityData(geocodedLocation.coordinates);
      
      // Get additional OSM details
      const osmDetails = await this.getOSMLocationDetails(geocodedLocation.coordinates);
      
      // Generate simulated reviews
      const reviews = this.generateSimulatedReviews(geocodedLocation.type, accessibilityData.score);

      // Calculate star rating (1-5)
      const starRating = this.calculateStarRating(accessibilityData.score);

      const locationDetails = {
        ...geocodedLocation,
        accessibility: {
          ...accessibilityData,
          starRating: starRating,
          description: this.getAccessibilityDescription(starRating)
        },
        details: osmDetails,
        reviews: reviews,
        timestamp: new Date().toISOString()
      };

      console.log(`✅ Enhanced location: ${locationDetails.name} (${starRating}★)`);
      return locationDetails;
    } catch (error) {
      console.error('Error getting location details:', error);
      return null;
    }
  }

  // Geocode a single location
  async geocodeLocation(locationName) {
    try {
      const response = await axios.get(`${this.nominatimURL}/search`, {
        params: {
          q: locationName + ', Toronto, Canada',
          format: 'json',
          addressdetails: 1,
          limit: 1
        },
        headers: {
          'User-Agent': this.userAgent
        },
        timeout: 10000
      });

      if (response.data && response.data.length > 0) {
        const result = response.data[0];
        return {
          id: result.place_id,
          name: result.display_name.split(',')[0] || locationName,
          fullName: result.display_name,
          type: this.determineTypeFromGeocoding(result),
          coordinates: {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon)
          },
          address: {
            street: result.address?.road,
            city: result.address?.city || 'Toronto',
            country: result.address?.country
          },
          source: 'nominatim'
        };
      }
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  // Get additional OSM details for a location
  async getOSMLocationDetails(coordinates) {
    try {
      const query = `
        [out:json][timeout:25];
        (
          node(around:50,${coordinates.lat},${coordinates.lng});
          way(around:50,${coordinates.lat},${coordinates.lng});
        );
        out body;
      `;

      const response = await axios.post(this.overpassURL, `data=${encodeURIComponent(query)}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 15000
      });

      if (response.data?.elements?.length > 0) {
        return this.processOSMElements(response.data.elements);
      }
      return {};
    } catch (error) {
      console.error('OSM details error:', error);
      return {};
    }
  }

  // Process OSM elements for additional details
  processOSMElements(elements) {
    const details = {
      amenities: [],
      features: [],
      tags: {}
    };

    elements.forEach(element => {
      if (element.tags) {
        // Collect amenities
        if (element.tags.amenity) {
          details.amenities.push(element.tags.amenity);
        }
        
        // Collect notable features
        if (element.tags.tourism) details.features.push(element.tags.tourism);
        if (element.tags.shop) details.features.push(element.tags.shop);
        if (element.tags.leisure) details.features.push(element.tags.leisure);
        
        // Store important tags
        Object.keys(element.tags).forEach(key => {
          if (['name', 'opening_hours', 'website', 'phone'].includes(key)) {
            details.tags[key] = element.tags[key];
          }
        });
      }
    });

    // Remove duplicates
    details.amenities = [...new Set(details.amenities)];
    details.features = [...new Set(details.features)];

    return details;
  }

  // GET REAL OSM ACCESSIBILITY DATA
  async getRealAccessibilityData(coordinates) {
    try {
      console.log(`♿ Fetching real accessibility data for ${coordinates.lat}, ${coordinates.lng}`);
      
      const query = this.buildAccessibilityQuery(coordinates);
      const response = await axios.post(this.overpassURL, `data=${encodeURIComponent(query)}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 15000
      });

      if (response.data && response.data.elements && response.data.elements.length > 0) {
        return this.processAccessibilityElements(response.data.elements);
      } else {
        console.log('📭 No accessibility data found in OSM');
        return this.getDefaultAccessibilityData();
      }
    } catch (error) {
      console.error('Error fetching accessibility data:', error.message);
      return this.getDefaultAccessibilityData();
    }
  }

  // Build Overpass query for accessibility data around coordinates
  buildAccessibilityQuery(coordinates) {
    const radius = 100; // meters around the point
    return `
      [out:json][timeout:25];
      (
        // Get nodes with accessibility tags
        node(around:${radius},${coordinates.lat},${coordinates.lng})["wheelchair"];
        node(around:${radius},${coordinates.lat},${coordinates.lng})["entrance"];
        node(around:${radius},${coordinates.lat},${coordinates.lng})["ramp"];
        node(around:${radius},${coordinates.lat},${coordinates.lng})["elevator"];
        
        // Get ways with accessibility tags  
        way(around:${radius},${coordinates.lat},${coordinates.lng})["wheelchair"];
        way(around:${radius},${coordinates.lat},${coordinates.lng})["entrance"];
        way(around:${radius},${coordinates.lat},${coordinates.lng})["ramp"];
        way(around:${radius},${coordinates.lat},${coordinates.lng})["elevator"];
      );
      out body;
    `;
  }

  // Process OSM elements to extract accessibility data
  processAccessibilityElements(elements) {
    let wheelchair = 'unknown';
    let entrance = 'unknown';
    let ramp = 'unknown';
    let elevator = 'unknown';
    let surface = 'unknown';

    // Collect all tags from nearby elements
    elements.forEach(element => {
      if (element.tags) {
        if (element.tags.wheelchair && wheelchair === 'unknown') {
          wheelchair = element.tags.wheelchair; // yes/no/limited
        }
        if (element.tags.entrance && entrance === 'unknown') {
          entrance = element.tags.entrance; // main/yes/no
        }
        if (element.tags.ramp && ramp === 'unknown') {
          ramp = element.tags.ramp; // yes/no
        }
        if (element.tags.elevator && elevator === 'unknown') {
          elevator = element.tags.elevator; // yes/no
        }
        if (element.tags.surface && surface === 'unknown') {
          surface = element.tags.surface; // paved/unpaved/etc
        }
      }
    });

    const score = this.calculateRealAccessibilityScore({
      wheelchair, entrance, ramp, elevator, surface
    });

    return {
      wheelchair,
      entrance,
      ramp,
      elevator,
      surface,
      score,
      dataSource: 'osm',
      elementsFound: elements.length
    };
  }

  // Calculate REAL accessibility score based on OSM tags
  calculateRealAccessibilityScore(tags) {
    let score = 50; // Base score

    // Wheelchair accessibility (most important)
    if (tags.wheelchair === 'yes') score += 30;
    else if (tags.wheelchair === 'limited') score += 15;
    else if (tags.wheelchair === 'no') score -= 25;

    // Ramp availability
    if (tags.ramp === 'yes') score += 15;
    else if (tags.ramp === 'no') score -= 10;

    // Elevator availability
    if (tags.elevator === 'yes') score += 10;
    else if (tags.elevator === 'no') score -= 5;

    // Entrance type
    if (tags.entrance === 'main') score += 5;
    else if (tags.entrance === 'no') score -= 10;

    // Surface quality
    if (tags.surface === 'paved') score += 10;
    else if (tags.surface === 'unpaved') score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  // Calculate star rating (1-5) from accessibility score
  calculateStarRating(accessibilityScore) {
    if (accessibilityScore >= 90) return 5;
    if (accessibilityScore >= 70) return 4;
    if (accessibilityScore >= 50) return 3;
    if (accessibilityScore >= 30) return 2;
    return 1;
  }

  // Get accessibility description based on star rating
  getAccessibilityDescription(starRating) {
    const descriptions = {
      5: 'Excellent accessibility - Fully wheelchair accessible with all amenities',
      4: 'Good accessibility - Mostly accessible with minor limitations',
      3: 'Moderate accessibility - Some accessibility features available',
      2: 'Limited accessibility - Significant barriers present',
      1: 'Poor accessibility - Not recommended for mobility devices'
    };
    return descriptions[starRating] || 'Accessibility information not available';
  }

  // Generate simulated reviews based on location type and accessibility
  generateSimulatedReviews(locationType, accessibilityScore) {
    const baseReviews = [
      {
        id: 1,
        author: 'Accessibility Advocate',
        rating: Math.ceil(accessibilityScore / 20),
        comment: this.generateReviewComment(locationType, accessibilityScore, 'positive'),
        date: '2024-01-15',
        verified: true
      },
      {
        id: 2,
        author: 'Local Guide',
        rating: Math.max(1, Math.ceil(accessibilityScore / 25)),
        comment: this.generateReviewComment(locationType, accessibilityScore, 'neutral'),
        date: '2024-01-10',
        verified: true
      },
      {
        id: 3,
        author: 'First-time Visitor',
        rating: Math.max(1, Math.ceil(accessibilityScore / 20)),
        comment: this.generateReviewComment(locationType, accessibilityScore, 'mixed'),
        date: '2024-01-05',
        verified: false
      }
    ];

    return baseReviews;
  }

  // Generate review comments based on accessibility score
  generateReviewComment(locationType, score, tone) {
    const positiveComments = [
      `Great ${locationType}! Very accessible and well-maintained.`,
      `Excellent accessibility features. Would recommend to anyone with mobility needs.`,
      `One of the most accessible ${locationType}s I've visited in Toronto.`,
      `Staff were very helpful and the facilities were completely accessible.`
    ];

    const neutralComments = [
      `Decent ${locationType}. Has basic accessibility features.`,
      `Average accessibility. Could use some improvements but manageable.`,
      `Standard ${locationType} with reasonable access.`,
      `Good overall, though some areas could be more accessible.`
    ];

    const mixedComments = [
      `The ${locationType} has some accessibility but could be better.`,
      `Mixed experience - some parts accessible, others challenging.`,
      `They're trying with accessibility but still room for improvement.`,
      `Okay for short visits, might be challenging for extended stays.`
    ];

    if (score >= 70) return positiveComments[Math.floor(Math.random() * positiveComments.length)];
    if (score >= 40) return neutralComments[Math.floor(Math.random() * neutralComments.length)];
    return mixedComments[Math.floor(Math.random() * mixedComments.length)];
  }

  // Default when no OSM data found
  getDefaultAccessibilityData() {
    return {
      wheelchair: 'unknown',
      entrance: 'unknown',
      ramp: 'unknown',
      elevator: 'unknown',
      surface: 'unknown',
      score: 50,
      dataSource: 'default',
      elementsFound: 0
    };
  }

  // Get real route using OSRM
  async getRoute(waypoints, transportationMode) {
    try {
      console.log(`🗺️ Getting real route for ${waypoints.length} waypoints via ${transportationMode}`);
      
      const profile = this.getOSRMProfile(transportationMode);
      const coordinates = waypoints.map(point => `${point.lng},${point.lat}`).join(';');

      const response = await axios.get(`${this.osrmURL}/route/v1/${profile}/${coordinates}`, {
        params: {
          overview: 'full',
          geometries: 'geojson',
          steps: true
        },
        timeout: 15000
      });

      if (response.data && response.data.routes && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        return this.processOSRMResponse(route, waypoints, transportationMode);
      } else {
        throw new Error('No route found');
      }
    } catch (error) {
      console.error('OSRM routing error:', error.message);
      return this.getFallbackRoute(waypoints, transportationMode);
    }
  }

  getOSRMProfile(transportationMode) {
    const profiles = {
      'walking': 'foot',
      'wheelchair': 'foot',
      'cycling': 'bike',
      'transit': 'foot',
      'car': 'car'
    };
    return profiles[transportationMode] || 'foot';
  }

  processOSRMResponse(osrmRoute, waypoints, transportationMode) {
    const distance = (osrmRoute.distance / 1000).toFixed(1);
    const duration = Math.round(osrmRoute.duration / 60);

    return {
      distance: parseFloat(distance),
      duration: duration,
      geometry: osrmRoute.geometry,
      legs: osrmRoute.legs,
      waypoints: waypoints,
      transportationMode: transportationMode,
      hasRealRouting: true
    };
  }

  getFallbackRoute(waypoints, transportationMode) {
    let totalDistance = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      totalDistance += this.calculateDistance(waypoints[i], waypoints[i + 1]);
    }

    const speed = this.getSpeedForMode(transportationMode);
    const duration = Math.round((totalDistance / speed) * 60);

    return {
      distance: parseFloat(totalDistance.toFixed(1)),
      duration: duration,
      geometry: null,
      legs: [],
      waypoints: waypoints,
      transportationMode: transportationMode,
      hasRealRouting: false
    };
  }

  calculateDistance(point1, point2) {
    const R = 6371;
    const dLat = this.deg2rad(point2.lat - point1.lat);
    const dLon = this.deg2rad(point2.lng - point1.lng);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(point1.lat)) * Math.cos(this.deg2rad(point2.lat)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  getSpeedForMode(transportationMode) {
    const speeds = {
      'walking': 5,
      'wheelchair': 3,
      'cycling': 15,
      'transit': 12,
      'car': 25
    };
    return speeds[transportationMode] || 5;
  }

  determineTypeFromGeocoding(result) {
    if (result.type) return result.type;
    if (result.category) return result.category;
    if (result.address) {
      if (result.address.tourism) return result.address.tourism;
      if (result.address.amenity) return result.address.amenity;
      if (result.address.shop) return result.address.shop;
    }
    return 'location';
  }

  // Legacy method
  async getTorontoAccessibilityData() {
    return [];
  }
}

module.exports = new OSMService();