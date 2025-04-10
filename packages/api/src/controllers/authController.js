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
            'SELECT user_id, email, password_hash, primary_role, club_id, is_active, is_email_verified, first_name, last_name, has_profile_picture FROM users WHERE lower(email) = lower($1)',
            [email]
        );
        const user = result.rows[0];

        // --- DETAILED LOGGING ---
        if (!user) {
            log.warn(`[Login] User not found in database for email: ${email}`);
            // This path leads to the 401 error
            return next(new AppError('Invalid email or password.', 401)); // Generic message
        }

        log.info(`[Login] User found: ${user.email} (ID: ${user.user_id}), Active: ${user.is_active}`);

        if (!user.is_active) {
            log.warn(`[Login] User is inactive: ${email}`);
            // This path leads to 403 error
            return next(new AppError('Your account is inactive. Please contact support.', 403));
        }

        if (!user.password_hash) {
             log.error(`[Login] CRITICAL: User ${email} found but has no password hash stored! Account cannot be logged into.`);
             // Return a generic error to the user, but log the critical issue
             return next(new AppError('Login configuration error for your account. Please contact support.', 500));
        }

        // Compare provided password with stored hash
        log.debug(`[Login] Comparing provided password with stored hash for user: ${email}`);
        // Ensure comparePassword utility exists and works
        const isMatch = await comparePassword(password, user.password_hash);

        if (!isMatch) {
            log.warn(`[Login] Password comparison failed for user: ${email}`);
            // This path leads to the 401 error
            return next(new AppError('Invalid email or password.', 401)); // Generic message
        }
        // --- END DETAILED LOGGING ---

        // If we reach here, password is correct
        log.info(`[Login] Password comparison successful for user: ${email}`);

        // Check if email verification is required and not completed (optional policy)
        // if (!user.is_email_verified) {
        //    log.warn(`Login attempt blocked: Email not verified - ${email}`);
        //    return next(new AppError('Please verify your email address before logging in.', 403));
        // }

        // Generate JWT token
        const userPayload = {
            userId: user.user_id,
            email: user.email,
            role: user.primary_role,
            // Conditionally add clubId if it exists
            ...(user.club_id && { clubId: user.club_id }),
        };
        // Ensure generateAuthToken utility exists and works
        const token = generateAuthToken(userPayload);

        log.info(`User logged in successfully: ${email}`);

        // Audit Log (Optional) - Ensure createAuditLog service exists and handles errors
        const auditContext = { userId: user.user_id, clubId: user.club_id, role: user.primary_role };
        createAuditLog(auditContext, user.user_id, null, 'LOGIN_SUCCESS')
            .catch(auditErr => log.error("Audit log failed for LOGIN_SUCCESS:", auditErr)); // Log audit errors non-blockingly


        // Prepare consistent response object
        const userResponseObject = {
            userId: user.user_id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            primary_role: user.primary_role,
            club_id: user.club_id, // Include club_id
            isActive: user.is_active,
            isEmailVerified: user.is_email_verified,
            has_profile_picture: user.has_profile_picture,
            // Do NOT include password_hash or other sensitive fields
        };
        log.debug("[Login] Sending successful login response.");


        // Return token and user info
        res.status(200).json({
            message: 'Login successful',
            token,
            user: userResponseObject // Send the explicitly created object
        });

    } catch (error) {
        log.error(`[Login] Unexpected error during login for ${email}:`, error);
        // Ensure sensitive details aren't leaked in generic message
        next(new AppError('Login failed due to an internal server error.', 500));
    }
};

