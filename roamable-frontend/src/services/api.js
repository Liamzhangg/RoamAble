import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Health check
export const checkHealth = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    throw new Error('Backend server is not responding');
  }
};

// Search location details
export const searchLocation = async (locationName) => {
  try {
    const response = await api.post('/location/details', { locationName });
    return response.data.data;
  } catch (error) {
    console.error('Location search error:', error);
    throw error;
  }
};

// Generate route
export const getRoute = async (routeData) => {
  try {
    const response = await api.post('/routes/navigate', routeData);
    return response.data;
  } catch (error) {
    console.error('Route generation error:', error);
    throw error;
  }
};

export default api;