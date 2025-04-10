// packages/club-admin-ui/src/services/api.js
import axios from 'axios';

// Determine the base URL from environment variables, default for local dev
const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- Request Interceptor ---
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('teamzy_token'); // Make sure key 'teamzy_token' is correct
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    // console.log(`Sending request to ${config.url} with config:`, config);
    return config;
  },
  (error) => {
    console.error("Error in request interceptor:", error);
    return Promise.reject(error);
  }
);

// --- Response Interceptor ---
api.interceptors.response.use(
  (response) => {
    // console.log('Received response from:', response.config.url);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(`Error Response Status: ${error.response.status} from ${error.config.url}`);
      console.error('Error Response Data:', error.response.data);
      if (error.response.status === 401) {
        console.warn('API returned 401 Unauthorized. Token might be invalid or expired.');
        window.dispatchEvent(new CustomEvent('auth-error-401'));
      }
      if (error.response.status === 403) {
        console.warn('API returned 403 Forbidden. User lacks permission for this action.');
      }
    } else if (error.request) {
      console.error('Network Error or No Response:', error.request);
    } else {
      console.error('Axios Error during request setup:', error.message);
    }
    return Promise.reject(error);
  }
);

// --- API Functions ---

// Function to get users within the current club
export const getClubUsers = async (params = {}) => {
    // Expected params: { page: number (1-based), pageSize: number, sort?: string, order?: 'asc' | 'desc', filter?: string }
    console.log("[api.js] Calling GET /club/users. Received params:", params); // Log params received from caller

    // --- FIX: REMOVED the redundant page + 1 adjustment ---
    // The caller (UserManagementPage) should provide the correct 1-based page index directly.
    // We just pass the received params along.
    const apiParams = { ...params };

    console.log("[api.js] Sending API request with params:", apiParams); // Log params being sent

    const response = await api.get('/club/users', { params: apiParams });

    console.log("[api.js] Response from GET /club/users:", response.data);
    return response.data;
};

// Function to invite a user to the current club
export const inviteClubUser = async (userData) => {
    // Expected userData: { email: string, role: 'COACH' | 'ATHLETE' | 'PARENT' }
    console.log("Calling POST /auth/invite with data:", userData);
    // Assuming '/auth/invite' is the correct endpoint for inviting to the *current* admin's club
    const response = await api.post('/auth/invite', userData);
    console.log("Response from POST /auth/invite:", response.data);
    return response.data;
};

// Add functions for Edit/Delete/Resend Invite later when backend is ready
// export const updateClubUser = async (userId, userData) => { ... };
// export const deleteClubUser = async (userId) => { ... };
// export const resendClubUserInvite = async (userId) => { ... };


export default api; // Export the configured axios instance