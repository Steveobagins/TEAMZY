// packages/api/src/routes/authRoutes.js
import express from 'express';
// Import validation functions directly from express-validator
import { body, param } from 'express-validator';

// Import controller functions (assuming authController.js exports named functions)
import {
    login,
    acceptInvitation, // Make sure this is the correct exported name
    verifyEmail,
    setPassword,
    registerInitialClubAdmin, // Make sure this is the correct exported name
    getCurrentUser,
    inviteUser,
    requestPasswordReset, // Added from previous example
    resetPassword         // Added from previous example
    // Add other controller functions like forgotPassword, resetPassword, logout if defined
} from '../controllers/authController.js';

// Import middleware (assuming these files export named functions)
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware.js';
// Assuming validationMiddleware exports handleValidationErrors
// *** OR if handleValidationErrors is now in validationRules.js, import from there ***
// import { handleValidationErrors } from '../middleware/validationMiddleware.js';
import { handleValidationErrors, loginRules, inviteUserRules, acceptInviteRules /* Add other specific rules if needed */ } from '../validation/validationRules.js'; // Assuming this is where it lives now

const router = express.Router();

// --- Public Routes ---

// POST /api/auth/login
router.post('/login',
    // Use pre-defined rule set or inline rules
    // loginRules(), // Option 1: Use combined rule set
    // Option 2: Keep inline rules (as in original)
    [
        body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
        body('password').notEmpty().withMessage('Password cannot be empty.')
    ],
    handleValidationErrors,
    login // Use imported controller function directly
);

// POST /api/auth/accept-invite/:token
router.post('/accept-invite/:token',
    // acceptInviteRules(), // Option 1: Use combined rule set
    // Option 2: Keep inline rules (as in original)
    [
        param('token').isHexadecimal().withMessage('Invalid token format (accept invite).').isLength({ min: 96, max: 96 }).withMessage('Invalid token length (accept invite).'), // Assuming invite token is 96 hex chars
        body('firstName').notEmpty().withMessage('First name is required.').trim().escape(),
        body('lastName').notEmpty().withMessage('Last name is required.').trim().escape(),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
        // Add password complexity rules if desired
        // .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+=[\]{};':"\\|,.<>/?~^-]).{8,}$/)
        // .withMessage('Password must contain uppercase, lowercase, number, and special character.')
    ],
    handleValidationErrors,
    acceptInvitation // Use imported controller function directly
);

// POST /api/auth/verify-email/:token - Changed from GET in previous examples? Verify method.
// Assuming verification token is 64 hex chars based on original comments
router.post('/verify-email/:token',
    [
        param('token').isHexadecimal().withMessage('Invalid token format (verification).').isLength({ min: 64, max: 64 }).withMessage('Invalid token length (verification).')
    ],
    handleValidationErrors,
    verifyEmail // Use imported controller function directly
);

// POST /api/auth/set-password/:token
// Assuming set password token is 96 hex chars based on original comments
router.post('/set-password/:token',
    [
        param('token')
            .isHexadecimal().withMessage('Invalid token format (set password).')
            .isLength({ min: 96, max: 96 }).withMessage('Invalid token length (set password).'),
        body('password')
            .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
            // Optional: Add complexity rules matching accept-invite
    ],
    handleValidationErrors,
    setPassword // Use imported controller function directly
);

// POST /api/auth/forgot-password
router.post('/forgot-password',
    [
        body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail()
    ],
    handleValidationErrors,
    requestPasswordReset // Make sure controller function exists and is exported
);

// POST /api/auth/reset-password/:token
// Assuming reset token is 96 hex chars
router.post('/reset-password/:token',
    [
        param('token').isHexadecimal().withMessage('Invalid token format (reset password).').isLength({ min: 96, max: 96 }).withMessage('Invalid token length (reset password).'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.')
        // Add password complexity rule if needed
    ],
    handleValidationErrors,
    resetPassword // Make sure controller function exists and is exported
);


// POST /api/auth/register-initial-admin (Keep validation inline or create specific rule set)
// *** Security Warning: This endpoint needs strong protection (e.g., run once, IP lock, special key) ***
router.post('/register-initial-admin',
    [
        // TODO: Add security middleware here!
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 8 }),
        body('firstName').notEmpty().trim().escape(),
        body('lastName').notEmpty().trim().escape(),
        body('clubId').isUUID().withMessage('Valid Club ID is required.') // Assuming clubId is UUID
    ],
    handleValidationErrors,
    registerInitialClubAdmin // Use imported controller function directly
);


// --- Protected Routes ---

// GET /api/auth/me
router.get('/me',
    authenticateToken, // Use imported middleware
    getCurrentUser     // Use imported controller function
);

// POST /api/auth/invite
router.post('/invite',
    authenticateToken,
    authorizeRole(['CLUB_ADMIN']), // Use imported middleware (factory pattern)
    // inviteUserRules(), // Option 1: Use combined rule set
    // Option 2: Keep inline rules
    [
        body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
        body('role').isIn(['COACH', 'ATHLETE', 'PARENT']).withMessage('Invalid role specified. Must be COACH, ATHLETE, or PARENT.')
    ],
    handleValidationErrors,
    inviteUser // Use imported controller function
);

// POST /api/auth/logout - Usually handled client-side, but can add server logic if needed
// router.post('/logout', authenticateToken, logout); // Assuming logout controller exists


// Use export default for ESM
export default router;