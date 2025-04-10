// Canvas: packages/club-admin-ui/src/contexts/AuthContext.js
// Updated login function to set loading state correctly

import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api'; // Ensure path is correct: ../services/api

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('teamzy_token'));
    const [loading, setLoading] = useState(true); // Covers initial token check AND /me fetch
    const [initialLoadDone, setInitialLoadDone] = useState(false); // To prevent flash of wrong UI
    const [error, setError] = useState(null); // Optional: Add error state

    const fetchUser = useCallback(async (currentToken) => {
        if (!currentToken) {
             console.log("AuthContext: No token, skipping user fetch.");
             setUser(null);
             return null;
        }
        console.log("AuthContext: Token found, attempting to fetch user...");
        try {
            const response = await api.get('/auth/me');
            console.log("AuthContext: /me response data:", JSON.stringify(response.data, null, 2));
            setUser(response.data);
            console.log("AuthContext: User state set for:", response.data.email);
            return response.data;
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message || "Failed to fetch user";
            console.error("AuthContext: Failed to fetch user.", errorMsg);
            setError(errorMsg); // Set error state
            localStorage.removeItem('teamzy_token');
            setToken(null);
            setUser(null);
            return null;
        }
    }, []);

    const logout = useCallback(() => {
        console.log("AuthContext: Logging out user (clearing state).");
        localStorage.removeItem('teamzy_token');
        setUser(null);
        setToken(null);
        setError(null); // Clear errors on logout
    }, []);

    useEffect(() => {
        console.log("AuthContext: Running effect to check auth state...");
        let isMounted = true; // Flag to prevent state update on unmounted component
        setLoading(true);
        setError(null); // Clear previous errors on check

        fetchUser(token)
          .catch((err) => {
              // Error is handled within fetchUser, logging here is optional
              console.error("AuthContext: Error caught during initial fetchUser effect:", err)
          })
          .finally(() => {
              if (isMounted) {
                  setLoading(false);
                  setInitialLoadDone(true);
                  console.log("AuthContext: Initial auth check complete.");
              }
          });

        const handleAuthError = () => {
            if (isMounted) {
                console.warn("AuthContext: Received 401 auth error event. Logging out (state only).");
                logout();
            }
        };
        window.addEventListener('auth-error-401', handleAuthError);

        return () => {
             isMounted = false; // Set flag on cleanup
             window.removeEventListener('auth-error-401', handleAuthError);
        };

    }, [token, fetchUser, logout]); // Dependencies are correct

    const login = useCallback(async (email, password) => {
        setLoading(true); // <-- Set loading TRUE before API call
        setError(null); // Clear previous errors
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token: newToken, user: loggedInUser } = response.data;

            localStorage.setItem('teamzy_token', newToken);
            setUser(loggedInUser); // Update user state
            setToken(newToken);   // Update token state (this triggers the useEffect)
            console.log("AuthContext: Login successful, user/token state set for:", loggedInUser.email);
            // Loading will be set to false by the useEffect after fetchUser confirms token
            return { success: true, user: loggedInUser };
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message || "Login failed";
            console.error("AuthContext: Login failed:", errorMsg);
            localStorage.removeItem('teamzy_token'); // Ensure cleanup on failure
            setUser(null);
            setToken(null);
            setError(errorMsg); // Set error state
            setLoading(false); // <-- Set loading FALSE only on error during login itself
            throw new Error(errorMsg); // Re-throw for the UI
        }
    }, []); // Dependencies: empty is correct as it doesn't depend on external state/props

    const acceptInvite = useCallback(async (inviteToken, firstName, lastName, password) => {
        setLoading(true); // Set loading true
        setError(null);
        try {
            const response = await api.post(`/auth/accept-invite/${inviteToken}`, { firstName, lastName, password });
            const { token: newToken, user: activatedUser } = response.data;

            localStorage.setItem('teamzy_token', newToken);
            setUser(activatedUser);
            setToken(newToken); // Triggers useEffect -> fetchUser -> setLoading(false)
            console.log("AuthContext: Invite accepted successfully for:", activatedUser.email);
            // Loading set to false via useEffect
            return { success: true, user: activatedUser };
        } catch (error) {
             const errorMsg = error.response?.data?.message || error.message || "Accepting invite failed";
            console.error("AuthContext: Accept invite failed:", errorMsg);
            localStorage.removeItem('teamzy_token');
            setUser(null);
            setToken(null);
            setError(errorMsg);
            setLoading(false); // Set loading false on error
            throw new Error(errorMsg);
        }
    }, []); // Dependencies: empty is correct

    const value = useMemo(() => ({
        user,
        token,
        isAuthenticated: !!user,
        loading,
        initialLoadDone,
        error, // Expose error state
        login,
        logout,
        acceptInvite,
        refetchUser: () => { // Wrap refetch in a function to control loading
            setLoading(true);
            fetchUser(token).finally(() => setLoading(false));
        }
    }), [user, token, loading, initialLoadDone, error, login, logout, acceptInvite, fetchUser]); // Include all memoized values and error

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined || context === null) {
        console.error("useAuth hook called outside of AuthProvider context!");
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};