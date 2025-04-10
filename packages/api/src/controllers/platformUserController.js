// Canvas: packages/api/src/controllers/platformUserController.js
// --- Includes fix for getAllUsers club_id filtering ---

import { query } from '../config/db.js'; // Import query directly
import { AppError } from '../utils/errorUtils.js';
import { hashPassword } from '../utils/hash.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import crypto from 'crypto';
import logger from '../utils/logger.js';

// --- Get All Users (for Platform Admins) ---
export const getAllUsers = async (req, res, next) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    // Extract club_id if provided
    const clubId = req.query.club_id; // <<<--- ADDED: Get clubId from query

    logger.debug(`getAllUsers called. Page: ${page}, Limit: ${limit}, ClubID Filter: ${clubId || 'None'}`);

    try {
        // --- Build query dynamically based on filter ---
        let baseUserQuery = `
            SELECT
                u.user_id AS "userId", -- Use aliases for consistency
                u.email,
                u.first_name AS "firstName",
                u.last_name AS "lastName",
                u.primary_role,
                u.club_id AS "clubId",
                c.name as club_name, -- Keep club_name
                u.is_active AS "isActive",
                u.has_profile_picture AS "hasProfilePicture",
                u.created_at AS "createdAt",
                u.updated_at AS "updatedAt"
            FROM users u
            LEFT JOIN clubs c ON u.club_id = c.club_id
        `;
        let baseCountQuery = `SELECT COUNT(*) FROM users u`; // Use alias for clarity in WHERE
        let whereClauses = [];
        let queryParams = [];
        let countQueryParams = [];
        let paramIndex = 1;

        // Add club_id filter if present
        if (clubId) {
            whereClauses.push(`u.club_id = $${paramIndex}`); // Use alias u.
            queryParams.push(clubId);
            countQueryParams.push(clubId);
            paramIndex++;
        }

        // --- Construct WHERE clause ---
        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // --- Final Queries ---
        const usersQueryText = `
            ${baseUserQuery}
            ${whereString}
            ORDER BY u.last_name, u.first_name -- Order applies to filtered or unfiltered results
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}; -- Add pagination params AFTER filter params
        `;
        queryParams.push(limit, offset); // Add pagination params to the main query

        const countQueryText = `
            ${baseCountQuery}
            ${whereString};
        `;
        // countQueryParams already holds clubId if needed

        logger.debug(`Executing Users Query: ${usersQueryText}`);
        logger.debug(`Executing Users Params: ${JSON.stringify(queryParams)}`);
        logger.debug(`Executing Count Query: ${countQueryText}`);
        logger.debug(`Executing Count Params: ${JSON.stringify(countQueryParams)}`);

        // --- Execute Queries ---
        const [usersResult, countResult] = await Promise.all([
            query(usersQueryText, queryParams),
            query(countQueryText, countQueryParams) // Use separate params for count
        ]);

        const users = usersResult.rows;
        const totalUsers = parseInt(countResult.rows[0].count, 10);
        const totalPages = Math.ceil(totalUsers / limit);

        res.status(200).json({
            status: 'success',
            message: 'Users retrieved successfully.',
            users,
            pagination: {
                currentPage: page,
                totalPages,
                totalUsers,
                limit,
            },
        });
    } catch (error) {
        logger.error('Error fetching all users (Platform Admin):', error);
        if (error.code === '42703') {
             return next(new AppError('Database schema mismatch while fetching users.', 500));
        }
        // Add more specific error checks if needed (e.g., invalid UUID format for clubId)
        return next(new AppError('Failed to retrieve users.', 500));
    }
};

