// Canvas: packages/api/src/controllers/platformClubController.js
// --- Fix applied: Changed FOR UPDATE to FOR UPDATE OF c ---

import * as db from '../config/db.js';
import createError from 'http-errors';
import { generateSecureToken } from '../utils/token.js';
import * as emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

// --- Load Constants (with checks and fallbacks) ---
let USER_ROLES, SUBSCRIPTION_TIERS, INVITATION_STATUS, DEFAULT_SUBSCRIPTION_STATUS;
const FALLBACK_USER_ROLES = { CLUB_ADMIN: 'CLUB_ADMIN' };
const FALLBACK_SUBSCRIPTION_TIERS = { FREE: 'FREE', BASIC: 'BASIC', PREMIUM: 'PREMIUM' };
const FALLBACK_INVITATION_STATUS = { PENDING: 'PENDING' };
const FALLBACK_DEFAULT_SUBSCRIPTION_STATUS = { ACTIVE: 'active', INACTIVE: 'inactive' };

try {
    const constants = await import('../utils/constants.js');
    USER_ROLES = constants.USER_ROLES;
    SUBSCRIPTION_TIERS = constants.SUBSCRIPTION_TIERS;
    INVITATION_STATUS = constants.INVITATION_STATUS;
    DEFAULT_SUBSCRIPTION_STATUS = constants.DEFAULT_SUBSCRIPTION_STATUS;

    if (!USER_ROLES || !USER_ROLES.CLUB_ADMIN) { logger.warn("WARN (platformClubController): USER_ROLES constant missing/incomplete. Using fallback."); USER_ROLES = FALLBACK_USER_ROLES; }
    if (!SUBSCRIPTION_TIERS || !Object.keys(SUBSCRIPTION_TIERS).length) { logger.warn("WARN (platformClubController): SUBSCRIPTION_TIERS missing/incomplete. Using fallback."); SUBSCRIPTION_TIERS = FALLBACK_SUBSCRIPTION_TIERS; }
     if (!INVITATION_STATUS || !INVITATION_STATUS.PENDING) { logger.warn("WARN (platformClubController): INVITATION_STATUS missing/incomplete. Using fallback."); INVITATION_STATUS = FALLBACK_INVITATION_STATUS; }
    if (!DEFAULT_SUBSCRIPTION_STATUS || !DEFAULT_SUBSCRIPTION_STATUS.ACTIVE) { logger.warn("WARN (platformClubController): DEFAULT_SUBSCRIPTION_STATUS missing/incomplete. Using fallback."); DEFAULT_SUBSCRIPTION_STATUS = FALLBACK_DEFAULT_SUBSCRIPTION_STATUS; }
} catch (err) {
    logger.error(`ERROR (platformClubController): Failed to load constants from '../utils/constants.js'. Using fallbacks. Error: ${err.message}`);
    USER_ROLES = FALLBACK_USER_ROLES; SUBSCRIPTION_TIERS = FALLBACK_SUBSCRIPTION_TIERS; INVITATION_STATUS = FALLBACK_INVITATION_STATUS; DEFAULT_SUBSCRIPTION_STATUS = FALLBACK_DEFAULT_SUBSCRIPTION_STATUS;
}
// ----------------------------------------------------

const FRONTEND_BASE_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Get ALL clubs
export async function getAllClubs(req, res, next) {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sort_by || 'created_at';
    const sortOrder = req.query.sort_order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const allowedSortColumns = ['name', 'subdomain', 'created_at', 'is_active', 'subscription_tier'];
    const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
    try {
        const clubsQuery = `
            SELECT
                c.club_id, c.name, c.subdomain, c.subscription_tier,
                c.subscription_status, c.is_active, c.created_at,
                u.email as primary_contact_email
            FROM clubs c
            LEFT JOIN users u ON c.primary_contact_user_id = u.user_id
            ORDER BY c.${safeSortBy} ${sortOrder}
            LIMIT $1 OFFSET $2
        `;
        const clubsResult = await db.query(clubsQuery, [limit, offset]);
        const totalResult = await db.query('SELECT COUNT(*) FROM clubs');
        const totalClubs = parseInt(totalResult.rows[0].count, 10);
        res.status(200).json({
            clubs: clubsResult.rows,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalClubs / limit),
                totalClubs: totalClubs,
                limit: limit
            }
        });
    } catch (error) {
        logger.error("Error fetching all clubs (Platform Admin):", error);
        next(error);
    }
}

