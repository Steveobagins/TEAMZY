// Canvas: packages/platform-admin-ui/src/pages/NotFoundPage.js
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router-dom';

function NotFoundPage() {
  return (
    <Box sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h4" gutterBottom>
        404 - Page Not Found
      </Typography>
      <Typography sx={{ mb: 2 }}>
        Sorry, the page you are looking for does not exist.
      </Typography>
      <Button component={RouterLink} to="/" variant="contained">
        Go to Dashboard
      </Button>
    </Box>
  );
}
export default NotFoundPage;