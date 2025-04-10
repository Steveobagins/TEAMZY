// packages/api/src/routes/userRoutes.js
import express from 'express';
import { param } from 'express-validator'; // Import validator functions
import multer from 'multer'; // Import multer

// Import middleware (assuming they use named exports)
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware.js';
// Import error handler (assuming it's now in validationRules.js)
import { handleValidationErrors } from '../validation/validationRules.js';
// Import controller functions (using import * as ... to keep controller.function access)
import * as userController from '../controllers/userController.js';

// Configure Multer for image uploads (memory storage for BLOBs)
// Keep this configuration here or move to uploadMiddleware.js if preferred
const storage = multer.memoryStorage();
const uploadMiddleware = multer({ // Renamed variable to avoid conflict with import name
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2 MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept only image mimetypes
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            // Use Error constructor for consistency
            cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WEBP) are allowed.'), false);
        }
    }
}).single('profilePicture'); // Expecting a single file field named 'profilePicture'

const router = express.Router();

// Apply authentication middleware to all routes defined in this file
router.use(authenticateToken);

// --- Routes for the Logged-in User (/api/users/me) ---

// POST /api/users/me/profile-picture (Upload own profile picture)
router.post('/me/profile-picture', (req, res, next) => {
    // Wrap multer upload middleware to handle its specific errors
    uploadMiddleware(req, res, function (err) { // Use the configured middleware instance
        if (err instanceof multer.MulterError) {
            // A Multer error occurred (e.g., file size limit exceeded)
            console.warn("Multer error uploading profile pic:", err.message);
            // Use AppError or just send response (consistent error handling preferred)
            return res.status(400).json({ message: `Upload error: ${err.message}` });
        } else if (err) {
            // An unknown error occurred (e.g., file filter rejection)
            console.warn("Non-Multer error uploading profile pic:", err.message);
            return res.status(400).json({ message: err.message || 'File upload failed.' });
        }
        // If no errors, proceed to the next middleware/controller
        next();
    });
}, userController.uploadMyProfilePicture); // Chain the controller function

// DELETE /api/users/me/profile-picture (Delete own profile picture)
router.delete('/me/profile-picture', userController.deleteMyProfilePicture);

// PUT /api/users/me - Update own profile details
// Add validation rules as needed
router.put('/me',
    [
        // Example validation for updating own profile
        // body('firstName').optional().notEmpty().trim().escape(),
        // body('lastName').optional().notEmpty().trim().escape(),
        // body('phone').optional({nullable: true}).trim().escape(),
    ],
    handleValidationErrors, // Apply validation error handler
    userController.updateMyProfile // Assuming this controller function exists
);


// --- Routes for Accessing Other Users (Require Permissions checked in controller) ---

// GET /api/users/:userId/profile-picture (Get another user's profile picture)
router.get('/:userId/profile-picture',
    [
        param('userId').isUUID().withMessage('Invalid user ID format.')
    ],
    handleValidationErrors, // Apply validation error handler
    userController.getProfilePicture // Controller handles permissions
);


// --- Admin Routes (Placeholders - these might live in platformUserRoutes or clubRoutes instead) ---
// If these routes are intended for Platform Admins managing *any* user,
// they belong in platformUserRoutes.js.
// If they are for Club Admins managing *their club's* users,
// they belong in clubRoutes.js.
// Keeping them separate in userRoutes.js can be confusing for authorization.

// Example Placeholder (consider moving):
// GET /api/users (List users - requires filtering based on role/club)
// router.get('/', authorizeRole(['PLATFORM_ADMIN', 'CLUB_ADMIN']), userController.listUsers);

// Use export default for ESM
export default router;