// Get single club details
export async function getClubById(req, res, next) {
    const { clubId } = req.params;
    try {
         const queryText = `
            SELECT
                c.*,
                pc.email as primary_contact_email,
                pc.first_name as primary_contact_first_name,
                pc.last_name as primary_contact_last_name,
                ca.email as created_by_admin_email,
                (c.logo_data IS NOT NULL) as has_logo
            FROM clubs c
            LEFT JOIN users pc ON c.primary_contact_user_id = pc.user_id
            LEFT JOIN users ca ON c.created_by_user_id = ca.user_id
            WHERE c.club_id = $1
         `;
         const result = await db.query(queryText, [clubId]);
        if (result.rows.length === 0) {
            return next(createError(404, 'Club not found.'));
        }
        const { logo_data, ...clubDataToSend } = result.rows[0];
        res.status(200).json(clubDataToSend);
    } catch(error) {
        logger.error(`Error fetching club ${clubId} (Platform Admin):`, error);
        next(error);
    }
}

// Get Club Logo
export async function getClubLogo(req, res, next) {
    const { clubId } = req.params;
    try {
        const result = await db.query('SELECT logo_data, logo_mime_type FROM clubs WHERE club_id = $1', [clubId]);
        if (result.rows.length === 0) {
            return next(createError(404, 'Club not found.'));
        }
        const logoData = result.rows[0].logo_data;
        const mimeType = result.rows[0].logo_mime_type;
        if (!logoData || !mimeType) {
            return next(createError(404, 'Logo not found for this club.'));
        }
        res.setHeader('Content-Type', mimeType);
        res.send(logoData);
    } catch (error) {
        logger.error(`Error fetching logo for club ${clubId}:`, error);
        next(error);
    }
}

