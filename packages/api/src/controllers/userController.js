// packages/api/src/controllers/userController.js

// Use named imports for db functions
import { query as dbQuery, queryWithTenantContext } from '../config/db.js';
// Import AppError for consistent error handling
import { AppError } from '../utils/errorUtils.js';
// Import logger utility
import log from '../utils/logger.js';
// Import audit log service if available
// import { createAuditLog } from '../services/auditLogService.js';

// --- Upload Profile Picture for Current User ---
export const uploadMyProfilePicture = async (req, res, next) => {
    // Get userId from req.user set by authMiddleware
    const userId = req.user?.userId;

    if (!userId) {
        // Should not happen if authMiddleware runs first
        log.error("uploadMyProfilePicture error: Missing user ID in request.");
        return next(new AppError('Authentication required.', 401));
    }

    if (!req.file) {
        return next(new AppError('No profile picture file was uploaded.', 400));
    }

    // File details from multer memory storage
    const { buffer, mimetype, originalname, size } = req.file;

    // Basic validation (redundant if multer fileFilter is strict, but safe)
    const MAX_SIZE = 2 * 1024 * 1024; // 2MB
    if (!mimetype.startsWith('image/')) {
        log.warn(`Invalid profile picture file type uploaded by user ${userId}: ${mimetype}`);
        return next(new AppError('Invalid file type. Only images are allowed.', 400));
    }
    if (size > MAX_SIZE) {
        log.warn(`Profile picture file size exceeded limit for user ${userId}: ${size} bytes`);
        return next(new AppError(`File size exceeds the ${MAX_SIZE / 1024 / 1024}MB limit.`, 400));
    }

    try {
        // Use RLS context to ensure the user updates their own profile
        const result = await queryWithTenantContext(
            req.tenantContext, // Pass tenant context from middleware
            `UPDATE users
             SET profile_picture_data = $1,
                 profile_picture_mime_type = $2,
                 profile_picture_file_name = $3,
                 has_profile_picture = TRUE, -- Set flag to true
                 updated_at = NOW()
             WHERE user_id = $4 -- RLS policy should enforce this matches context userId
             RETURNING user_id`,
            [buffer, mimetype, originalname, userId]
        );

        if (result.rowCount === 0) {
            // RLS might prevent update if policy is wrong, or user ID mismatch
            log.error(`Profile pic upload failed for user ${userId}. RLS policy prevented update or user ID mismatch.`);
            // Use 404 as the user context might not match a user visible via RLS
            return next(new AppError('Could not update profile picture. User not found or permission denied.', 404));
        }

        log.info(`Profile picture uploaded successfully for user ${userId}.`);

        // Log audit event (using direct query or service)
        // createAuditLog(req.tenantContext, userId, null, 'PROFILE_PIC_UPLOADED', { filename: originalname, mimetype: mimetype, size: size });
        dbQuery(
            'INSERT INTO audit_log (actor_user_id, actor_club_id, action, target_type, target_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [userId, req.user.club_id, 'PROFILE_PIC_UPLOADED', 'USER', userId, JSON.stringify({ filename: originalname, mimetype: mimetype, size: size }), req.ip, req.headers['user-agent']]
        ).catch(auditErr => log.error("Audit log failed for PROFILE_PIC_UPLOADED:", auditErr));

        res.status(200).json({ message: 'Profile picture uploaded successfully.', hasProfilePicture: true }); // Indicate success

    } catch (error) {
        log.error(`Upload Profile Pic Error for user ${userId}:`, error);
        next(new AppError('Failed to upload profile picture.', 500)); // Generic error
    }
};

// --- Get Profile Picture for a Specific User ---
// NOTE: Permission checks need careful review based on application rules.
export const getProfilePicture = async (req, res, next) => {
    const requestingUser = req.user; // User making the request (from authMiddleware)
    const targetUserId = req.params.userId; // User whose picture is requested

    if (!requestingUser?.userId) {
        log.error("getProfilePicture error: Missing requesting user ID.");
        return next(new AppError('Authentication required.', 401));
    }

    // --- Permission Check Logic ---
    let canView = false;
    try {
        if (requestingUser.userId === targetUserId) {
            canView = true; // User requesting their own picture
            log.debug(`User ${requestingUser.userId} requesting own profile picture.`);
        } else if (requestingUser.primary_role === 'PLATFORM_ADMIN') {
            canView = true; // Platform admin can view any
            log.debug(`Platform Admin ${requestingUser.userId} requesting profile picture of ${targetUserId}.`);
        } else if (requestingUser.club_id) {
            // Check if target user is visible within the requester's RLS context (same club)
            // This relies on the RLS policy for the 'users' table being correctly configured.
            const targetUserResult = await queryWithTenantContext(
                req.tenantContext, // Use REQUESTER'S tenant context
                'SELECT club_id FROM users WHERE user_id = $1', // Just need to know if the row is visible
                [targetUserId]
            );
            if (targetUserResult.rows.length > 0) {
                // Row is visible via RLS, means they are in the same club.
                // Add more role-specific checks if needed (e.g., Coach vs Athlete)
                if (['CLUB_ADMIN', 'COACH'].includes(requestingUser.primary_role)) {
                    canView = true;
                    log.debug(`User ${requestingUser.userId} (Role: ${requestingUser.primary_role}) requesting profile picture of ${targetUserId} (same club).`);
                }
                // TODO: Add logic for Parent/Athlete visibility if required
            }
        }

        if (!canView) {
            log.warn(`Permission denied for user ${requestingUser.userId} (Role: ${requestingUser.primary_role}) to view profile pic of ${targetUserId}.`);
            return next(new AppError('Forbidden: You do not have permission to view this profile picture.', 403));
        }

        // --- Fetch Picture Data (Permission Granted) ---
        // Use direct query as RLS/permission check is complete.
        const result = await dbQuery(
            'SELECT profile_picture_data, profile_picture_mime_type FROM users WHERE user_id = $1 AND has_profile_picture = TRUE', // Also check flag
            [targetUserId]
        );
        const profile = result.rows[0];

        if (!profile || !profile.profile_picture_data || !profile.profile_picture_mime_type) {
            log.debug(`Profile picture not found for target user ${targetUserId} (or flag not set).`);
            // Send 404 - frontend should handle showing a default avatar
            return next(new AppError('Profile picture not found for this user.', 404));
        }

        // Set headers and send image data
        res.setHeader('Content-Type', profile.profile_picture_mime_type);
        res.setHeader('Content-Disposition', `inline; filename="profile_${targetUserId}"`); // Suggest filename
        res.setHeader('Cache-Control', 'private, max-age=3600'); // Cache for 1 hour
        res.send(profile.profile_picture_data);

    } catch (error) {
        log.error(`Get Profile Pic Error for target user ${targetUserId}, requested by ${requestingUser.userId}:`, error);
        next(new AppError('Failed to retrieve profile picture.', 500));
    }
};

