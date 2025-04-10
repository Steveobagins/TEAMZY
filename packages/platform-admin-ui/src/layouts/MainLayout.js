// Canvas: packages/platform-admin-ui/src/layouts/MainLayout.js (Fixed Dynamic Logo Loading)

import React, { useState, useEffect } from 'react';
import { Outlet, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext'; // Adjust path if needed
import Sidebar from './Sidebar'; // Adjust path if needed
import ProfilePictureDropdown from '../components/common/ProfilePictureDropdown'; // Adjust path if needed

// MUI Imports
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import Skeleton from '@mui/material/Skeleton'; // Import Skeleton for loading state

// NOTE: No static logo import needed from @teamzy/shared/assets anymore

// Import CSS if still needed
import './MainLayout.css'; // Adjust path if needed

const drawerWidth = 240; // Ensure this matches Sidebar.js

function MainLayout() {
    const { user } = useAuth();

    // --- State for dynamic logo ---
    const [logoUrl, setLogoUrl] = useState(''); // Store the final URL (API endpoint + cache buster)
    const [logoStatus, setLogoStatus] = useState('loading'); // 'loading', 'loaded', 'error'
    // --- End State ---

    // --- Effect to set the dynamic logo URL on mount ---
    useEffect(() => {
        // Construct the API endpoint URL
        // Ensure REACT_APP_ prefix matches your .env setup (or use VITE_ etc.)
        const apiBaseUrl = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');
        const logoEndpoint = `${apiBaseUrl}/platform/settings/logo`;
        // Set the URL with a timestamp for cache busting
        const urlWithCacheBust = `${logoEndpoint}?t=${Date.now()}`;

        setLogoUrl(urlWithCacheBust);
        setLogoStatus('loading'); // Reset status to loading whenever effect runs (e.g., on route change if needed)
        console.log("MainLayout Effect: Setting logoUrl to attempt fetch:", urlWithCacheBust);

        // Cleanup function not strictly needed here as state updates handle themselves
        // But good practice if doing async calls directly in useEffect
        // return () => { /* Potential cleanup */ };
    }, []); // Run only once on component mount to fetch initial logo URL
    // --- End Effect ---

    // --- Handlers for image load events ---
    const handleLogoLoad = () => {
        // Only update state if it's not already loaded (prevents potential loops)
        if (logoStatus !== 'loaded') {
            console.log("MainLayout handleLogoLoad: Image loaded successfully! Setting status to 'loaded'. URL:", logoUrl);
            setLogoStatus('loaded');
        }
    };

    const handleLogoError = (event) => {
        // Only update state if it's not already error (prevents potential loops)
        if (logoStatus !== 'error') {
            console.error("MainLayout handleLogoError: Image failed to load from API. Setting status to 'error'. URL:", event.target.src);
            setLogoStatus('error');
        }
    };
    // --- End Handlers ---

    // --- Helper to render the logo or placeholder ---
    const renderLogo = () => {
        // console.log("MainLayout renderLogo: Current status is:", logoStatus, "URL:", logoUrl); // Optional debug
        switch (logoStatus) {
            case 'loading':
                // Show Skeleton AND the hidden img tag to trigger loading
                return (
                    <>
                        {/* Visible placeholder */}
                        <Skeleton variant="circular" width={32} height={32} sx={{ mr: 1, display: 'block' }} />
                        {/* Hidden img tag to actually fetch the image and trigger handlers */}
                        {logoUrl && ( // Only render if URL is set
                            <Box
                                component="img"
                                key={logoUrl} // Add key to potentially help React diffing if URL changes
                                sx={{ width: 0, height: 0, position: 'absolute', visibility: 'hidden', pointerEvents: 'none' }} // Hide effectively
                                alt="" // Alt not needed for hidden img
                                src={logoUrl}
                                onLoad={handleLogoLoad} // Attach load handler
                                onError={handleLogoError} // Attach error handler
                            />
                        )}
                    </>
                );
            case 'loaded':
                // Show the actual visible image tag once loaded successfully
                return (
                    <Box
                        component="img"
                        key={logoUrl}
                        sx={{ height: 32, mr: 1, display: 'block' }} // Style for visible logo
                        alt="Teamzy Logo"
                        src={logoUrl}
                        // We could still keep onError here to catch subsequent network issues maybe,
                        // but it might cause flicker if the image briefly fails later.
                        // onError={handleLogoError}
                    />
                );
            case 'error':
            default:
                 // Render a placeholder if loading failed or status is unknown
                 // console.log("MainLayout renderLogo: Rendering fallback/placeholder Box.");
                 // Simple Box placeholder (could be initials or generic icon)
                 return <Box component="span" sx={{ width: 32, height: 32, bgcolor: 'action.disabledBackground', borderRadius: '50%', mr: 1, display: 'block' }} />;
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
                    {/* Left Section */}
                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                        {/* Logo Link */}
                        <Link component={RouterLink} to="/dashboard" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', mr: 2 }}>
                            {/* Render Logo using the helper function */}
                            {renderLogo()}

                            {/* Brand Name */}
                            <Typography
                                variant="h6" noWrap component="div"
                                sx={{ fontWeight: 'bold', color: 'text.primary' }}
                            >
                                Teamzy
                            </Typography>
                        </Link>

                        {/* Club Name (Display based on context if needed) */}
                        {user?.club_name && ( // Only show if club_name exists (relevant for club-admin)
                            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                                | {user.club_name}
                            </Typography>
                        )}
                    </Box>

                    {/* Right Section */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {user && <ProfilePictureDropdown />}
                    </Box>
                </Toolbar>
            </AppBar>

            {/* Body container */}
            <Box sx={{ display: 'flex', flexGrow: 1 }}>
                 <Sidebar /> {/* Ensure Sidebar uses correct drawerWidth and mt */}
                 <Box
                    component="main"
                    sx={{
                        flexGrow: 1,
                        p: 3,
                        overflowY: 'auto',
                        // No margin/offset needed here with sticky AppBar
                    }}
                 >
                    {/* Outlet renders the actual page content */}
                    <Outlet />
                 </Box>
            </Box>
        </Box>
    );
}

export default MainLayout;