// packages/platform-admin-ui/src/components/dialogs/ViewClubDialog.js
// --- Using Flexbox for better label-chip spacing ---

import React from 'react';
import PropTypes from 'prop-types';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
    Box, Grid, Chip, Divider, Avatar, Skeleton
} from '@mui/material';
import { format } from 'date-fns';
import BusinessIcon from '@mui/icons-material/Business';

// Helper function to format dates nicely, handling nulls
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try { return format(new Date(dateString), 'PPpp'); }
    catch (e) { console.error("Date formatting error:", e); return dateString; }
};

// Helper to get initials from name
const getInitials = (name = '') => {
    return (name || '').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

// Construct API base URL for logo endpoint
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

const ViewClubDialog = ({ open, onClose, clubData }) => {

    const isLoading = !clubData;
    const clubInitials = isLoading ? '' : getInitials(clubData?.name);
    const clubLogoUrl = isLoading ? null : (
        clubData?.has_logo
        ? `${API_BASE_URL}/platform-admin/clubs/${clubData.club_id}/logo?t=${Date.now()}`
        : null
    );

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
             <DialogTitle>{isLoading ? "Loading Club Details..." : `Club Details: ${clubData?.name || ''}`}</DialogTitle>
             <DialogContent dividers>
                <Grid container spacing={2} alignItems="flex-start">

                    {/* Club Logo / Avatar */}
                    <Grid item xs={12} sm={3} sx={{ display: 'flex', justifyContent: 'center', alignItems:'center', flexDirection:'column', mb: { xs: 2, sm: 0 } }}>
                        {isLoading ? ( <Skeleton variant="rounded" width={100} height={100} /> ) : (
                            <Avatar sx={{ width: 100, height: 100, fontSize: '2.5rem', bgcolor: clubLogoUrl ? 'transparent' : 'secondary.main', borderRadius: '8px' }} src={clubLogoUrl} alt={`${clubData?.name || 'Club'} Logo`} variant="rounded" >
                                {!clubLogoUrl && (clubInitials || <BusinessIcon />)}
                            </Avatar>
                        )}
                         <Typography variant="caption" color="textSecondary" sx={{mt: 1}}>{isLoading ? <Skeleton width={80} /> : `Club ID: ${clubData.club_id}`}</Typography>
                    </Grid>

                    {/* Club Details Grid */}
                    <Grid item xs={12} sm={9}>
                        <Grid container spacing={2}>
                            {/* Basic Info */}
                            <Grid item xs={12} sm={6}> <Typography variant="overline" color="textSecondary">Club Name</Typography> {isLoading ? <Skeleton/> : <Typography variant="h6">{clubData.name || '-'}</Typography>} </Grid>
                            <Grid item xs={12} sm={6}> <Typography variant="overline" color="textSecondary">Subdomain</Typography> {isLoading ? <Skeleton/> : <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{clubData.subdomain || '-'}.teamzy.app</Typography>} </Grid>
                            <Grid item xs={12}><Divider sx={{ my: 1 }} light /></Grid>

                            {/* Contact Info */}
                             <Grid item xs={12} sm={6}> <Typography variant="overline" color="textSecondary">Primary Contact</Typography> {isLoading ? <Skeleton width="80%"/> : <Typography variant="body1">{`${clubData.primary_contact_first_name || ''} ${clubData.primary_contact_last_name || ''}`.trim() || '-'}</Typography>} </Grid>
                             <Grid item xs={12} sm={6}> <Typography variant="overline" color="textSecondary">Primary Contact Email</Typography> {isLoading ? <Skeleton width="90%"/> : <Typography variant="body1">{clubData.primary_contact_email || '-'}</Typography>} </Grid>
                             <Grid item xs={12} sm={6}> <Typography variant="overline" color="textSecondary">Club Contact Email</Typography> {isLoading ? <Skeleton width="90%"/> : <Typography variant="body1">{clubData.contact_email || '-'}</Typography>} </Grid>
                             <Grid item xs={12} sm={6}> <Typography variant="overline" color="textSecondary">Club Contact Phone</Typography> {isLoading ? <Skeleton width="70%"/> : <Typography variant="body1">{clubData.contact_phone || '-'}</Typography>} </Grid>
                             <Grid item xs={12}> <Typography variant="overline" color="textSecondary">Address</Typography> {isLoading ? <Skeleton height={40}/> : <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{clubData.address || '-'}</Typography>} </Grid>
                             <Grid item xs={12}><Divider sx={{ my: 1 }} light /></Grid>

                            {/* --- Status & Subscription (Using Flexbox) --- */}
                            <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                 <Typography variant="overline" color="textSecondary" component="span">Platform Status:</Typography>
                                 {isLoading ? <Skeleton width={60}/> : <Chip label={clubData.is_active ? 'Active' : 'Inactive'} color={clubData.is_active ? 'success' : 'default'} size="small" variant={clubData.is_active ? 'filled' : 'outlined'} />}
                            </Grid>
                             <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="overline" color="textSecondary" component="span">Subscription Tier:</Typography>
                                {isLoading ? <Skeleton width={70}/> : <Chip label={clubData.subscription_tier || '-'} color="info" size="small" variant="outlined" />}
                            </Grid>
                             <Grid item xs={12} sm={4} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="overline" color="textSecondary" component="span">Subscription Status:</Typography>
                                {isLoading ? <Skeleton width={80}/> : <Chip label={clubData.subscription_status || '-'} color={clubData.subscription_status === 'active' ? 'success' : 'default'} size="small" variant="outlined" />}
                            </Grid>
                            {/* --- End Status & Subscription --- */}


                            <Grid item xs={12}><Divider sx={{ my: 1 }} light /></Grid>

                            {/* Timestamps & Creator */}
                             <Grid item xs={12} sm={6}> <Typography variant="overline" color="textSecondary">Created By</Typography> {isLoading ? <Skeleton width="80%"/> : <Typography variant="body2">{clubData.created_by_admin_email || '-'}</Typography>} </Grid>
                             <Grid item xs={12} sm={6}> <Typography variant="overline" color="textSecondary">Account Created</Typography> {isLoading ? <Skeleton /> : <Typography variant="body2">{formatDate(clubData.created_at)}</Typography>} </Grid>
                             <Grid item xs={12} sm={6}> <Typography variant="overline" color="textSecondary">Last Updated</Typography> {isLoading ? <Skeleton /> : <Typography variant="body2">{formatDate(clubData.updated_at)}</Typography>} </Grid>

                        </Grid>
                    </Grid>

                </Grid>
            </DialogContent>
             <DialogActions sx={{ padding: '16px 24px' }}>
                <Button onClick={onClose} color="primary" variant="outlined"> Close </Button>
             </DialogActions>
        </Dialog>
    );
};

ViewClubDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    clubData: PropTypes.object,
};

export default ViewClubDialog;