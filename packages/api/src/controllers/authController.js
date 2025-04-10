// packages/api/src/controllers/authController.js

import bcrypt from 'bcrypt';
import crypto from 'crypto'; // For generating tokens
import { query, queryWithTenantContext } from '../config/db.js'; // Use direct query for some actions
import { generateAuthToken } from '../utils/token.js'; // Assuming exists: generates JWT
import { hashPassword, comparePassword } from '../utils/hash.js'; // Assuming bcrypt compare is here
import * as emailService from '../services/emailService.js'; // Assuming email service uses exports
import { AppError } from '../utils/errorUtils.js';
import log from '../utils/logger.js'; // Make sure logger is imported
import { createAuditLog } from '../services/auditLogService.js'; // Optional: For audit logging

const SALT_ROUNDS = process.env.SALT_ROUNDS ? parseInt(process.env.SALT_ROUNDS, 10) : 12;
const RESET_TOKEN_EXPIRES_MINUTES = 60; // Password reset token validity
const INVITE_TOKEN_EXPIRES_HOURS = 72; // Invite token validity
const VERIFICATION_TOKEN_EXPIRES_HOURS = 24; // Email verification token validity
const SET_PASSWORD_TOKEN_EXPIRES_HOURS = 72; // Set password token validity

// Helper to generate secure tokens and their hashed versions + expiry
const generateTokenAndHash = async (bytes = 48, validityHours) => {
    const token = crypto.randomBytes(bytes).toString('hex');
    // Ensure hashPassword utility exists and works as expected
    const hashedToken = await hashPassword(token);
    const expires = new Date();
    expires.setHours(expires.getHours() + validityHours);
    return { token, hashedToken, expires };
};

// --- Authentication Controller Functions ---

export const login = async (req, res, next) => {
    const { email, password } = req.body;
    log.info(`Login attempt initiated for email: ${email}`); // Log start

    if (!email || !password) {
        log.warn(`[Login] Missing email or password in request body.`);
        return next(new AppError('Email and password are required.', 400));
    }

    try {
        // Find user by email - case-insensitive search
        log.debug(`[Login] Querying for user: ${email}`);
        const result = await query(
            `SELECT
                user_id, email, password_hash, primary_role, club_id,
                is_active, is_email_verified, first_name, last_name,
                has_profile_picture
             FROM users
             WHERE lower(email) = lower($1)`,
            [email]
        );
        const user = result.rows[0];

        if (!user) {
            log.warn(`[Login] User not found in database for email: ${email}`);
            return next(new AppError('Invalid email or password.', 401)); // Generic message
        }

        log.info(`[Login] User found: ${user.email} (ID: ${user.user_id}), Active: ${user.is_active}`);

        if (!user.is_active) {
            log.warn(`[Login] User is inactive: ${email}`);
            return next(new AppError('Your account is inactive. Please contact support.', 403));
        }

        if (!user.password_hash) {
             log.error(`[Login] CRITICAL: User ${email} found but has no password hash stored! Account cannot be logged into.`);
             return next(new AppError('Login configuration error for your account. Please contact support.', 500));
        }

        // Compare provided password with stored hash
        log.debug(`[Login] Comparing provided password with stored hash for user: ${email}`);
        const isMatch = await comparePassword(password, user.password_hash);

        if (!isMatch) {
            log.warn(`[Login] Password comparison failed for user: ${email}`);
            return next(new AppError('Invalid email or password.', 401)); // Generic message
        }

        log.info(`[Login] Password comparison successful for user: ${email}`);

        // Generate JWT token
        const userPayload = {
            userId: user.user_id,
            email: user.email,
            primary_role: user.primary_role, // *** FIXED: Use 'primary_role' key consistently ***
            // Conditionally add clubId if it exists
            ...(user.club_id && { clubId: user.club_id }),
        };
        const token = generateAuthToken(userPayload);

        log.info(`User logged in successfully: ${email}`);

        // Audit Log (Optional)
        const auditContext = { userId: user.user_id, clubId: user.club_id, role: user.primary_role };
        createAuditLog(auditContext, user.user_id, null, 'LOGIN_SUCCESS')
            .catch(auditErr => log.error("Audit log failed for LOGIN_SUCCESS:", auditErr));

        // Prepare consistent response object
        const userResponseObject = {
            userId: user.user_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            primary_role: user.primary_role, // Key is 'primary_role'
            club_id: user.club_id,
            isActive: user.is_active,
            isEmailVerified: user.is_email_verified,
            has_profile_picture: user.has_profile_picture,
        };
        log.debug("[Login] Sending successful login response.");

        // Return token and user info
        res.status(200).json({
            message: 'Login successful',
            token,
            user: userResponseObject
        });

    } catch (error) {
        log.error(`[Login] Unexpected error during login for ${email}:`, error);
        next(new AppError('Login failed due to an internal server error.', 500));
    }
};

