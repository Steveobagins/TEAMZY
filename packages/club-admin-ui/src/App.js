// packages/club-admin-ui/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import PreferencesPage from './pages/PreferencesPage';
import ProfilePage from './pages/ProfilePage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage from './pages/NotFoundPage';

// --- Import New Placeholder Pages ---
import TeamsPage from './pages/TeamsPage';
import EventsPage from './pages/EventsPage'; // Added for Sidebar item
import CommunicationPage from './pages/CommunicationPage';
import PerformancePage from './pages/PerformancePage';
import PaymentsPage from './pages/PaymentsPage';
import UserManagementPage from './pages/UserManagementPage';
// --- End Imports ---

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
                    <Route path="/unauthorized" element={<UnauthorizedPage />} />

                    {/* --- Protected Routes within MainLayout --- */}
                    {/* Allow CLUB_ADMIN and COACH to access the layout and common pages */}
                    <Route
                        path="/"
                        element={
                            <ProtectedRoute roles={['CLUB_ADMIN', 'COACH']}>
                                <MainLayout />
                            </ProtectedRoute>
                        }
                    >
                        {/* Default route */}
                        <Route index element={<Navigate to="/dashboard" replace />} />

                        {/* Common Pages */}
                        <Route path="dashboard" element={<DashboardPage />} />
                        <Route path="profile" element={<ProfilePage />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="preferences" element={<PreferencesPage />} />

                        {/* --- NEW Placeholder Routes --- */}
                        <Route path="teams" element={<TeamsPage />} />
                        <Route path="events" element={<EventsPage />} /> {/* Added */}
                        <Route path="communication" element={<CommunicationPage />} />
                        <Route path="performance" element={<PerformancePage />} />
                        <Route path="payments" element={<PaymentsPage />} />

                        {/* User Management (Admin Only) - Nested ProtectedRoute for specific role */}
                        <Route
                            path="users"
                            element={
                                <ProtectedRoute roles={['CLUB_ADMIN']}>
                                    <UserManagementPage />
                                </ProtectedRoute>
                            }
                        />
                        {/* --- End NEW Placeholder Routes --- */}

                    </Route>
                    {/* --- End Protected Routes --- */}

                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </Router>
        </AuthProvider>
    );
}
export default App;