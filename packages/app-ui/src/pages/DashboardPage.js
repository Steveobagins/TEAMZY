import React from 'react';
import { Typography, Box, Paper } from '@mui/material';
import { useAuth } from '../contexts/AuthContext'; // Import useAuth to access user info

function DashboardPage() {
  const { user } = useAuth(); // Get the current logged-in user details

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Paper elevation={1} sx={{ p: 2 }}>
        <Typography variant="h6">
          Welcome, {user?.first_name || user?.email || 'User'}!
        </Typography>
        <Typography variant="body1" sx={{ mt: 1 }}>
          This is the main dashboard for the Teamy user application.
        </Typography>
        {user?.primary_role && (
           <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
             Your role: {user.primary_role}
           </Typography>
        )}
         {user?.club_id && (
           <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
             Club ID: {user.club_id}
           </Typography>
        )}
        {/* More dashboard content specific to roles (Coach, Athlete, Parent) will go here */}
      </Paper>
    </Box>
  );
}

export default DashboardPage;