export const getCurrentUser = async (req, res, next) => {
    // req.user should be populated by authenticateToken middleware
    if (!req.user || !req.user.userId) { // Check for userId specifically from token payload
        log.error("getCurrentUser called without req.user.userId being set by middleware.");
        return next(new AppError('Authentication data missing or invalid.', 500));
    }

    try {
        const userIdFromToken = req.user.userId;
        log.debug(`getCurrentUser: Fetching details for user ID: ${userIdFromToken}`);

        // --- FETCH FULL USER DETAILS FROM DATABASE --- // *** FIXED: Fetch fresh data ***
        const userResult = await query(
            `SELECT
                user_id as "userId",
                email,
                first_name as "firstName",
                last_name as "lastName",
                primary_role,
                club_id,
                is_active as "isActive",
                is_email_verified as "isEmailVerified",
                has_profile_picture
             FROM users
             WHERE user_id = $1`,
            [userIdFromToken]
        );

        const user = userResult.rows[0];

        if (!user) {
            log.warn(`getCurrentUser: User not found in DB for ID: ${userIdFromToken} (from valid token)`);
            return next(new AppError('User associated with token not found.', 404));
        }
        // ----------------------------------------------

        let clubName = null;
        if (user.club_id) {
            try {
                // Fetch club name using the user's actual club_id from DB
                const clubResult = await query('SELECT name FROM clubs WHERE club_id = $1', [user.club_id]);
                 if (clubResult.rows.length > 0) {
                     clubName = clubResult.rows[0].name;
                 } else {
                     log.warn(`getCurrentUser: Club not found for club_id ${user.club_id} associated with user ${user.userId}.`);
                 }
            } catch(clubQueryError) {
                 log.error(`getCurrentUser: Error fetching club name for user ${user.userId}, club ${user.club_id}:`, clubQueryError);
            }
        }

        // Construct the response using the fresh data fetched from the database
        // *** FIXED: Ensure correct keys are used based on DB query aliases ***
        res.status(200).json({
            userId: user.userId,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            primary_role: user.primary_role, // Correct key from DB fetch
            club_id: user.club_id,
            isActive: user.isActive,
            isEmailVerified: user.isEmailVerified,
            has_profile_picture: user.has_profile_picture,
            club_name: clubName,
        });

    } catch (error) {
         log.error(`Error in getCurrentUser logic for user ID ${req.user?.userId}:`, error);
         next(new AppError('Failed to retrieve user details.', 500));
    }
};


// --- acceptInvitation --- (Code as provided, seems logically okay assuming DB schema matches)
export const acceptInvitation = async (req, res, next) => {
    const { token } = req.params;
    const { firstName, lastName, password } = req.body;

    if (!firstName || !lastName || !password || password.length < 8) {
        return next(new AppError('First name, last name, and a password (min 8 characters) are required.', 400));
    }

    try {
        const hashedToken = await hashPassword(token);

        const userResult = await query(
            `SELECT user_id, email, status, club_id, primary_role
             FROM users
             WHERE invite_token = $1 AND invite_expires > NOW() AND invitation_status = 'PENDING'::invitation_status`, // Check PENDING status
            [hashedToken]
        );
        const user = userResult.rows[0];

        if (!user) {
            log.warn(`Accept invite attempt with invalid/expired token or non-pending user.`);
            return next(new AppError('Invitation token is invalid, has expired, or the user status is incorrect.', 400));
        }

        const passwordHash = await hashPassword(password);

        const updateResult = await query(
            `UPDATE users
             SET first_name = $1,
                 last_name = $2,
                 password_hash = $3,
                 invitation_status = 'ACCEPTED'::invitation_status,
                 is_active = TRUE,
                 is_email_verified = TRUE, -- Assuming invite acceptance implies verification for now
                 invite_token = NULL,
                 invite_expires = NULL,
                 last_login_at = NOW()
             WHERE user_id = $4
             RETURNING user_id, email, primary_role, club_id, first_name, last_name, is_active, is_email_verified, has_profile_picture`,
            [firstName, lastName, passwordHash, user.user_id]
        );

        const updatedUser = updateResult.rows[0];
        if (!updatedUser) throw new Error("Failed to update user during invite acceptance.");

        log.info(`User accepted invitation and activated account: ${updatedUser.email}`);

        const userPayload = { userId: updatedUser.user_id, email: updatedUser.email, primary_role: updatedUser.primary_role, ...(updatedUser.club_id && { clubId: updatedUser.club_id }) };
        const authToken = generateAuthToken(userPayload);

        const auditContext = { userId: updatedUser.user_id, clubId: updatedUser.club_id, role: updatedUser.primary_role };
        createAuditLog(auditContext, updatedUser.user_id, null, 'ACCEPT_INVITE_SUCCESS')
             .catch(auditErr => log.error("Audit log failed for ACCEPT_INVITE_SUCCESS:", auditErr));

        res.status(200).json({
            message: 'Invitation accepted successfully. Account activated.',
            token: authToken,
            user: {
                userId: updatedUser.user_id,
                email: updatedUser.email,
                firstName: updatedUser.first_name,
                lastName: updatedUser.last_name,
                primary_role: updatedUser.primary_role,
                club_id: updatedUser.club_id,
                isActive: updatedUser.is_active,
                isEmailVerified: updatedUser.is_email_verified,
                has_profile_picture: updatedUser.has_profile_picture,
            }
        });

    } catch (error) {
        log.error('Error accepting invitation:', error);
        next(new AppError('Failed to accept invitation.', 500));
    }
};


