// Canvas: packages/club-admin-ui/src/theme.js
// ESLint fix applied - removed unused 'cyan' import

import { createTheme } from '@mui/material/styles';
import { blue, grey } from '@mui/material/colors'; // Removed 'cyan'

// Define base colors based roughly on the reference image
const primaryBlue = '#4F46E5'; // A strong blue, similar to Tailwind's indigo-600 or the button in ref img
const lightBlueAccent = '#67E8F9'; // Similar to the cyan/teal accent in ref img charts (Currently unused, but kept definition)
const lightGreyBackground = '#F9FAFB'; // Very light grey for overall background (like Tailwind's gray-50)
const whiteBackground = '#FFFFFF'; // White for cards/paper
const textPrimary = '#1F2937'; // Dark gray for primary text (like Tailwind's gray-800)
const textSecondary = '#6B7280'; // Lighter gray for secondary text (like Tailwind's gray-500)

const theme = createTheme({
    // --- Palette ---
    palette: {
        mode: 'light', // Explicitly set light mode
        primary: {
            main: primaryBlue, // Main interactive blue color
            // contrastText: '#ffffff', // Text on primary color - calculated automatically usually
        },
        secondary: {
            // Use secondary for accents if needed, e.g., charts. Keeping definition for now.
            main: lightBlueAccent,
            // contrastText: textPrimary, // Text on secondary color - needs careful choice
        },
        background: {
            default: lightGreyBackground, // Overall page background
            paper: whiteBackground, // Background for components like Card, Paper, Drawer
        },
        text: {
            primary: textPrimary,
            secondary: textSecondary,
        },
        grey: grey, // Use MUI's grey scale for other shades
    },

    // --- Typography ---
    typography: {
        fontFamily: [ // Example using system fonts for good performance
            '-apple-system',
            'BlinkMacSystemFont',
            '"Segoe UI"',
            'Roboto',
            '"Helvetica Neue"',
            'Arial',
            'sans-serif',
            '"Apple Color Emoji"',
            '"Segoe UI Emoji"',
            '"Segoe UI Symbol"',
        ].join(','),
        h1: { fontSize: '2.2rem', fontWeight: 600 },
        h2: { fontSize: '1.8rem', fontWeight: 600 },
        h3: { fontSize: '1.5rem', fontWeight: 600 },
        h4: { fontSize: '1.2rem', fontWeight: 600 },
        // Add other overrides if needed
    },

    // --- Shape ---
    shape: {
        borderRadius: 8, // Default rounded corners for most components (adjust value 4, 8, 12 etc.)
    },

    // --- Component Overrides ---
    components: {
        // Style AppBar (Header)
        MuiAppBar: {
            defaultProps: {
                elevation: 0, // Flat header, rely on border
                color: 'inherit', // Use inherit to get paper background (white)
            },
            styleOverrides: {
                root: {
                    backgroundColor: whiteBackground, // Ensure white background
                    borderBottom: `1px solid ${grey[200]}`, // Subtle bottom border
                },
            },
        },
        // Style Drawer (Sidebar)
         MuiDrawer: {
             styleOverrides: {
                 paper: {
                     backgroundColor: whiteBackground, // Use paper (white) or lightGreyBackground
                     borderRight: `1px solid ${grey[200]}`, // Consistent border
                 }
             }
         },
        // Style Buttons
        MuiButton: {
            defaultProps: {
                disableElevation: true, // Flat buttons by default
            },
            styleOverrides: {
                root: {
                    textTransform: 'none', // Prevent uppercase text
                    borderRadius: 6, // Slightly less rounded than cards? Or use theme.shape.borderRadius
                },
                containedPrimary: { // Style for the main blue button
                     // backgroundColor: primaryBlue, // Already set by palette
                     color: whiteBackground,
                     '&:hover': {
                         // Define hover state if needed (MUI provides some darkening by default)
                     },
                },
            },
        },
        // Style Cards
        MuiCard: {
            defaultProps: {
                variant: 'outlined', // Use outlined cards by default for the clean look
                // Or use elevation: 1 for very subtle shadow
            },
             styleOverrides: {
                 root: ({ theme }) => ({ // Access theme object if needed
                     border: `1px solid ${grey[200]}`, // Ensure consistent border for outlined variant
                     // Add default padding or other styles if desired
                     // Example: padding: theme.spacing(2)
                 }),
             }
        },
         // Style ListItems for Sidebar active state
         MuiListItemButton: {
             styleOverrides: {
                 root: {
                     '&.Mui-selected': { // Style for selected state (used by NavLink active class)
                         backgroundColor: `${blue[50]} !important`, // Example: Very light blue background
                         color: primaryBlue,
                         '& .MuiListItemIcon-root': { // Style icons within active item
                             color: primaryBlue,
                         },
                         // Add a border or other indicator if desired
                         // borderLeft: `3px solid ${primaryBlue}`,
                     },
                     '&.Mui-selected:hover': { // Hover state for selected item
                        backgroundColor: `${blue[100]} !important`, // Slightly darker blue background
                     },
                     // Adjust padding or other styles
                     // paddingLeft: theme.spacing(3), // Example indent
                 },
             },
         },
         // Style TextFields (Optional - adjust as needed)
        // MuiTextField: {
        //     defaultProps: {
        //         variant: 'outlined', // Default variant
        //     },
        // },
    },
});

export default theme;