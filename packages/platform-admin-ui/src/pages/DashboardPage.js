// Canvas: packages/platform-admin-ui/src/pages/DashboardPage.js
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

function DashboardPage() {
  return (
    <Box sx={{ pt: 0, mt: 0 }}>
      <Typography variant="h4" gutterBottom>
        Platform Dashboard
      </Typography>
      <Typography>
        Welcome to the Platform Admin area. Overview stats and actions will go here.
      </Typography>
      {/* Add Cards, Grids etc later */}
    </Box>
  );
}
export default DashboardPage;