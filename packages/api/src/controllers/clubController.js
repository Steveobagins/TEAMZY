// packages/api/src/controllers/clubController.js

import { queryWithTenantContext } from '../config/db.js'; // Relying on RLS via context
import { AppError } from '../utils/errorUtils.js';
import log from '../utils/logger.js'; // Assuming you have a logger utility

// Allowed sort fields for club users list
const ALLOWED_SORT_FIELDS = ['email', 'firstName', 'lastName', 'primary_role', 'created_at'];

/**
 * Get users belonging to the current club admin's club via RLS.
 * Supports pagination and sorting.
 */
export const getUsersInMyClub = async (req, res, next) => {
    // tenantContext is set by authenticateToken middleware
    const { clubId, userId: adminUserId } = req.tenantContext;
    // Log context only at info level if needed
    log.info(`[getUsersInMyClub] Request for ClubID: ${clubId}`);

    // Pagination and Sorting parameters
    const page = parseInt(req.query.page, 10) || 1;
    const pageSize = parseInt(req.query.pageSize, 10) || 10;
    const sortField = req.query.sort || 'created_at';
    const sortOrder = req.query.order?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Validate sort field
    if (!ALLOWED_SORT_FIELDS.includes(sortField)) {
        if (sortField === 'status') {
             // Let user know derived status cannot be sorted currently
             return next(new AppError(`Sorting by derived 'status' is not currently supported.`, 400));
        }
        return next(new AppError(`Invalid sort field: ${sortField}. Allowed: ${ALLOWED_SORT_FIELDS.join(', ')}`, 400));
    }
    // Validate pagination
    if (page < 1 || pageSize < 1 || pageSize > 100) { // Max 100 per page
        return next(new AppError('Invalid pagination parameters (page>=1, pageSize 1-100).', 400));
    }

    const offset = (page - 1) * pageSize;

    try {
        // RLS is expected to handle the filtering based on tenantContext set in queryWithTenantContext
        const usersQuery = `
            SELECT
                user_id as "userId",
                first_name as "firstName",
                last_name as "lastName",
                email,
                primary_role,
                CASE
                    WHEN invitation_status = 'PENDING'::invitation_status THEN 'Invited'
                    WHEN is_active = true THEN 'Active'
                    ELSE 'Inactive'
                END as "status",
                is_active,
                invitation_status,
                created_at,
                club_id -- Select club_id to potentially verify RLS in logs if needed later
            FROM users
            -- No explicit WHERE club_id clause here - relying on RLS policies
            ORDER BY "${sortField}" ${sortOrder} -- Quote sort field for safety
            LIMIT $1 OFFSET $2;
        `;

        // RLS applies to COUNT(*) as well via queryWithTenantContext
        const countQuery = `SELECT COUNT(*) FROM users;`;

        const usersQueryParams = [pageSize, offset];
        const countQueryParams = []; // No params needed for count with RLS

        log.debug(`[getUsersInMyClub] Executing queries via queryWithTenantContext...`);
        // Execute both queries in parallel within the RLS context
        const [usersResult, countResult] = await Promise.all([
            queryWithTenantContext(req.tenantContext, usersQuery, usersQueryParams),
            queryWithTenantContext(req.tenantContext, countQuery, countQueryParams)
        ]);

        const users = usersResult.rows;
        // Safely parse count, default to 0
        const totalCount = countResult.rows.length > 0 ? parseInt(countResult.rows[0].count, 10) : 0;
        log.info(`[getUsersInMyClub] RLS Query Results - User Count This Page: ${users.length}, Total Count (RLS): ${totalCount}`);

        // Log returned club_ids for verification only if issues persist and debug level is enabled
        // if (log.levels.includes('debug')) {
        //      log.debug('[getUsersInMyClub] Returned user club_ids:', users.map(u => u.club_id));
        // }

        const responsePayload = {
            users: users,
            totalCount: totalCount,
            page: page, // Echo back the requested page
            pageSize: pageSize,
        };
        log.debug(`[getUsersInMyClub] Sending Response Payload.`, { userCount: users.length, totalCount });

        res.status(200).json(responsePayload);

    } catch (error) {
        // Log error with context
        log.error(`[getUsersInMyClub] Error fetching users for club ${clubId} by admin ${adminUserId}:`, error);
        // Pass generic error to client
        next(new AppError('Failed to retrieve club users', 500));
    }
};

// --- Placeholder Stubs for future functionality ---
// These will also need to use queryWithTenantContext and rely on appropriate RLS policies
// (including INSERT/UPDATE/DELETE policies if applicable) when implemented.

export const inviteUserToClub = async (req, res, next) => {
    log.warn('inviteUserToClub controller called but not fully implemented.');
    res.status(501).json({ message: "Invite user endpoint not implemented yet." });
};

export const updateUserInClub = async (req, res, next) => {
     const { userId: targetUserId } = req.params;
     log.warn(`updateUserInClub controller called for user ${targetUserId} but not fully implemented.`);
     res.status(501).json({ message: "Update user endpoint not implemented yet." });
};

export const resendInviteToUser = async (req, res, next) => {
    const { userId: targetUserId } = req.params;
     log.warn(`resendInviteToUser controller called for user ${targetUserId} but not fully implemented.`);
    res.status(501).json({ message: "Resend invite endpoint not implemented yet." });
};

export const removeUserFromClub = async (req, res, next) => {
    const { userId: targetUserId } = req.params;
     log.warn(`removeUserFromClub controller called for user ${targetUserId} but not fully implemented.`);
    res.status(501).json({ message: "Remove user endpoint not implemented yet." });
};
// --- End Placeholders ---