// --- verifyEmail --- (Code as provided, seems logically okay assuming DB schema matches)
export const verifyEmail = async (req, res, next) => {
    const { token } = req.params;

    try {
        const hashedToken = await hashPassword(token);

        const userResult = await query(
            `SELECT user_id, email, is_email_verified, status, club_id, primary_role
             FROM users
             WHERE verification_token = $1 AND verification_expires > NOW()`,
            [hashedToken]
        );
        const user = userResult.rows[0];

        if (!user) {
            log.warn(`Email verification attempt with invalid or expired token.`);
            return next(new AppError('Verification token is invalid or has expired.', 400));
        }

        if (user.is_email_verified) {
            log.info(`Email already verified for: ${user.email}`);
            return res.status(200).json({ message: 'Email address already verified.' });
        }

        await query(
            `UPDATE users
             SET is_email_verified = TRUE,
                 verification_token = NULL,
                 verification_expires = NULL
             WHERE user_id = $1`,
            [user.user_id]
        );

        log.info(`Email successfully verified for: ${user.email}`);

        const auditContext = { userId: user.user_id, clubId: user.club_id, role: user.primary_role };
        createAuditLog(auditContext, user.user_id, null, 'VERIFY_EMAIL_SUCCESS')
             .catch(auditErr => log.error("Audit log failed for VERIFY_EMAIL_SUCCESS:", auditErr));

        res.status(200).json({ message: 'Email verified successfully. You can now log in.' });

    } catch (error) {
        log.error('Error verifying email:', error);
        next(new AppError('Failed to verify email address.', 500));
    }
};


// --- setPassword --- (Code as provided, seems logically okay assuming DB schema matches)
export const setPassword = async (req, res, next) => {
    const { token } = req.params;
    const { password } = req.body;

     if (!password || password.length < 8) {
         return next(new AppError('A password (min 8 characters) is required.', 400));
     }

     try {
        const hashedToken = await hashPassword(token);

        const userResult = await query(
            `SELECT user_id, email, status, club_id, primary_role
             FROM users
             WHERE set_password_token = $1 AND set_password_expires > NOW()`,
            [hashedToken]
        );
        const user = userResult.rows[0];

        if (!user) {
            log.warn(`Set password attempt with invalid or expired token.`);
            return next(new AppError('Set password link is invalid or has expired.', 400));
        }

        const passwordHash = await hashPassword(password);

        const updateResult = await query(
            `UPDATE users
             SET password_hash = $1,
                 invitation_status = CASE WHEN invitation_status = 'INVITED'::invitation_status OR invitation_status = 'PENDING'::invitation_status THEN 'ACCEPTED'::invitation_status ELSE invitation_status END,
                 is_active = TRUE,
                 set_password_token = NULL,
                 set_password_expires = NULL,
                 last_login_at = NOW()
             WHERE user_id = $2
             RETURNING user_id, email, primary_role, club_id, first_name, last_name, is_active, is_email_verified, has_profile_picture`,
            [passwordHash, user.user_id]
        );

         const updatedUser = updateResult.rows[0];
         if (!updatedUser) throw new Error("Failed to update user during set password.");

        log.info(`Password set successfully for user: ${updatedUser.email}`);

        const userPayload = { userId: updatedUser.user_id, email: updatedUser.email, primary_role: updatedUser.primary_role, ...(updatedUser.club_id && { clubId: updatedUser.club_id }) };
        const authToken = generateAuthToken(userPayload);

        const auditContext = { userId: updatedUser.user_id, clubId: updatedUser.club_id, role: updatedUser.primary_role };
        createAuditLog(auditContext, updatedUser.user_id, null, 'SET_PASSWORD_SUCCESS')
             .catch(auditErr => log.error("Audit log failed for SET_PASSWORD_SUCCESS:", auditErr));

        res.status(200).json({
            message: 'Password set successfully. You are now logged in.',
            token: authToken,
            user: {
                userId: updatedUser.user_id,
                email: updatedUser.email,
                firstName: updatedUser.first_name,
                lastName: updatedUser.last_name,
                primary_role: updatedUser.primary_role,
                club_id: updatedUser.club_id,
                isActive: updatedUser.is_active,
                isEmailVerified: updatedUser.is_email_verified,
                has_profile_picture: updatedUser.has_profile_picture,
            }
        });

    } catch (error) {
        log.error('Error setting password:', error);
        next(new AppError('Failed to set password.', 500));
    }
};


