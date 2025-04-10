// packages/club-admin-ui/src/layouts/Sidebar.js

import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Verify path is correct

// MUI Imports
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

// MUI Icons - Ensure all needed icons are imported
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People'; // For User Management
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer'; // For Teams
import EventIcon from '@mui/icons-material/Event'; // For Events
import ForumIcon from '@mui/icons-material/Forum'; // For Communication
import AssessmentIcon from '@mui/icons-material/Assessment'; // For Performance
import PaymentIcon from '@mui/icons-material/Payment'; // For Payments
// Add any other icons needed for Profile, Settings etc. if they were meant to be here
// import SettingsIcon from '@mui/icons-material/Settings';
// import AccountCircleIcon from '@mui/icons-material/AccountCircle';

const drawerWidth = 240; // Should match MainLayout.js

function Sidebar() {
    const { user } = useAuth();
    // Determine if the user is a CLUB_ADMIN for conditional rendering
    const isClubAdmin = user?.primary_role === 'CLUB_ADMIN';

    // Define menu items with text, icon, path, and admin restriction flag
    const menuItems = [
        { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', adminOnly: false },
        { text: 'Teams', icon: <SportsSoccerIcon />, path: '/teams', adminOnly: false },
        { text: 'Events', icon: <EventIcon />, path: '/events', adminOnly: false },
        { text: 'Communication', icon: <ForumIcon />, path: '/communication', adminOnly: false },
        { text: 'Performance', icon: <AssessmentIcon />, path: '/performance', adminOnly: false },
        { text: 'Payments', icon: <PaymentIcon />, path: '/payments', adminOnly: false },
        { text: 'User Management', icon: <PeopleIcon />, path: '/users', adminOnly: true }, // Only show to Admins
        // Consider adding links for Profile, Settings, Preferences if desired in sidebar:
        // { text: 'My Profile', icon: <AccountCircleIcon />, path: '/profile', adminOnly: false },
        // { text: 'Settings', icon: <SettingsIcon />, path: '/settings', adminOnly: false },
    ];

    const drawerContent = (
        // pt: 2 adds padding top, could use theme.spacing(2)
        <Box sx={{ overflow: 'auto', pt: 2 }}>
            <List>
                {menuItems.map((item) => (
                    // Conditionally render the item based on adminOnly flag and user role
                    (!item.adminOnly || isClubAdmin) && (
                        <ListItem key={item.text} disablePadding>
                            <ListItemButton
                                component={NavLink} // Use NavLink for active styling
                                to={item.path}
                                // Apply active styles using sx prop with a function
                                sx={(theme) => ({ // Pass theme for access to palette etc.
                                    pl: 3, // Indent items
                                    '&.active': { // Style applied when NavLink is active
                                        backgroundColor: theme.palette.action.selected, // Use theme color for selection
                                        color: theme.palette.primary.main, // Use theme color for text/icon
                                        '& .MuiListItemIcon-root': { // Target icon specifically
                                            color: theme.palette.primary.main,
                                        },
                                    },
                                    // Optional: Hover styles
                                    '&:hover': {
                                        backgroundColor: theme.palette.action.hover,
                                    }
                                })}
                            >
                                {item.icon && (
                                    // Adjust icon styling as needed
                                    <ListItemIcon sx={{ minWidth: '40px' /* Adjust alignment */ }}>
                                        {item.icon}
                                    </ListItemIcon>
                                )}
                                <ListItemText primary={item.text} />
                            </ListItemButton>
                        </ListItem>
                    )
                ))}
            </List>
        </Box>
    );

    return (
        <Drawer
            variant="permanent" // Keep drawer always visible
            sx={{
                width: drawerWidth,
                flexShrink: 0, // Prevent drawer from shrinking
                // Styles for the Drawer Paper component
                [`& .MuiDrawer-paper`]: {
                    width: drawerWidth,
                    boxSizing: 'border-box', // Include padding and border in the element's total width and height
                    // Position below the sticky AppBar
                    mt: '65px', // Adjust this value if AppBar height changes (e.g., '64px' or theme.mixins.toolbar.minHeight)
                    height: 'calc(100vh - 65px)', // Calculate height to fill remaining viewport below AppBar
                    // Background color and border are typically handled by MUI theme defaults
                },
            }}
        >
            {drawerContent}
        </Drawer>
    );
}

export default Sidebar;