// packages/platform-admin-ui/src/pages/VerifyEmailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
    Container,
    Box,
    Typography,
    CircularProgress,
    Alert,
    Button,
    Paper,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import api from '../services/api';

const VerifyEmailPage = () => {
    const { token } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [setPasswordToken, setSetPasswordToken] = useState(null); // State to store the set password token

    useEffect(() => {
        // Use an AbortController to cancel the fetch if the component unmounts
        // or if the effect re-runs (due to StrictMode or dependency changes)
        const abortController = new AbortController();
        const { signal } = abortController;

        const verify = async () => {
            if (!token) {
                setError('No verification token provided in the URL.');
                setLoading(false);
                return;
            }

            // Reset states only if not already completed in a previous run
            // This check helps prevent unnecessary state flashing in StrictMode
            // if (!loading && (success || error)) {
            //    return; // Already processed
            // }

            setLoading(true);
            setError(null);
            setSuccess(false);
            setSetPasswordToken(null); // Reset set password token

            try {
                console.log(`Attempting to verify email with token: ${token} (Signal: ${signal.aborted})`);
                // Pass the AbortSignal to the API call
                const response = await api.post(`/auth/verify-email/${token}`, null, { // Send null body if not needed
                    signal: signal // Pass the signal here
                });

                console.log("Verification API Response:", response.data);

                // Check if the request was aborted after it was sent but before response
                if (signal.aborted) {
                    console.log("Verification request was aborted.");
                    return; // Don't update state if aborted
                }

                setSuccess(true);
                setError(null);
                // Store the set password token if received from backend
                if (response.data.setPasswordToken) {
                    setSetPasswordToken(response.data.setPasswordToken);
                    console.log("Received setPasswordToken:", response.data.setPasswordToken);
                }

            } catch (err) {
                 // Don't update state if the error is due to abortion
                if (err.name === 'AbortError' || err.name === 'CanceledError') {
                     console.log('Fetch aborted');
                     return;
                 }

                console.error("Email verification error:", err.response?.data || err);
                const errorMessage = err.response?.data?.message || err.message || 'An unexpected error occurred during verification.';
                setError(errorMessage);
                setSuccess(false);
                setSetPasswordToken(null);
            } finally {
                // Only set loading to false if not aborted prematurely
                // Although technically it might finish even if aborted, visually it makes sense
                 if (!signal.aborted) {
                     setLoading(false);
                 }
            }
        };

        verify();

        // Cleanup function: Abort the fetch if the component unmounts or effect re-runs
        return () => {
            console.log("Cleaning up verify effect, aborting controller.");
            abortController.abort();
        };
    }, [token]); // Dependency array

    return (
        <Container component="main" maxWidth="sm" sx={{ mt: 8 }}>
            <Paper elevation={3} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5" sx={{ mb: 3 }}>
                    Email Verification
                </Typography>

                {/* Mutually Exclusive Rendering */}
                {loading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                        <CircularProgress />
                        <Typography>Verifying your email address...</Typography>
                    </Box>
                ) : error ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2, width: '100%' }}>
                         <ErrorOutlineIcon color="error" sx={{ fontSize: 60 }} />
                         <Alert severity="error" sx={{ width: '100%' }}>{error}</Alert>
                         <Typography variant="body2" sx={{ mt: 1 }}>
                              Please check the link you received or try logging in. If the problem persists, contact support.
                         </Typography>
                         <Button component={RouterLink} to="/login" variant="contained" sx={{ mt: 2 }}>
                             Go to Login
                         </Button>
                    </Box>
                ) : success ? (
                     <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2, width: '100%' }}>
                         <CheckCircleOutlineIcon color="success" sx={{ fontSize: 60 }} />
                         <Alert severity="success" sx={{ width: '100%' }}>
                             {setPasswordToken ? 'Email verified successfully! Please set your password.' : 'Email verified successfully! You can now log in.'}
                         </Alert>
                         {setPasswordToken ? (
                             <>
                                 <Typography variant="body1" sx={{ mt: 1 }}>
                                     Click the button below to create a password for your account. This link is valid for a limited time.
                                 </Typography>
                                 {/* This button will eventually link to the SetPasswordPage */}
                                 <Button
                                     component={RouterLink}
                                     // *** TODO: Update this route when SetPasswordPage exists ***
                                     to={`/set-password/${setPasswordToken}`} // Pass token in URL
                                     variant="contained"
                                     sx={{ mt: 2 }}
                                 >
                                     Set Your Password
                                 </Button>
                             </>
                         ) : (
                             <>
                                <Typography variant="body1" sx={{ mt: 1 }}>
                                    Your account is active and ready to use.
                                </Typography>
                                 <Button component={RouterLink} to="/login" variant="contained" sx={{ mt: 2 }}>
                                     Proceed to Login
                                 </Button>
                             </>
                         )}
                     </Box>
                ) : (
                    <Typography>Preparing verification...</Typography> // Initial state
                )}
            </Paper>
        </Container>
    );
};

export default VerifyEmailPage;