// --- acceptInvitation ---
export const acceptInvitation = async (req, res, next) => {
    const { token } = req.params;
    const { firstName, lastName, password } = req.body;

    // Add input validation here (e.g., using express-validator)
    if (!firstName || !lastName || !password || password.length < 8) { // Example min length
        return next(new AppError('First name, last name, and a password (min 8 characters) are required.', 400));
    }

    try {
        // Hash the incoming token to compare with DB
        const hashedToken = await hashPassword(token); // Assuming this uses the same hash as generateTokenAndHash

        // Find user by the hashed invite token, ensuring it hasn't expired and user is still 'INVITED'
        // ASSUMPTION: 'status' column exists and uses 'INVITED', 'ACTIVE' etc. and invite_token/expires exist.
        const userResult = await query(
            `SELECT user_id, email, status, club_id, primary_role
             FROM users
             WHERE invite_token = $1 AND invite_expires > NOW() AND status = 'INVITED'::invitation_status`, // Cast to enum
            [hashedToken]
        );
        const user = userResult.rows[0];

        if (!user) {
            log.warn(`Accept invite attempt with invalid/expired token or non-invited user.`);
            return next(new AppError('Invitation token is invalid, has expired, or the user status is incorrect.', 400));
        }

        // Hash the new password
        const passwordHash = await hashPassword(password);

        // Update user: set name, password, status to ACTIVE, clear invite token, set email verified (or require verification?)
        const updateResult = await query(
            `UPDATE users
             SET first_name = $1,
                 last_name = $2,
                 password_hash = $3,
                 status = 'ACCEPTED'::invitation_status, -- Set status to accepted or active based on workflow
                 invitation_status = 'ACCEPTED'::invitation_status, -- Update invitation_status specifically
                 is_active = TRUE,
                 is_email_verified = TRUE, -- Assuming invite acceptance implies verification
                 invite_token = NULL,
                 invite_expires = NULL,
                 last_login_at = NOW() -- Optional: set last login
             WHERE user_id = $4
             RETURNING user_id, email, primary_role, club_id, first_name, last_name, is_active, is_email_verified, has_profile_picture`, // Return updated user info
            [firstName, lastName, passwordHash, user.user_id]
        );

        const updatedUser = updateResult.rows[0];

        if (!updatedUser) {
             throw new Error("Failed to update user during invite acceptance."); // Should not happen if initial query worked
        }

        log.info(`User accepted invitation and activated account: ${updatedUser.email}`);

        // Generate JWT for immediate login
        const userPayload = { userId: updatedUser.user_id, email: updatedUser.email, role: updatedUser.primary_role, ...(updatedUser.club_id && { clubId: updatedUser.club_id }) };
        const authToken = generateAuthToken(userPayload);

        // Audit Log (Optional)
        const auditContext = { userId: updatedUser.user_id, clubId: updatedUser.club_id, role: updatedUser.primary_role };
        createAuditLog(auditContext, updatedUser.user_id, null, 'ACCEPT_INVITE_SUCCESS')
             .catch(auditErr => log.error("Audit log failed for ACCEPT_INVITE_SUCCESS:", auditErr));

        res.status(200).json({
            message: 'Invitation accepted successfully. Account activated.',
            token: authToken,
            user: { // Return consistent user object
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

// --- verifyEmail ---
export const verifyEmail = async (req, res, next) => {
    const { token } = req.params;

    try {
        // Hash the incoming token to compare with DB
        const hashedToken = await hashPassword(token); // Assuming hash used matches generate

        // Find user by hashed verification token, check expiry and if not already verified
        // ASSUMPTION: verification_token, verification_expires columns exist
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

        // Update user: set email verified, clear token fields
        // Check if 'status' column exists and handle potentially different states
        await query(
            `UPDATE users
             SET is_email_verified = TRUE,
                 -- Optionally update status/is_active if verification completes setup
                 -- status = CASE WHEN status = 'PENDING_VERIFICATION' THEN 'ACTIVE' ELSE status END,
                 -- is_active = CASE WHEN status = 'PENDING_VERIFICATION' THEN TRUE ELSE is_active END,
                 verification_token = NULL,
                 verification_expires = NULL
             WHERE user_id = $1`,
            [user.user_id]
        );

        log.info(`Email successfully verified for: ${user.email}`);

        // Audit Log (Optional)
        const auditContext = { userId: user.user_id, clubId: user.club_id, role: user.primary_role };
        createAuditLog(auditContext, user.user_id, null, 'VERIFY_EMAIL_SUCCESS')
             .catch(auditErr => log.error("Audit log failed for VERIFY_EMAIL_SUCCESS:", auditErr));

        res.status(200).json({ message: 'Email verified successfully. You can now log in.' });

    } catch (error) {
        log.error('Error verifying email:', error);
        next(new AppError('Failed to verify email address.', 500));
    }
};

// --- setPassword ---
export const setPassword = async (req, res, next) => {
    const { token } = req.params;
    const { password } = req.body;

     // Add input validation
     if (!password || password.length < 8) {
         return next(new AppError('A password (min 8 characters) is required.', 400));
     }

     try {
        // Hash the incoming token
        const hashedToken = await hashPassword(token); // Assuming hash used matches generate

        // Find user by hashed set_password_token and expiry
        // ASSUMPTION: set_password_token, set_password_expires columns exist
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

        // Hash the new password
        const passwordHash = await hashPassword(password);

        // Update user: set password, clear token, potentially activate
        // Check if 'status'/'invitation_status' columns exist and use correct values
        const updateResult = await query(
            `UPDATE users
             SET password_hash = $1,
                 invitation_status = CASE WHEN invitation_status = 'INVITED'::invitation_status OR invitation_status = 'PENDING'::invitation_status THEN 'ACCEPTED'::invitation_status ELSE invitation_status END, -- Mark invite as accepted
                 is_active = TRUE, -- Activate the user
                 set_password_token = NULL,
                 set_password_expires = NULL,
                 -- last_password_change_at = NOW(), -- Requires column
                 last_login_at = NOW() -- Log them in after setting password
             WHERE user_id = $2
             RETURNING user_id, email, primary_role, club_id, first_name, last_name, is_active, is_email_verified, has_profile_picture`,
            [passwordHash, user.user_id]
        );

         const updatedUser = updateResult.rows[0];
         if (!updatedUser) {
             throw new Error("Failed to update user during set password.");
         }

        log.info(`Password set successfully for user: ${updatedUser.email}`);

        // Generate JWT for immediate login
        const userPayload = { userId: updatedUser.user_id, email: updatedUser.email, role: updatedUser.primary_role, ...(updatedUser.club_id && { clubId: updatedUser.club_id }) };
        const authToken = generateAuthToken(userPayload);

        // Audit Log (Optional)
        const auditContext = { userId: updatedUser.user_id, clubId: updatedUser.club_id, role: updatedUser.primary_role };
        createAuditLog(auditContext, updatedUser.user_id, null, 'SET_PASSWORD_SUCCESS')
             .catch(auditErr => log.error("Audit log failed for SET_PASSWORD_SUCCESS:", auditErr));


        res.status(200).json({
            message: 'Password set successfully. You are now logged in.',
            token: authToken,
            user: { // Return consistent user object
                userId: updatedUser.user_id,
                email: updatedUser.email,
                firstName: updatedUser.first_name,
                lastName: updatedUser.last_name,
                primary_role: updatedUser.primary_role,
                club_id: updatedUser.club_id,
                isActive: updatedUser.is_active,
                isEmailVerified: updatedUser.is_email_verified, // May not be verified yet depending on flow
                has_profile_picture: updatedUser.has_profile_picture,
            }
        });

    } catch (error) {
        log.error('Error setting password:', error);
        next(new AppError('Failed to set password.', 500));
    }
};

// --- requestPasswordReset ---
export const requestPasswordReset = async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new AppError('Email address is required.', 400));
    }

    try {
        // Find user by email - Use direct query
        // Ensure is_active check matches your logic (maybe allow inactive users to reset?)
        const userResult = await query('SELECT user_id, email, first_name, is_active, club_id, primary_role FROM users WHERE lower(email) = lower($1)', [email]);
        const user = userResult.rows[0];

        // Avoid revealing if email exists. Respond the same way whether found or not.
        if (!user || !user.is_active) {
            log.warn(`Password reset requested for non-existent or inactive email: ${email}`);
            // DO NOT reveal user existence/status
            return res.status(200).json({ message: 'If an account with that email exists and is active, a password reset link has been sent.' });
        }

        // Generate token, hash, and expiry
        // Ensure password_reset_token/expires columns exist
        const { token: resetToken, hashedToken, expires } = await generateTokenAndHash(48, RESET_TOKEN_EXPIRES_MINUTES / 60); // Validity in hours

        // Update user record
        await query(
            'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE user_id = $3',
            [hashedToken, expires, user.user_id]
        );

        // Send email with unhashed token
        // Ensure emailService is configured and function exists
        await emailService.sendPasswordResetEmail(user.email, user.first_name, resetToken);

        // Audit Log (Optional)
        const auditContext = { userId: user.user_id, clubId: user.club_id, role: user.primary_role };
        createAuditLog(auditContext, user.user_id, null, 'REQUEST_PASSWORD_RESET', { email })
            .catch(auditErr => log.error("Audit log failed for REQUEST_PASSWORD_RESET:", auditErr));


        res.status(200).json({ message: 'If an account with that email exists and is active, a password reset link has been sent.' });

    } catch (error) {
        log.error('Error requesting password reset:', error);
        next(new AppError('Failed to process password reset request.', 500));
    }
};

// --- resetPassword ---
export const resetPassword = async (req, res, next) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) { // Add complexity checks if desired
        return next(new AppError('New password (min 8 characters) is required.', 400));
    }

    try {
        // Hash the incoming token
        const hashedToken = await hashPassword(token);

        // Find user by hashed token and expiry
        // Ensure password_reset_token/expires columns exist
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

        // Hash the new password
        const newPasswordHash = await hashPassword(password);

        // Update password and clear token fields
        // Ensure last_password_change_at column exists if used
        await query(
            `UPDATE users
             SET password_hash = $1,
                 password_reset_token = NULL,
                 password_reset_expires = NULL
                 -- last_password_change_at = NOW() -- Uncomment if column exists
             WHERE user_id = $2`,
            [newPasswordHash, user.user_id]
        );

        log.info(`Password successfully reset for user: ${user.email}`);

        // Audit Log (Optional)
        const auditContext = { userId: user.user_id, clubId: user.club_id, role: user.primary_role };
        createAuditLog(auditContext, user.user_id, null, 'RESET_PASSWORD_SUCCESS')
            .catch(auditErr => log.error("Audit log failed for RESET_PASSWORD_SUCCESS:", auditErr));

        // Optional: Send confirmation email
        // await emailService.sendPasswordResetConfirmationEmail(user.email);

        res.status(200).json({ message: 'Password has been successfully reset. You can now log in.' });

    } catch (error) {
        log.error('Error resetting password:', error);
        next(new AppError('Failed to reset password.', 500));
    }
};

