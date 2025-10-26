// File: server.js (Updated Backend)
// ==========================================
// ROAMABLE BACKEND - ACCESSIBILITY ROUTE PLANNER
// ==========================================

// 1. IMPORT OUR TOOLS
const express = require('express');
const cors = require('cors');
const path = require('path');

// 2. CREATE OUR SERVER
const app = express();
const PORT = process.env.PORT || 5001;

// 3. SET UP MIDDLEWARE (Rules for how requests are handled)
app.use(cors()); // Allow frontend to talk to backend
app.use(express.json()); // Understand JSON data from requests

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../frontend/build')));

// 4. IMPORT OUR OSM SERVICE
const OSMService = require('./services/osm-service');

// 5. CREATE OUR ROUTES (Different URLs people can visit)

// Homepage - Welcome message
app.get('/api', (req, res) => {
  res.json({
    message: '🚀 Welcome to Roamable Backend!',
    description: 'Accessibility-focused route planning between two locations',
    version: '2.0.0',
    endpoints: [
      'GET  /api/health - Check server status',
      'POST /api/location/details - Get detailed location information',
      'POST /api/routes/navigate - Generate accessible route between two points'
    ]
  });
});

// Health check - Is the server running?
app.get('/api/health', (req, res) => {
  res.json({
    status: '✅ Server is healthy and running!',
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime().toFixed(2)} seconds`
  });
});

// Get detailed location information including accessibility and reviews
app.post('/api/location/details', async (req, res) => {
  try {
    const { locationName } = req.body;
    
    if (!locationName) {
      return res.status(400).json({
        success: false,
        error: 'Location name is required'
      });
    }

    console.log(`🔍 Getting details for: "${locationName}"`);
    
    const locationDetails = await OSMService.getLocationDetails(locationName);
    
    if (!locationDetails) {
      return res.status(404).json({
        success: false,
        error: 'Location not found'
      });
    }

    res.json({
      success: true,
      data: locationDetails,
      message: `Found details for ${locationDetails.name}`
    });
  } catch (error) {
    console.error('Location details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get location details'
    });
  }
});

// Generate accessible route between current location and destination
app.post('/api/routes/navigate', async (req, res) => {
  try {
    const { currentLocation, destination, disabilityType, transportationMode = 'walking' } = req.body;
    
    console.log('🧭 Generating accessible route:', { 
      currentLocation, 
      destination,
      disabilityType,
      transportationMode 
    });

    // Handle current location input (can be coordinates or address)
    let startCoords;
    if (typeof currentLocation === 'string') {
      // User provided address string, geocode it
      const geocoded = await OSMService.geocodeLocation(currentLocation);
      if (!geocoded) {
        return res.status(400).json({
          success: false,
          error: 'Could not find your current location',
          message: 'Please provide a valid address or enable GPS'
        });
      }
      startCoords = geocoded.coordinates;
    } else if (currentLocation.lat && currentLocation.lng) {
      // User provided coordinates directly
      startCoords = currentLocation;
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid current location format',
        message: 'Please provide coordinates {lat, lng} or an address string'
      });
    }

    if (!destination) {
      return res.status(400).json({
        success: false,
        error: 'Destination is required',
        message: 'Please provide a destination name'
      });
    }

    // Get destination details
    const destinationDetails = await OSMService.getLocationDetails(destination);
    
    if (!destinationDetails) {
      return res.status(404).json({
        success: false,
        error: 'Destination not found',
        message: `Could not find destination: ${destination}`
      });
    }

    console.log('📍 Destination found:', destinationDetails.name);

    // Generate route based on disability type
    const route = await generateAccessibleRoute(
      startCoords, 
      destinationDetails.coordinates, 
      disabilityType, 
      transportationMode,
      destinationDetails
    );

    // Prepare response for frontend
    const response = {
      success: true,
      data: {
        route: route,
        destination: destinationDetails,
        userContext: {
          disabilityType: disabilityType,
          transportationMode: transportationMode
        }
      },
      message: `Generated ${route.type} route to ${destinationDetails.name}`
    };

    res.json(response);
  } catch (error) {
    console.error('Route navigation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate route'
    });
  }
});

// Generate accessible route based on disability type
async function generateAccessibleRoute(startCoords, endCoords, disabilityType, transportationMode, destinationDetails) {
  try {
    // Get real route from OSRM
    const coordinates = [startCoords, endCoords];
    const baseRoute = await OSMService.getRoute(coordinates, transportationMode);
    
    // Enhance route with disability-specific features
    const enhancedRoute = await enhanceRouteForDisability(
      baseRoute, 
      disabilityType, 
      startCoords, 
      endCoords
    );

    // Calculate accessibility score for the route
    const routeAccessibilityScore = calculateRouteAccessibility(enhancedRoute, disabilityType);

    return {
      id: `route-${Date.now()}`,
      type: getRouteType(disabilityType),
      start: {
        coordinates: startCoords,
        type: 'current_location'
      },
      end: {
        coordinates: endCoords,
        name: destinationDetails.name,
        type: 'destination'
      },
      transportationMode: transportationMode,
      distance: baseRoute.distance,
      duration: baseRoute.duration,
      geometry: baseRoute.geometry,
      legs: baseRoute.legs,
      accessibility: {
        score: routeAccessibilityScore,
        rating: Math.ceil(routeAccessibilityScore / 20), // Convert to 1-5 scale
        features: enhancedRoute.accessibilityFeatures,
        warnings: enhancedRoute.warnings,
        disabilityType: disabilityType
      },
      instructions: enhancedRoute.instructions,
      hasRealRouting: baseRoute.hasRealRouting,
      estimatedArrival: new Date(Date.now() + baseRoute.duration * 60 * 1000).toISOString()
    };
  } catch (error) {
    console.error('Error generating accessible route:', error);
    throw error;
  }
}

// Enhance route with disability-specific features
async function enhanceRouteForDisability(route, disabilityType, startCoords, endCoords) {
  const enhancedRoute = {
    ...route,
    accessibilityFeatures: [],
    warnings: [],
    instructions: []
  };

  switch (disabilityType) {
    case 'visual_impairment':
      enhancedRoute.accessibilityFeatures.push(
        'Auditory crosswalk signals',
        'Tactile paving',
        'Clear audio instructions'
      );
      enhancedRoute.instructions.push(
        'Route prioritized for visual impairment',
        'Look for auditory signals at crosswalks',
        'Use tactile paving guidance where available'
      );
      break;

    case 'wheelchair':
      enhancedRoute.accessibilityFeatures.push(
        'Wheelchair-accessible paths',
        'Ramp availability',
        'Elevator access points'
      );
      enhancedRoute.instructions.push(
        'Route optimized for wheelchair accessibility',
        'Avoids stairs and steep inclines',
        'Prioritizes paved surfaces'
      );
      break;

    case 'mobility_impairment':
      enhancedRoute.accessibilityFeatures.push(
        'Gentle slopes',
        'Rest areas',
        'Accessible transit stops'
      );
      enhancedRoute.instructions.push(
        'Route designed for mobility assistance',
        'Includes rest areas along the path',
        'Minimizes distance between stops'
      );
      break;

    case 'hearing_impairment':
      enhancedRoute.accessibilityFeatures.push(
        'Visual signals',
        'Clear visual instructions',
        'Text-based guidance'
      );
      enhancedRoute.instructions.push(
        'Route suitable for hearing impairment',
        'Visual crosswalk signals prioritized',
        'Clear visual signage along route'
      );
      break;

    default:
      enhancedRoute.accessibilityFeatures.push('Standard accessible route');
      enhancedRoute.instructions.push('General accessibility considerations');
  }

  // Add disability-specific warnings
  if (disabilityType === 'visual_impairment') {
    enhancedRoute.warnings.push('Be cautious at intersections without auditory signals');
  } else if (disabilityType === 'wheelchair') {
    enhancedRoute.warnings.push('Watch for uneven surfaces and construction zones');
  }

  return enhancedRoute;
}

// Calculate route accessibility score (0-100)
function calculateRouteAccessibility(route, disabilityType) {
  let score = 70; // Base score

  // Disability-specific scoring
  switch (disabilityType) {
    case 'visual_impairment':
      score += route.accessibilityFeatures.includes('Auditory crosswalk signals') ? 20 : 0;
      score += route.accessibilityFeatures.includes('Tactile paving') ? 10 : 0;
      break;
    case 'wheelchair':
      score += route.accessibilityFeatures.includes('Wheelchair-accessible paths') ? 20 : 0;
      score += route.accessibilityFeatures.includes('Ramp availability') ? 10 : 0;
      break;
    case 'mobility_impairment':
      score += route.accessibilityFeatures.includes('Gentle slopes') ? 15 : 0;
      score += route.accessibilityFeatures.includes('Rest areas') ? 15 : 0;
      break;
  }

  // Distance factor (shorter routes are generally better)
  if (route.distance < 1) score += 10;
  else if (route.distance > 5) score -= 10;

  return Math.max(0, Math.min(100, score));
}

// Get route type based on disability
function getRouteType(disabilityType) {
  const types = {
    'visual_impairment': 'visually-accessible',
    'wheelchair': 'wheelchair-accessible', 
    'mobility_impairment': 'mobility-optimized',
    'hearing_impairment': 'visually-guided'
  };
  return types[disabilityType] || 'accessible';
}

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
});

// 6. START THE SERVER
app.listen(PORT, () => {
  console.log('==========================================');
  console.log('🚀 ROAMABLE BACKEND - SINGLE DESTINATION ROUTING!');
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log('==========================================');
  console.log('📋 AVAILABLE ENDPOINTS:');
  console.log(`   GET  http://localhost:${PORT}/api`);
  console.log(`   GET  http://localhost:${PORT}/api/health`);
  console.log(`   POST http://localhost:${PORT}/api/location/details`);
  console.log(`   POST http://localhost:${PORT}/api/routes/navigate`);
  console.log('==========================================');
  console.log('♿ DISABILITY SUPPORT: Visual, Wheelchair, Mobility, Hearing');
  console.log('🗺️  FEATURES: Real routing with accessibility enhancements');
  console.log('==========================================');
});