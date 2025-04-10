// packages/platform-admin-ui/src/pages/SetPasswordPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container,
    Box,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Paper,
    IconButton,
    InputAdornment
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import api from '../services/api'; // Ensure this path is correct

const SetPasswordPage = () => {
    const { token } = useParams(); // Get the set_password_token from the URL
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    // Clear errors when user types
    useEffect(() => {
        setError(null);
        if (password) setPasswordError('');
        if (confirmPassword) setConfirmPasswordError('');
    }, [password, confirmPassword]);

    const validateForm = () => {
        let isValid = true;
        setPasswordError('');
        setConfirmPasswordError('');
        setError(null); // Clear general error on validation attempt

        // Basic password length check (backend validates more thoroughly potentially)
        if (!password || password.length < 8) {
            setPasswordError('Password must be at least 8 characters long.');
            isValid = false;
        }
        // TODO: Add complexity validation if needed (e.g., regex)
        // else if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(password)) {
        //     setPasswordError('Password must contain letters and numbers.');
        //     isValid = false;
        // }

        if (!confirmPassword) {
             setConfirmPasswordError('Please confirm your password.');
             isValid = false;
        } else if (password && confirmPassword !== password) {
            setConfirmPasswordError('Passwords do not match.');
            isValid = false;
        }

        return isValid;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null); // Clear previous submission errors

        if (!validateForm()) {
            return; // Stop submission if frontend validation fails
        }

        if (!token) {
            setError('Password reset token is missing from the URL.');
            return;
        }

        setLoading(true);
        setSuccess(false); // Reset success state

        try {
            console.log(`Attempting to set password with token: ${token}`);
            const response = await api.post(`/auth/set-password/${token}`, {
                password: password, // Send the new password in the body
            });

            console.log("Set Password API Response:", response.data);
            setSuccess(true);
            setError(null); // Clear any previous errors on success

            // Optionally redirect after a short delay
            setTimeout(() => {
                navigate('/login'); // Redirect to login page on success
            }, 3000); // 3 second delay

        } catch (err) {
            console.error("Set password error:", err.response?.data || err);
            const errorMessage = err.response?.data?.message || err.message || 'An unexpected error occurred while setting the password.';
            setError(errorMessage);
            setSuccess(false);
        } finally {
            setLoading(false);
        }
    };

     // Toggle password visibility handlers
     const handleClickShowPassword = () => setShowPassword((show) => !show);
     const handleClickShowConfirmPassword = () => setShowConfirmPassword((show) => !show);
     const handleMouseDownPassword = (event) => event.preventDefault();


    return (
        <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
            <Paper elevation={3} sx={{ padding: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5" sx={{ mb: 2 }}>
                    Set Your Password
                </Typography>

                {success ? (
                     <Box sx={{ width: '100%', textAlign: 'center' }}>
                        <Alert severity="success" sx={{ mb: 2 }}>Password successfully set!</Alert>
                        <Typography>Redirecting you to the login page...</Typography>
                        <CircularProgress sx={{ mt: 2 }} />
                     </Box>
                ) : (
                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Please choose a secure password for your account.
                        </Typography>

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
                        )}

                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="password"
                            label="New Password"
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            error={!!passwordError}
                            helperText={passwordError}
                            disabled={loading}
                            InputProps={{ // <-- Add visibility toggle
                                endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="toggle password visibility"
                                        onClick={handleClickShowPassword}
                                        onMouseDown={handleMouseDownPassword}
                                        edge="end"
                                    >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                                ),
                            }}
                        />
                        <TextField
                            margin="normal"
                            required
                            fullWidth
                            name="confirmPassword"
                            label="Confirm New Password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            id="confirmPassword"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            error={!!confirmPasswordError}
                            helperText={confirmPasswordError}
                            disabled={loading}
                             InputProps={{ // <-- Add visibility toggle
                                endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        aria-label="toggle password visibility"
                                        onClick={handleClickShowConfirmPassword}
                                        onMouseDown={handleMouseDownPassword}
                                        edge="end"
                                    >
                                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                                ),
                            }}
                        />
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={loading}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Set Password'}
                        </Button>
                    </Box>
                )}
            </Paper>
        </Container>
    );
};

export default SetPasswordPage;