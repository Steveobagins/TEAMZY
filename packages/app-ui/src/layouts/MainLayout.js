import React, { useState } from 'react';
import { Outlet } from 'react-router-dom'; // Changed from children prop to Outlet for nested routes
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Paper,
  BottomNavigation,
  BottomNavigationAction,
  IconButton, // For potential icons in AppBar
  // Menu as Popover for profile/logout in mobile AppBar
  Menu,
  MenuItem,
  Avatar, // For user avatar
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore'; // Example icon
import FavoriteIcon from '@mui/icons-material/Favorite'; // Example icon
import LocationOnIcon from '@mui/icons-material/LocationOn'; // Example icon
import AccountCircle from '@mui/icons-material/AccountCircle'; // Default user icon
import MenuIcon from '@mui/icons-material/Menu'; // Common mobile menu icon

import { useAuth } from '../contexts/AuthContext'; // To access user and logout

// Placeholder for dynamic logo fetching later
// import { useFetchPlatformLogo } from '../hooks/useFetchPlatformLogo';

function MainLayout() {
  const [bottomNavValue, setBottomNavValue] = useState(0); // State for bottom navigation
  const { user, logout } = useAuth();
  const [anchorEl, setAnchorEl] = useState(null); // State for profile menu anchor
  // const { logoSrc, loadingLogo } = useFetchPlatformLogo(); // Placeholder logo hook

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    logout();
    // Navigation to /login happens via ProtectedRoute/AuthContext effect
  };

  const renderProfileMenu = (
    <Menu
      anchorEl={anchorEl}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      keepMounted
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      open={Boolean(anchorEl)}
      onClose={handleMenuClose}
    >
      <MenuItem onClick={handleMenuClose} component="a" href="/profile"> {/* TODO: Update with React Router Link */}
          Profile
      </MenuItem>
      {/* Add other menu items like Settings if needed */}
      <MenuItem onClick={handleLogout}>Logout</MenuItem>
    </Menu>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Top Application Bar */}
      <AppBar position="sticky"> {/* Sticky AppBar */}
        <Toolbar variant="dense"> {/* dense variant is more compact */}
          {/* Potentially a menu icon for a drawer on mobile */}
          {/* <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 1 }} // Adjust margin if needed
          >
            <MenuIcon />
          </IconButton> */}

          {/* TODO: Add App Logo/Name here */}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Teamy
          </Typography>

          {/* Profile Icon/Menu */}
          <IconButton
            size="large"
            edge="end"
            aria-label="account of current user"
            aria-controls="profile-menu-appbar" // ID for menu accessibility
            aria-haspopup="true"
            onClick={handleMenuOpen}
            color="inherit"
          >
             {user?.profile_picture_url ? ( // TODO: Need profile pic URL logic
                  <Avatar sx={{ width: 32, height: 32 }} src={user.profile_picture_url} />
              ) : (
                  <AccountCircle />
              )}
          </IconButton>
        </Toolbar>
      </AppBar>
      {renderProfileMenu} {/* Render the menu itself */}

      {/* Main Content Area */}
      {/* Adjust paddingBottom to account for BottomNavigation height */}
      <Container
        component="main"
        maxWidth="lg" // Or restrict width further for mobile feel? 'sm' or 'xs'? Test needed.
        sx={{ flexGrow: 1, py: 2, px: 2, mb: '56px' }} // Added mb to avoid overlap with bottom nav
      >
        {/* Nested routes will render here */}
        <Outlet />
      </Container>

      {/* Bottom Navigation */}
      <Paper
        sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1100 }} // Fixed position, above content potentially
        elevation={3}
      >
        <BottomNavigation
          showLabels // Keep labels visible
          value={bottomNavValue}
          onChange={(event, newValue) => {
            setBottomNavValue(newValue);
            // TODO: Add navigation logic here based on 'newValue'
            // Example: if (newValue === 0) navigate('/dashboard');
            // Example: if (newValue === 1) navigate('/schedule');
            // Example: if (newValue === 2) navigate('/teams');
          }}
        >
          {/* TODO: Replace with actual app navigation items and icons */}
          <BottomNavigationAction label="Dashboard" icon={<RestoreIcon />} />
          <BottomNavigationAction label="Schedule" icon={<FavoriteIcon />} />
          <BottomNavigationAction label="Teams" icon={<LocationOnIcon />} />
          {/* Add more actions as needed */}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}

export default MainLayout;