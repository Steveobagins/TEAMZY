// Canvas: packages/platform-admin-ui/src/services/api.js (And club-admin-ui)
// Corrected: Removed default Content-Type header

import axios from 'axios';

// Use environment variable for base URL, fallback to localhost for development
// Ensure REACT_APP_ prefix matches your setup (e.g., VITE_ for Vite)
const apiBaseUrl = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, ''); // Remove trailing slash

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    // REMOVED 'Content-Type': 'application/json' from default headers.
    // Axios will now set it correctly based on the request data (JSON or FormData).
    'Accept': 'application/json', // We generally expect JSON responses from our API
  },
  timeout: 15000, // Example: 15 second timeout
});

// Request interceptor to add the JWT token from localStorage
api.interceptors.request.use(
  (config) => {
    // Assuming token is stored under 'teamzy_token' key
    const token = localStorage.getItem('teamzy_token');
    if (token) {
      // Set the Authorization header
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // Log headers just before sending (optional debug)
    // console.log('Sending request with headers:', config.headers);
    return config;
  },
  (error) => {
    // Handle request configuration error
    console.error("Axios request config error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling global errors like 401 or network issues
api.interceptors.response.use(
  (response) => {
    // Any status code within the range of 2xx (Success)
    return response;
  },
  (error) => {
    // Any status codes outside the range of 2xx (Error)

    // Handle Network Errors (error.response will be undefined)
    if (!error.response) {
        console.error("API Network Error:", error.message); // e.g., "Network Error", "timeout of 15000ms exceeded"
        // Optionally dispatch a global event or show a generic network error message
        // window.dispatchEvent(new CustomEvent('network-error'));
        // Return a structured error or re-throw
        return Promise.reject({ message: `Network Error: ${error.message}`, isNetworkError: true });
    }

    // Handle specific HTTP error statuses
    console.error(`API Response Error: ${error.response.status} for ${error.config.url}`, error.response.data);

    if (error.response.status === 401) {
       console.warn("API Auth Error: 401 Unauthorized detected by interceptor.");
       // Option 1: Dispatch custom event for AuthContext to handle logout
       window.dispatchEvent(new CustomEvent('auth-error-401'));
       // Option 2: Direct logout (less ideal)
       // localStorage.removeItem('teamzy_token');
       // window.location.href = '/login';
    }

    // Reject with the error so components can catch it if needed
    // Pass along the response data if available, otherwise the error object
    return Promise.reject(error.response?.data || error);
  }
);

export default api;