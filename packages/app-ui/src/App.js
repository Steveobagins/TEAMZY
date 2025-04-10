import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

// Import layouts and routing components
import MainLayout from './layouts/MainLayout'; // Import the actual layout
import ProtectedRoute from './components/common/ProtectedRoute';

// Lazy load pages for better initial load performance
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
// Add other lazy-loaded pages here as needed
// const ProfilePage = lazy(() => import('./pages/ProfilePage'));
// const SchedulePage = lazy(() => import('./pages/SchedulePage'));
// const TeamsPage = lazy(() => import('./pages/TeamsPage'));

function App() {

  // Centered loading spinner for Suspense fallback
  const CenteredLoader = () => (
      <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="calc(100vh - 56px)" // Adjust height assuming AppBar + BottomNav might be visible
      >
          <CircularProgress />
      </Box>
  );

  return (
    <Suspense fallback={<CenteredLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        {/* Add other public routes like /verify-email, /set-password etc. */}


        {/* Protected Routes - Rendered within MainLayout */}
        <Route
          path="/"
          element={
            <ProtectedRoute> {/* Protect the layout and its children */}
              <MainLayout />
            </ProtectedRoute>
          }
        >
            {/* Index route for the root path "/" */}
            <Route index element={<DashboardPage />} />

            {/* Add other nested routes relative to "/" */}
            {/* Example: /profile */}
            {/* <Route path="profile" element={<ProfilePage />} /> */}

            {/* Example: /schedule */}
            {/* <Route path="schedule" element={<SchedulePage />} /> */}

            {/* Example: /teams */}
            {/* <Route path="teams" element={<TeamsPage />} /> */}

            {/* Add more child routes as needed */}

        </Route> {/* End of protected routes */}


        {/* Catch-all Route for Not Found */}
        {/* Render NotFoundPage without the MainLayout */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />

      </Routes>
    </Suspense>
  );
}

export default App;