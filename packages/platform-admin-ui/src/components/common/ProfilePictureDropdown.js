// Canvas: packages/platform-admin-ui/src/components/common/ProfilePictureDropdown.js (Verified Tooltip Structure)

import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom'; // Include useNavigate
import { useAuth } from '../../contexts/AuthContext'; // Adjust path if needed

// MUI Imports
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip'; // Optional: for hover text

function ProfilePictureDropdown() {
    const { user, logout } = useAuth();
    const navigate = useNavigate(); // Get navigate function
    const [anchorElUser, setAnchorElUser] = useState(null); // Anchor element for Menu

    // API Base URL from environment variables
    const apiBaseUrl = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');

    // Construct profile picture URL safely with cache-busting timestamp
    const profilePicUrl = user?.has_profile_picture && user?.userId
        ? `${apiBaseUrl}/users/${user.userId}/profile-picture?t=${Date.now()}`
        : null; // Use null if no picture or user ID

    // Function to generate initials for fallback avatar
    const getInitials = (fname, lname) => {
        const firstName = fname || '';
        const lastName = lname || '';
        // Handle cases with only one name or no names
        if (!firstName && !lastName) return '?';
        if (!lastName) return firstName.charAt(0).toUpperCase();
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    };

    const handleOpenUserMenu = (event) => {
        setAnchorElUser(event.currentTarget);
    };

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    const handleLogout = () => {
        handleCloseUserMenu(); // Close menu first
        logout(); // Call context logout to clear state and token
        navigate('/login', { replace: true }); // Explicitly navigate to login after logout
    };

    if (!user) {
        return null; // Don't render if user data isn't loaded yet
    }

    return (
        <Box sx={{ flexGrow: 0 }}> {/* Container for the dropdown trigger */}
            {/* Tooltip wraps ONLY the IconButton */}
            <Tooltip title="Open settings">
                 <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}> {/* Remove padding for tight fit */}
                     <Avatar
                         alt={`${user.firstName || ''} ${user.lastName || ''}`}
                         src={profilePicUrl} // Avatar handles null src gracefully
                         sx={{ width: 40, height: 40 }} // Consistent size
                     >
                         {/* Fallback initials shown automatically if src is invalid/null */}
                         {!profilePicUrl && getInitials(user.firstName, user.lastName)}
                     </Avatar>
                 </IconButton>
            </Tooltip>
            {/* End Tooltip Wrapper */}

            <Menu
                sx={{ mt: '45px' }} // Offset menu slightly below avatar
                id="menu-appbar"
                anchorEl={anchorElUser} // Element menu is anchored to
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                keepMounted // Better for SEO and accessibility
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                open={Boolean(anchorElUser)} // Menu is open if anchorElUser is not null
                onClose={handleCloseUserMenu} // Function to close the menu
            >
                {/* User Info Section */}
                <Box sx={{ px: 2, py: 1 }}>
                     <Typography variant="subtitle1" component="div" noWrap>
                         {user.firstName} {user.lastName}
                     </Typography>
                      <Typography variant="caption" component="div" color="text.secondary" noWrap>
                         {user.email}
                     </Typography>
                 </Box>
                <Divider sx={{ my: 0.5 }} />

                {/* Menu Items */}
                <MenuItem
                    onClick={handleCloseUserMenu}
                    component={RouterLink} // Use React Router Link
                    to="/profile"
                >
                    <Typography textAlign="center">My Profile</Typography>
                </MenuItem>
                <MenuItem
                     onClick={handleCloseUserMenu}
                     component={RouterLink}
                     to="/settings" // Ensure this matches a valid route in App.js
                >
                    <Typography textAlign="center">Settings</Typography>
                </MenuItem>
                 <MenuItem
                     onClick={handleCloseUserMenu}
                     component={RouterLink}
                     to="/preferences" // Ensure this matches a valid route in App.js
                >
                    <Typography textAlign="center">Preferences</Typography>
                </MenuItem>

                <Divider sx={{ my: 0.5 }} />

                 <MenuItem onClick={handleLogout}> {/* Logout is an action, not a link */}
                    <Typography textAlign="center" color="error">Logout</Typography> {/* Optional: error color */}
                </MenuItem>
            </Menu>
        </Box>
    );
}

export default ProfilePictureDropdown;