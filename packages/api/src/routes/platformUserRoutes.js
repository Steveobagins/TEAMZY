// packages/api/src/routes/platformUserRoutes.js
// --- CORRECTED controller function names ---
import express from 'express';
// Import validation functions directly from express-validator
import { param, body } from 'express-validator';

// Import controller functions (using import * as ... to keep controller.function access)
import * as platformUserController from '../controllers/platformUserController.js';

// Import middleware (assuming they use named exports)
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware.js';
// Import error handler (assuming it's now in validationRules.js)
import { handleValidationErrors } from '../validation/validationRules.js';

// --- Load Constants ---
// Attempt direct import, provide fallback if module/export is missing or empty
import * as constantsModule from '../utils/constants.js'; // Assuming constants.js uses export
const FALLBACK_USER_ROLES = { PLATFORM_ADMIN: 'PLATFORM_ADMIN', CLUB_ADMIN: 'CLUB_ADMIN', COACH: 'COACH', PARENT: 'PARENT', ATHLETE: 'ATHLETE' };
let USER_ROLES = FALLBACK_USER_ROLES; // Default to fallback

// Check if the import worked and the specific export exists and is valid
if (constantsModule && constantsModule.USER_ROLES && Object.keys(constantsModule.USER_ROLES).length > 0) {
    USER_ROLES = constantsModule.USER_ROLES;
} else {
    console.warn("WARN (platformUserRoutes): USER_ROLES constant missing/incomplete or constants module failed to load. Using fallback.");
}
const allowedRoles = Object.values(USER_ROLES);
// --------------------


const router = express.Router();

// Apply auth middleware to all routes in this file using router.use()
// These will run BEFORE the specific route handlers below
router.use(authenticateToken);
router.use(authorizeRole(['PLATFORM_ADMIN'])); // Ensure only Platform Admins access these routes

// --- Route Definitions ---

// GET /api/platform-admin/users - Get all users (controller likely handles pagination/sorting)
router.get('/', platformUserController.getAllUsers);

// POST /api/platform-admin/users - Create a new platform user (e.g., another Platform Admin)
router.post('/',
    [ // Keep validation inline or create specific rule set
        body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
        body('firstName').notEmpty().withMessage('First name is required.').trim().escape(),
        body('lastName').notEmpty().withMessage('Last name is required.').trim().escape(),
        // Note: Password validation should ideally be added here from validationRules.js
        // Role might be set automatically or passed in body depending on controller logic
        // body('role').optional().isIn(allowedRoles).withMessage('Invalid role specified.') // Example if role is passed
    ],
    handleValidationErrors,
    platformUserController.createPlatformAdmin // <<<--- CORRECTED function name
);

// GET /api/platform-admin/users/:userId - Get specific user details
router.get('/:userId',
    [
        param('userId').isUUID().withMessage('Invalid User ID format.')
    ],
    handleValidationErrors,
    platformUserController.getUserById
);

/* // TODO: Implement platformUserController.getUserProfilePicture or remove this route
// GET /api/platform-admin/users/:userId/profile-picture - Get user profile picture
router.get('/:userId/profile-picture',
    [
        param('userId').isUUID().withMessage('Invalid User ID format.')
    ],
    handleValidationErrors,
    platformUserController.getUserProfilePicture // <<<--- Controller function currently missing
);
*/

// PUT /api/platform-admin/users/:userId - Update user details
router.put('/:userId',
    [
        param('userId').isUUID().withMessage('Invalid User ID format.'),
        // Add validation for fields that can be updated by Platform Admin
        body('firstName').optional().notEmpty().withMessage('First name cannot be empty.').trim().escape(),
        body('lastName').optional().notEmpty().withMessage('Last name cannot be empty.').trim().escape(),
        body('primaryRole').optional().isIn(allowedRoles).withMessage(`Invalid role specified. Must be one of: ${allowedRoles.join(', ')}`),
        // Add other updatable fields like phone, etc.
    ],
    handleValidationErrors,
    platformUserController.updateUser
);

// PUT /api/platform-admin/users/:userId/status - Toggle user active status
router.put('/:userId/status',
    [
        param('userId').isUUID().withMessage('Invalid User ID format.')
    ],
    handleValidationErrors,
    platformUserController.toggleUserStatus
);

// POST /api/platform-admin/users/:userId/request-password-reset - Trigger admin password reset
router.post('/:userId/request-password-reset',
    [
        param('userId').isUUID().withMessage('Invalid User ID format.')
    ],
    handleValidationErrors,
    platformUserController.requestPasswordReset // <<<--- CORRECTED function name
);

// DELETE /api/platform-admin/users/:userId - Delete a user
router.delete('/:userId',
    [
        param('userId').isUUID().withMessage('Invalid User ID format.'),
        // Add confirmation logic if needed (e.g., body('confirmationEmail'))
    ],
    handleValidationErrors,
    platformUserController.deleteUser
);

// Use export default for ESM
export default router;