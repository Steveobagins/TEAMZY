// packages/api/src/services/auditLogService.js
import { query } from '../config/db.js'; // Use direct query for logging
import log from '../utils/logger.js';

/**
 * Creates an entry in the audit_log table.
 *
 * @param {object} context - The context of the user performing the action.
 *                           Should contain { userId, clubId, role } if available.
 *                           Use { userId: null } etc. for system or unauthenticated actions.
 * @param {string|number|null} targetUserId - The ID of the user being affected (if applicable).
 * @param {string|number|null} targetClubId - The ID of the club being affected (if applicable).
 * @param {string} action - A string code representing the action (e.g., 'LOGIN_SUCCESS', 'INVITE_USER_SENT').
 * @param {object|null} details - Optional JSON object containing additional details about the action.
 */
export const createAuditLog = async (context, targetUserId, targetClubId, action, details = null) => {
    try {
        // Ensure context values are present or null
        const actorUserId = context?.userId ?? null;
        const actorClubId = context?.clubId ?? null;
        // const actorRole = context?.role ?? null; // Role might be useful to store too

        // Ensure target IDs are valid or null
        const validTargetUserId = targetUserId || null;
        const validTargetClubId = targetClubId || null;

        const result = await query(
            `INSERT INTO audit_log (actor_user_id, actor_club_id, action, target_user_id, target_club_id, details)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING audit_log_id`,
            [actorUserId, actorClubId, action, validTargetUserId, validTargetClubId, details ? JSON.stringify(details) : null]
        );

        log.debug(`Audit log created: ID ${result.rows[0].audit_log_id}, Action: ${action}, Actor: ${actorUserId}`);

    } catch (error) {
        // Log the error but don't let audit logging failure break the main operation
        log.error('Failed to create audit log:', {
             error: error.message,
             context,
             targetUserId,
             targetClubId,
             action,
             details
        });
    }
};

// Example usage within another service or controller:
// import { createAuditLog } from './auditLogService';
// ... inside an async function where req exists ...
// await createAuditLog(req.tenantContext, newUser.user_id, null, 'USER_CREATED', { email: newUser.email });
// await createAuditLog(req.tenantContext, null, clubId, 'CLUB_SETTINGS_UPDATED', { changes: [...] });
// await createAuditLog({ userId: systemUserId }, targetUser.id, null, 'SYSTEM_USER_DEACTIVATED');