// packages/api/src/validation/validationRules.js
// --- STATE BEFORE ADDING PLATFORM ADMIN RULES ---

import { body, query, validationResult } from 'express-validator'; // param might not have been needed yet
import { AppError } from '../utils/errorUtils.js'; // Make sure errorUtils exists and path is correct

// Middleware to handle validation errors from express-validator
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log the detailed errors for debugging
    console.error("Validation Errors:", errors.array());
    // Return a user-friendly error response
    return next(new AppError(`Validation failed: ${errors.array()[0].msg}`, 400));
  }
  next();
};

// Reusable validation rules for pagination
// Assuming these were potentially present
export const paginationRules = () => [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer.')
    .toInt(),
  query('pageSize') // Or 'limit', depending on original implementation
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Page size must be between 1 and 100.')
    .toInt(),
  query('sort')
    .optional()
    .isString().withMessage('Sort field must be a string.')
    .trim()
    .escape(),
  query('order')
    .optional()
    .isString().withMessage('Sort order must be a string.')
    .trim()
    .toUpperCase()
    .isIn(['ASC', 'DESC']).withMessage('Sort order must be ASC or DESC.'),
];

// --- Authentication Validation Rules ---
// Assuming these were present
export const loginRules = () => [
  body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

export const inviteUserRules = () => [
    body('email').isEmail().withMessage('Please provide a valid email address.').normalizeEmail(),
    body('role').isIn(['COACH', 'ATHLETE', 'PARENT']).withMessage('Invalid role specified.'),
];

export const acceptInviteRules = () => [
    body('firstName').notEmpty().trim().escape().withMessage('First name is required.'),
    body('lastName').notEmpty().trim().escape().withMessage('Last name is required.'),
    body('password') // Assuming a simpler password rule originally
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long.'),
];

// NOTE: Platform Admin specific rules (createPlatformAdminRules, updateUserRules, etc.) are NOT included in this reverted state.