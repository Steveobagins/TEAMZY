// Canvas: packages/club-admin-ui/src/components/ProtectedRoute.js
// Reverted loading check, simplified role check assuming loading guard is sufficient

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Ensure path is correct

// MUI component for loading indicator (optional, replace div if desired)
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';

function ProtectedRoute({ children, roles }) {
    const location = useLocation();
    const auth = useAuth();

    // --- Use the combined loading check ---
    // Wait if context isn't ready OR auth state is loading OR initial check isn't done
    if (!auth || auth.loading || !auth.initialLoadDone) {
        // Render a proper loading indicator
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    // Now we know loading is false and initialLoadDone is true
    const { isAuthenticated, user } = auth;

    // --- Authentication Check ---
    if (!isAuthenticated || !user) {
        // This should now correctly happen only when truly logged out or if initial fetch failed
        console.log("ProtectedRoute: Not Authenticated or user data missing. Redirecting to login.");
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // --- Role Check ---
    // This check now runs only when we know user object exists and loading is complete
    if (roles && Array.isArray(roles) && roles.length > 0) {
        // Check if the existing user has the required role
        if (!user.primary_role || !roles.includes(user.primary_role)) {
             console.warn(`ProtectedRoute: Role Mismatch! User Role: ${user.primary_role}, Required: [${roles.join(', ')}]. Redirecting to /unauthorized`);
             return <Navigate to="/unauthorized" replace />;
        }
        // console.log("ProtectedRoute: Role Check Passed."); // Optional log
    }

    // console.log("ProtectedRoute: Allowing Access."); // Optional log
    // If authenticated and authorized (or no roles specified), render the child components
    return children;
}

export default ProtectedRoute;