// --- Get Single User Details (for Platform Admins) ---
export const getUserById = async (req, res, next) => {
    const { userId } = req.params;
    try {
        const queryText = `
            SELECT
                u.user_id, u.email, u.first_name, u.last_name, u.primary_role, u.is_active,
                u.club_id, c.name as club_name, u.has_profile_picture,
                u.created_at, u.updated_at, u.last_login_at
            FROM users u
            LEFT JOIN clubs c ON u.club_id = c.club_id
            WHERE u.user_id = $1;
        `;
        const result = await query(queryText, [userId]);

        if (result.rows.length === 0) {
            return next(new AppError('User not found.', 404));
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        logger.error(`Error fetching user ${userId} (Platform Admin):`, error);
        return next(new AppError('Failed to retrieve user details.', 500));
    }
};

// --- Create Platform Admin User ---
export const createPlatformAdmin = async (req, res, next) => {
    const { email, firstName, lastName, password } = req.body;
    const creatorEmail = req.user?.email || 'unknown admin';

    if (!email || !firstName || !lastName || !password) {
        return next(new AppError('Missing required fields (email, firstName, lastName, password).', 400));
    }

    logger.info(`Admin ${creatorEmail} attempting to create new Platform Admin: ${email}`);

    try {
        const existingUser = await query('SELECT user_id FROM users WHERE lower(email) = lower($1)', [email]);
        if (existingUser.rows.length > 0) {
            return next(new AppError('User with this email already exists.', 409));
        }

        const hashedPassword = await hashPassword(password);

        const insertQueryText = `
            INSERT INTO users (email, first_name, last_name, password_hash, primary_role, is_active, club_id)
            VALUES ($1, $2, $3, $4, 'PLATFORM_ADMIN', true, NULL)
            RETURNING user_id, email, first_name, last_name, primary_role, is_active, created_at;
        `;
        const result = await query(insertQueryText, [email, firstName, lastName, hashedPassword]);
        const newUser = result.rows[0];

        logger.info(`Successfully created Platform Admin: ${email} (ID: ${newUser.user_id}) by ${creatorEmail}`);

        res.status(201).json({
            status: 'success',
            message: 'Platform Administrator created successfully.',
            user: newUser,
        });

    } catch (error) {
        logger.error(`Error creating platform admin user ${email} by ${creatorEmail}:`, error);
        if (error.message === "Failed to hash password.") {
             return next(new AppError('Server error during user creation.', 500));
        }
        return next(new AppError('Failed to create platform admin user.', 500));
    }
};


// --- Update User Details (by Platform Admin) ---
export const updateUser = async (req, res, next) => {
    const { userId } = req.params;
    const { firstName, lastName, email, primaryRole, clubId } = req.body;

    if (!firstName || !lastName || !email || !primaryRole) {
        return next(new AppError('Missing required fields.', 400));
    }
    if (primaryRole === 'PLATFORM_ADMIN' && clubId) {
         return next(new AppError('Platform Admins cannot be assigned to a specific club.', 400));
    }

    try {
        // Check for email conflicts if email is changing
        if (email) {
            const currentUser = await query('SELECT email FROM users WHERE user_id = $1', [userId]);
            if (currentUser.rows.length === 0) {
                return next(new AppError('User not found.', 404));
            }
            if (currentUser.rows[0].email.toLowerCase() !== email.toLowerCase()) {
                const existingEmail = await query('SELECT user_id FROM users WHERE lower(email) = lower($1) AND user_id != $2', [email, userId]);
                if (existingEmail.rows.length > 0) {
                    return next(new AppError('Another user with this email already exists.', 409));
                }
            }
        }

        const clubIdToSet = primaryRole === 'PLATFORM_ADMIN' ? null : clubId;

        const queryText = `
            UPDATE users SET
                first_name = $1,
                last_name = $2,
                email = $3,
                primary_role = $4,
                club_id = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = $6
            RETURNING user_id, email, first_name, last_name, primary_role, is_active, club_id, updated_at;
        `;
        const result = await query(queryText, [firstName, lastName, email, primaryRole, clubIdToSet, userId]);

        if (result.rows.length === 0) {
            return next(new AppError('User not found or update failed.', 404));
        }

        res.status(200).json({
            status: 'success',
            message: 'User updated successfully.',
            user: result.rows[0],
        });
    } catch (error) {
        logger.error(`Error updating user ${userId} (Platform Admin):`, error);
        return next(new AppError('Failed to update user.', 500));
    }
};

// --- Toggle User Active Status ---
export const toggleUserStatus = async (req, res, next) => {
    const { userId } = req.params;
    const adminUserId = req.user?.userId;

    if (userId === adminUserId) {
        return next(new AppError('Action not allowed on own account.', 400));
    }

    try {
        const result = await query(
            'UPDATE users SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 RETURNING is_active;',
            [userId]
        );

        if (result.rows.length === 0) {
            return next(new AppError('User not found.', 404));
        }

        const newStatus = result.rows[0].is_active;
        res.status(200).json({
            status: 'success',
            message: `User ${newStatus ? 'activated' : 'deactivated'} successfully.`,
            isActive: newStatus,
        });
    } catch (error) {
        logger.error(`Error toggling status for user ${userId} (Platform Admin):`, error);
        return next(new AppError('Failed to update user status.', 500));
    }
};

// --- Delete User ---
export const deleteUser = async (req, res, next) => {
    const { userId } = req.params;
    const adminUserId = req.user?.userId;
    const adminEmail = req.user?.email || 'unknown admin';


    if (userId === adminUserId) {
        return next(new AppError('You cannot delete your own account.', 400));
    }

    logger.warn(`Deletion requested for user ID: ${userId} by admin ${adminEmail}`);

    try {
        const result = await query('DELETE FROM users WHERE user_id = $1 RETURNING email;', [userId]);

        if (result.rowCount === 0) {
            return next(new AppError('User not found.', 404));
        }
        const deletedEmail = result.rows[0]?.email || 'unknown';
        logger.info(`Successfully deleted user ${deletedEmail} (ID: ${userId})`);

        res.status(200).json({
            status: 'success',
            message: 'User deleted successfully.',
        });
    } catch (error) {
        logger.error(`Error deleting user ${userId} (Platform Admin):`, error);
        return next(new AppError('Failed to delete user.', 500));
    }
};


// --- Request Password Reset (Admin Initiated) ---
export const requestPasswordReset = async (req, res, next) => {
    const { userId } = req.params;
    const adminEmail = req.user?.email || 'unknown admin';

    logger.info(`Password reset initiated for user ID: ${userId} by ${adminEmail}`);

    try {
        const userResult = await query('SELECT email, first_name FROM users WHERE user_id = $1 AND is_active = true;', [userId]);
        if (userResult.rows.length === 0) {
            return next(new AppError('Active user not found.', 404));
        }
        const { email, first_name: firstName } = userResult.rows[0];

        const resetToken = crypto.randomBytes(32).toString('hex');
        // Note: Hashing the token before storing is generally recommended for security
        // const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const hashedToken = await hashPassword(resetToken); // Use bcrypt for consistency if available elsewhere
        const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

        await query(
            'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE user_id = $3',
            // Store hashed token, send raw token in email
            [hashedToken, tokenExpiry, userId]
        );

        // Ensure PLATFORM_ADMIN_UI_BASE_URL is configured in your environment
        // const resetUrl = `${process.env.PLATFORM_ADMIN_UI_BASE_URL || 'http://localhost:3002'}/reset-password/${resetToken}`;
        const resetUrl = `${process.env.APP_UI_BASE_URL || 'http://localhost:3000'}/reset-password/${resetToken}`; // Should likely point to APP UI reset page
        await sendPasswordResetEmail(email, firstName, resetUrl);

        logger.info(`Password reset email sent to ${email}`);

        res.status(200).json({
            status: 'success',
            message: 'Password reset email sent.',
        });

    } catch (error) {
        logger.error(`Error requesting password reset for user ${userId} by ${adminEmail}:`, error);
        return next(new AppError('Failed to send password reset email.', 500));
    }
};