// Create Club
export async function createClub(req, res, next) {
    const {
        clubName,
        subdomain,
        primaryContactEmail,
        primaryContactFirstName,
        primaryContactLastName,
        subscriptionTier = SUBSCRIPTION_TIERS.FREE,
        activateImmediately = true,
    } = req.body;
    const createdByUserId = req.user?.userId;

    if (!createdByUserId) {
        logger.error("createClub Error: Missing user ID in request (req.user.userId)");
        return next(createError(401, 'Unauthorized: Missing authenticated user information.'));
    }

    let client;
    try {
        if (!db.pool || typeof db.pool.connect !== 'function') {
            logger.error("FATAL (createClub): db.pool or db.pool.connect is not available. Check config/db.js export.");
            return next(createError(500, 'Database configuration error.'));
        }
        client = await db.pool.connect();
        await client.query('BEGIN');
        logger.info("Transaction started for club creation.");

        const emailCheck = await client.query('SELECT 1 FROM users WHERE email = $1', [primaryContactEmail]);
        if (emailCheck.rowCount > 0) {
            logger.warn(`Club Creation Conflict: Email ${primaryContactEmail} already exists.`);
            await client.query('ROLLBACK');
            return next(createError(409, 'Email address is already associated with an existing user.'));
        }
        const subdomainCheck = await client.query('SELECT 1 FROM clubs WHERE subdomain = $1', [subdomain]);
        if (subdomainCheck.rowCount > 0) {
            logger.warn(`Club Creation Conflict: Subdomain ${subdomain} already exists.`);
            await client.query('ROLLBACK');
            return next(createError(409, 'Subdomain is already taken. Please choose another one.'));
        }

        logger.info(`Inserting club: ${clubName}, Subdomain: ${subdomain}`);
        const clubInsertQuery = `
            INSERT INTO clubs (name, subdomain, subscription_tier, subscription_status, created_by_user_id, is_active)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING club_id;
        `;
        const initialSubscriptionStatus = activateImmediately ? DEFAULT_SUBSCRIPTION_STATUS.ACTIVE : DEFAULT_SUBSCRIPTION_STATUS.INACTIVE;
        const clubResult = await client.query(clubInsertQuery, [
            clubName, subdomain, subscriptionTier, initialSubscriptionStatus, createdByUserId, activateImmediately,
        ]);
        const newClubId = clubResult.rows[0].club_id;
        logger.info(`Club created with ID: ${newClubId}`);

        const verificationToken = generateSecureToken();
        const verificationTokenExpires = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS);
        logger.info(`Generated verification token: [${verificationToken}] expiring at: [${verificationTokenExpires}]`);

        logger.info(`Inserting initial Club Admin user: ${primaryContactEmail}`);
        const userInsertQuery = `
            INSERT INTO users (email, first_name, last_name, primary_role, club_id, is_email_verified, verification_token, verification_token_expires, is_active, invitation_status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING user_id;
        `;
        const userInsertParams = [
            primaryContactEmail, primaryContactFirstName, primaryContactLastName,
            USER_ROLES.CLUB_ADMIN, newClubId, false, verificationToken, verificationTokenExpires, false, INVITATION_STATUS.PENDING,
        ];
        logger.debug(`DEBUG: User INSERT parameters:`, JSON.stringify(userInsertParams));

        let userResult;
        try {
            userResult = await client.query(userInsertQuery, userInsertParams);
            logger.debug(`DEBUG: User INSERT query executed. Row count: ${userResult.rowCount}`);
        } catch(insertError) {
            logger.error("ERROR during user INSERT:", insertError);
            await client.query('ROLLBACK');
            return next(createError(500, 'Failed to create user record during club setup.'));
        }

        if (!userResult || userResult.rowCount === 0 || !userResult.rows[0]?.user_id) {
            logger.error("ERROR: User INSERT query seemed to succeed but returned no user_id. Rolling back.");
            await client.query('ROLLBACK');
            return next(createError(500, 'Failed to retrieve user ID after creation.'));
        }
        const newUserId = userResult.rows[0].user_id;
        logger.info(`Club Admin user created with ID: ${newUserId}`);

        logger.info(`Linking primary contact user ${newUserId} to club ${newClubId}`);
        const updateClubQuery = `
            UPDATE clubs SET primary_contact_user_id = $1, updated_at = NOW() WHERE club_id = $2;
        `;
        await client.query(updateClubQuery, [newUserId, newClubId]);
        logger.info(`Club ${newClubId} updated with primary contact.`);

        await client.query('COMMIT');
        logger.info(`Transaction committed successfully for club ${newClubId}.`);

        logger.debug(`DEBUG: Value of verificationToken before creating link: [${verificationToken}]`);
        const verificationLink = `${FRONTEND_BASE_URL}/verify-email/${verificationToken}`;
        logger.info(`Attempting to send verification email to ${primaryContactEmail}`);
        emailService.sendEmailVerificationEmail(primaryContactEmail, primaryContactFirstName, verificationToken)
            .then(() => logger.info(`Verification email successfully queued/sent for ${primaryContactEmail}`))
            .catch(emailError => logger.error(`CRITICAL: Failed to send verification email to ${primaryContactEmail} for club ${newClubId}: ${emailError.message}`, emailError));

        res.status(201).json({
            message: 'Club created successfully. A verification email has been sent to the primary contact.',
            club: { club_id: newClubId, name: clubName, subdomain: subdomain, primary_contact_user_id: newUserId }
        });

    } catch (error) {
        logger.error(`Error during club creation: ${error.message}`, { stack: error.stack, body: req.body });
        if (client) {
            try { logger.error("Rolling back transaction due to error."); await client.query('ROLLBACK'); }
            catch (rollbackError) { logger.error(`Critical Error: Failed to rollback transaction: ${rollbackError.message}`, rollbackError); }
        }
        next(error instanceof createError.HttpError ? error : createError(500, 'Failed to create club due to an internal server error.'));
    } finally {
        if (client) { client.release(); logger.info("Database client released."); }
    }
}