// --- registerInitialClubAdmin ---
// This function should likely be removed or heavily secured (e.g., require special env flag, specific IP)
export const registerInitialClubAdmin = async (req, res, next) => {
    log.warn("Attempt to access highly sensitive endpoint: registerInitialClubAdmin - Consider disabling or protecting.");
    // Add security checks here (e.g., check if ANY Platform Admin exists before allowing)
    // const platformAdminCheck = await query("SELECT 1 FROM users WHERE primary_role = 'PLATFORM_ADMIN' LIMIT 1");
    // if (platformAdminCheck.rowCount > 0) {
    //     return next(new AppError("Initial admin registration only allowed during first setup.", 403));
    // }

    const { email, password, firstName, lastName, clubId } = req.body;
    // Add input validation

    try {
        // Basic checks
        const existingUser = await query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email]);
        if (existingUser.rows.length > 0) return next(new AppError('Email address already in use.', 409));
        const clubExists = await query('SELECT 1 FROM clubs WHERE club_id = $1', [clubId]);
        if (clubExists.rows.length === 0) return next(new AppError('Specified Club ID does not exist.', 400));

        const passwordHash = await hashPassword(password);

        // Insert new user, mark as active & verified (since it's a trusted setup path)
        // Ensure 'status' column exists and uses 'ACTIVE'
        const insertResult = await query(
            `INSERT INTO users (email, password_hash, first_name, last_name, primary_role, club_id, is_active, is_email_verified, invitation_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING user_id, email`,
            [email, passwordHash, firstName, lastName, 'CLUB_ADMIN', clubId, true, true, 'ACCEPTED'] // Use 'ACCEPTED' for invitation_status
        );
        const newUser = insertResult.rows[0];
        log.info(`Initial Club Admin registered: ${newUser.email} for Club ID: ${clubId}`);

        // Audit Log
        createAuditLog({ userId: null }, newUser.user_id, null, 'REGISTER_INITIAL_ADMIN', { email, clubId })
             .catch(auditErr => log.error("Audit log failed for REGISTER_INITIAL_ADMIN:", auditErr));

        res.status(201).json({ message: 'Initial Club Admin registered successfully.', userId: newUser.user_id });

    } catch (error) {
        log.error('Error registering initial club admin:', error);
        next(new AppError('Failed to register initial admin.', 500));
    }
};

