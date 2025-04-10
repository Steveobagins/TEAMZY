// packages/platform-admin-ui/src/components/dialogs/AddUserDialog.js
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    CircularProgress,
    Alert,
    Grid,
    Typography,
} from '@mui/material';
import api from '../../services/api'; // Ensure this path is correct

const AddUserDialog = ({ open, onClose, onSuccess }) => {
    const initialFormData = {
        firstName: '',
        lastName: '',
        email: '',
        // Role is determined by backend for this specific dialog (PLATFORM_ADMIN)
    };

    const [formData, setFormData] = useState(initialFormData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Reset form and errors when dialog opens
    useEffect(() => {
        if (open) {
            setFormData(initialFormData);
            setError(null);
            setLoading(false);
        }
    }, [open]);

    // Basic frontend validation
    const validateForm = useCallback(() => {
        if (!formData.firstName.trim()) return 'First Name is required.';
        if (!formData.lastName.trim()) return 'Last Name is required.';
        if (!formData.email.trim()) return 'Email is required.';
        if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Please enter a valid email address.';
        return null; // No errors
    }, [formData]);

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
        // Clear general error message on input change
        if (error) setError(null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        try {
            // API endpoint for creating a user (specifically Platform Admin in this context)
            console.log("Submitting new user data:", formData);
            const response = await api.post('/platform-admin/users', formData);
            console.log("API Response:", response);
            setLoading(false);
            onSuccess(response.data.message || 'User created successfully!'); // Pass success message back
            handleClose(); // Close dialog on success
        } catch (err) {
            setLoading(false);
            const errorMessage = err.response?.data?.message || err.message || 'An unexpected error occurred.';
            console.error("Error creating user:", err.response?.data || err);
            setError(errorMessage);
        }
    };

    const handleClose = () => {
        if (!loading) {
            onClose();
        }
    };

    const currentValidationError = validateForm();

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth component="form" onSubmit={handleSubmit} noValidate>
            <DialogTitle>Add New Platform Administrator</DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            autoFocus // Focus first field
                            label="First Name"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            margin="dense"
                            disabled={loading}
                            error={!formData.firstName.trim() && !!currentValidationError?.includes('First Name')}
                            helperText={!formData.firstName.trim() && !!currentValidationError?.includes('First Name') ? 'Required' : ''}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Last Name"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            margin="dense"
                            disabled={loading}
                            error={!formData.lastName.trim() && !!currentValidationError?.includes('Last Name')}
                            helperText={!formData.lastName.trim() && !!currentValidationError?.includes('Last Name') ? 'Required' : ''}
                        />
                    </Grid>
                    <Grid item xs={12}>
                        <TextField
                            label="Email Address"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            margin="dense"
                            disabled={loading}
                            error={(!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) && !!currentValidationError?.includes('Email')}
                            helperText={(!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email)) && !!currentValidationError?.includes('Email') ? 'Valid Email is required' : ''}
                        />
                         <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 0.5, ml: 1.5 }}>
                            An email will be sent to this address for verification and password setup.
                        </Typography>
                    </Grid>
                    {/* Role is fixed as PLATFORM_ADMIN by the backend endpoint */}
                </Grid>

            </DialogContent>
            <DialogActions sx={{ padding: '16px 24px' }}>
                <Button onClick={handleClose} disabled={loading} color="inherit">
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={loading || !!currentValidationError}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Add Administrator'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

AddUserDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func.isRequired,
};

export default AddUserDialog;