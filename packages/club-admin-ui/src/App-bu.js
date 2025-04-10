// Canvas: packages/club-admin-ui/src/App.js
import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute'; // Adjusted import

// Layouts
const MainLayout = lazy(() => import('./layouts/MainLayout')); // Lazy load main layout

// --- Public Pages ---
const LoginPage = lazy(() => import('./pages/LoginPage'));
const AcceptInvitePage = lazy(() => import('./pages/AcceptInvitePage'));
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
// TODO: Add ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage when implemented

// --- Protected Pages (Lazy Loaded) ---
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TeamManagementPage = lazy(() => import('./pages/TeamManagementPage'));
const EventManagementPage = lazy(() => import('./pages/EventManagementPage'));
const CommunicationPage = lazy(() => import('./pages/CommunicationPage'));
const PerformancePage = lazy(() => import('./pages/PerformancePage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage')); // Invite UI etc.
const ProfilePage = lazy(() => import('./pages/ProfilePage')); // User's own profile

// Loading fallback component
const LoadingFallback = () => <div style={{ padding: '20px', textAlign: 'center' }}>Loading Page...</div>;

// Helper component to handle redirection based on auth status
const AuthRedirector = () => {
    const { isAuthenticated, loading, initialLoadDone } = useAuth();

    if (loading && !initialLoadDone) {
        return <LoadingFallback />; // Show loading only during initial check
    }

    // If authenticated, redirect from root/login to dashboard
    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    // If not authenticated, allow rendering public routes (like login)
    return null; // Let the Routes below handle it
};


function App() {
    return (
        <AuthProvider>
            <Router>
                 <Suspense fallback={<LoadingFallback />}>
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
                        <Route path="/unauthorized" element={<UnauthorizedPage />} />
                        {/* TODO: Add public routes for forgot/reset password, email verification */}

                        {/* Protected Routes within MainLayout */}
                        {/* Apply ProtectedRoute wrapper to the layout route */}
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute roles={['CLUB_ADMIN', 'COACH']}> {/* Roles allowed in Club Admin UI */}
                                    <MainLayout />
                                </ProtectedRoute>
                            }
                        >
                            {/* Index route redirects to dashboard */}
                            <Route index element={<Navigate to="/dashboard" replace />} />

                            {/* Specific pages accessible via Outlet in MainLayout */}
                            <Route path="dashboard" element={<DashboardPage />} />
                            <Route path="teams/*" element={<TeamManagementPage />} /> {/* Use /* for nested routes */}
                            <Route path="events/*" element={<EventManagementPage />} />
                            <Route path="communication" element={<CommunicationPage />} />
                            <Route path="performance" element={<PerformancePage />} />
                            <Route path="payments" element={<PaymentsPage />} />
                            <Route path="settings" element={<SettingsPage />} />
                            <Route path="profile" element={<ProfilePage />} />

                            {/* User Management - restricted to CLUB_ADMIN */}
                            <Route
                                path="users"
                                element={
                                    <ProtectedRoute roles={['CLUB_ADMIN']}>
                                        <UserManagementPage />
                                    </ProtectedRoute>
                                }
                            />

                            {/* --- Add Placeholder Routes for ALL other sections from spec --- */}
                            {/* Example: */}
                            {/* <Route path="reports" element={<div>Reports Placeholder</div>} /> */}
                            {/* <Route path="facilities" element={<div>Facilities Placeholder</div>} /> */}

                            {/* Optional: A nested 404 within the authenticated layout */}
                            {/* <Route path="*" element={<div>Section Not Found</div>} /> */}
                        </Route>

                        {/* Fallback 404 Route (Top Level) */}
                        <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                 </Suspense>
            </Router>
        </AuthProvider>
    );
}
export default App;