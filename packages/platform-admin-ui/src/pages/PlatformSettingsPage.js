// Canvas: packages/platform-admin-ui/src/pages/PlatformSettingsPage.js (Working Base + Styling Re-applied)

import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

// MUI Imports
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import Skeleton from '@mui/material/Skeleton';
import Snackbar from '@mui/material/Snackbar';
import Fade from '@mui/material/Fade';
import Button from '@mui/material/Button'; // Keep Button import
import Divider from '@mui/material/Divider'; // Keep Divider import

// --- Define Logo Dimensions ---
const LOGO_MAX_WIDTH = 180; // Max width for the container/image
const LOGO_MAX_HEIGHT = 70; // Max height for the container/image
// --- End Definitions ---

function PlatformSettingsPage() {
    // State
    const [logoUrl, setLogoUrl] = useState('');
    const [logoStatus, setLogoStatus] = useState('loading'); // 'loading', 'loaded', 'error'
    const [isUploading, setIsUploading] = useState(false);
    // Snackbar state
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');
    // Ref for the hidden file input
    const fileInputRef = useRef(null);
    // State for more persistent errors (optional)
    const [uploadError, setUploadError] = useState('');

    const apiBaseUrl = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api').replace(/\/$/, '');
    const logoEndpoint = `${apiBaseUrl}/platform/settings/logo`;

    // --- Show Snackbar ---
    const showSnackbar = (message, severity = 'info') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
        if (uploadError) setUploadError('');
    };

    const handleSnackbarClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setSnackbarOpen(false);
    };

    // --- Fetch current logo ---
    const fetchCurrentLogo = () => {
        setLogoStatus('loading');
        const urlWithCacheBust = `${logoEndpoint}?t=${Date.now()}`;
        console.log("Attempting to load logo from:", urlWithCacheBust);
        setLogoUrl(urlWithCacheBust);
    };

    useEffect(() => {
        fetchCurrentLogo();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Image load/error handlers ---
    const handleLogoLoad = () => {
        if (logoStatus !== 'loaded') {
            console.log("handleLogoLoad triggered. Setting status to 'loaded'.");
            setLogoStatus('loaded');
            setUploadError('');
        }
    };
    const handleLogoError = () => {
         if (logoStatus !== 'error') {
            console.error("handleLogoError triggered. Setting status to 'error'.");
            setLogoStatus('error');
         }
    };

    // --- Upload logic ---
    const handleUpload = async (fileToUpload) => {
        if (!fileToUpload) return;
        setIsUploading(true);

        const formData = new FormData();
        formData.append('platformLogo', fileToUpload);

        try {
            const response = await api.put('/platform/settings/logo', formData);
            showSnackbar(response.data.message || 'Logo updated successfully!', 'success');
            fetchCurrentLogo();
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message || 'Failed to upload logo.';
            console.error("Logo Upload Error:", err.response || err);
            showSnackbar(errorMsg, 'error');
            setUploadError(errorMsg);
            if (logoStatus !== 'loaded') setLogoStatus('error');
        } finally {
            setIsUploading(false);
        }
    };

    // --- File input change handler ---
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        event.target.value = null;

        if (file) {
            // Validation
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
            const maxSizeMB = 2;
            const maxSizeBytes = maxSizeMB * 1024 * 1024;

            if (!allowedTypes.includes(file.type)) {
                showSnackbar(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`, 'error');
                setUploadError(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
                return;
            }
            if (file.size > maxSizeBytes) {
                 showSnackbar(`File size exceeds ${maxSizeMB}MB limit.`, 'error');
                 setUploadError(`File size exceeds ${maxSizeMB}MB limit.`);
                 return;
            }
            setUploadError('');
            handleUpload(file);
        }
    };

    const triggerFileInput = () => {
        if (fileInputRef.current && !isUploading) {
            fileInputRef.current.click();
        }
    };

    // --- Styles object for visible image/skeleton ---
     const imageStyles = {
        display: 'block',
        maxWidth: `${LOGO_MAX_WIDTH}px`,
        maxHeight: `${LOGO_MAX_HEIGHT}px`,
        width: 'auto',
        height: 'auto',
        objectFit: 'contain',
        borderRadius: (theme) => theme.shape.borderRadius, // Apply theme rounding
    };
     // --- End Styles object ---


    // --- Render the logo display area ---
    const renderLogoDisplay = () => {
        let displayContent = null;
        let showEditOverlay = !isUploading && logoStatus !== 'loading';

        // Apply styling changes here
        if (logoStatus === 'loading') {
             displayContent = <Skeleton variant="rectangular" width={LOGO_MAX_WIDTH} height={LOGO_MAX_HEIGHT} sx={{ borderRadius: (theme) => theme.shape.borderRadius }} />;
             showEditOverlay = false;
        } else if (logoStatus === 'error' || !logoUrl) {
            displayContent = <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', width: '100%', fontStyle: 'italic' }}>No logo uploaded</Typography>;
        } else if (logoStatus === 'loaded') {
            displayContent = (
                <img
                    key={logoUrl}
                    src={logoUrl}
                    alt="Platform Logo"
                    style={imageStyles} // Apply the styles object
                />
            );
        }

        const hiddenImg = logoUrl ? (
             <img
                  key={logoUrl + '-handler'}
                  src={logoUrl}
                  alt=""
                  onLoad={handleLogoLoad}
                  onError={handleLogoError}
                  style={{ display: 'none' }}
              />
        ) : null;


        return (
            // Container with fixed size, padding, border radius
            <Box
                onClick={triggerFileInput}
                sx={{
                    position: 'relative',
                    cursor: !isUploading ? 'pointer' : 'default',
                    width: `${LOGO_MAX_WIDTH}px`,   // Use constant
                    height: `${LOGO_MAX_HEIGHT}px`,  // Use constant
                    p: 1, // Apply padding
                    border: '1px dashed',
                    borderColor: 'divider',
                    borderRadius: (theme) => theme.shape.borderRadius, // Apply rounding
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden', // Clip overlay corners
                }}
            >
                {hiddenImg}
                {/* Wrap content for centering within padding */}
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', maxWidth: '100%', maxHeight: '100%' }}>
                     {displayContent}
                 </Box>

                {/* Edit Icon Overlay with matching border radius */}
                <Box
                    className="edit-overlay"
                    sx={{
                        position: 'absolute', inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)', color: 'white',
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        opacity: 0, pointerEvents: 'none',
                        transition: 'opacity 0.2s ease-in-out',
                        borderRadius: (theme) => `calc(${theme.shape.borderRadius}px - 1px)`, // Match container rounding
                        '.MuiBox-root:hover > &': {
                           opacity: showEditOverlay ? 0.8 : 0,
                        },
                    }}
                >
                    <PhotoCameraIcon />
                </Box>

                {/* Loading Spinner Overlay with matching border radius */}
                {isUploading && (
                     <Box sx={{
                            position: 'absolute', inset: 0,
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            borderRadius: (theme) => `calc(${theme.shape.borderRadius}px - 1px)`, // Match container rounding
                            zIndex: 2
                        }}>
                        <CircularProgress size={30} />
                    </Box>
                )}
            </Box>
        );
    };


    return (
        <Box sx={{ pt: 0, mt: 0 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                Platform Settings
            </Typography>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={4000}
                onClose={handleSnackbarClose}
                TransitionComponent={Fade}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }} variant="filled">
                    {snackbarMessage}
                </Alert>
            </Snackbar>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Platform Logo
                    </Typography>

                    {/* Optional persistent error */}
                    {uploadError && !snackbarOpen && <Alert severity="error" sx={{ mb: 2 }}>{uploadError}</Alert>}

                    <input
                        ref={fileInputRef}
                        id="logo-upload-input-hidden"
                        type="file"
                        hidden
                        accept="image/png, image/jpeg, image/gif, image/svg+xml"
                        onChange={handleFileChange}
                    />

                    {renderLogoDisplay()}

                    <Typography variant="caption" display="block" sx={{ mt: 1 }} color="text.secondary">
                        Click logo to upload (Max 2MB, PNG/JPG/SVG).
                    </Typography>

                </CardContent>
            </Card>
        </Box>
    );
}

export default PlatformSettingsPage;