// Canvas: packages/club-admin-ui/src/pages/LoginPage.js (Corrected Hook Order)
import React, { useState, useEffect } from 'react'; // Added useEffect for potential debug
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

function LoginPage() {
    // --- Call ALL Hooks unconditionally at the Top ---
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth(); // Call useAuth unconditionally

    // --- State Variables ---
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [localLoading, setLocalLoading] = useState(false); // Renamed to avoid clash

    // --- Debugging log for when auth context changes ---
    useEffect(() => {
        console.log("LoginPage: Auth context updated:", auth);
    }, [auth]);

    // --- Derived State / Conditional Logic ---
    // Check if auth context is ready before trying to use it
    if (!auth) {
        // This should ideally not happen if AuthProvider wraps correctly,
        // but it's a safeguard. Could also indicate AuthProvider hasn't finished loading.
        console.error("LoginPage: Auth context is still not available!");
        return <div>Loading Auth...</div>; // Or a more robust loading indicator
    }

    // Destructure *after* confirming auth exists
    const { login, loading: authLoading, initialLoadDone } = auth; // Get loading state from context too

    // Determine where to redirect after login
    const from = location.state?.from?.pathname || '/dashboard';

    // --- Event Handler ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLocalLoading(true); // Indicate form submission is in progress
        try {
            await login(email, password);
            // No error means login was successful (AuthContext handles state update)
            navigate(from, { replace: true }); // Navigate on success
        } catch (err) {
            setError(err.message || 'Login failed. Please check credentials.');
            console.error("Login page submit error:", err);
        } finally {
            setLocalLoading(false); // Stop indicating form submission progress
        }
    };

    // --- Render Logic ---
    // Show loading state while AuthProvider determines initial auth status
    // Use initialLoadDone to avoid showing login form briefly before redirecting if already logged in
    if (authLoading || !initialLoadDone) {
         return <div>Checking authentication status...</div>; // Or a spinner
    }

    // Render the login form
    return (
        <div>
            <h2>Club Admin Login</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />
                </div>
                <div>
                    <label htmlFor="password">Password:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                {/* Disable button based on local loading state */}
                <button type="submit" disabled={localLoading}>
                    {localLoading ? 'Logging in...' : 'Login'}
                </button>
            </form>
        </div>
    );
}

export default LoginPage;