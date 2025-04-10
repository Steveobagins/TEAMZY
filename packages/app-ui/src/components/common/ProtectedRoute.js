import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material'; // For loading indicator

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, initialLoadDone, user } = useAuth();
  const location = useLocation();

  // *** UNCOMMENTED LOGGING ***
  console.log(`ProtectedRoute (${location.pathname}): Evaluating... initialLoadDone: ${initialLoadDone}, isAuthenticated: ${isAuthenticated}`);

  // Centered loading spinner while checking auth status
  const CenteredLoader = () => (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
    >
      <CircularProgress />
    </Box>
  );

  // 1. Wait for the initial authentication check to complete
  if (!initialLoadDone) {
    // *** UNCOMMENTED LOGGING ***
    console.log(`ProtectedRoute (${location.pathname}): Waiting for initial load...`);
    return <CenteredLoader />; // Show loading indicator while checking auth
  }

  // 2. If initial check is done and user is not authenticated, redirect to login
  if (!isAuthenticated) {
    // *** UNCOMMENTED LOGGING ***
    console.log(`ProtectedRoute (${location.pathname}): NOT Authenticated. Redirecting to /login.`);
    // Pass the current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. (Optional) Role-based access control
  // Check if allowedRoles array is provided and if the user's role is included
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.primary_role; // Assuming role is stored in user object like this
    // *** UNCOMMENTED LOGGING ***
    console.log(`ProtectedRoute (${location.pathname}): Checking roles. User role: ${userRole}, Allowed: ${allowedRoles.join(', ')}`);
    if (!userRole || !allowedRoles.includes(userRole)) {
        console.warn(`ProtectedRoute (${location.pathname}): User role '${userRole}' NOT in allowed roles. Redirecting.`);
        // Redirect to an unauthorized page or dashboard/home page might be better
        return <Navigate to="/" replace />; // Or <Navigate to="/unauthorized" replace />;
    }
     // *** UNCOMMENTED LOGGING ***
     console.log(`ProtectedRoute (${location.pathname}): Role check PASSED.`);
  }

  // 4. If authenticated (and authorized, if roles checked), render the child component
  // *** UNCOMMENTED LOGGING ***
  console.log(`ProtectedRoute (${location.pathname}): Authenticated & Authorized. Rendering children.`);
  return children;
};

export default ProtectedRoute;