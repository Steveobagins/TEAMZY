import React from 'react';
import { Box, Typography, Button, Container } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom'; // Use RouterLink for navigation
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'; // Example icon

function NotFoundPage() {
  return (
    <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: 3,
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
        <Typography component="h1" variant="h4" gutterBottom>
          Oops! Page Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          We can't seem to find the page you're looking for. It might have been moved or deleted.
        </Typography>
        <Button
          variant="contained"
          component={RouterLink} // Use RouterLink for client-side navigation
          to="/" // Link back to the dashboard/home page
        >
          Go to Dashboard
        </Button>
      </Box>
    </Container>
  );
}

export default NotFoundPage;