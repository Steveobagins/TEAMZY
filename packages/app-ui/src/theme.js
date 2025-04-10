import { createTheme } from '@mui/material/styles';
import { red } from '@mui/material/colors';

// A custom theme for this app
const theme = createTheme({
  palette: {
    primary: {
      // TODO: Define primary color based on app design - using default Material blue for now
      main: '#556cd6',
    },
    secondary: {
      // TODO: Define secondary color based on app design - using default Material pink for now
      main: '#19857b',
    },
    error: {
      main: red.A400,
    },
    background: {
      default: '#f4f6f8', // A light grey background
      paper: '#ffffff',
    },
  },
  typography: {
    // Adjust font sizes, weights for mobile-first approach if needed
    // Example: smaller default font size
    // fontSize: 14,
    // h1: { fontSize: '2.5rem' },
    // h2: { fontSize: '2rem' },
    // ... and so on
  },
  components: {
    // Example: Default props for Button component
    MuiButton: {
      defaultProps: {
        // size: 'small', // Example: make buttons smaller by default
        // variant: 'contained', // Example: make buttons contained by default
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        // size: 'small', // Example: make text fields smaller by default
      },
    },
    // Customizations for other components like AppBar, BottomNavigation, etc. can go here
  },
});

export default theme;