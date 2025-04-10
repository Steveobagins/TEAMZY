// Canvas: packages/platform-admin-ui/src/App.js (Add SetPasswordPage route)

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';

// --- Page Imports ---
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ClubManagementPage from './pages/ClubManagementPage';
import PlatformSettingsPage from './pages/PlatformSettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage from './pages/NotFoundPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import SetPasswordPage from './pages/SetPasswordPage'; // <<<--- 1. IMPORT SetPasswordPage

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    {/* --- Public Routes (No Layout Wrapper) --- */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/unauthorized" element={<UnauthorizedPage />} />
                    <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
                    {/* Add the public set password route here */}
                    <Route path="/set-password/:token" element={<SetPasswordPage />} /> {/* <<<--- 2. ADD PUBLIC ROUTE */}


                    {/* --- Protected Platform Admin Routes (Wrapped in MainLayout) --- */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute roles={['PLATFORM_ADMIN']}>
                                <MainLayout />
                            </ProtectedRoute>
                        }
                    >
                        {/* Child routes render inside MainLayout's <Outlet /> */}
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard" element={<DashboardPage />} />
                        <Route path="clubs" element={<ClubManagementPage />} />
                        <Route path="users" element={<UserManagementPage />} />
                        <Route path="settings" element={<PlatformSettingsPage />} />
                        {/* Add more protected routes here */}

                        {/* Catch-all *inside* protected layout */}
                         <Route path="*" element={<NotFoundPage />} />
                    </Route>

                    {/* --- Catch-all Not Found Route (Top Level) --- */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;