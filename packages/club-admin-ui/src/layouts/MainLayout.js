// Canvas: packages/club-admin-ui/src/layouts/MainLayout.js
// (Fixed import order)

import React, { useState, useEffect } from 'react';
import { Outlet, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Verify path
import Sidebar from './Sidebar'; // This needs to be the Club Admin Sidebar
import ProfilePictureDropdown from '../components/common/ProfilePictureDropdown'; // Verify path

// MUI Imports
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton';
import { grey } from '@mui/material/colors'; // <-- MOVED IMPORT HERE

// Import CSS if still needed for specific tweaks (verify path)
// import './MainLayout.css'; // Should have been removed in Action 7

const drawerWidth = 240; // Ensure this matches the club-admin Sidebar.js width

function MainLayout() {
    const { user } = useAuth();

    // --- State for dynamic CLUB logo ---
    const [logoUrl, setLogoUrl] = useState('');
    const [logoStatus, setLogoStatus] = useState('loading');
    // --- End State ---

    // --- Effect to set the dynamic CLUB logo URL on mount ---
    useEffect(() => {
        // TODO: Implement API endpoint `/api/clubs/me/logo` to get the current club's logo
        const placeholderUrl = ''; // Or point to a known non-existent path to trigger error handler
        setLogoUrl(placeholderUrl);
        setLogoStatus('loading');
        console.log("Club Admin MainLayout Effect: Attempting club logo fetch (currently placeholder). Needs API: /api/clubs/me/logo");

        // Simulate fetching for demonstration (remove later)
        /*
        const simulateFetch = () => {
            console.log("Simulating club logo fetch...");
             setTimeout(() => {
                 console.log("Simulated fetch failed (no real endpoint). Setting status to error.");
                 setLogoStatus('error');
             }, 1500);
        }
        simulateFetch();
        */

        // return () => { /* Potential cleanup */ };
    }, []);
    // --- End Effect ---

    // --- Handlers for image load events (reusable) ---
    const handleLogoLoad = () => {
        if (logoStatus !== 'loaded') {
            console.log("Club Admin MainLayout handleLogoLoad: Club logo loaded successfully! Status: 'loaded'. URL:", logoUrl);
            setLogoStatus('loaded');
        }
    };

    const handleLogoError = (event) => {
        if (logoStatus !== 'error') {
            console.error("Club Admin MainLayout handleLogoError: Club logo failed to load. Status: 'error'. URL:", event?.target?.src || logoUrl);
            setLogoStatus('error');
        }
    };
    // --- End Handlers ---

    // --- Helper to render the logo or placeholder (reusable) ---
    const renderLogo = () => {
        switch (logoStatus) {
            case 'loading':
                return (
                    <>
                        <Skeleton variant="circular" width={32} height={32} sx={{ mr: 1, display: 'block' }} />
                        {logoUrl && (
                            <Box
                                component="img"
                                key={logoUrl}
                                sx={{ width: 0, height: 0, position: 'absolute', visibility: 'hidden' }}
                                alt=""
                                src={logoUrl}
                                onLoad={handleLogoLoad}
                                onError={handleLogoError}
                            />
                        )}
                    </>
                );
            case 'loaded':
                return (
                    <Box
                        component="img"
                        key={logoUrl}
                        sx={{ height: 32, mr: 1, display: 'block' }}
                        alt={`${user?.club_name || 'Club'} Logo`}
                        src={logoUrl}
                        onError={handleLogoError}
                    />
                );
            case 'error':
            default:
                 return <Box component="span" sx={{ width: 32, height: 32, bgcolor: 'action.disabledBackground', borderRadius: '50%', mr: 1, display: 'block' }} title="Club logo unavailable" />;
        }
    };
     // --- End Helper ---

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <AppBar
                position="sticky"
                sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
            >
                <Toolbar>
                    {/* Left Section: Logo and Branding */}
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                        <Link component={RouterLink} to="/dashboard" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', mr: 2 }}>
                            {renderLogo()}
                            <Typography
                                variant="h6" noWrap component="div"
                                sx={{ fontWeight: 'bold', color: 'text.primary' }}
                            >
                                Teamzy {/* Platform Name */}
                            </Typography>
                        </Link>

                        {/* Club Name */}
                        {user?.club_name && (
                            <Typography variant="body1" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' }, borderLeft: `1px solid ${grey[300]}`, pl: 2, ml: 2 }}>
                                {user.club_name}
                            </Typography>
                        )}
                    </Box>

                    {/* Right Section: User Dropdown */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {user && <ProfilePictureDropdown />}
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Body container */}
            <Box sx={{ display: 'flex', flexGrow: 1 }}>
                 <Sidebar drawerWidth={drawerWidth} />

                 {/* Main content area */}
                 <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: 3,
                        width: { sm: `calc(100% - ${drawerWidth}px)` },
                        overflowY: 'auto',
                        bgcolor: 'background.default',
                    }}
                 >
                    <Outlet />
                 </Box>
            </Box>
        </Box>
    );
}

export default MainLayout;

// NO IMPORTS HERE ANYMORE