// Create this file at: packages/club-admin-ui/src/pages/ProfilePage.js

import React from 'react';
import { useAuth } from '../contexts/AuthContext'; // Adjust path if needed

function ProfilePage() {
  const { user } = useAuth();

  // Placeholder - Add logic to fetch full profile, edit, upload picture etc. later
  return (
    <div>
      <h1>My Profile</h1>
      {user ? (
        <div>
          <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Role:</strong> {user.primary_role}</p>
          {user.club_name && <p><strong>Club:</strong> {user.club_name}</p>}
          <p><strong>Has Profile Picture:</strong> {user.has_profile_picture ? 'Yes' : 'No'}</p>
          {/* Add form for editing profile details later */}
          {/* Add component for profile picture upload/display later */}
        </div>
      ) : (
        <p>Loading profile...</p>
      )}
    </div>
  );
}

export default ProfilePage;