// --- Delete Profile Picture for Current User ---
export const deleteMyProfilePicture = async (req, res, next) => {
    const userId = req.user?.userId; // From authMiddleware

    if (!userId) {
        log.error("deleteMyProfilePicture error: Missing user ID in request.");
        return next(new AppError('Authentication required.', 401));
    }

    try {
        // Use RLS context to ensure the user deletes their own picture
        const result = await queryWithTenantContext(
            req.tenantContext, // Pass context
            `UPDATE users
             SET profile_picture_data = NULL,
                 profile_picture_mime_type = NULL,
                 profile_picture_file_name = NULL,
                 has_profile_picture = FALSE, -- Set flag to false
                 updated_at = NOW()
             WHERE user_id = $1 -- RLS should enforce self-update
             RETURNING user_id`, // Ensure the update happened
            [userId]
        );

        if (result.rowCount === 0) {
            log.error(`Profile pic deletion failed for user ${userId}. RLS policy prevented update or user ID mismatch.`);
            return next(new AppError('Could not delete profile picture. User not found or permission denied.', 404));
        }

        log.info(`Profile picture deleted successfully for user ${userId}.`);

        // Log audit event
        // createAuditLog(req.tenantContext, userId, null, 'PROFILE_PIC_DELETED');
        dbQuery(
            'INSERT INTO audit_log (actor_user_id, actor_club_id, action, target_type, target_id, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [userId, req.user.club_id, 'PROFILE_PIC_DELETED', 'USER', userId, req.ip, req.headers['user-agent']]
        ).catch(auditErr => log.error("Audit log failed for PROFILE_PIC_DELETED:", auditErr));

        res.status(200).json({ message: 'Profile picture deleted successfully.', hasProfilePicture: false }); // Indicate success

    } catch (error) {
        log.error(`Delete Profile Pic Error for user ${userId}:`, error);
        next(new AppError('Failed to delete profile picture.', 500));
    }
};


// --- Update Profile for Current User ---
export const updateMyProfile = async (req, res, next) => {
    const userId = req.user?.userId;
    // Extract allowed fields from body - add validation in routes/validationRules.js
    const { firstName, lastName, phone /* Add other self-editable fields */ } = req.body;

    if (!userId) {
        return next(new AppError('Authentication required.', 401));
    }

    const fieldsToUpdate = {};
    if (firstName !== undefined) fieldsToUpdate.first_name = firstName;
    if (lastName !== undefined) fieldsToUpdate.last_name = lastName;
    if (phone !== undefined) fieldsToUpdate.phone = phone;
    // Add other editable fields

    if (Object.keys(fieldsToUpdate).length === 0) {
        return res.status(304).json({ message: 'No changes detected or no valid fields provided.' });
    }

    try {
        // Construct dynamic update query
        const updateFields = Object.keys(fieldsToUpdate);
        const setClauses = updateFields.map((key, index) => `"${key}" = $${index + 1}`);
        const updateValues = updateFields.map(key => fieldsToUpdate[key]);

        const updateQuery = `
            UPDATE users SET ${setClauses.join(', ')}, updated_at = NOW()
            WHERE user_id = $${updateFields.length + 1} -- RLS will enforce self-update
            RETURNING user_id, email, first_name as "firstName", last_name as "lastName", phone, updated_at`; // Return updated fields

        // Use RLS context for self-update
        const result = await queryWithTenantContext(
            req.tenantContext,
            updateQuery,
            [...updateValues, userId]
        );

        if (result.rowCount === 0) {
            log.error(`Self-profile update failed for user ${userId}. RLS policy prevented update or user ID mismatch.`);
            return next(new AppError('Could not update profile. User not found or permission denied.', 404));
        }

        log.info(`User ${userId} updated their profile successfully.`);
        // TODO: Add detailed audit log comparing changes

        res.status(200).json({ message: 'Profile updated successfully.', user: result.rows[0] });

    } catch (error) {
        log.error(`Update Profile Error for user ${userId}:`, error);
        next(new AppError('Failed to update profile.', 500));
    }
};


// No module.exports needed