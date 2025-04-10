// packages/platform-admin-ui/src/components/dialogs/ViewUserDialog.js
// --- Includes Avatar display ---

import React from 'react';
import PropTypes from 'prop-types';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Grid,
    Chip,
    Divider,
    Avatar, // Import Avatar
    Skeleton // Import Skeleton for loading state
} from '@mui/material';
import { format } from 'date-fns'; // For date formatting
import { PersonOutline as PersonOutlineIcon } from '@mui/icons-material'; // Default icon

// Helper to get initials from name
const getInitials = (firstName = '', lastName = '') => {
    const firstInitial = firstName ? firstName[0] : '';
    const lastInitial = lastName ? lastName[0] : '';
    return `${firstInitial}${lastInitial}`.toUpperCase();
};

// Helper function to format dates nicely, handling nulls
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
        return format(new Date(dateString), 'PPpp'); // e.g., Feb 28, 2024, 1:30:00 PM
    } catch (e) {
        console.error("Date formatting error:", e);
        return dateString; // Return original string if formatting fails
    }
};

// Construct API base URL for picture endpoint
// Ensure this correctly points to your API root (e.g., http://localhost:5001/api)
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

const ViewUserDialog = ({ open, onClose, userData }) => {

    // Use userData being null as the loading indicator for simplicity here
    const isLoading = !userData;
    const userInitials = isLoading ? '' : getInitials(userData?.first_name, userData?.last_name);
    const profilePictureUrl = isLoading ? null : (
        userData?.has_profile_picture
        // Construct the full URL to the profile picture endpoint
        ? `${API_BASE_URL}/platform-admin/users/${userData.user_id}/profile-picture?t=${Date.now()}` // Add timestamp to prevent caching issues
        : null
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
            <DialogTitle>{isLoading ? "Loading User Details..." : `User Details: ${userData?.first_name || ''} ${userData?.last_name || ''}`}</DialogTitle>
            <DialogContent dividers>
                <Grid container spacing={2} alignItems="center">

                    {/* Profile Picture / Avatar */}
                    <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                        {isLoading ? (
                            <Skeleton variant="circular" width={80} height={80} />
                        ) : (
                            <Avatar
                                sx={{ width: 80, height: 80, fontSize: '2rem', bgcolor: profilePictureUrl ? 'transparent' : 'primary.main' }}
                                src={profilePictureUrl} // Set src to the picture endpoint URL if available
                                alt={`${userInitials} Profile Picture`}
                            >
                                {/* Fallback to initials if src fails or no picture */}
                                {!profilePictureUrl && (userInitials || <PersonOutlineIcon />)}
                            </Avatar>
                         )}
                    </Grid>

                    {/* Spacer or Divider */}
                     <Grid item xs={12}><Divider sx={{ mb: 1 }} light /></Grid>

                    {/* Basic Info */}
                    <Grid item xs={12} sm={6}>
                        <Typography variant="overline" color="textSecondary">First Name</Typography>
                        {isLoading ? <Skeleton width="80%"/> : <Typography variant="body1">{userData.first_name || '-'}</Typography>}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="overline" color="textSecondary">Last Name</Typography>
                         {isLoading ? <Skeleton width="80%"/> : <Typography variant="body1">{userData.last_name || '-'}</Typography>}
                    </Grid>
                    <Grid item xs={12}>
                        <Typography variant="overline" color="textSecondary">Email</Typography>
                         {isLoading ? <Skeleton width="90%"/> : <Typography variant="body1">{userData.email || '-'}</Typography>}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="overline" color="textSecondary">Primary Role</Typography>
                         {isLoading ? <Skeleton width="60%"/> : <Typography variant="body1">{userData.primary_role || '-'}</Typography>}
                    </Grid>
                     <Grid item xs={12} sm={6}>
                        <Typography variant="overline" color="textSecondary">Phone Number</Typography>
                         {isLoading ? <Skeleton width="70%"/> : <Typography variant="body1">{userData.phone_number || '-'}</Typography>}
                    </Grid>

                     <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

                    {/* Status Info */}
                    <Grid item xs={12} sm={4}>
                         <Typography variant="overline" color="textSecondary">Account Status</Typography>
                         {isLoading ? <Skeleton width={60}/> : (
                            <Chip label={userData.is_active ? 'Active' : 'Inactive'} color={userData.is_active ? 'success' : 'default'} size="small" variant={userData.is_active ? 'filled' : 'outlined'} />
                         )}
                    </Grid>
                     <Grid item xs={12} sm={4}>
                        <Typography variant="overline" color="textSecondary">Email Verified</Typography>
                         {isLoading ? <Skeleton width={50}/> : (
                             <Chip label={userData.is_email_verified ? 'Yes' : 'No'} color={userData.is_email_verified ? 'success' : 'warning'} size="small" variant={userData.is_email_verified ? 'filled' : 'outlined'} />
                         )}
                    </Grid>
                     <Grid item xs={12} sm={4}>
                        <Typography variant="overline" color="textSecondary">MFA Enabled</Typography>
                         {isLoading ? <Skeleton width={50}/> : (
                             <Chip label={userData.is_mfa_enabled ? 'Yes' : 'No'} color={userData.is_mfa_enabled ? 'success' : 'default'} size="small" variant={userData.is_mfa_enabled ? 'filled' : 'outlined'} />
                         )}
                    </Grid>

                    <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

                     {/* Club Info (if applicable) */}
                     {!isLoading && userData.club_id && ( // Only render section if not loading AND has club
                        <>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="overline" color="textSecondary">Associated Club</Typography>
                                <Typography variant="body1">{userData.club_name || '-'}</Typography>
                            </Grid>
                             <Grid item xs={12} sm={6}>
                                <Typography variant="overline" color="textSecondary">Club ID</Typography>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{userData.club_id}</Typography>
                            </Grid>
                            <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
                        </>
                     )}
                     {/* Optionally show a placeholder when loading and user might have a club */}
                     {isLoading && <Grid item xs={12}><Skeleton height={40}/></Grid>}

                    {/* Timestamps */}
                     <Grid item xs={12} sm={6}>
                        <Typography variant="overline" color="textSecondary">User ID</Typography>
                         {isLoading ? <Skeleton /> : <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{userData.user_id}</Typography>}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="overline" color="textSecondary">Account Created</Typography>
                         {isLoading ? <Skeleton /> : <Typography variant="body2">{formatDate(userData.created_at)}</Typography>}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="overline" color="textSecondary">Last Updated</Typography>
                         {isLoading ? <Skeleton /> : <Typography variant="body2">{formatDate(userData.updated_at)}</Typography>}
                    </Grid>
                     <Grid item xs={12} sm={6}>
                        <Typography variant="overline" color="textSecondary">Last Login</Typography>
                         {isLoading ? <Skeleton /> : <Typography variant="body2">{formatDate(userData.last_login_at)}</Typography>}
                    </Grid>

                </Grid>
            </DialogContent>
            <DialogActions sx={{ padding: '16px 24px' }}>
                <Button onClick={onClose} color="primary" variant="outlined">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

ViewUserDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    userData: PropTypes.object, // Can be null while loading
};

export default ViewUserDialog;