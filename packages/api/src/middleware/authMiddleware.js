// packages/api/src/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js'; // Using direct query for initial user lookup
import { AppError } from '../utils/errorUtils.js'; // Use custom error class
import log from '../utils/logger.js'; // Use logger utility

// Ensure JWT_SECRET is loaded from environment variables
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    log.error("FATAL ERROR: JWT_SECRET is not defined in environment variables.");
    // Exit the process if the secret is missing, as auth cannot function
    process.exit(1);
}

/**
 * Middleware to verify JWT token from Authorization header.
 * Attaches user object and tenant context to req.
 */
export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Check for Bearer token format
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) {
        // Use next(error) to pass control to the global error handler
        return next(new AppError('No token provided, authorization denied.', 401));
    }

    try {
        // Verify the token using the secret
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.userId; // Assuming your JWT payload includes userId

        if (!userId) {
            log.warn("JWT verification successful but payload missing userId:", decoded);
            return next(new AppError('Invalid token payload.', 401));
        }

        // Fetch fresh user data - essential for checking active status and getting current role/club
        // Avoid selecting password_hash. Explicitly select needed fields.
        const userResult = await query(
            `SELECT
                user_id, email, first_name, last_name, primary_role,
                club_id, is_active, has_profile_picture
             FROM users
             WHERE user_id = $1`,
            [userId]
        );
        const user = userResult.rows[0];

        if (!user) {
            log.warn(`User ID ${userId} from valid JWT not found in DB.`);
            return next(new AppError('User not found.', 401));
        }

        if (!user.is_active) {
            log.warn(`Authentication attempt by inactive user: ${user.email} (ID: ${userId})`);
            // Use 403 Forbidden as they are authenticated but not allowed access
            return next(new AppError('Your account is inactive. Please contact support.', 403));
        }

        // Attach user info to request object (use consistent naming)
        req.user = {
            userId: user.user_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            primary_role: user.primary_role,
            club_id: user.club_id, // Store club_id for potential checks
            isActive: user.is_active,
            has_profile_picture: user.has_profile_picture, // Include if needed elsewhere
        };

        // Set tenant context for RLS (used by queryWithTenantContext)
        // Check if non-platform admins have a club_id
        if (user.primary_role !== 'PLATFORM_ADMIN' && !user.club_id) {
            log.error(`User ${user.email} (Role: ${user.primary_role}) missing club_id required for tenant context.`);
            // This indicates a data integrity issue or misconfiguration
            return next(new AppError('User configuration error: Missing club association.', 500));
        }

        req.tenantContext = {
            userId: user.user_id,
            role: user.primary_role,
            // Only set clubId if the user is associated with one
            // PLATFORM_ADMINs will have clubId as null here, which is correct for RLS bypass logic elsewhere
            clubId: user.club_id,
        };

        log.debug(`User authenticated: ${user.email}, Role: ${user.primary_role}, Club: ${user.club_id || 'N/A'}`);
        next(); // Proceed to the next middleware/route handler

    } catch (error) {
        // Handle specific JWT errors
        if (error instanceof jwt.TokenExpiredError) {
            log.warn('JWT token expired:', error.message);
            return next(new AppError('Token expired, please log in again.', 401));
        }
        if (error instanceof jwt.JsonWebTokenError) {
            log.warn('Invalid JWT token:', error.message);
            return next(new AppError('Invalid token.', 401));
        }
        // Handle unexpected errors during authentication
        log.error('Unexpected error during JWT verification or user fetch:', error);
        next(new AppError('Authentication failed due to an internal error.', 500));
    }
};

/**
 * Middleware factory to check if the authenticated user has one of the required roles.
 * Must be used *after* authenticateToken.
 * @param {string[]} requiredRoles - Array of allowed role strings (e.g., ['CLUB_ADMIN', 'COACH'])
 * @returns {Function} Express middleware function
 */
export const authorizeRole = (requiredRoles) => {
    // Return the actual middleware function
    return (req, res, next) => {
        // Ensure authenticateToken has run and set req.user and req.user.primary_role
        if (!req.user || !req.user.primary_role) {
            log.error('authorizeRole called without preceding successful authenticateToken.');
            // Send 401 because the issue is lack of authentication context
            return next(new AppError('Authentication required before checking roles.', 401));
        }

        const userRole = req.user.primary_role;
        // Ensure requiredRoles is always an array for consistent checking
        const rolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
        const hasRequiredRole = rolesArray.includes(userRole);

        if (!hasRequiredRole) {
            log.warn(`Authorization Failure: User ${req.user.email} (Role: ${userRole}) attempted action requiring roles: [${rolesArray.join(', ')}] on ${req.method} ${req.originalUrl}`);
            // Send 403 Forbidden because authentication succeeded but authorization failed
            return next(new AppError('You do not have permission to perform this action.', 403));
        }

        // Role is sufficient, proceed
        log.debug(`Role authorized: User ${req.user.email} (Role: ${userRole}) for roles: [${rolesArray.join(', ')}]`);
        next();
    };
};

// Note: No need for module.exports with ES Modules, use export keyword.