// Update Club
export async function updateClub(req, res, next) {
    const { clubId } = req.params;
    const adminUserId = req.user?.userId;
    const adminUserEmail = req.user?.email;
    const {
        name, contact_email, contact_phone, address,
        primary_color, secondary_color, subscription_tier,
        primary_contact_user_id
    } = req.body;

    logger.info(`Admin ${adminUserEmail} attempting to update club ${clubId}`);

    const fieldsToUpdate = {};
    const originalFields = {};

    if (name !== undefined) fieldsToUpdate.name = name;
    if (contact_email !== undefined) fieldsToUpdate.contact_email = contact_email;
    if (contact_phone !== undefined) fieldsToUpdate.contact_phone = contact_phone;
    if (address !== undefined) fieldsToUpdate.address = address;
    if (primary_color !== undefined) fieldsToUpdate.primary_color = primary_color;
    if (secondary_color !== undefined) fieldsToUpdate.secondary_color = secondary_color;

    const allowedTiers = Object.values(SUBSCRIPTION_TIERS || FALLBACK_SUBSCRIPTION_TIERS);
    if (subscription_tier !== undefined) {
        if (allowedTiers.includes(subscription_tier)) {
            fieldsToUpdate.subscription_tier = subscription_tier;
        } else {
            return next(createError(400, `Invalid subscription_tier: ${subscription_tier}. Allowed: ${allowedTiers.join(', ')}`));
        }
    }

    const newPrimaryContactId = primary_contact_user_id;

    if (Object.keys(fieldsToUpdate).length === 0 && !newPrimaryContactId) {
        return res.status(304).json({ message: 'No valid fields provided for update.' });
    }

    let client;
    try {
        client = await db.pool.connect();
        await client.query('BEGIN');

        // --- *** THE FIX IS HERE *** ---
        // Get current club data for comparison and lock ONLY the clubs row ('c')
        const currentClubResult = await client.query(`
            SELECT
                c.name, c.contact_email, c.contact_phone, c.address, c.primary_color,
                c.secondary_color, c.subscription_tier, c.primary_contact_user_id,
                pc.email as current_primary_contact_email,
                pc.first_name as current_primary_contact_first_name,
                pc.last_name as current_primary_contact_last_name
            FROM clubs c
            LEFT JOIN users pc ON c.primary_contact_user_id = pc.user_id
            WHERE c.club_id = $1
            FOR UPDATE OF c -- <<< Changed to lock only the 'clubs' table row
            `,
            [clubId]
        );
        // --- *** END OF FIX *** ---


        if (currentClubResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return next(createError(404, 'Club not found.'));
        }
        const currentClub = currentClubResult.rows[0];
        Object.assign(originalFields, currentClub);

        if (newPrimaryContactId && newPrimaryContactId !== currentClub.primary_contact_user_id) {
            logger.info(`Attempting to change primary contact for club ${clubId} to user ${newPrimaryContactId}`);
            const newContactUserResult = await client.query(
                'SELECT user_id, email, primary_role FROM users WHERE user_id = $1 AND club_id = $2',
                [newPrimaryContactId, clubId]
            );
            if (newContactUserResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return next(createError(400, `Invalid user specified for primary contact: User ID ${newPrimaryContactId} not found or does not belong to this club.`));
            }
            fieldsToUpdate.primary_contact_user_id = newPrimaryContactId;
            logger.info(`New primary contact user ${newContactUserResult.rows[0].email} validated for club ${clubId}.`);
        } else if (newPrimaryContactId === currentClub.primary_contact_user_id) {
            logger.info(`Primary contact ID provided (${newPrimaryContactId}) is the same as the current one. No change needed.`);
        }

        if (Object.keys(fieldsToUpdate).length === 0) {
            await client.query('ROLLBACK'); // Release lock
            return res.status(304).json({ message: 'No changes detected.' });
        }

        const updateFields = Object.keys(fieldsToUpdate);
        const setClauses = updateFields.map((key, index) => `${key} = $${index + 1}`);
        const updateValues = updateFields.map(key => fieldsToUpdate[key]);

        const updateQuery = `
            UPDATE clubs SET ${setClauses.join(', ')}, updated_at = NOW()
            WHERE club_id = $${updateFields.length + 1}
            RETURNING *;`;

        logger.info(`Executing update for club ${clubId}: SET ${setClauses.join(', ')}`);
        const updateResult = await client.query(updateQuery, [...updateValues, clubId]);

        if (updateResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return next(createError(500, 'Failed to update club.'));
        }
        const updatedClub = updateResult.rows[0];
        logger.info(`Club ${clubId} updated successfully.`);

        // --- Audit Logging ---
        const changes = {};
        updateFields.forEach(key => {
            if (String(originalFields[key]) !== String(updatedClub[key])) {
                changes[key] = { old: originalFields[key], new: updatedClub[key] };
            }
        });

        if (Object.keys(changes).length > 0) {
            try {
                await client.query(
                    'INSERT INTO audit_log (user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
                    [ adminUserId, 'PLATFORM_CLUB_UPDATED', 'CLUB', clubId, JSON.stringify({ clubName: updatedClub.name, changes, updatedBy: adminUserEmail }) ]
                );
            } catch (auditErr) { logger.error(`Audit log failed for club update (Club ID: ${clubId}):`, auditErr); }
        } else { logger.info(`No actual field value changes detected for club ${clubId} after update query.`); }
        // --- End Audit Logging ---

        await client.query('COMMIT');

        // Prepare response - fetch final contact details if changed
        const { logo_data, ...clubDataToSend } = updatedClub;
        if (changes.primary_contact_user_id) {
             const finalContact = await db.query('SELECT email, first_name, last_name FROM users WHERE user_id = $1', [updatedClub.primary_contact_user_id]);
             if(finalContact.rows.length > 0) {
                clubDataToSend.primary_contact_email = finalContact.rows[0].email;
                clubDataToSend.primary_contact_first_name = finalContact.rows[0].first_name;
                clubDataToSend.primary_contact_last_name = finalContact.rows[0].last_name;
             }
        } else {
             clubDataToSend.primary_contact_email = originalFields.current_primary_contact_email;
             clubDataToSend.primary_contact_first_name = originalFields.current_primary_contact_first_name;
             clubDataToSend.primary_contact_last_name = originalFields.current_primary_contact_last_name;
        }

        res.status(200).json({
            message: 'Club updated successfully.',
            club: clubDataToSend
        });

    } catch (error) {
        logger.error(`Error updating club ${clubId}:`, error);
        if (client) {
            try { await client.query('ROLLBACK'); }
            catch (rbErr) { logger.error('Rollback failed:', rbErr); }
        }
        // Pass the original database error if it's the specific one we identified
        if (error.code === '0A000' && error.message.includes('FOR UPDATE cannot be applied')) {
            next(createError(500, `Database error during update: ${error.message}`));
        } else {
            next(error); // Pass other errors to the global handler
        }
    } finally {
        if (client) { client.release(); }
    }
}


