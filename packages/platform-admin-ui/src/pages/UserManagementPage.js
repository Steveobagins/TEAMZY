// Canvas: packages/platform-admin-ui/src/pages/UserManagementPage.js
// --- Reinstated showInMenu to make actions appear in dropdown menu ---

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Card, CardContent, CircularProgress, Alert, Button,
    IconButton, Tooltip, Chip, Snackbar, Fade, Grid
} from '@mui/material';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import LockResetIcon from '@mui/icons-material/LockReset';
import api from '../services/api';
import ConfirmationDialog from '../components/common/ConfirmationDialog'; // Corrected path assuming common folder
import AddUserDialog from '../components/dialogs/AddUserDialog'; // Assuming dialogs folder
import ViewUserDialog from '../components/dialogs/ViewUserDialog'; // Assuming dialogs folder
import EditUserDialog from '../components/dialogs/EditUserDialog'; // Assuming dialogs folder
import { useAuth } from '../contexts/AuthContext';

const UserManagementPage = () => {
    // --- State variables ---
    const [users, setUsers] = useState([]);
    const [gridLoading, setGridLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user: currentUser } = useAuth();
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
    const [rowCount, setRowCount] = useState(0);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');
    const [confirmToggleOpen, setConfirmToggleOpen] = useState(false);
    const [toggleTarget, setToggleTarget] = useState({ id: null, currentStatus: null });
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [deleteTargetId, setDeleteTargetId] = useState(null);
    const [deleteTargetEmail, setDeleteTargetEmail] = useState('');
    const [deleteTargetLastName, setDeleteTargetLastName] = useState('');
    const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
    const [isViewUserDialogOpen, setIsViewUserDialogOpen] = useState(false);
    const [selectedUserData, setSelectedUserData] = useState(null);
    const [viewUserLoading, setViewUserLoading] = useState(false);
    const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
    const [editTargetUserId, setEditTargetUserId] = useState(null);
    const [confirmResetOpen, setConfirmResetOpen] = useState(false);
    const [resetTargetId, setResetTargetId] = useState(null);
    const [resetTargetEmail, setResetTargetEmail] = useState('');

    // --- Snackbar Handlers ---
    const showSnackbar = (message, severity = 'info') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
        if (error && severity !== 'error') setError(null);
    };
    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };

    // --- Fetch Users ---
    const fetchUsers = useCallback(async () => {
        setGridLoading(true);
        // console.log(`Fetching platform users... Page: ${paginationModel.page + 1}, Limit: ${paginationModel.pageSize}`);
        try {
            const params = {
                page: paginationModel.page + 1,
                limit: paginationModel.pageSize
            };
            const response = await api.get('/platform-admin/users', { params });
            setUsers(response.data?.users || []);
            setRowCount(response.data?.totalCount || response.data?.pagination?.totalCount || response.data?.pagination?.totalUsers || 0);
            if (error) setError(null);
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch users.';
            console.error("Failed to fetch users:", err.response || err);
            setError(errorMsg);
            setUsers([]);
            setRowCount(0);
        } finally {
            setGridLoading(false);
        }
    }, [paginationModel, error]);

    useEffect(() => {
        fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paginationModel]);

    // --- Action Handlers (View, Edit) ---
    const handleViewDetails = async (id) => {
        // console.log(`Attempting to view details for user ${id}`);
        setViewUserLoading(true);
        setError(null);
        setSelectedUserData(null);
        setIsViewUserDialogOpen(true);
        try {
            const response = await api.get(`/platform-admin/users/${id}`);
            setSelectedUserData(response.data);
            // console.log("Fetched user details:", response.data);
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch user details.';
            console.error(`Failed to fetch details for user ${id}:`, err.response || err);
            showSnackbar(errorMsg, 'error');
            setIsViewUserDialogOpen(false);
        } finally {
            setViewUserLoading(false);
        }
    };
    const handleEditUser = (id) => {
        // console.log(`Opening edit dialog for user ${id}`);
        setEditTargetUserId(id);
        setIsEditUserDialogOpen(true);
    };

    // --- Toggle Status Handlers ---
    const handleToggleActive = (id, currentStatus) => {
        setToggleTarget({ id, currentStatus });
        setConfirmToggleOpen(true);
    };
    const handleCloseToggleConfirm = () => {
        setConfirmToggleOpen(false);
    };
    const confirmToggleActive = async () => {
        const { id, currentStatus } = toggleTarget;
        if (!id) return;
        const action = currentStatus ? 'Deactivate' : 'Activate';
        // console.log(`CONFIRMED: Attempting to ${action} user ${id}...`);
        handleCloseToggleConfirm();
        try {
            const response = await api.put(`/platform-admin/users/${id}/status`);
            showSnackbar(response.data?.message || `${action} successful!`, 'success');
            fetchUsers();
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || `Failed to ${action.toLowerCase()} user.`;
            console.error(`Toggle active error for user ${id}:`, err.response || err);
            showSnackbar(errorMsg, 'error');
        }
    };

    // --- Delete User Handlers ---
    const handleDeleteUser = (id, email, lastName) => {
        if (currentUser && currentUser.userId === id) {
            showSnackbar('You cannot delete your own account.', 'warning');
            return;
        }
        setDeleteTargetId(id);
        setDeleteTargetEmail(email);
        setDeleteTargetLastName(lastName || '');
        setConfirmDeleteOpen(true);
    };
    const handleCloseDeleteConfirm = () => {
        setConfirmDeleteOpen(false);
        setTimeout(() => {
            setDeleteTargetId(null);
            setDeleteTargetEmail('');
            setDeleteTargetLastName('');
        }, 150);
    };
    const confirmDeleteUser = async () => {
        if (!deleteTargetId) return;
        // console.log(`CONFIRMED: Attempting to DELETE user ${deleteTargetId}...`);
        const targetIdToDelete = deleteTargetId;
        handleCloseDeleteConfirm();
        try {
            setGridLoading(true);
            const response = await api.delete(`/platform-admin/users/${targetIdToDelete}`);
            showSnackbar(response.data?.message || 'User deleted successfully.', 'success');
            fetchUsers();
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Failed to delete user.';
            console.error(`Delete error for user ${targetIdToDelete}:`, err.response || err);
            showSnackbar(errorMsg, 'error');
        } finally {
            setGridLoading(false);
        }
    };

    // --- Add User Dialog Handlers ---
    const handleOpenAddUserDialog = () => {
        setIsAddUserDialogOpen(true);
    };
    const handleCloseAddUserDialog = () => {
        setIsAddUserDialogOpen(false);
    };
    const handleAddUserSuccess = (message) => {
        handleCloseAddUserDialog();
        showSnackbar(message, 'success');
        fetchUsers();
    };

    // --- View User Dialog Close Handler ---
    const handleCloseViewUserDialog = () => {
        setIsViewUserDialogOpen(false);
        setSelectedUserData(null);
    };

    // --- Edit User Dialog Handlers ---
    const handleCloseEditUserDialog = () => {
        setIsEditUserDialogOpen(false);
        setEditTargetUserId(null);
    };
    const handleEditUserSuccess = (message) => {
        handleCloseEditUserDialog();
        showSnackbar(message, 'success');
        fetchUsers();
    };

    // --- Request Password Reset Handlers ---
    const handleRequestPasswordReset = (id, email) => {
        setResetTargetId(id);
        setResetTargetEmail(email);
        setConfirmResetOpen(true);
    };
    const handleCloseResetConfirm = () => {
        setConfirmResetOpen(false);
         setTimeout(() => {
             setResetTargetId(null);
             setResetTargetEmail('');
         }, 150);
    };
    const confirmRequestPasswordReset = async () => {
        if (!resetTargetId) return;
        // console.log(`CONFIRMED: Attempting to request password reset for user ${resetTargetId}...`);
        const targetId = resetTargetId;
        handleCloseResetConfirm();
        try {
            const response = await api.post(`/platform-admin/users/${targetId}/request-password-reset`);
            showSnackbar(response.data?.message || 'Password reset email sent.', 'success');
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Failed to send password reset email.';
            console.error(`Request password reset error for user ${targetId}:`, err.response || err);
            showSnackbar(errorMsg, 'error');
        }
    };

    // --- Columns Definition ---
    const columns = React.useMemo(() => [
        { field: 'firstName', headerName: 'First Name', width: 120 },
        { field: 'lastName', headerName: 'Last Name', width: 120 },
        { field: 'email', headerName: 'Email', flex: 1, minWidth: 180 },
        { field: 'primary_role', headerName: 'Role', width: 120 },
        { field: 'club_name', headerName: 'Club', width: 140, valueGetter: (value, row) => row.club_name || 'N/A' },
        {
            field: 'isActive',
            headerName: 'Status',
            width: 90,
            renderCell: (params) => (
                <Chip label={params.value ? 'Active' : 'Inactive'} color={params.value ? 'success' : 'default'} size="small" variant={params.value ? "filled" : "outlined"} />)
        },
        {
            field: 'createdAt',
            headerName: 'Created',
            type: 'dateTime',
            width: 100,
            valueGetter: (value) => value ? new Date(value) : null,
            renderCell: (params) => params.value ? params.value.toLocaleDateString() : ''
        },
        {
            field: 'actions',
            headerName: 'Actions',
            type: 'actions',
            width: 100, // <<< Reduced width as only ... icon is shown
            getActions: (params) => {
                 const isActive = params.row.isActive === true;
                 const isCurrentUser = currentUser && currentUser.userId === params.id;

                 // Return array of action items - ALL with showInMenu prop
                 return [
                     <GridActionsCellItem
                        key={`view-${params.id}`}
                        icon={<VisibilityIcon />}
                        label="View Details"
                        onClick={() => handleViewDetails(params.id)}
                        showInMenu // <<< ADDED BACK
                     />,
                     <GridActionsCellItem
                        key={`edit-${params.id}`}
                        icon={<EditIcon />}
                        label="Edit"
                        onClick={() => handleEditUser(params.id)}
                        showInMenu // <<< ADDED BACK
                     />,
                      <GridActionsCellItem
                        key={`toggle-${params.id}`}
                        icon={isActive ? <ToggleOffIcon /> : <ToggleOnIcon />}
                        label={isActive ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggleActive(params.id, isActive)}
                        showInMenu // <<< ADDED BACK
                        sx={{ color: isActive ? 'text.secondary' : 'success.main' }} // Style text color in menu
                        disabled={isCurrentUser}
                     />,
                     <GridActionsCellItem
                        key={`reset-${params.id}`}
                        icon={<LockResetIcon />}
                        label="Send Password Reset"
                        onClick={() => handleRequestPasswordReset(params.id, params.row.email)}
                        showInMenu // <<< ADDED BACK
                     />,
                     <GridActionsCellItem
                        key={`delete-${params.id}`}
                        icon={<DeleteIcon />}
                        label="Delete User"
                        onClick={() => handleDeleteUser(params.id, params.row.email, params.row.lastName)}
                        showInMenu // <<< ADDED BACK
                        sx={{ color: 'error.main' }} // Style text color in menu
                        disabled={isCurrentUser}
                     />,
                 ];
            }
        },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ], [currentUser]);


    return (
        <>
            {/* Snackbar */}
            <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleSnackbarClose} TransitionComponent={Fade} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%', boxShadow: 6 }} variant="filled">
                    {snackbarMessage}
                </Alert>
            </Snackbar>

            {/* Dialogs */}
            <ConfirmationDialog
                open={confirmToggleOpen}
                onClose={handleCloseToggleConfirm}
                onConfirm={confirmToggleActive}
                title="Confirm Status Change"
                message={`Are you sure you want to ${toggleTarget.currentStatus ? 'DEACTIVATE' : 'ACTIVATE'} this user?`}
                confirmText={toggleTarget.currentStatus ? 'Deactivate' : 'Activate'}
                confirmColor={toggleTarget.currentStatus ? 'warning' : 'success'}
            />
            <ConfirmationDialog
                open={confirmDeleteOpen}
                onClose={handleCloseDeleteConfirm}
                onConfirm={confirmDeleteUser}
                title="Confirm User Deletion"
                message={`To confirm deletion of "${deleteTargetEmail || 'this user'}", please type their last name below.`}
                confirmText="Delete User Permanently"
                confirmColor="error"
                confirmationValue={deleteTargetLastName}
                confirmationLabel={`Type "${deleteTargetLastName}" to confirm`}
            />
            <AddUserDialog
                open={isAddUserDialogOpen}
                onClose={handleCloseAddUserDialog}
                onSuccess={handleAddUserSuccess}
            />
            {isViewUserDialogOpen && (
                <ViewUserDialog
                    open={isViewUserDialogOpen}
                    onClose={handleCloseViewUserDialog}
                    userData={viewUserLoading ? null : selectedUserData}
                    isLoading={viewUserLoading}
                />
            )}
            {isEditUserDialogOpen && editTargetUserId && (
                <EditUserDialog
                    open={isEditUserDialogOpen}
                    onClose={handleCloseEditUserDialog}
                    onSuccess={handleEditUserSuccess}
                    userId={editTargetUserId}
                />
            )}
             <ConfirmationDialog
                 open={confirmResetOpen}
                 onClose={handleCloseResetConfirm}
                 onConfirm={confirmRequestPasswordReset}
                 title="Confirm Password Reset"
                 message={`Are you sure you want to send a password reset email to "${resetTargetEmail || 'this user'}"? They will receive a link to set a new password.`}
                 confirmText="Send Reset Email"
                 confirmColor="warning"
             />


            {/* Header */}
            <Grid container justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                <Grid item>
                    <Typography variant="h4" gutterBottom sx={{ mb: { xs: 1, sm: 0 } }}>
                        User Management (Platform)
                    </Typography>
                </Grid>
                <Grid item>
                    <Button
                        variant="contained"
                        startIcon={<AddCircleOutlineIcon />}
                        onClick={handleOpenAddUserDialog}
                    >
                        Add Administrator
                    </Button>
                </Grid>
            </Grid>

            {/* Data Grid */}
            <Card elevation={2}>
                <CardContent sx={{ p: { xs: 1, sm: 2 } }}>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <Box sx={{ height: 'calc(100vh - 220px)', width: '100%' }}>
                         <DataGrid
                            loading={gridLoading}
                            rows={users}
                            columns={columns}
                            getRowId={(row) => row.userId}
                            paginationMode="server"
                            rowCount={rowCount}
                            pageSizeOptions={[10, 25, 50]}
                            paginationModel={paginationModel}
                            onPaginationModelChange={setPaginationModel}
                            autoHeight={false}
                            density="compact"
                            disableRowSelectionOnClick
                            sx={{
                                '& .MuiDataGrid-columnHeaders': {
                                    backgroundColor: (theme) => theme.palette.action.hover,
                                    borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                                },
                                '& .MuiDataGrid-overlay': {
                                     position: 'absolute',
                                     top: 0,
                                     left: 0,
                                     right: 0,
                                     bottom: 0,
                                     backgroundColor: 'rgba(255, 255, 255, 0.7)',
                                 },
                                '& .MuiDataGrid-virtualScroller': {
                                    minHeight: '100px',
                                },
                                border: 0,
                                '& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within': {
                                    outline: 'none',
                                },
                                '& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
                                    outline: 'none',
                                },
                            }}
                         />
                    </Box>
                </CardContent>
            </Card>
        </>
    );
};

export default UserManagementPage;