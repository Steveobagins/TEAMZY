// packages/api/src/routes/platformClubRoutes.js
import express from 'express';
// Import validation functions directly from express-validator
import { body, param } from 'express-validator';

// Import controller functions (using import * as ... to keep controller.function access)
import * as platformClubController from '../controllers/platformClubController.js';

// Import middleware (assuming they use named exports)
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware.js';
// Import error handler (assuming it's now in validationRules.js)
import { handleValidationErrors } from '../validation/validationRules.js';
import logger from '../utils/logger.js'; // Import logger

// --- Load Constants ---
// Attempt direct import, provide fallback if module/export is missing or empty
import * as constantsModule from '../utils/constants.js'; // Assuming constants.js uses export
const FALLBACK_SUBSCRIPTION_TIERS = { FREE: 'FREE', BASIC: 'BASIC', PREMIUM: 'PREMIUM' };
let SUBSCRIPTION_TIERS = FALLBACK_SUBSCRIPTION_TIERS; // Default to fallback

// Check if the import worked and the specific export exists and is valid
if (constantsModule && constantsModule.SUBSCRIPTION_TIERS && Object.keys(constantsModule.SUBSCRIPTION_TIERS).length > 0) {
    SUBSCRIPTION_TIERS = constantsModule.SUBSCRIPTION_TIERS;
} else {
    // Use logger instead of console.warn
    logger.warn("WARN (platformClubRoutes): SUBSCRIPTION_TIERS constant missing/incomplete or constants module failed to load. Using fallback.");
}
const allowedTiers = Object.values(SUBSCRIPTION_TIERS);
// --------------------


const router = express.Router();

// <<<--- ADD THIS LOGGING MIDDLEWARE ---<<<
router.use((req, res, next) => {
  // Log only for the specific route we are debugging
  if (req.method === 'POST' && req.originalUrl === '/api/platform-admin/clubs') {
     logger.info(`[platformClubRoutes] Received ${req.method} ${req.originalUrl}. Inspecting req.body BEFORE validation:`);
     // Using console.dir for better object inspection in some terminals
     console.dir(req.body, { depth: null });
     logger.info(`[platformClubRoutes] Content-Type Header: ${req.headers['content-type']}`);
  }
  next(); // Continue to next middleware/route
});
// <<<------------------------------------<<<


// Apply auth middleware AFTER logging body (auth modifies req)
router.use(authenticateToken);
router.use(authorizeRole(['PLATFORM_ADMIN'])); // Ensure only Platform Admins access these routes

// --- Route Definitions ---

// GET /api/platform-admin/clubs - Get all clubs (controller handles pagination/sorting)
router.get('/', platformClubController.getAllClubs);

// POST /api/platform-admin/clubs - Create a new club
router.post('/',
    [ // Use the validation rules that match the "last known working" controller
        body('clubName').notEmpty().withMessage('Club name is required.').trim().escape(),
        body('subdomain')
            .notEmpty().withMessage('Subdomain is required.')
            .trim()
            .isLength({ min: 3, max: 63 }).withMessage('Subdomain must be 3-63 characters.')
            .matches(/^[a-z0-9-]+$/).withMessage('Subdomain can only contain lowercase letters, numbers, and hyphens.')
            .toLowerCase(), // Ensure lowercase
        // Use the key the controller expects
        body('primaryContactEmail').isEmail().withMessage('Valid primary contact email is required.').normalizeEmail(),
        body('primaryContactFirstName').notEmpty().withMessage('Primary contact first name is required.').trim().escape(),
        body('primaryContactLastName').notEmpty().withMessage('Primary contact last name is required.').trim().escape(),
        // Use the first key of the determined tiers as default (e.g., 'FREE')
        body('subscriptionTier').optional().isIn(allowedTiers).withMessage(`Invalid tier.`).default(Object.keys(SUBSCRIPTION_TIERS)[0]),
        // Use the key the controller expects
        body('activateImmediately').optional().isBoolean().withMessage('Activate immediately must be true or false.').default(true),
    ],
    handleValidationErrors, // Runs AFTER the logging middleware above
    platformClubController.createClub
);

// GET /api/platform-admin/clubs/:clubId - Get club details
router.get('/:clubId',
    [
        param('clubId').isUUID().withMessage('Invalid Club ID format.')
    ],
    handleValidationErrors,
    platformClubController.getClubById
);

// GET /api/platform-admin/clubs/:clubId/logo - Get club logo
router.get('/:clubId/logo',
    [
        param('clubId').isUUID().withMessage('Invalid Club ID format.')
    ],
    handleValidationErrors,
    platformClubController.getClubLogo
);

// PUT /api/platform-admin/clubs/:clubId - Update club details
router.put('/:clubId',
    [
        param('clubId').isUUID().withMessage('Invalid Club ID format.'),
        // Keep validation for updatable fields inline or create rule set
        // Ensure these match controller update logic's expected keys (name, contact_email etc.)
        body('name')
            .optional()
            .notEmpty().withMessage('Club name cannot be empty if provided.')
            .trim().escape(),
        body('contact_email') // Controller expects this for update
            .optional({ checkFalsy: true }) // Allow empty string ''
            .isEmail().withMessage('Invalid contact email format.')
            .normalizeEmail(),
        body('contact_phone') // Controller expects this
            .optional({ nullable: true, checkFalsy: true }) // Allow null or empty string
            .trim().escape(),
        body('address') // Controller expects this
            .optional({ nullable: true, checkFalsy: true })
            .trim().escape(),
        body('primary_color') // Controller expects this
            .optional({ checkFalsy: true })
            .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Primary color must be a valid hex code (e.g., #RRGGBB).')
            .trim(),
        body('secondary_color') // Controller expects this
            .optional({ checkFalsy: true })
            .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Secondary color must be a valid hex code (e.g., #RRGGBB).')
            .trim(),
        body('subscription_tier') // Controller update logic expects this
            .optional()
            .isIn(allowedTiers).withMessage(`Invalid subscription tier. Must be one of: ${allowedTiers.join(', ')}`),
        body('primary_contact_user_id') // Controller update logic expects this
            .optional({ nullable: true }) // Allow setting to null? Check controller logic.
            .isUUID().withMessage('Invalid format for primary contact user ID.')
    ],
    handleValidationErrors,
    platformClubController.updateClub // Ensure controller is imported correctly
);

// PUT /api/platform-admin/clubs/:clubId/status - Toggle club active status
router.put('/:clubId/status',
    [
        param('clubId').isUUID().withMessage('Invalid Club ID format.')
    ],
    handleValidationErrors,
    platformClubController.toggleClubStatus // Ensure controller is imported correctly
);

// DELETE /api/platform-admin/clubs/:clubId - Delete a club
router.delete('/:clubId',
    [
        param('clubId').isUUID().withMessage('Invalid Club ID format.'),
        // Add confirmation logic in body if needed (e.g., body('confirmClubName'))
    ],
    handleValidationErrors,
    platformClubController.deleteClub // Ensure controller is imported correctly
);

// Use export default for ESM
export default router;