// --- getCurrentUser ---
export const getCurrentUser = async (req, res, next) => {
    // req.user and req.tenantContext should be populated by authenticateToken middleware
    if (!req.user || !req.tenantContext) {
        log.error("getCurrentUser called without req.user/req.tenantContext being set by middleware.");
        // This indicates an issue with the authenticateToken middleware if it happens after successful login
        return next(new AppError('Authentication data missing or middleware failed.', 500));
    }

    try {
        const userContext = req.user; // Data extracted from JWT payload by middleware
        const tenantContext = req.tenantContext;
        let clubName = null;

        // Fetch club name if user belongs to a club
        if (userContext.clubId) {
             // Use queryWithTenantContext to respect potential RLS on 'clubs' table
            try {
                 const clubResult = await queryWithTenantContext(tenantContext, 'SELECT name FROM clubs WHERE club_id = $1', [userContext.clubId]);
                 if (clubResult.rows.length > 0) {
                     clubName = clubResult.rows[0].name;
                 } else {
                     log.warn(`User ${userContext.userId} has club_id ${userContext.clubId} but club not found or not visible via RLS.`);
                 }
            } catch(clubQueryError) {
                 log.error(`Error fetching club name for user ${userContext.userId}, club ${userContext.clubId}:`, clubQueryError);
                 // Decide if this should cause the request to fail or just return null clubName
            }
        }

        // Construct consistent response object based on data from JWT/middleware
        // Ensure the fields populated in the JWT by generateAuthToken match these
        res.status(200).json({
            userId: userContext.userId,
            email: userContext.email,
            firstName: userContext.firstName, // Needs to be in JWT payload or fetched separately
            lastName: userContext.lastName,   // Needs to be in JWT payload or fetched separately
            primary_role: userContext.role,   // Role from JWT
            club_id: userContext.clubId,      // Club ID from JWT
            isActive: userContext.isActive, // Needs to be in JWT payload or fetched separately
            isEmailVerified: userContext.isEmailVerified, // Needs to be in JWT payload or fetched separately
            has_profile_picture: userContext.has_profile_picture, // Needs to be in JWT payload or fetched separately
            club_name: clubName,
        });

    } catch (error) {
         log.error(`Error in getCurrentUser logic for user ID ${req.user.userId}:`, error);
         next(new AppError('Failed to retrieve user details.', 500));
    }
};

