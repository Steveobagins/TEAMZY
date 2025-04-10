// src/layouts/Sidebar.js
import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
    Box,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Typography,
    Divider,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import PeopleIcon from '@mui/icons-material/People'; // Import User icon
import BusinessIcon from '@mui/icons-material/Business'; // Import Club icon

const drawerWidth = 240;

const Sidebar = ({ mobileOpen, handleDrawerToggle }) => {
    const location = useLocation();

    const menuItems = [
        { text: 'Dashboard', path: '/', icon: <DashboardIcon /> },
        { text: 'Users', path: '/users', icon: <PeopleIcon /> }, // Added User Management
        { text: 'Clubs', path: '/clubs', icon: <BusinessIcon /> }, // Added Club Management
        { text: 'Settings', path: '/settings', icon: <SettingsIcon /> },
    ];

    const drawer = (
        <div>
            <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', px: [1] }}>
                {/* Consider adding a Logo here */}
                <Typography variant="h6" noWrap component="div" color="primary">
                    Teamzy Admin
                </Typography>
            </Toolbar>
            <Divider />
            <List>
                {menuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            component={RouterLink}
                            to={item.path}
                            selected={location.pathname === item.path}
                            sx={{
                                '&.Mui-selected': {
                                    backgroundColor: 'action.selected',
                                    '&:hover': {
                                        backgroundColor: 'action.hover',
                                    },
                                },
                            }}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </div>
    );

    return (
        <Box
            component="nav"
            sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
            aria-label="mailbox folders"
        >
            {/* Temporary Mobile Drawer */}
            <Drawer
                variant="temporary"
                open={mobileOpen}
                onClose={handleDrawerToggle}
                ModalProps={{
                    keepMounted: true, // Better open performance on mobile.
                }}
                sx={{
                    display: { xs: 'block', sm: 'none' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                }}
            >
                {drawer}
            </Drawer>
            {/* Permanent Desktop Drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    display: { xs: 'none', sm: 'block' },
                    '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
                }}
                open
            >
                {drawer}
            </Drawer>
        </Box>
    );
};

export default Sidebar;