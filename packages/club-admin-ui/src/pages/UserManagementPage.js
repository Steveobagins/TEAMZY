// packages/club-admin-ui/src/pages/UserManagementPage.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DataGrid, GridToolbar } from '@mui/x-data-grid'; // Use @mui/x-data-grid
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar'; // Simple Snackbar for now
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

// MUI Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert'; // Example for actions menu

// Import API functions - ADJUST PATHS AS NEEDED
import { getClubUsers, inviteClubUser } from '../services/api';

// Import Dialog - ADJUST PATHS AS NEEDED
import InviteUserDialog from '../components/users/InviteUserDialog';

// Helper function to map user status to Chip color
const getStatusChipProps = (status) => {
    switch (status?.toUpperCase()) {
        case 'ACTIVE': return { label: 'Active', color: 'success' };
        case 'INVITED': return { label: 'Invited', color: 'warning' };
        case 'INACTIVE': return { label: 'Inactive', color: 'default' };
        default: return { label: status || 'Unknown', color: 'secondary' };
    }
};

// Define columns (with defensive checks)
const columns = (handleEdit, handleDelete, handleActionsMenu) => [
    { field: 'userId', headerName: 'ID', width: 90, hide: true },
    {
        field: 'fullName', headerName: 'Name', width: 200,
        valueGetter: (params) => {
            if (!params || !params.row) { return ''; }
            return `${params.row.firstName || ''} ${params.row.lastName || ''}`;
        }
    },
    { field: 'email', headerName: 'Email', width: 250 },
    { field: 'primary_role', headerName: 'Role', width: 130 },
    {
        field: 'status', headerName: 'Status', width: 150,
        renderCell: (params) => {
            const chipProps = getStatusChipProps(params.value);
            return <Chip size="small" {...chipProps} />;
        },
    },
    {
        field: 'created_at', headerName: 'Joined Date', type: 'dateTime', width: 180,
        valueGetter: (params) => params.value ? new Date(params.value) : null,
    },
    {
      field: 'actions', headerName: 'Actions', type: 'actions', width: 100, sortable: false, filterable: false,
      renderCell: (params) => {
           if (!params || !params.row || !params.row.userId) { return null; }
           const isOpenCheck = handleActionsMenu?.isOpen || (() => false);
           const handleClick = handleActionsMenu?.handleClick || (() => {});
           const menuId = `actions-menu-${params.row.userId}`;
           return (
               <Box>
                   <IconButton
                       size="small" aria-label="more actions" id={`actions-button-${params.row.userId}`}
                       aria-controls={isOpenCheck(menuId) ? menuId : undefined}
                       aria-haspopup="true" aria-expanded={isOpenCheck(menuId) ? 'true' : undefined}
                       onClick={(e) => handleClick(e, menuId, params.row)}
                   > <MoreVertIcon fontSize="inherit" /> </IconButton>
               </Box>
           );
       },
    },
];


