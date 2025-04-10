// Canvas: packages/platform-admin-ui/src/pages/ClubManagementPage.js
// --- Removed placeholder function definitions at the end ---

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Card, CardContent, CircularProgress, Alert, Button,
    IconButton, Tooltip, Chip, Snackbar, Fade, Grid
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import api from '../services/api';
import ConfirmationDialog from '../components/common/ConfirmationDialog';
import CreateClubDialog from '../components/dialogs/CreateClubDialog';
import ViewClubDialog from '../components/dialogs/ViewClubDialog';
import EditClubDialog from '../components/dialogs/EditClubDialog'; // Import EditClubDialog

const ClubManagementPage = () => {
    const [clubs, setClubs] = useState([]);
    const [gridLoading, setGridLoading] = useState(true);
    const [error, setError] = useState(null);

    // Pagination State
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
    const [rowCount, setRowCount] = useState(0);

    // Snackbar State
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');

    // Dialog States
    const [confirmToggleOpen, setConfirmToggleOpen] = useState(false);
    const [toggleTarget, setToggleTarget] = useState({ id: null, currentStatus: null });
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [isViewClubDialogOpen, setIsViewClubDialogOpen] = useState(false);
    const [selectedClubData, setSelectedClubData] = useState(null);
    const [viewClubLoading, setViewClubLoading] = useState(false);
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [deleteTargetName, setDeleteTargetName] = useState('');
    const [isEditClubDialogOpen, setIsEditClubDialogOpen] = useState(false);
    const [editTargetClubId, setEditTargetClubId] = useState(null);

    // --- Snackbar Handlers ---
    const showSnackbar = (message, severity = 'info') => {
        setSnackbarMessage(message); setSnackbarSeverity(severity); setSnackbarOpen(true); if (error && severity !== 'error') setError(null);
    };
    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') return; setSnackbarOpen(false);
    };

    // --- Fetch Clubs (for Grid) ---
    const fetchClubs = useCallback(async () => {
        console.log("fetchClubs: Setting gridLoading to true");
        setGridLoading(true);
        console.log(`Attempting to fetch platform clubs... Page: ${paginationModel.page + 1}, Limit: ${paginationModel.pageSize}`);
        try {
            const params = { page: paginationModel.page + 1, limit: paginationModel.pageSize };
            console.log("fetchClubs: Making API call with params:", params);
            const response = await api.get('/platform-admin/clubs', { params });
            console.log("fetchClubs: API call successful, Status:", response.status);
            console.log("fetchClubs: Response data:", response.data);

            setClubs(response.data?.clubs || []); // Corrected state setter
            setRowCount(response.data?.pagination?.totalClubs || 0);
            if (error) { console.log("fetchClubs: Clearing previous error state."); setError(null); }
            console.log("fetchClubs: State updated with fetched data.");

        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch clubs.';
            console.error("fetchClubs: API call failed:", err.response || err);
            setError(errorMsg);
            setClubs([]); // Corrected state setter
            setRowCount(0);
            console.log("fetchClubs: State updated after error.");
        } finally {
            console.log("fetchClubs: Setting gridLoading to false in finally block.");
            setGridLoading(false);
        }
     // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paginationModel]);
    useEffect(() => { fetchClubs(); }, [fetchClubs]);

    // --- Action Handlers ---
    const handleOpenCreateDialog = () => { setIsCreateDialogOpen(true); };
    const handleCloseCreateDialog = () => { setIsCreateDialogOpen(false); };
    const handleCreateSuccess = (message) => { handleCloseCreateDialog(); showSnackbar(message, 'success'); fetchClubs(); };

    const handleViewDetails = async (id) => {
        console.log(`Attempting to view details for club ${id}`); setViewClubLoading(true); setError(null); setSelectedClubData(null); setIsViewClubDialogOpen(true); try { const response = await api.get(`/platform-admin/clubs/${id}`); setSelectedClubData(response.data); console.log("Fetched club details:", response.data); } catch (err) { const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch club details.'; console.error(`Failed to fetch details for club ${id}:`, err.response || err); showSnackbar(errorMsg, 'error'); setIsViewClubDialogOpen(false); } finally { setViewClubLoading(false); }
    };
    const handleEditClub = (id) => {
        console.log(`Opening edit dialog for club ${id}`); setEditTargetClubId(id); setIsEditClubDialogOpen(true);
    };

    // --- Toggle Status Handlers ---
    const handleToggleActive = (id, currentStatus) => { setToggleTarget({ id, currentStatus }); setConfirmToggleOpen(true); };
    const handleCloseToggleConfirm = () => { setConfirmToggleOpen(false); };
    const confirmToggleActive = async () => { const { id, currentStatus } = toggleTarget; if (!id) return; const action = currentStatus ? 'Deactivate' : 'Activate'; console.log(`CONFIRMED: Attempting to ${action} club ${id}...`); handleCloseToggleConfirm(); try { const response = await api.put(`/platform-admin/clubs/${id}/status`); showSnackbar(response.data?.message || `${action} successful!`, 'success'); fetchClubs(); } catch (err) { const errorMsg = err.response?.data?.message || err.message || `Failed to ${action.toLowerCase()} club.`; console.error(`Toggle active error for club ${id}:`, err.response || err); showSnackbar(errorMsg, 'error'); } };

    // --- Delete Club Handlers ---
    const handleDeleteClub = (id, name) => { setDeleteTargetId(id); setDeleteTargetName(name || ''); setConfirmDeleteOpen(true); };
    const handleCloseDeleteConfirm = () => { setConfirmDeleteOpen(false); setDeleteTargetId(null); setDeleteTargetName(''); };
    const confirmDeleteClub = async () => { if (!deleteTargetId) return; console.log(`CONFIRMED: Attempting to DELETE club ${deleteTargetId} and associated users...`); const targetId = deleteTargetId; handleCloseDeleteConfirm(); try { setGridLoading(true); const response = await api.delete(`/platform-admin/clubs/${targetId}`); showSnackbar(response.data?.message || 'Club deleted successfully.', 'success'); fetchClubs(); } catch (err) { const errorMsg = err.response?.data?.message || err.message || 'Failed to delete club.'; console.error(`Delete error for club ${targetId}:`, err.response || err); showSnackbar(errorMsg, 'error'); } finally { setGridLoading(false); } };

    // --- View Club Dialog Close Handler ---
    const handleCloseViewClubDialog = () => { setIsViewClubDialogOpen(false); setSelectedClubData(null); };

    // --- Edit Club Dialog Handlers ---
    const handleCloseEditClubDialog = () => { setIsEditClubDialogOpen(false); setEditTargetClubId(null); };
    const handleEditClubSuccess = (message) => { handleCloseEditClubDialog(); showSnackbar(message, 'success'); fetchClubs(); };

    // --- Columns Definition ---
    const columns = [
        { field: 'name', headerName: 'Club Name', flex: 1, minWidth: 150 },
        { field: 'subdomain', headerName: 'Subdomain', width: 120 },
        { field: 'primary_contact_email', headerName: 'Contact', flex: 1, minWidth: 180, valueGetter: (value) => value || '-' },
        { field: 'subscription_tier', headerName: 'Tier', width: 90 },
        { field: 'subscription_status', headerName: 'Subscription', width: 110, renderCell: (params) => { const status = params.value || 'N/A'; let c = 'default'; let v = 'outlined'; if (['active', 'trial'].includes(status)) {c='success'; v='filled';} else if (['past_due', 'unpaid'].includes(status)) {c='warning'; v='filled';} else if (['cancelled', 'expired', 'inactive','incomplete_expired'].includes(status)) {c='error';} else {v='filled';} const l = status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '); return <Chip label={l} color={c} size="small" variant={v} sx={{width:'100%', textAlign:'center'}}/>; } },
        { field: 'is_active', headerName: 'Platform Status', width: 100, renderCell: (params) => { const a = params.value === true; return <Chip label={a ? 'Active' : 'Inactive'} color={a ? 'success' : 'default'} size="small" variant={a ? 'filled' : 'outlined'} sx={{width:'100%', textAlign:'center'}} />; } },
        { field: 'created_at', headerName: 'Created', type: 'dateTime', width: 120, valueGetter: (value) => value ? new Date(value) : null, renderCell: (params) => params.value ? params.value.toLocaleDateString() : '' },
        { field: 'actions', headerName: 'Actions', type: 'actions', width: 100, getActions: (params) => {
                 const isActive = params.row.is_active === true;
                 return [
                     <GridActionsCellItem icon={<VisibilityIcon />} label="View Details" onClick={() => handleViewDetails(params.id)} showInMenu />,
                     <GridActionsCellItem icon={<EditIcon />} label="Edit Club" onClick={() => handleEditClub(params.id)} showInMenu />,
                     <GridActionsCellItem icon={isActive ? <ToggleOffIcon /> : <ToggleOnIcon />} label={isActive ? 'Deactivate' : 'Activate'} onClick={() => handleToggleActive(params.id, isActive)} showInMenu sx={{ color: isActive ? 'error.main' : 'success.main' }} />,
                     <GridActionsCellItem icon={<DeleteIcon />} label="Delete Club" onClick={() => handleDeleteClub(params.id, params.row.name)} showInMenu sx={{ color: 'error.main' }} />,
                 ];
            }
        },
    ];

     return (
         <>
             {/* Snackbar */}
             <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackbarClose} TransitionComponent={Fade} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%', boxShadow: 6 }} variant="filled"> {snackbarMessage} </Alert>
             </Snackbar>

             {/* Dialogs */}
             <ConfirmationDialog open={confirmToggleOpen} onClose={handleCloseToggleConfirm} onConfirm={confirmToggleActive} title="Confirm Status Change" message={`Are you sure you want to ${toggleTarget.currentStatus ? 'DEACTIVATE' : 'ACTIVATE'} this club?`} confirmText={toggleTarget.currentStatus ? 'Deactivate' : 'Activate'} confirmColor={toggleTarget.currentStatus ? 'warning' : 'success'} />
             <CreateClubDialog open={isCreateDialogOpen} onClose={handleCloseCreateDialog} onSuccess={handleCreateSuccess} />
             {isViewClubDialogOpen && ( <ViewClubDialog open={isViewClubDialogOpen} onClose={handleCloseViewClubDialog} clubData={viewClubLoading ? null : selectedClubData} /> )}
             <ConfirmationDialog open={confirmDeleteOpen} onClose={handleCloseDeleteConfirm} onConfirm={confirmDeleteClub} title="Confirm Club Deletion" message={`WARNING: This will permanently delete the club "${deleteTargetName}" AND ALL ASSOCIATED USERS. To confirm, type the club name below.`} confirmText="Delete Club Permanently" confirmColor="error" confirmationValue={deleteTargetName} confirmationLabel={`Type "${deleteTargetName}" to confirm`} />
             {isEditClubDialogOpen && editTargetClubId && ( <EditClubDialog open={isEditClubDialogOpen} onClose={handleCloseEditClubDialog} onSuccess={handleEditClubSuccess} clubId={editTargetClubId} /> )}

            {/* Header */}
            <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                 <Grid item> <Typography variant="h4" gutterBottom sx={{ mb: { xs: 1, sm: 0 } }}> Club Management </Typography> </Grid>
                 <Grid item> <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={handleOpenCreateDialog}> Create New Club </Button> </Grid>
            </Grid>

            {/* Data Grid */}
            <Card elevation={2}>
                <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <Box sx={{ height: 'calc(100vh - 240px)', width: '100%' }}>
                        <DataGrid
                            loading={gridLoading}
                            rows={clubs} // Use clubs state here
                            columns={columns}
                            getRowId={(row) => row.club_id}
                            paginationMode="server"
                            rowCount={rowCount}
                            pageSizeOptions={[10, 25, 50]}
                            paginationModel={paginationModel}
                            onPaginationModelChange={setPaginationModel}
                            autoHeight={false}
                            density="compact"
                            disableRowSelectionOnClick
                            sx={{ '& .MuiDataGrid-columnHeaders': { backgroundColor: (theme) => theme.palette.action.hover }, '& .MuiDataGrid-overlay': { height: 'auto !important' }, '& .MuiDataGrid-virtualScroller': { minHeight: '100px' }, border: (theme) => `1px solid ${theme.palette.divider}`, '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': { outline: 'none' }, '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': { outline: 'none' }, }}
                        />
                    </Box>
                </CardContent>
            </Card>
        </>
    );
};

export default ClubManagementPage;