// --- requestPasswordReset --- (Code as provided, seems logically okay assuming DB schema matches)
export const requestPasswordReset = async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new AppError('Email address is required.', 400));
    }

    try {
        const userResult = await query('SELECT user_id, email, first_name, is_active, club_id, primary_role FROM users WHERE lower(email) = lower($1)', [email]);
        const user = userResult.rows[0];

        if (!user || !user.is_active) {
            log.warn(`Password reset requested for non-existent or inactive email: ${email}`);
            return res.status(200).json({ message: 'If an account with that email exists and is active, a password reset link has been sent.' });
        }

        const { token: resetToken, hashedToken, expires } = await generateTokenAndHash(48, RESET_TOKEN_EXPIRES_MINUTES / 60);

        await query(
            'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE user_id = $3',
            [hashedToken, expires, user.user_id]
        );

        await emailService.sendPasswordResetEmail(user.email, user.first_name, resetToken);

        const auditContext = { userId: user.user_id, clubId: user.club_id, role: user.primary_role };
        createAuditLog(auditContext, user.user_id, null, 'REQUEST_PASSWORD_RESET', { email })
            .catch(auditErr => log.error("Audit log failed for REQUEST_PASSWORD_RESET:", auditErr));

        res.status(200).json({ message: 'If an account with that email exists and is active, a password reset link has been sent.' });

    } catch (error) {
        log.error('Error requesting password reset:', error);
        next(new AppError('Failed to process password reset request.', 500));
    }
};


// --- resetPassword --- (Code as provided, seems logically okay assuming DB schema matches)
export const resetPassword = async (req, res, next) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
        return next(new AppError('New password (min 8 characters) is required.', 400));
    }

    try {
        const hashedToken = await hashPassword(token);

        const userResult = await query(
            `SELECT user_id, email, club_id, primary_role
             FROM users
             WHERE password_reset_token = $1 AND password_reset_expires > NOW()`,
            [hashedToken]
        );
        const user = userResult.rows[0];

        if (!user) {
            log.warn(`Invalid or expired password reset token attempt.`);
            return next(new AppError('Password reset token is invalid or has expired.', 400));
        }

        const newPasswordHash = await hashPassword(password);

        await query(
            `UPDATE users
             SET password_hash = $1,
                 password_reset_token = NULL,
                 password_reset_expires = NULL
             WHERE user_id = $2`,
            [newPasswordHash, user.user_id]
        );

        log.info(`Password successfully reset for user: ${user.email}`);

        const auditContext = { userId: user.user_id, clubId: user.club_id, role: user.primary_role };
        createAuditLog(auditContext, user.user_id, null, 'RESET_PASSWORD_SUCCESS')
            .catch(auditErr => log.error("Audit log failed for RESET_PASSWORD_SUCCESS:", auditErr));

        res.status(200).json({ message: 'Password has been successfully reset. You can now log in.' });

    } catch (error) {
        log.error('Error resetting password:', error);
        next(new AppError('Failed to reset password.', 500));
    }
};