// Toggle Club Status
export async function toggleClubStatus(req, res, next) {
    const { clubId } = req.params;
    const userId = req.user?.userId;
    const userEmail = req.user?.email;

    if (!userId || !userEmail) {
        logger.error("toggleClubStatus Error: Missing user ID or email in request (req.user)");
        return next(createError(401, 'Unauthorized: Missing authenticated user information.'));
    }

    let client;
    try {
        if (!db.pool || typeof db.pool.connect !== 'function') {
             logger.error("FATAL (toggleClubStatus): db.pool or db.pool.connect is not available.");
            return next(createError(500, 'Database configuration error.'));
        }
        client = await db.pool.connect();
        await client.query('BEGIN');

        const currentClubResult = await client.query('SELECT is_active FROM clubs WHERE club_id = $1 FOR UPDATE', [clubId]); // FOR UPDATE is fine here (no join)
        if (currentClubResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return next(createError(404, 'Club not found.'));
        }
        const currentStatus = currentClubResult.rows[0].is_active;
        const newStatus = !currentStatus;

        await client.query('UPDATE clubs SET is_active = $1, updated_at = NOW() WHERE club_id = $2', [newStatus, clubId]);

        try {
            await client.query(
                'INSERT INTO audit_log (user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
                [ userId, newStatus ? 'PLATFORM_CLUB_ACTIVATED' : 'PLATFORM_CLUB_DEACTIVATED', 'CLUB', clubId, JSON.stringify({ toggledBy: userEmail }) ]
            );
        } catch (auditErr) {
            logger.error("Audit log failed within transaction:", auditErr);
            await client.query('ROLLBACK');
            return next(createError(500, 'Failed to record audit log. Status change reverted.'));
        }

        await client.query('COMMIT');

        res.status(200).json({
            message: `Club status successfully updated to ${newStatus ? 'Active' : 'Inactive'}.`
        });

    } catch(error) {
        logger.error(`Error toggling club status for ${clubId} (Platform Admin):`, error);
        if (client) { try { await client.query('ROLLBACK'); } catch (rbErr) { logger.error("Rollback failed:", rbErr); } }
        next(error);
    } finally {
        if (client) { client.release(); }
    }
}


