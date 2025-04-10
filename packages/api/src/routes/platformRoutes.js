// packages/api/src/routes/platformRoutes.js
import express from 'express';

// Import controller functions (using import * as ... to keep controller.function access)
import * as platformController from '../controllers/platformController.js';

// Import middleware (assuming they use named exports)
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware.js';
// Import upload middleware (assuming it uses default export)
import upload from '../middleware/uploadMiddleware.js'; // Check if this is default or named export

const router = express.Router();

// --- Define Routes relative to /api/platform ---

// Public route to get the logo (e.g., /api/platform/settings/logo)
router.get('/settings/logo', platformController.getPlatformLogo);

// Protected route to update the logo (e.g., /api/platform/settings/logo)
router.put(
    '/settings/logo',
    authenticateToken,                 // 1. Verify JWT and attach user to req.user
    authorizeRole(['PLATFORM_ADMIN']), // 2. Ensure user role is PLATFORM_ADMIN
    upload.single('platformLogo'),     // 3. Handle file upload with field name 'platformLogo'
    platformController.updatePlatformLogo // 4. Call controller function
);

// --- Add other platform settings/management routes here ---
// Example: Get basic settings (Protected)
// router.get('/settings',
//     authenticateToken,
//     authorizeRole(['PLATFORM_ADMIN']),
//     platformController.getPlatformSettings // Assuming this controller function exists
// );
// Example: Update basic settings (Protected)
// router.put('/settings',
//     authenticateToken,
//     authorizeRole(['PLATFORM_ADMIN']),
//     express.json(), // Might already be applied globally in app.js
//     // Add validation middleware if needed
//     platformController.updatePlatformSettings // Assuming this controller function exists
// );

// Use export default for ESM
export default router;