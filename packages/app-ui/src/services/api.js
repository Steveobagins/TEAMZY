import axios from 'axios';

// Get the API base URL from environment variables
// Ensure you have REACT_APP_API_BASE_URL defined in your .env file for app-ui
// Example: REACT_APP_API_BASE_URL=http://localhost:3001/api
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api'; // Fallback to relative /api

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Consider adding withCredentials if you were using session cookies instead of JWT Bearer token
  // withCredentials: true,
});

// Optional: Add interceptors for request or response handling
// For example, automatically adding the auth token from localStorage or context
// (AuthContext already handles setting the header on login/load, but an interceptor
// could be an alternative or backup)

// Example Request Interceptor (alternative to setting header in AuthContext)
/*
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
*/

// Example Response Interceptor (e.g., handling 401 Unauthorized globally)
/*
api.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    if (error.response && error.response.status === 401) {
      // Handle 401 Unauthorized (e.g., token expired)
      console.error("API Service: Unauthorized access (401). Redirecting to login.");
      // Clear token, user state (might need access to AuthContext or dispatch an event)
      localStorage.removeItem('authToken');
      // Redirect to login page - Use window.location for simplicity here,
      // or implement a more sophisticated solution involving router history
      // outside of React components.
      if (window.location.pathname !== '/login') {
         window.location.href = '/login'; // Force reload to clear state
      }
    }
    return Promise.reject(error);
  }
);
*/


export default api;