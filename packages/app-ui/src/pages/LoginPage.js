import React, { useState, useEffect } from 'react'; // <-- Import useEffect
import { useLocation, useNavigate } from 'react-router-dom'; // <-- No Navigate import needed here
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Paper,
} from '@mui/material';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading: authLoading, isAuthenticated, initialLoadDone } = useAuth();
  const navigate = useNavigate(); // Hook for navigation
  const location = useLocation(); // Hook to get location state

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine where to redirect after login
  const from = location.state?.from?.pathname || '/'; // Default to dashboard/home

  // *** ADD THIS useEffect ***
  useEffect(() => {
    // Only navigate if authentication is confirmed AND we are still on the login page
    if (isAuthenticated && initialLoadDone) {
        console.log(`LoginPage Effect: Authenticated! Navigating to: ${from}`); // <<< DEBUG LOG
        navigate(from, { replace: true }); // Perform navigation
    }
    // Add dependencies: navigate when isAuthenticated changes or the target 'from' changes
  }, [isAuthenticated, initialLoadDone, from, navigate]);


  const handleSubmit = async (event) => {
    event.preventDefault();
    console.log('LoginPage: handleSubmit triggered.');
    setError('');

    if (!email || !password) {
      console.log('LoginPage: Email or password missing.');
      setError('Please enter both email and password.');
      return;
    }

    setIsSubmitting(true);
    console.log(`LoginPage: Attempting login for email: ${email}`);
    try {
      console.log('LoginPage: Calling AuthContext.login...');
      await login(email, password);
      console.log('LoginPage: AuthContext.login call finished successfully.');
      // Navigation is now handled by the useEffect hook
    } catch (err) {
      console.error("LoginPage: Catch block reached. Error from AuthContext.login:", err);
      setError(err.message || 'An unexpected error occurred during login.');
       setIsSubmitting(false); // Stop local loading on error
    } finally {
       console.log('LoginPage: handleSubmit finally block reached.');
       // Don't necessarily stop submitting here on success, let the redirect happen
       // setIsSubmitting(false);
    }
  };

  // Effect to clear local submitting state if auth loading finishes without navigation
  // (e.g., context error after submit button pressed)
  useEffect(() => {
    if (!authLoading && isSubmitting) {
        // This might still run briefly even on successful login before navigation occurs
        console.log("LoginPage Effect: AuthLoading finished while submitting was true. Resetting isSubmitting.");
        setIsSubmitting(false);
    }
  }, [authLoading, isSubmitting]);


  // --- Rendering Logic ---

  // If initial auth check is ongoing, show loader (ProtectedRoute handles this for protected routes)
  if (!initialLoadDone && !isAuthenticated) { // Only show loader if initial load isn't done AND not already auth
    console.log("LoginPage: Rendering loader because initialLoadDone is false.");
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // *** DO NOT RENDER <Navigate> here. Let the useEffect handle navigation ***

  // Render login form
   console.log("LoginPage: Rendering login form. isSubmitting:", isSubmitting, "isAuthenticated:", isAuthenticated);
  return (
    <Container component="main" maxWidth="xs">
      {/* ... (rest of Paper and Form content remains the same) ... */}
       <Paper elevation={3} sx={{ marginTop: 8, padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography component="h1" variant="h5" gutterBottom>
          Sign In
        </Typography>

        {error && (
          <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting} // Use local submitting state
          />
          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting} // Use local submitting state
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isSubmitting} // Use local submitting state
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default LoginPage;