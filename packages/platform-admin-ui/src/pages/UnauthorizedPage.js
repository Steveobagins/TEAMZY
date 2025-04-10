// Canvas: packages/platform-admin-ui/src/pages/UnauthorizedPage.js
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Link as RouterLink } from 'react-router-dom';

function UnauthorizedPage() {
  return (
    <Box sx={{ textAlign: 'center', mt: 8 }}>
      <Typography variant="h4" gutterBottom color="error">
        Unauthorized
      </Typography>
      <Typography sx={{ mb: 2 }}>
        You do not have permission to access this page.
      </Typography>
      <Button component={RouterLink} to="/login" variant="contained">
        Go to Login
      </Button>
    </Box>
  );
}
export default UnauthorizedPage;