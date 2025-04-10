// Canvas: packages/platform-admin-ui/src/components/dialogs/EditClubDialog.js
// --- Fetch club users for Primary Contact dropdown and set default value ---

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
    CircularProgress, Alert, Grid, FormControl, InputLabel, Select, MenuItem,
    Box, Typography, FormHelperText
} from '@mui/material';
import api from '../../services/api'; // Adjust path if needed

// Ideally import from shared constants
const SUBSCRIPTION_TIERS = ['FREE', 'BASIC', 'PREMIUM', 'TRIAL'];

function EditClubDialog({ open, onClose, onSuccess, clubId }) {
    const [clubData, setClubData] = useState(null); // Store fetched club data
    const [clubUsers, setClubUsers] = useState([]); // Store fetched users for the club
    const [fetchLoading, setFetchLoading] = useState(false); // Combined loading state for initial data
    const [fetchError, setFetchError] = useState(null); // Error state for initial data fetch
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);

    // State for form fields - separate from fetched data to track edits
    const [formData, setFormData] = useState({
        name: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        primary_color: '#0000FF', // Default color
        secondary_color: '#FFFFFF', // Default color
        subscription_tier: '',
        primary_contact_user_id: '', // Store the selected/current contact ID
    });

    // Fetch Club details AND potential contact users when dialog opens
    const fetchInitialData = useCallback(async () => {
        if (!clubId) return;
        setFetchLoading(true);
        setFetchError(null);
        setClubData(null);
        setClubUsers([]);
        setFormData({ // Reset form data
            name: '', contact_email: '', contact_phone: '', address: '',
            primary_color: '#0000FF', secondary_color: '#FFFFFF', subscription_tier: '',
            primary_contact_user_id: '',
        });

        try {
            // Fetch club details and users concurrently
            const [clubResponse, usersResponse] = await Promise.all([
                api.get(`/platform-admin/clubs/${clubId}`),
                // *** ASSUMPTION: Endpoint to get users for a specific club ***
                // Adjust endpoint/params as needed based on your actual API
                api.get(`/platform-admin/users`, { params: { club_id: clubId, limit: 200 } }) // Fetch users of the club
            ]);

            const fetchedClub = clubResponse.data;
            const fetchedUsers = usersResponse.data?.users || []; // Extract users array

            console.log("Fetched Club Data:", fetchedClub);
            console.log("Fetched Club Users:", fetchedUsers);

            setClubData(fetchedClub); // Store original fetched data if needed elsewhere
            setClubUsers(fetchedUsers); // Store users for dropdown

            // --- Set initial form data, including the current primary contact ---
            setFormData({
                name: fetchedClub.name || '',
                contact_email: fetchedClub.contact_email || '',
                contact_phone: fetchedClub.contact_phone || '',
                address: fetchedClub.address || '',
                primary_color: fetchedClub.primary_color || '#0000FF',
                secondary_color: fetchedClub.secondary_color || '#FFFFFF',
                subscription_tier: fetchedClub.subscription_tier || '',
                // <<< SET DEFAULT VALUE for dropdown >>>
                primary_contact_user_id: fetchedClub.primary_contact_user_id || '', // Default to current contact
            });

        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to load club data or users.';
            console.error("EditClubDialog: Fetch initial data error:", err.response || err);
            setFetchError(errorMsg);
        } finally {
            setFetchLoading(false);
        }
    }, [clubId]);

    useEffect(() => {
        if (open) {
            fetchInitialData();
        } else {
            // Optional: Reset state when dialog closes if needed
            setFetchError(null);
            setSubmitError(null);
            // Form data reset is handled by fetchInitialData on open
        }
    }, [open, fetchInitialData]);

    // Handle input changes for most fields
    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
        if (submitError) setSubmitError(null); // Clear previous submit error
    };

    // Handle form submission
    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitError(null);
        setIsSubmitting(true);

        // Construct payload - send fields managed by formData
        // Ensure keys match backend expectation (likely snake_case for clubs based on controller)
        const payload = {
            name: formData.name,
            contact_email: formData.contact_email,
            contact_phone: formData.contact_phone,
            address: formData.address,
            primary_color: formData.primary_color,
            secondary_color: formData.secondary_color,
            subscription_tier: formData.subscription_tier,
            primary_contact_user_id: formData.primary_contact_user_id || null, // Send null if empty/unselected
        };

        // Basic Frontend Validation (Optional)
        if (!payload.name?.trim()) {
             setSubmitError("Club Name cannot be empty.");
             setIsSubmitting(false);
             return;
        }
         // Add more validation if needed

        console.log("Submitting Club Update Payload:", payload);

        try {
            const response = await api.put(`/platform-admin/clubs/${clubId}`, payload);
            console.log("Update Club Response:", response.data);
            setIsSubmitting(false);
            onSuccess(response.data?.message || 'Club updated successfully!');
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Failed to update club.';
            console.error("Error updating club:", err.response?.data || err);
            setSubmitError(errorMsg);
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={isSubmitting ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Club Details</DialogTitle>
            {/* Use Box for form to handle potential default browser validation messages */}
            <Box component="form" onSubmit={handleSubmit} noValidate>
                <DialogContent dividers>
                    {fetchLoading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                            <CircularProgress />
                        </Box>
                    )}
                    {fetchError && (
                        <Alert severity="error" sx={{ mb: 2 }}>{fetchError}</Alert>
                    )}
                    {submitError && (
                        <Alert severity="error" sx={{ mb: 2 }}>{submitError}</Alert>
                    )}

                    {!fetchLoading && !fetchError && clubData && ( // Render form only when data is loaded
                        <Grid container spacing={2} sx={{pt: 1}}>
                            <Grid item xs={12}>
                                <TextField
                                    label="Club Name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    fullWidth
                                    required
                                    margin="dense"
                                    disabled={isSubmitting}
                                    autoFocus
                                />
                            </Grid>
                             {/* Add other fields like contact_email, phone, address etc. */}
                             <Grid item xs={12} sm={6}>
                                <TextField
                                    label="Contact Email"
                                    name="contact_email"
                                    type="email"
                                    value={formData.contact_email}
                                    onChange={handleChange}
                                    fullWidth
                                    margin="dense"
                                    disabled={isSubmitting}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                 <TextField
                                     label="Contact Phone"
                                     name="contact_phone"
                                     value={formData.contact_phone}
                                     onChange={handleChange}
                                     fullWidth
                                     margin="dense"
                                     disabled={isSubmitting}
                                 />
                             </Grid>
                             <Grid item xs={12}>
                                 <TextField
                                     label="Address"
                                     name="address"
                                     value={formData.address}
                                     onChange={handleChange}
                                     fullWidth
                                     margin="dense"
                                     multiline
                                     rows={2}
                                     disabled={isSubmitting}
                                 />
                             </Grid>
                             <Grid item xs={12} sm={6}>
                                 <TextField
                                     label="Primary Color (Hex)"
                                     name="primary_color"
                                     value={formData.primary_color}
                                     onChange={handleChange}
                                     fullWidth
                                     margin="dense"
                                     disabled={isSubmitting}
                                     // Basic pattern validation - consider a color picker component
                                     inputProps={{ pattern: "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" }}
                                 />
                             </Grid>
                             <Grid item xs={12} sm={6}>
                                 <TextField
                                     label="Secondary Color (Hex)"
                                     name="secondary_color"
                                     value={formData.secondary_color}
                                     onChange={handleChange}
                                     fullWidth
                                     margin="dense"
                                     disabled={isSubmitting}
                                      inputProps={{ pattern: "^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$" }}
                                 />
                             </Grid>
                             <Grid item xs={12} sm={6}>
                                <FormControl fullWidth margin="dense" required disabled={isSubmitting}>
                                    <InputLabel id="tier-select-label">Subscription Tier</InputLabel>
                                    <Select
                                        labelId="tier-select-label"
                                        name="subscription_tier"
                                        value={formData.subscription_tier}
                                        label="Subscription Tier"
                                        onChange={handleChange}
                                    >
                                        {SUBSCRIPTION_TIERS.map((tier) => (
                                            <MenuItem key={tier} value={tier}>{tier}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                {/* --- Primary Contact Dropdown --- */}
                                <FormControl fullWidth margin="dense" disabled={isSubmitting || clubUsers.length === 0}>
                                    <InputLabel id="primary-contact-label">Primary Contact</InputLabel>
                                    <Select
                                        labelId="primary-contact-label"
                                        name="primary_contact_user_id"
                                        value={formData.primary_contact_user_id} // Value is the user ID
                                        label="Primary Contact"
                                        onChange={handleChange}
                                    >
                                        {/* Option to clear selection */}
                                        <MenuItem value=""><em>None (Clear)</em></MenuItem>
                                        {clubUsers.map((user) => (
                                            // Ensure user objects have userId, firstName, lastName
                                            <MenuItem key={user.userId} value={user.userId}>
                                                {`${user.firstName || ''} ${user.lastName || ''} (${user.email})`}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                     {clubUsers.length === 0 && <FormHelperText>No users found for this club.</FormHelperText>}
                                </FormControl>
                                {/* ------------------------------ */}
                            </Grid>
                        </Grid>
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
                        disabled={isSubmitting || fetchLoading || !!fetchError}
                    >
                        {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}

EditClubDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func.isRequired,
    clubId: PropTypes.string,
};

export default EditClubDialog;