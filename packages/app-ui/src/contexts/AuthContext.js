// packages/app-ui/src/contexts/AuthContext.js
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from 'react';
import api from '../services/api';

// Simple logger
const log = {
    info: console.log,
    warn: console.warn,
    error: console.error,
    debug: console.log,
};

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem('authToken');
    log.debug('AuthContext Init: Token from localStorage:', storedToken ? 'exists' : null);
    return storedToken;
  });
  const [authCheckLoading, setAuthCheckLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const debugSetUser = useCallback((newUser) => {
      log.debug('AuthContext: debugSetUser called with:', newUser ? 'User Object' : null, newUser);
      setUser(newUser);
  }, []);


  const handleSetToken = useCallback((newToken) => {
    log.debug('AuthContext: handleSetToken called with:', newToken ? 'a token' : null);
    const currentTokenInState = token;
    if (newToken !== currentTokenInState) {
        if (newToken) {
            localStorage.setItem('authToken', newToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        } else {
            localStorage.removeItem('authToken');
            delete api.defaults.headers.common['Authorization'];
        }
        setToken(newToken);
        log.debug('AuthContext: Token state updated.');
    } else {
        log.debug('AuthContext: Token state unchanged, skipping update.');
    }
  }, [token]);

  const fetchCurrentUser = useCallback(async (currentToken) => {
      log.debug(`AuthContext: fetchCurrentUser START. Token: ${currentToken ? 'exists' : null}`);
      if (!currentToken) {
          log.debug('AuthContext: fetchCurrentUser - No token, ensuring user is null.');
          if (user !== null) debugSetUser(null);
          setAuthCheckLoading(false);
          if (!initialLoadDone) setInitialLoadDone(true);
          log.debug('AuthContext: fetchCurrentUser END (no token). Returning null.');
          return null;
      }

      api.defaults.headers.common['Authorization'] = `Bearer ${currentToken}`;
      // Don't set loading true here if called from login, login already set it?
      // setAuthCheckLoading(true); // Maybe only set this in the useEffect?

      let fetchedUserData = null;

      try {
          log.debug('AuthContext: fetchCurrentUser - Attempting api.get(/auth/me)...');
          const response = await api.get('/auth/me');
          log.debug("AuthContext fetchCurrentUser: /me Raw Response Data:", JSON.stringify(response.data, null, 2));

          // Check if response.data IS the user object (has essential fields)
          if (response && response.data && response.data.userId) { // Check for userId
              log.info('AuthContext: fetchCurrentUser - /auth/me SUCCESS. User data received.', response.data);
              // Set the user state with the received data
              debugSetUser(response.data);
              fetchedUserData = response.data;
          } else {
              log.error('AuthContext: fetchCurrentUser - /auth/me SUCCESS but response missing valid user data.', response.data);
              // If /me fails to return a user even with a token, the token is invalid/user deleted
              handleSetToken(null); // Clear the invalid token
              if (user !== null) debugSetUser(null);
          }
      } catch (error) {
          log.error('AuthContext: fetchCurrentUser - /me FAILED. Error:', error.response?.data || error.message);
          // If /me fails (e.g., 401), clear the invalid token
          handleSetToken(null);
          if (user !== null) debugSetUser(null);
      } finally {
          // Maybe don't set loading/initialDone here if called from login?
          // setAuthCheckLoading(false);
          // if (!initialLoadDone) {
          //     log.debug('AuthContext: fetchCurrentUser - Setting initialLoadDone = true');
          //     setInitialLoadDone(true);
          // }
          log.debug(`AuthContext: fetchCurrentUser END. Returning: ${fetchedUserData ? 'User Object' : null}`);
          return fetchedUserData; // Return the data or null
      }
  }, [debugSetUser, handleSetToken, initialLoadDone, user]);


  useEffect(() => {
    log.debug('AuthContext: Initial mount effect running.');
    const currentToken = localStorage.getItem('authToken');
    if (currentToken && !token) {
        log.debug('AuthContext: Syncing token state from localStorage.');
        handleSetToken(currentToken); // Set token state
        // Don't call fetchCurrentUser here, let the state update trigger it if needed
    } else if (currentToken && user === null) {
         // If token exists but user doesn't, try fetching
         log.debug('AuthContext: Token exists on mount, user null, fetching user.');
         setAuthCheckLoading(true); // Set loading before fetch
         fetchCurrentUser(currentToken).finally(() => {
             setAuthCheckLoading(false);
             setInitialLoadDone(true);
         });
    } else {
         // No token or user already loaded
         setAuthCheckLoading(false);
         setInitialLoadDone(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount


  // Login function - ADDED LOGGING
  const login = useCallback(async (email, password) => {
    setActionLoading(true);
    log.info('AuthContext: login function started.');
    try {
      // --- Step 1: Call /auth/login ---
      const response = await api.post('/auth/login', { email, password });

      // --- Step 2: Log Response ---
      log.info("AuthContext login: API call successful. Full Response:", JSON.stringify(response, null, 2));
      log.info("AuthContext login: Response Status:", response.status);
      log.info("AuthContext login: Response Data:", JSON.stringify(response.data, null, 2));

      // Step 3: Check data and destructure
      if (!response.data || typeof response.data !== 'object') {
          log.error("AuthContext login: API returned success status but no response data object.");
          throw new Error('Authentication succeeded, but received invalid data from server.');
      }
      const newToken = response.data.token ?? null;
      const loginUserResponse = response.data.user ?? null; // User object from LOGIN response

      log.info("AuthContext login: Destructured Token:", newToken ? '[TOKEN RECEIVED]' : '[NO TOKEN]');
      log.info("AuthContext login: Destructured User from Login:", JSON.stringify(loginUserResponse, null, 2));

      if (!newToken || !loginUserResponse) {
          log.error("AuthContext login: API response missing token or user object.");
          throw new Error('Authentication succeeded, but failed to retrieve session token or user data.');
      }

      // --- Step 4: Set Token & User State DIRECTLY from login response ---
      // No need to call fetchCurrentUser again immediately if login returns user data
      handleSetToken(newToken);
      debugSetUser(loginUserResponse); // Use the user data from the login response

      setActionLoading(false);
      log.info('AuthContext: Login process complete, user state set from login response.');
      return { success: true, user: loginUserResponse }; // Return the user data received

      // --- OLD LOGIC (Removed): ---
      // handleSetToken(response.data.token);
      // const fetchedUser = await fetchCurrentUser(response.data.token); // Don't call this again here
      // setActionLoading(false);
      // if (fetchedUser) { ... } else { throw ... }
      // --- END OLD LOGIC ---

    } catch (error) {
      log.error('AuthContext: /auth/login failed:', error.response?.data?.message || error.message);
      handleSetToken(null);
      if (user !== null) debugSetUser(null);
      setActionLoading(false);
      // Rethrow specific message if available, otherwise the generic error
      throw new Error(error.response?.data?.message || error.message || 'Login failed.');
    }
  }, [handleSetToken, debugSetUser, user]); // Removed fetchCurrentUser from deps


  const logout = useCallback(async () => {
    log.info('AuthContext: logout function started.');
    setActionLoading(true);
    // Optional: Call backend logout endpoint if it exists (e.g., for token invalidation)
    // try { await api.post('/auth/logout'); } catch (e) { log.warn("Logout API call failed:", e); }
    handleSetToken(null); // Clears token state & local storage
    if (user !== null) debugSetUser(null); // Clear user state
    setActionLoading(false);
    log.info('AuthContext: logout function finished.');
    // Maybe redirect here or let component handle redirect
  }, [handleSetToken, debugSetUser, user]);


  const contextValue = useMemo(() => {
    const isAuthenticated = !!user && !!token;
    log.debug(`AuthContext: useMemo calculating value. user: ${!!user}, token: ${!!token}, isAuthenticated: ${isAuthenticated}, loading: ${authCheckLoading || actionLoading}, initialLoadDone: ${initialLoadDone}`);
    return {
      user,
      token,
      isAuthenticated,
      // Combine loading states for simplicity for consumers? Or keep separate?
      isLoading: authCheckLoading || actionLoading,
      authCheckLoading, // Expose for fine-grained control if needed
      actionLoading,   // Expose for fine-grained control if needed
      initialLoadDone,
      login,
      logout,
    };
  }, [user, token, authCheckLoading, actionLoading, initialLoadDone, login, logout]);

  log.debug("AuthContext: Rendering Provider component.");

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};