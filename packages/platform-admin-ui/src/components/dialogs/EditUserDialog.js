// Canvas: packages/platform-admin-ui/src/components/dialogs/EditUserDialog.js
// --- Added email to payload to match controller requirements ---

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    CircularProgress, Alert, Grid, FormControl, InputLabel, Select, MenuItem,
    Box, Typography
} from '@mui/material';
import api from '../../services/api'; // Adjust path if needed

const USER_ROLES_OPTIONS = ['PLATFORM_ADMIN', 'CLUB_ADMIN', 'COACH', 'PARENT', 'ATHLETE']; // Verify roles

const EditUserDialog = ({ open, onClose, onSuccess, userId }) => {
    const [initialDataLoading, setInitialDataLoading] = useState(false);
    const [initialDataError, setInitialDataError] = useState(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        primaryRole: '',
        email: '', // <<< Added email to state
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    useEffect(() => {
        if (open && userId) {
            const fetchUserData = async () => {
                setInitialDataLoading(true);
                setInitialDataError(null);
                setSubmitError(null);
                try {
                    const response = await api.get(`/platform-admin/users/${userId}`);
                    const userData = response.data;
                    // console.log("Fetched user data for edit:", userData);
                    // Ensure email is populated from the correct field name (likely email itself)
                    setFormData({
                        firstName: userData.first_name || '',
                        lastName: userData.last_name || '',
                        primaryRole: userData.primary_role || '',
                        email: userData.email || '', // <<< Populate email from fetched data
                    });
                } catch (err) {
                    console.error("Error fetching user data for edit:", err);
                    setInitialDataError(err.response?.data?.message || err.message || "Failed to load user data.");
                } finally {
                    setInitialDataLoading(false);
                }
            };
            fetchUserData();
        } else if (!open) {
             setFormData({ firstName: '', lastName: '', primaryRole: '', email: '' }); // Reset state
             setInitialDataError(null);
             setSubmitError(null);
        }
    }, [open, userId]);

    const validateForm = useCallback(() => {
        if (!formData.firstName?.trim()) return 'First Name cannot be empty.';
        if (!formData.lastName?.trim()) return 'Last Name cannot be empty.';
        if (!formData.primaryRole || !USER_ROLES_OPTIONS.includes(formData.primaryRole)) return 'Invalid Role selected.';
        // Email validation might be redundant if it's read-only, but good practice:
        if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) return 'Valid Email is required.';
        return null;
    }, [formData]);

    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
        if (submitError) setSubmitError(null);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitError(null);

        const validationError = validateForm();
        if (validationError) {
            setSubmitError(validationError);
            return;
        }

        setIsSubmitting(true);

        // --- CONSTRUCT PAYLOAD WITH ALL CONTROLLER REQUIRED FIELDS ---
        const payload = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            primaryRole: formData.primaryRole,
            email: formData.email, // <<< ADDED EMAIL TO PAYLOAD
            // Note: clubId is also destructured in controller, but not checked in the 'if'.
            // If clubId IS required under certain conditions, add it here conditionally.
            // e.g., clubId: formData.primaryRole === 'CLUB_ADMIN' ? fetchedClubId : null
        };
        // ----------------------------------------------------------

        // Pre-flight Check
        let missingFields = [];
        if (!payload.firstName?.trim()) missingFields.push('firstName');
        if (!payload.lastName?.trim()) missingFields.push('lastName');
        if (!payload.primaryRole?.trim()) missingFields.push('primaryRole');
        if (!payload.email?.trim()) missingFields.push('email'); // Added email check

        console.log(`Submitting updated user data for ${userId}:`, JSON.stringify(payload));

        if (missingFields.length > 0) {
             console.error("FRONTEND CHECK FAILED: Payload is missing or has invalid values for:", missingFields.join(', '));
             setSubmitError(`Internal check failed: Missing or invalid ${missingFields.join(', ')}.`);
             setIsSubmitting(false);
             return;
        }

        try {
            const response = await api.put(`/platform-admin/users/${userId}`, payload);
            console.log("Update API Response:", response);
            setIsSubmitting(false);
            onSuccess(response.data?.message || 'User updated successfully!');
        } catch (err) {
            setIsSubmitting(false);
            const errorMessage = err.response?.data?.message || err.message || 'An unexpected error occurred.';
            console.error(`Error updating user ${userId} with payload: ${JSON.stringify(payload)}`, err.response?.data || err);
            setSubmitError(errorMessage);
        }
    };

    const currentValidationError = validateForm();

    return (
        <Dialog open={open} onClose={isSubmitting ? undefined : onClose} maxWidth="xs" fullWidth component="form" onSubmit={handleSubmit} noValidate>
            <DialogTitle>Edit User</DialogTitle>
            <DialogContent dividers>
                {initialDataLoading && (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        <CircularProgress sx={{mb: 1}} />
                        <Typography>Loading user data...</Typography>
                    </Box>
                )}
                {initialDataError && (
                    <Alert severity="error" sx={{ mb: 2 }}>{initialDataError}</Alert>
                )}

                {!initialDataLoading && !initialDataError && (
                    <>
                        {submitError && (
                            <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>
                        )}
                        <Grid container spacing={2} sx={{ pt: 1 }}>
                             {/* Email Field (Read Only) */}
                             <Grid item xs={12}>
                                <TextField
                                    label="Email"
                                    name="email"
                                    value={formData.email}
                                    // onChange={handleInputChange} // Keep read-only if email change not allowed here
                                    fullWidth
                                    required
                                    margin="dense"
                                    disabled // Make it disabled instead of readOnly InputProps for consistency
                                    InputLabelProps={{ shrink: true }} // Ensure label doesn't overlap value
                                />
                            </Grid>
                             <Grid item xs={12} sm={6}>
                                <TextField
                                    autoFocus
                                    label="First Name"
                                    name="firstName"
                                    value={formData.firstName}
                                    onChange={handleInputChange}
                                    fullWidth
                                    required
                                    margin="dense"
                                    disabled={isSubmitting}
                                    error={!!submitError?.includes('First Name')}
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
                                    disabled={isSubmitting}
                                     error={!!submitError?.includes('Last Name')}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl fullWidth margin="dense" required disabled={isSubmitting}>
                                    <InputLabel id="role-select-label">Primary Role</InputLabel>
                                    <Select
                                        labelId="role-select-label"
                                        id="primaryRole"
                                        name="primaryRole"
                                        value={formData.primaryRole}
                                        label="Primary Role"
                                        onChange={handleInputChange}
                                        error={!!submitError?.includes('Role')}
                                    >
                                        {USER_ROLES_OPTIONS.map((role) => (
                                            <MenuItem key={role} value={role}>
                                                {role.replace('_', ' ')}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </>
                 )}

            </DialogContent>
            <DialogActions sx={{ padding: '16px 24px' }}>
                <Button onClick={onClose} disabled={isSubmitting} color="inherit">
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={isSubmitting || initialDataLoading || !!initialDataError || !!currentValidationError}
                >
                    {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

EditUserDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func.isRequired,
    userId: PropTypes.string,
};

export default EditUserDialog;