// Delete Club (and associated users)
export async function deleteClub(req, res, next) {
    const { clubId } = req.params;
    const adminUserId = req.user?.userId;
    const adminUserEmail = req.user?.email;

    logger.warn(`!!! DESTRUCTIVE ACTION WARNING !!! Admin ${adminUserEmail} attempting to delete club ${clubId} and ALL associated users.`);

    let client;
    try {
        client = await db.pool.connect();
        await client.query('BEGIN');

        const clubResult = await client.query('SELECT name FROM clubs WHERE club_id = $1', [clubId]);
        if (clubResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return next(createError(404, 'Club not found.'));
        }
        const clubName = clubResult.rows[0].name;

        const usersResult = await client.query('SELECT user_id, email FROM users WHERE club_id = $1', [clubId]);
        const usersToDelete = usersResult.rows;
        logger.info(`Found ${usersToDelete.length} users associated with club ${clubId} (${clubName}) marked for deletion.`);

        let deletedUserCount = 0;
        let deletedUserEmails = [];
        if (usersToDelete.length > 0) {
            const userIdsToDelete = usersToDelete.map(u => u.user_id);
             deletedUserEmails = usersToDelete.map(u => u.email);
            logger.info(`Deleting users with IDs: ${userIdsToDelete.join(', ')}`);
            const deleteUsersResult = await client.query('DELETE FROM users WHERE user_id = ANY($1::uuid[])', [userIdsToDelete]);
             deletedUserCount = deleteUsersResult.rowCount;
            logger.info(`Deleted ${deletedUserCount} user records.`);
            if (deletedUserCount !== usersToDelete.length) {
                 logger.warn(`Mismatch during user deletion for club ${clubId}. Expected ${usersToDelete.length}, deleted ${deletedUserCount}. Rolling back.`);
                await client.query('ROLLBACK');
                return next(createError(500, 'Failed to delete all associated users. Club deletion aborted.'));
            }
        }

        logger.info(`Deleting club record for ${clubId} (${clubName}).`);
        const deleteClubResult = await client.query('DELETE FROM clubs WHERE club_id = $1', [clubId]);

        if (deleteClubResult.rowCount !== 1) {
            await client.query('ROLLBACK');
            logger.error(`Club deletion failed unexpectedly for club ID: ${clubId}. Row count: ${deleteClubResult.rowCount}`);
            return next(createError(500, 'Club deletion failed unexpectedly.'));
        }
        logger.info(`Club ${clubName} (ID: ${clubId}) deleted successfully.`);

        try {
            await client.query(
                'INSERT INTO audit_log (user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
                [ adminUserId, 'PLATFORM_CLUB_DELETED', 'CLUB', clubId, JSON.stringify({ deletedClubName: clubName, deletedUserCount: deletedUserCount, deletedUserEmails: deletedUserEmails, deletedBy: adminUserEmail }) ]
            );
        } catch (auditErr) { logger.error(`Audit log failed for club deletion (Club ID: ${clubId}):`, auditErr); }

        await client.query('COMMIT');
        logger.info(`Transaction committed for deletion of club ${clubId}.`);

        res.status(200).json({
            message: `Club '${clubName}' and its associated users deleted successfully.`
        });

    } catch (error) {
        logger.error(`Error deleting club ${clubId} (Platform Admin):`, error);
        if (client) { try { await client.query('ROLLBACK'); logger.error("Transaction rolled back due to error."); } catch (rbErr) { logger.error('Rollback failed:', rbErr); } }
        if (error.code === '23503') {
             logger.error(`Foreign key violation during club deletion. Check for other related tables: ${error.detail}`);
            return next(createError(409, `Cannot delete club. It may still be referenced by other data (e.g., teams, events). Please clean up related data first. Details: ${error.detail}`));
        }
        next(error);
    } finally {
        if (client) { client.release(); }
    }
}


