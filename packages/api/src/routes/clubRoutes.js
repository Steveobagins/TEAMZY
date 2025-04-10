// packages/api/src/routes/clubRoutes.js
import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware.js';
import { getUsersInMyClub } from '../controllers/clubController.js';
import { handleValidationErrors, paginationRules } from '../validation/validationRules.js';

const router = express.Router();

// Prefix: /api/club (defined in app.js)

// --- User Management within a Club ---

// GET /api/club/users - List users in the admin's club
router.get(
    '/users',
    authenticateToken,
    authorizeRole(['CLUB_ADMIN']), // Only Club Admins can list users
    paginationRules(), // Reuse pagination validation rules
    handleValidationErrors,
    getUsersInMyClub
);

// Add routes for Club Admin actions like:
// POST /api/club/users/:userId/resend-invite
// PUT /api/club/users/:userId (Update specific user details - limited scope)
// DELETE /api/club/users/:userId (Deactivate/remove user from club)

// Add routes for Club Details/Settings management by Club Admin:
// GET /api/club/details
// PUT /api/club/details
// POST /api/club/logo
// GET /api/club/logo (This might be needed for the MainLayout logo)


export default router;