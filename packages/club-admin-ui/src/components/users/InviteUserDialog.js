// packages/club-admin-ui/src/components/users/InviteUserDialog.js
import React, { useState } from 'react';
import PropTypes from 'prop-types';

// MUI Imports
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormHelperText from '@mui/material/FormHelperText';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress'; // For button loading

// Constants for roles available to invite
const INVITE_ROLES = [
    { value: 'COACH', label: 'Coach' },
    { value: 'ATHLETE', label: 'Athlete' },
    { value: 'PARENT', label: 'Parent' },
];

function InviteUserDialog({ open, onClose, onSuccess, onError }) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState(''); // For general form errors from API
    const [fieldErrors, setFieldErrors] = useState({}); // For specific field validation errors

    // Basic validation
    const validateForm = () => {
        const errors = {};
        if (!email) {
            errors.email = 'Email is required.';
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            errors.email = 'Email address is invalid.';
        }
        if (!role) {
            errors.role = 'Role is required.';
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0; // Return true if no errors
    };

    const handleClose = () => {
        if (isSubmitting) return; // Prevent closing while submitting
        setEmail('');
        setRole('');
        setFormError('');
        setFieldErrors({});
        onClose(); // Call the onClose function passed from parent
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormError(''); // Clear previous general errors
        if (!validateForm()) {
            return; // Stop if validation fails
        }

        setIsSubmitting(true);
        try {
            // Call the actual API function passed via props or imported directly
            // Assuming onSuccess is passed and it handles API call
            await onSuccess({ email, role });
            handleClose(); // Close dialog on success
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Failed to send invitation.';
            console.error("Invite submission error:", error);
            setFormError(message); // Display error message in the dialog
            // Optional: Set specific field errors if API provides them
            // if (error.response?.data?.errors) { setFieldErrors(error.response.data.errors); }
            onError(message); // Notify parent about the error (e.g., for Snackbar)
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onClose={handleClose} aria-labelledby="invite-user-dialog-title">
            <DialogTitle id="invite-user-dialog-title">Invite New User</DialogTitle>
            <form onSubmit={handleSubmit} noValidate>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        Enter the email address and select the role for the new user. They will receive an email with instructions to set up their account.
                    </DialogContentText>

                    {/* General Error Alert */}
                    {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

                    <TextField
                        autoFocus
                        required
                        margin="dense"
                        id="email"
                        name="email"
                        label="Email Address"
                        type="email"
                        fullWidth
                        variant="outlined"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        error={!!fieldErrors.email}
                        helperText={fieldErrors.email}
                        disabled={isSubmitting}
                    />
                    <FormControl fullWidth margin="dense" required error={!!fieldErrors.role} disabled={isSubmitting}>
                        <InputLabel id="role-select-label">Role</InputLabel>
                        <Select
                            labelId="role-select-label"
                            id="role"
                            name="role"
                            value={role}
                            label="Role"
                            onChange={(e) => setRole(e.target.value)}
                        >
                            <MenuItem value="" disabled><em>Select a role...</em></MenuItem>
                            {INVITE_ROLES.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                    {option.label}
                                </MenuItem>
                            ))}
                        </Select>
                        {fieldErrors.role && <FormHelperText>{fieldErrors.role}</FormHelperText>}
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleClose} disabled={isSubmitting} color="inherit">
                        Cancel
                    </Button>
                    {/* Use LoadingButton or simple disable */}
                    <Button
                        type="submit"
                        variant="contained"
                        color="primary"
                        disabled={isSubmitting}
                        startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        {isSubmitting ? 'Sending...' : 'Send Invitation'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
}

InviteUserDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSuccess: PropTypes.func.isRequired, // Function to call API
    onError: PropTypes.func.isRequired, // Function to handle errors (e.g., show snackbar)
};

export default InviteUserDialog;