// --- Upload/Update Club Logo ---
export async function uploadClubLogo(req, res, next) {
    const { clubId } = req.params;
    const adminUserId = req.user?.userId || 'unknown_admin_id';
    const adminUserEmail = req.user?.email || 'unknown_admin_email';

    if (!req.file) { return next(createError(400, 'No logo file uploaded.')); }

    logger.info(`Admin ${adminUserEmail} (ID: ${adminUserId}) uploading logo for club ID: ${clubId}. File: ${req.file.originalname}, Size: ${req.file.size}, MIME: ${req.file.mimetype}`);

    let client;
    try {
         client = await db.pool.connect();
         await client.query('BEGIN');

        const clubExists = await client.query('SELECT club_id, name FROM clubs WHERE club_id = $1 FOR UPDATE', [clubId]); // FOR UPDATE fine here (no join)
        if (clubExists.rows.length === 0) { await client.query('ROLLBACK'); return next(createError(404, 'Club not found.')); }
        const clubName = clubExists.rows[0].name;

        const queryText = `
            UPDATE clubs SET logo_data = $1, logo_mime_type = $2, updated_at = CURRENT_TIMESTAMP WHERE club_id = $3;
        `;
        await client.query(queryText, [req.file.buffer, req.file.mimetype, clubId]);
        logger.info(`Successfully updated logo for club ID: ${clubId}`);

         try {
             await client.query(
                 'INSERT INTO audit_log (user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5)',
                 [ adminUserId, 'PLATFORM_CLUB_LOGO_UPDATED', 'CLUB', clubId, JSON.stringify({ clubName: clubName, uploadedBy: adminUserEmail, fileName: req.file.originalname, fileSize: req.file.size, mimeType: req.file.mimetype }) ]
             );
         } catch (auditErr) { logger.error(`Audit log failed for logo upload (Club ID: ${clubId}):`, auditErr); }

         await client.query('COMMIT');

        res.status(200).json({ status: 'success', message: 'Club logo updated successfully.' });
    } catch (error) {
        logger.error(`Error uploading logo for club ${clubId}:`, error);
         if (client) { try { await client.query('ROLLBACK'); } catch (rbErr) { logger.error('Rollback failed:', rbErr); } }
        next(createError(500, 'Failed to save club logo.'));
    } finally {
         if (client) { client.release(); }
    }
}