// --- registerInitialClubAdmin --- (Code as provided, be cautious using this)
export const registerInitialClubAdmin = async (req, res, next) => {
    log.warn("Attempt to access highly sensitive endpoint: registerInitialClubAdmin - Consider disabling or protecting.");
    const { email, password, firstName, lastName, clubId } = req.body;

    try {
        const existingUser = await query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email]);
        if (existingUser.rows.length > 0) return next(new AppError('Email address already in use.', 409));
        const clubExists = await query('SELECT 1 FROM clubs WHERE club_id = $1', [clubId]);
        if (clubExists.rows.length === 0) return next(new AppError('Specified Club ID does not exist.', 400));

        const passwordHash = await hashPassword(password);

        const insertResult = await query(
            `INSERT INTO users (email, password_hash, first_name, last_name, primary_role, club_id, is_active, is_email_verified, invitation_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING user_id, email`,
            [email, passwordHash, firstName, lastName, 'CLUB_ADMIN', clubId, true, true, 'ACCEPTED']
        );
        const newUser = insertResult.rows[0];
        log.info(`Initial Club Admin registered: ${newUser.email} for Club ID: ${clubId}`);

        createAuditLog({ userId: null }, newUser.user_id, null, 'REGISTER_INITIAL_ADMIN', { email, clubId })
             .catch(auditErr => log.error("Audit log failed for REGISTER_INITIAL_ADMIN:", auditErr));

        res.status(201).json({ message: 'Initial Club Admin registered successfully.', userId: newUser.user_id });

    } catch (error) {
        log.error('Error registering initial club admin:', error);
        next(new AppError('Failed to register initial admin.', 500));
    }
};


// --- inviteUser --- (Code as provided, seems logically okay assuming DB schema matches and inviter context is set)
export const inviteUser = async (req, res, next) => {
    const inviter = req.user; // Populated by authenticateToken
    const inviterContext = req.tenantContext; // Populated by authenticateToken

    if (!inviter || inviter.primary_role !== 'CLUB_ADMIN' || !inviter.clubId) { // Check inviter's role from req.user
        log.warn(`Invite attempt by non-CLUB_ADMIN or user without club_id: ${inviter?.email}`);
        return next(new AppError('Only Club Administrators can invite users.', 403));
    }

    const { email, role } = req.body;

    if (!email || !role || !['COACH', 'ATHLETE', 'PARENT'].includes(role)) {
         return next(new AppError('Valid email and role (COACH, ATHLETE, PARENT) are required.', 400));
    }

    try {
        const existingUserResult = await query('SELECT user_id, club_id, invitation_status FROM users WHERE lower(email) = lower($1)', [email]);
        const existingUser = existingUserResult.rows[0];

        if (existingUser) {
            log.warn(`Invite attempt for existing email: ${email}, Status: ${existingUser.invitation_status}, Current Club: ${existingUser.club_id}`);
            return next(new AppError(`An account with email ${email} already exists or has a pending invite.`, 409));
        }

        const { token: inviteToken, hashedToken, expires } = await generateTokenAndHash(48, INVITE_TOKEN_EXPIRES_HOURS);

        const insertResult = await query(
            `INSERT INTO users (email, primary_role, club_id, invitation_status, is_active, is_email_verified, invite_token, invite_expires, invited_by_user_id)
             VALUES ($1, $2, $3, 'PENDING', FALSE, FALSE, $4, $5, $6)
             RETURNING user_id, email, primary_role`,
            [email, role, inviter.clubId, hashedToken, expires, inviter.userId]
        );
        const newUser = insertResult.rows[0];
        if (!newUser) throw new Error("Failed to retrieve new user details after insert during invite.");

        const clubResult = await query('SELECT name FROM clubs WHERE club_id = $1', [inviter.clubId]);
        const clubName = clubResult.rows.length > 0 ? clubResult.rows[0].name : 'Your Club';

        // Pass inviter user object itself if needed by email service
        await emailService.sendInvitationEmail(email, inviteToken, inviter, clubName, role);

        log.info(`User invited: ${email} (Role: ${role}) to club ${inviter.clubId} by Admin: ${inviter.email}`);

        createAuditLog(inviterContext, newUser.user_id, inviter.clubId, 'INVITE_USER_SENT', { invitedEmail: email, invitedRole: role })
             .catch(auditErr => log.error("Audit log failed for INVITE_USER_SENT:", auditErr));

        res.status(201).json({
            message: `Invitation sent successfully to ${email}.`,
            user: newUser
        });

    } catch (error) {
        log.error(`Error inviting user ${email} by admin ${inviter.email}:`, error);
        if (error.code === '23505') { // PostgreSQL unique violation code
             return next(new AppError(`User with email ${email} already exists.`, 409));
        }
        next(new AppError('Failed to send invitation.', 500));
    }
};

// Placeholder for logout if needed
// export const logout = async (req, res, next) => { ... };
