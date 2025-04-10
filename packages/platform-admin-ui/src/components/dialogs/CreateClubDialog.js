// packages/platform-admin-ui/src/components/dialogs/CreateClubDialog.js
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
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    Checkbox, // Added back for activateImmediately
    FormControlLabel, // Added back
    Box,
    Typography,
    Grid,
} from '@mui/material';
import api from '../../services/api'; // Ensure this path is correct

// Define Subscription Tiers locally or import from a shared location if available
const SUBSCRIPTION_TIERS = {
    FREE: 'FREE',
    BASIC: 'BASIC',
    PREMIUM: 'PREMIUM',
};

const CreateClubDialog = ({ open, onClose, onSuccess }) => {
    // Initial state matching form fields and backend expectations
    const initialFormData = {
        clubName: '',
        subdomain: '',
        primaryContactEmail: '',
        primaryContactFirstName: '',
        primaryContactLastName: '',
        subscriptionTier: SUBSCRIPTION_TIERS.FREE,
        activateImmediately: true, // Default to true, matches controller logic
    };

    const [formData, setFormData] = useState(initialFormData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [subdomainHelperText, setSubdomainHelperText] = useState('Lowercase letters, numbers, hyphens only (e.g., springfield-soccer)');
    const [isSubdomainValid, setIsSubdomainValid] = useState(true);

    // Reset form and errors when dialog opens
    useEffect(() => {
        if (open) {
            setFormData(initialFormData);
            setError(null);
            setSubdomainHelperText('Lowercase letters, numbers, hyphens only (e.g., springfield-soccer)');
            setIsSubdomainValid(true);
            setLoading(false); // Ensure loading is reset
        }
    }, [open]); // Rerun when 'open' state changes

    // Basic frontend validation logic
    const validateForm = useCallback(() => {
        if (!formData.clubName.trim()) return 'Club Name is required.';
        if (!formData.subdomain.trim()) return 'Subdomain is required.';
        if (!/^[a-z0-9-]+$/.test(formData.subdomain)) return 'Subdomain contains invalid characters.';
        if (formData.subdomain.length < 3 || formData.subdomain.length > 63) return 'Subdomain must be between 3 and 63 characters.';
        if (!formData.primaryContactEmail.trim()) return 'Admin Email is required.'; // Label consistency
        if (!/\S+@\S+\.\S+/.test(formData.primaryContactEmail)) return 'Please enter a valid email address.';
        if (!formData.primaryContactFirstName.trim()) return 'Admin First Name is required.'; // Label consistency
        if (!formData.primaryContactLastName.trim()) return 'Admin Last Name is required.'; // Label consistency
        if (!Object.values(SUBSCRIPTION_TIERS).includes(formData.subscriptionTier)) return 'Invalid Subscription Tier selected.';

        return null; // No errors
    }, [formData]);

    const handleInputChange = (event) => {
        const { name, value, type, checked } = event.target; // Add back type/checked
        let processedValue = type === 'checkbox' ? checked : value; // Handle checkbox

        setFormData((prevData) => {
             // Special handling for subdomain: format and validate as user types
            if (name === 'subdomain') {
                processedValue = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                 const isValidFormat = /^[a-z0-9-]*$/.test(processedValue); // Allow empty string during typing
                const isValidLength = processedValue.length >= 3 && processedValue.length <= 63;
                const finalValid = processedValue === '' || (isValidFormat && isValidLength);

                setIsSubdomainValid(finalValid || processedValue === ''); // Valid if format/length correct OR empty

                 if (!isValidFormat && processedValue !== '') {
                    setSubdomainHelperText('Invalid characters. Use letters, numbers, hyphens.');
                } else if (processedValue !== '' && !isValidLength) {
                    setSubdomainHelperText('Must be 3-63 characters.');
                } else {
                    setSubdomainHelperText('Lowercase letters, numbers, hyphens only.');
                }
            }

            return {
                ...prevData,
                [name]: processedValue,
            };
        });

        // Clear general error message on input change
        if (error) {
           setError(null);
        }
    };


    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);

        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }
        // Double check subdomain validity state just before submit
        if (!isSubdomainValid && formData.subdomain !== '') {
             setError(subdomainHelperText || 'Subdomain is invalid.');
             return;
        }

        setLoading(true);
        try {
            // --- FINAL PAYLOAD FOR TOKEN WORKFLOW ---
            // Use keys exactly as expected by the provided controller
            const payload = {
                clubName: formData.clubName,
                subdomain: formData.subdomain,
                primaryContactEmail: formData.primaryContactEmail.trim(), // Trim email just in case
                primaryContactFirstName: formData.primaryContactFirstName,
                primaryContactLastName: formData.primaryContactLastName,
                subscriptionTier: formData.subscriptionTier,
                activateImmediately: formData.activateImmediately,

                // Add optional fields ONLY if backend controller uses them
                // contact_phone: formData.contactPhone,
                // address: formData.address,
            };

            console.log("Submitting FINAL PAYLOAD for email setup workflow:", payload);
            // <<<--- ADDED STRINGIFY LOG ---<<<
            console.log("Stringified payload before send:", JSON.stringify(payload));
            // <<<--------------------------<<<

            // Send the mapped payload
            const response = await api.post('/platform-admin/clubs', payload);
            // --- *** END OF PAYLOAD *** ---

            console.log("API Response:", response);
            setLoading(false);
            // Success message reflects email being sent
            onSuccess(response.data.message || 'Club created successfully! Setup email sent to admin.');
            handleClose(); // Close dialog on success
        } catch (err) {
            setLoading(false);
            const errorMessage = err.response?.data?.message || err.message || 'An unexpected error occurred.';
            console.error("Error creating club:", err.response?.data || err);
             if (errorMessage.toLowerCase().includes('required field') || errorMessage.toLowerCase().includes('missing')) {
                 setError(`Failed to create club. Backend Error: ${errorMessage}. Please verify the payload keys match the running backend controller.`);
             } else {
                 setError(errorMessage);
             }
        }
    };

    const handleClose = () => {
        if (!loading) {
            onClose(); // Call the onClose handler passed from parent
        }
    };

    // Re-calculate validation error on render to update button disabled state
    const currentValidationError = validateForm();

    return (
        // Using `onSubmit` on the Dialog's Form element
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth component="form" onSubmit={handleSubmit} noValidate>
            <DialogTitle>Create New Club</DialogTitle>
            <DialogContent dividers>
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
                <Grid container spacing={2}>
                    {/* Club Details */}
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Club Name"
                            name="clubName" // Matches state key
                            value={formData.clubName}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            margin="dense"
                            disabled={loading}
                            error={!!currentValidationError?.includes('Club Name')}
                            helperText={!!currentValidationError?.includes('Club Name') ? 'Club Name is required' : ''}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Subdomain"
                            name="subdomain" // Matches state key
                            value={formData.subdomain}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            margin="dense"
                            disabled={loading}
                            inputProps={{ maxLength: 63 }}
                            error={!isSubdomainValid && formData.subdomain !== ''}
                            helperText={subdomainHelperText}
                        />
                         <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: -0.5, ml: 1.5 }}>
                            URL: {formData.subdomain || '{subdomain}'}.teamzy.app
                        </Typography>
                    </Grid>
                     {/* Initial Admin Details */}
                     <Grid item xs={12}>
                         <Typography variant="subtitle2" sx={{ mt: 1, mb: -0.5 }}>Initial Club Administrator</Typography>
                     </Grid>
                     <Grid item xs={12} sm={6}>
                        <TextField
                            label="Admin First Name"
                            name="primaryContactFirstName" // Matches state key
                            value={formData.primaryContactFirstName}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            margin="dense"
                            disabled={loading}
                            error={!!currentValidationError?.includes('First Name')}
                            helperText={!!currentValidationError?.includes('First Name') ? 'Admin First Name is required' : ''}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            label="Admin Last Name"
                            name="primaryContactLastName" // Matches state key
                            value={formData.primaryContactLastName}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            margin="dense"
                            disabled={loading}
                            error={!!currentValidationError?.includes('Last Name')}
                            helperText={!!currentValidationError?.includes('Last Name') ? 'Admin Last Name is required' : ''}
                        />
                    </Grid>
                    <Grid item xs={12}> {/* Span full width */}
                        <TextField
                            label="Admin Email Address"
                            name="primaryContactEmail" // Matches state key
                            type="email"
                            value={formData.primaryContactEmail}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            margin="dense"
                            disabled={loading}
                            error={!!currentValidationError?.includes('Email')}
                             helperText={!!currentValidationError?.includes('Email') ? 'Valid Admin Email is required.' : 'Setup email will be sent to this address.'}
                         />
                    </Grid>
                    {/* Club Settings */}
                     <Grid item xs={12} sm={6}> {/* Adjust grid size */}
                         <FormControl fullWidth margin="dense" disabled={loading}>
                            <InputLabel id="subscription-tier-label">Subscription Tier</InputLabel>
                            <Select
                                labelId="subscription-tier-label"
                                id="subscriptionTier"
                                name="subscriptionTier" // Matches state and controller key
                                value={formData.subscriptionTier}
                                label="Subscription Tier"
                                onChange={handleInputChange}
                             >
                                {Object.entries(SUBSCRIPTION_TIERS).map(([key, value]) => (
                                    <MenuItem key={value} value={value}>{value}</MenuItem>
                                ))}
                             </Select>
                        </FormControl>
                    </Grid>
                     <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center', mt: { xs: 0, sm: 1 } }}> {/* Align checkbox */}
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={formData.activateImmediately}
                                    onChange={handleInputChange}
                                    name="activateImmediately" // Matches state and controller key
                                    disabled={loading}
                                    sx={{ py: 0 }}
                                />
                            }
                            label="Activate Club Immediately"
                        />
                    </Grid>
                    <Grid item xs={12}>
                         <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: -1, ml: 1.5 }}>
                           If checked, the club is active, otherwise inactive. Admin still needs to verify email.
                        </Typography>
                    </Grid>
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
                    disabled={loading || !!currentValidationError || (!isSubdomainValid && formData.subdomain !== '')}
                >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Create Club & Send Invite'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

CreateClubDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func.isRequired,
};

export default CreateClubDialog;