// --- inviteUser ---
export const inviteUser = async (req, res, next) => {
    const inviter = req.user; // Populated by authenticateToken
    const inviterContext = req.tenantContext; // Populated by authenticateToken

    // Ensure inviter has rights (is CLUB_ADMIN and has a club_id)
    if (!inviter || inviter.role !== 'CLUB_ADMIN' || !inviter.clubId) {
        log.warn(`Invite attempt by non-CLUB_ADMIN or user without club_id: ${inviter?.email}`);
        return next(new AppError('Only Club Administrators can invite users.', 403));
    }

    const { email, role } = req.body; // Role: COACH, ATHLETE, PARENT
    // Add input validation for email format and allowed roles

    if (!email || !role || !['COACH', 'ATHLETE', 'PARENT'].includes(role)) {
         return next(new AppError('Valid email and role (COACH, ATHLETE, PARENT) are required.', 400));
    }


    try {
        // Check if user already exists anywhere in the system
        // Consider if an existing user should be added to the club instead, or if it's an error
        const existingUserResult = await query('SELECT user_id, club_id, invitation_status FROM users WHERE lower(email) = lower($1)', [email]);
        const existingUser = existingUserResult.rows[0];

        if (existingUser) {
            // Handle existing user based on business rules
            // Example: If they are already in *this* club, maybe error? If in another club? If invite pending?
            log.warn(`Invite attempt for existing email: ${email}, Status: ${existingUser.invitation_status}, Current Club: ${existingUser.club_id}`);
            return next(new AppError(`An account with email ${email} already exists or has a pending invite.`, 409));
        }

        // Generate invite token
        // Ensure invite_token/expires columns exist
        const { token: inviteToken, hashedToken, expires } = await generateTokenAndHash(48, INVITE_TOKEN_EXPIRES_HOURS);

        // Insert the new user with 'PENDING' status
        // Ensure created_by column exists
        const insertResult = await query(
            `INSERT INTO users (email, primary_role, club_id, invitation_status, is_active, is_email_verified, invite_token, invite_expires, invited_by_user_id)
             VALUES ($1, $2, $3, 'PENDING', FALSE, FALSE, $4, $5, $6)
             RETURNING user_id, email, primary_role`,
            [email, role, inviter.clubId, hashedToken, expires, inviter.userId]
        );
        const newUser = insertResult.rows[0];
        if (!newUser) {
             throw new Error("Failed to retrieve new user details after insert during invite.");
        }

        // Send the invitation email
        // Fetch club name (or use inviter context if it includes it)
        const clubResult = await query('SELECT name FROM clubs WHERE club_id = $1', [inviter.clubId]);
        const clubName = clubResult.rows.length > 0 ? clubResult.rows[0].name : 'Your Club'; // Fallback name

        // Ensure email service works
        await emailService.sendInvitationEmail(email, inviteToken, inviter, clubName, role);

        log.info(`User invited: ${email} (Role: ${role}) to club ${inviter.clubId} by Admin: ${inviter.email}`);

        // Audit Log
        createAuditLog(inviterContext, newUser.user_id, inviter.clubId, 'INVITE_USER_SENT', { invitedEmail: email, invitedRole: role })
             .catch(auditErr => log.error("Audit log failed for INVITE_USER_SENT:", auditErr));

        res.status(201).json({
            message: `Invitation sent successfully to ${email}.`,
            user: newUser // Send back basic info of the created user record
        });

    } catch (error) {
        log.error(`Error inviting user ${email} by admin ${inviter.email}:`, error);
        // Check for unique constraint violation (email already exists)
        if (error.code === '23505') { // PostgreSQL unique violation code
             return next(new AppError(`User with email ${email} already exists.`, 409));
        }
        next(new AppError('Failed to send invitation.', 500));
    }
};

// --- Placeholder for logout ---
// Actual logout is typically handled client-side by removing the token.
// A backend endpoint might be used for token invalidation if using a denylist.
// export const logout = async (req, res, next) => {
//     // If using server-side sessions or token denylist:
//     // 1. Invalidate session/token
//     // 2. Audit log
//     log.info("Logout endpoint called (currently placeholder).");
//     res.status(200).json({ message: "Logout successful (placeholder)." });
// };