function UserManagementPage() {
    // DataGrid State - Starts at page 0 (first page)
    const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [rowCount, setRowCount] = useState(0);
    const [sortModel, setSortModel] = useState([]);

    // Invite Dialog State
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    // Snackbar State
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    // Action Menu State
    const [anchorEl, setAnchorEl] = useState(null);
    const [currentMenuId, setCurrentMenuId] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);

    // Mounted Ref
    const isMounted = useRef(true);
    useEffect(() => { isMounted.current = true; return () => { isMounted.current = false; }; }, []);

    // --- Data Fetching ---
    const fetchUsersData = useCallback(async () => {
        if (!isMounted.current) return;
        setLoading(true);
        setError(null);

        const currentPageForApi = paginationModel.page + 1; // Calculate 1-based page for API

        // --- Log state just before calculation ---
        console.debug(`[fetchUsersData] paginationModel state:`, paginationModel);
        console.debug(`[fetchUsersData] Requesting API Page: ${currentPageForApi}`);

        const params = {
            page: currentPageForApi,
            pageSize: paginationModel.pageSize,
        };
        if (sortModel.length > 0) { params.sort = sortModel[0].field; params.order = sortModel[0].sort; }

        try {
            console.debug("[fetchUsersData] Calling getClubUsers with params:", params);
            const data = await getClubUsers(params);
            console.debug("[fetchUsersData] Received API data:", data);

            if (isMounted.current) {
                // Validate response structure slightly more defensively
                const receivedUsers = data?.users || [];
                const total = data?.totalCount || 0;
                 console.debug(`[fetchUsersData] API reported ${receivedUsers.length} users for page ${data?.page}, total ${total}`);

                const usersWithId = receivedUsers.map(u => ({ ...u, id: u.userId }));
                setUsers(usersWithId);
                setRowCount(total);

                // --- Add check for empty results on non-first pages ---
                if (currentPageForApi > 1 && usersWithId.length === 0 && total > 0) {
                     console.warn(`[fetchUsersData] Received 0 users for page ${currentPageForApi}, but totalCount is ${total}. Check API pagination logic or RLS.`);
                     // Optional: Automatically go back to first page?
                     // setPaginationModel(prev => ({ ...prev, page: 0 }));
                 }
            }
        } catch (err) {
             console.error("[fetchUsersData] Failed:", err);
            if (isMounted.current) {
                setError(err?.response?.data?.message || err?.message || "Could not load users.");
                setUsers([]);
                setRowCount(0);
            }
        } finally {
            if (isMounted.current) { setLoading(false); }
        }
    }, [paginationModel, sortModel]);

    // Initial fetch and re-fetch on model changes
    useEffect(() => {
        console.debug("[Effect] Running fetchUsersData due to change in dependencies.");
        fetchUsersData();
    }, [fetchUsersData]);

    // --- Event Handlers ---
    const handlePaginationModelChange = (newModel) => {
        if (isMounted.current) {
             // --- Log what DataGrid sends ---
            console.debug("[handlePaginationModelChange] Received newModel from DataGrid:", newModel);
            setPaginationModel(newModel);
        }
    };

    const handleSortModelChange = (newModel) => {
        if (isMounted.current) {
            console.debug("[handleSortModelChange] Received newModel:", newModel);
            setSortModel(newModel);
        }
    };

    // Other handlers (Invite, Snackbar, Actions Menu) remain the same...
    const handleOpenInviteDialog = () => setIsInviteDialogOpen(true);
    const handleCloseInviteDialog = () => setIsInviteDialogOpen(false);
    const handleInviteSuccess = () => { if (isMounted.current) { showSnackbar('Invitation sent successfully!', 'success'); fetchUsersData(); }};
    const handleInviteError = (errorMessage) => { if (isMounted.current) { showSnackbar(errorMessage || 'Failed to send invitation.', 'error'); }};
    const showSnackbar = (message, severity = 'info') => { if (isMounted.current) { setSnackbar({ open: true, message, severity }); }};
    const handleCloseSnackbar = (event, reason) => { if (reason === 'clickaway') return; if (isMounted.current) setSnackbar({ ...snackbar, open: false }); };
    const handleEditUser = (user) => { console.log("Edit user:", user); showSnackbar(`Edit action for ${user.email} needs implementation.`, 'warning'); };
    const handleDeleteUser = (user) => { console.log("Delete user:", user); showSnackbar(`Delete action for ${user.email} needs implementation.`, 'warning'); };
    const handleResendInvite = async (user) => {
        if (!user || user.status?.toUpperCase() !== 'INVITED') { showSnackbar('Cannot resend invite.', 'warning'); return; }
        console.log("Resend invite:", user); showSnackbar(`Resending invite to ${user.email}...`, 'info');
        try { /* TODO: await resendClubUserInvite(user.userId); */ await new Promise(r => setTimeout(r, 1000)); showSnackbar('Invite resent.', 'success'); }
        catch (error) { console.error("Resend failed:", error); showSnackbar(error?.response?.data?.message || 'Failed to resend invite.', 'error'); }
    };
    const handleActionsMenuClick = useCallback((event, menuId, user) => { setAnchorEl(event.currentTarget); setCurrentMenuId(menuId); setSelectedUser(user); }, []);
    const handleActionsMenuClose = useCallback(() => { setAnchorEl(null); setCurrentMenuId(null); setSelectedUser(null); }, []);
    const handleMenuAction = useCallback((action) => {
        const user = selectedUser; handleActionsMenuClose(); if (!user) return;
        console.debug(`Menu action '${action}' for user:`, user);
        switch(action) {
            case 'edit': handleEditUser(user); break;
            case 'delete': handleDeleteUser(user); break;
            case 'resend': handleResendInvite(user); break;
            default: console.warn("Unknown menu action:", action);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedUser, handleActionsMenuClose]);
    const isActionsMenuOpen = useCallback((menuId) => Boolean(anchorEl && currentMenuId === menuId), [anchorEl, currentMenuId]);
    const columnActionHandlers = React.useMemo(() => ({ handleClick: handleActionsMenuClick, isOpen: isActionsMenuOpen }), [handleActionsMenuClick, isActionsMenuOpen]);
    const memoizedColumns = React.useMemo(() => columns(handleEditUser, handleDeleteUser, columnActionHandlers), [columnActionHandlers]);


    return (
        <Box sx={{ width: '100%' }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1"> User Management </Typography>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenInviteDialog}> Invite User </Button>
            </Box>

            {/* Error Display */}
            {error && <Alert severity="error" sx={{ mb: 2 }}> {error} </Alert>}

            {/* DataGrid */}
            <Box sx={{ height: 'calc(100vh - 240px)', width: '100%' }}>
                <DataGrid
                    rows={users}
                    columns={memoizedColumns}
                    rowCount={rowCount}
                    loading={loading}
                    paginationMode="server"
                    sortingMode="server"
                    pageSizeOptions={[10, 25, 50, 100]}
                    paginationModel={paginationModel} // Controlled by state
                    onPaginationModelChange={handlePaginationModelChange} // Updates state
                    sortModel={sortModel}
                    onSortModelChange={handleSortModelChange}
                    getRowId={(row) => row.userId}
                    checkboxSelection={false}
                    disableRowSelectionOnClick
                    slots={{ toolbar: GridToolbar }}
                    slotProps={{ toolbar: { showQuickFilter: true, quickFilterProps: { debounceMs: 500 } } }}
                    // --- REMOVED pagination FROM initialState ---
                    initialState={{
                        columns: { columnVisibilityModel: { userId: false } },
                    }}
                    sx={{ border: 0 /* other styling */ }}
                />
            </Box>

            {/* Dialogs, Menus, Snackbar */}
            {isInviteDialogOpen && <InviteUserDialog open={isInviteDialogOpen} onClose={handleCloseInviteDialog} onSuccess={handleInviteSuccess} onError={handleInviteError} />}
            <Menu id={currentMenuId || 'user-actions-menu-fallback'} anchorEl={anchorEl} open={Boolean(anchorEl && selectedUser)} onClose={handleActionsMenuClose} MenuListProps={{ 'aria-labelledby': currentMenuId ? `actions-button-${selectedUser?.userId}` : undefined }} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
                 <MenuItem onClick={() => handleMenuAction('edit')}> <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon> <ListItemText>Edit User</ListItemText> </MenuItem>
                 {selectedUser?.status?.toUpperCase() === 'INVITED' && ( <MenuItem onClick={() => handleMenuAction('resend')}> <ListItemText>Resend Invite</ListItemText> </MenuItem> )}
                 <MenuItem onClick={() => handleMenuAction('delete')} sx={{ color: 'error.main' }}> <ListItemIcon sx={{ color: 'error.main' }}><DeleteIcon fontSize="small" /></ListItemIcon> <ListItemText>Remove User</ListItemText> </MenuItem>
            </Menu>
            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }} variant="filled"> {snackbar.message} </Alert>
            </Snackbar>
        </Box>
    );
}

export default UserManagementPage;