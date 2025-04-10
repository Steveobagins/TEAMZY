// packages/api/src/services/emailService.js
import 'dotenv/config'; // Load environment variables
import log from '../utils/logger.js'; // Use logger

// Dynamically determine client URL based on role or use a general one
// Consider passing the specific client base URL (platform, club, app) if links differ significantly
const CLIENT_URL_PLATFORM_ADMIN = process.env.CLIENT_URL_PLATFORM_ADMIN || 'http://localhost:3002';
const CLIENT_URL_CLUB_ADMIN = process.env.CLIENT_URL_CLUB_ADMIN || 'http://localhost:3003';
const CLIENT_URL_APP = process.env.CLIENT_URL_APP || 'http://localhost:3004';
// Fallback if specific URLs aren't set
const CLIENT_URL_GENERAL = process.env.CLIENT_URL || 'http://localhost:3000';

const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM || '"Teamzy Platform" <noreply@example.com>';
const EMAIL_PROVIDER = process.env.EMAIL_PROVIDER || 'console'; // Default to console logging

// Placeholder function (or implement actual email sending)
// Make this the internal function, specific functions below will call this
async function _sendEmailInternal(to, subject, textBody, htmlBody) {
    if (EMAIL_PROVIDER === 'console' || process.env.NODE_ENV !== 'production') {
        log.info(`---- SIMULATED EMAIL to ${to} ----`);
        log.info(`From: ${EMAIL_FROM_ADDRESS}`);
        log.info(`Subject: ${subject}`);
        log.info(`---- TEXT BODY ----\n${textBody}`);
        log.info(`---- HTML BODY ----\n${htmlBody || '(No HTML Body)'}`);
        log.info(`-----------------------`);
        // Simulate success
        return { success: true, messageId: 'simulated_' + Date.now() };
    }

    log.warn(`Email provider "${EMAIL_PROVIDER}" requested but not implemented.`);
    // Add real email provider logic here (Mailgun, SendGrid, Nodemailer/SMTP)
    // Ensure necessary libraries are installed and env vars are set

    // Example using Nodemailer (needs `npm install nodemailer` or `pnpm add nodemailer`)
    /*
    if (EMAIL_PROVIDER === 'nodemailer') {
        try {
            // Lazy load nodemailer only if needed
            const nodemailer = (await import('nodemailer')).default; // Dynamic import
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || "587", 10),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            const mailOptions = { from: EMAIL_FROM_ADDRESS, to, subject, text: textBody, html: htmlBody };
            let info = await transporter.sendMail(mailOptions);
            log.info(`Email sent via Nodemailer to ${to}: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            log.error(`Nodemailer sending error to ${to}:`, error);
            throw new Error(`Failed to send email via Nodemailer: ${error.message}`);
        }
    }
    */

    // If no provider matched or implemented
    log.error(`Email provider "${EMAIL_PROVIDER}" is not configured or supported.`);
    throw new Error("Email service is not configured properly.");
}

/**
 * Sends an invitation email to a new user.
 * @param {string} toEmail - Recipient's email.
 * @param {string} inviteToken - The unique invite token (unhashed).
 * @param {object} invitingUser - Object containing inviter's details { firstName, lastName }.
 * @param {string} clubName - Name of the club being invited to.
 * @param {string} invitedRole - Role the user is being invited as (e.g., 'COACH').
 */
export async function sendInvitationEmail(toEmail, inviteToken, invitingUser, clubName, invitedRole) {
    // Use Club Admin URL for accepting club invites
    const inviteLink = `${CLIENT_URL_CLUB_ADMIN}/accept-invite/${inviteToken}`;
    const subject = `You're invited to join ${clubName} on Teamzy!`;
    const textBody = `Hello,\n\n${invitingUser.firstName} ${invitingUser.lastName} has invited you to join ${clubName} on Teamzy as a ${invitedRole}.\n\nPlease click the following link to accept the invitation and set up your account:\n${inviteLink}\n\nThis link will expire soon.\n\nIf you did not expect this invitation, please ignore this email.\n\nThanks,\nThe Teamzy Team`;
    const htmlBody = `<p>Hello,</p><p>${invitingUser.firstName} ${invitingUser.lastName} has invited you to join <strong>${clubName}</strong> on Teamzy as a <strong>${invitedRole}</strong>.</p><p>Please click the button below to accept the invitation and set up your account:</p><p style="margin: 20px 0;"><a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Accept Invitation</a></p><p>This link will expire soon (typically 72 hours).</p><p>If you did not expect this invitation, please ignore this email.</p><p>Thanks,<br/>The Teamzy Team</p>`;
    return _sendEmailInternal(toEmail, subject, textBody, htmlBody);
}

/**
 * Sends a password reset link email (user-initiated).
 * @param {string} toEmail - Recipient's email.
 * @param {string} userFirstName - User's first name (for personalization).
 * @param {string} resetToken - The unique password reset token (unhashed).
 */
export async function sendPasswordResetEmail(toEmail, userFirstName, resetToken) {
    // Use general client URL or determine based on user role if possible
    const resetLink = `${CLIENT_URL_GENERAL}/reset-password/${resetToken}`;
    const subject = `Reset your Teamzy password`;
    const textBody = `Hello ${userFirstName || ''},\n\nSomeone requested a password reset for the Teamzy account associated with this email address.\n\nIf this was you, click the following link to set a new password:\n${resetLink}\n\nThis link expires in 1 hour.\n\nIf you did not request this password reset, please ignore this email. Your password will remain unchanged.\n\nThanks,\nThe Teamzy Team`;
    const htmlBody = `<p>Hello ${userFirstName || ''},</p><p>Someone requested a password reset for the Teamzy account associated with this email address.</p><p>If this was you, click the button below to set a new password:</p><p style="margin: 20px 0;"><a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a></p><p>This link expires in 1 hour.</p><p>If you did not request this password reset, please ignore this email. Your password will remain unchanged.</p><p>Thanks,<br/>The Teamzy Team</p>`;
    return _sendEmailInternal(toEmail, subject, textBody, htmlBody);
}

/**
 * Sends an email verification link.
 * @param {string} toEmail - Recipient's email.
 * @param {string} userFirstName - User's first name (for personalization).
 * @param {string} verificationToken - The unique verification token (unhashed).
 */
export async function sendEmailVerificationEmail(toEmail, userFirstName, verificationToken) {
    // Use general client URL for verification
    const verificationLink = `${CLIENT_URL_GENERAL}/verify-email/${verificationToken}`;
    const subject = `Verify your email address for Teamzy`;
    const textBody = `Hello ${userFirstName || ''},\n\nThank you for registering with Teamzy! Please verify your email address by clicking the link below:\n${verificationLink}\n\nThis link expires soon (typically 24 hours).\n\nIf you did not create an account with Teamzy, please ignore this email.\n\nThanks,\nThe Teamzy Team`;
    const htmlBody = `<p>Hello ${userFirstName || ''},</p><p>Thank you for registering with Teamzy! Please verify your email address by clicking the button below:</p><p style="margin: 20px 0;"><a href="${verificationLink}" style="display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a></p><p>This link expires soon (typically 24 hours).</p><p>If you did not create an account with Teamzy, please ignore this email.</p><p>Thanks,<br/>The Teamzy Team</p>`;
    return _sendEmailInternal(toEmail, subject, textBody, htmlBody);
}

/**
 * Sends an email for admin-initiated password reset or initial account setup.
 * @param {string} toEmail - Recipient's email.
 * @param {string} userFirstName - User's first name (for personalization).
 * @param {string} setupToken - The unique set_password token (unhashed).
 * @param {boolean} isInitialSetup - Flag indicating if this is for initial account setup vs. admin reset.
 * @param {string} [adminName] - Optional name of the admin initiating the action (for reset email).
 */
export async function sendAccountSetupEmail(toEmail, userFirstName, setupToken, isInitialSetup = true, adminName = 'Administrator') {
    // Determine appropriate client URL (Platform Admin UI for platform admins, Club Admin UI otherwise?)
    // This might need refinement based on who is being created/reset
    const setupLink = `${CLIENT_URL_PLATFORM_ADMIN}/set-password/${setupToken}`; // Assume platform admin link for now
    const subject = isInitialSetup ? `Set up your Teamzy Platform Account` : `Password Reset Initiated for your Teamzy Account`;
    const introText = isInitialSetup
        ? `An administrator has created a Teamzy Platform account for you.`
        : `A password reset for your Teamzy account was initiated by an administrator (${adminName}).`;
    const buttonText = isInitialSetup ? 'Set Up Account & Password' : 'Set New Password';
    const buttonColor = isInitialSetup ? '#17a2b8' : '#ffc107'; // Info vs Warning color
    const expiryText = `This link will expire soon (typically 72 hours).`;

    const textBody = `Hello ${userFirstName || ''},\n\n${introText}\n\nPlease click the following link to set a password for your account:\n${setupLink}\n\n${expiryText}\n\nIf you did not expect this, please contact support or your administrator. For security reasons, do not share this link.\n\nThanks,\nThe Teamzy Team`;
    const htmlBody = `
        <p>Hello ${userFirstName || ''},</p>
        <p>${introText}</p>
        <p>Please click the button below to set a password for your account:</p>
        <p style="margin: 20px 0;">
            <a href="${setupLink}" style="display: inline-block; padding: 12px 24px; background-color: ${buttonColor}; color: ${isInitialSetup ? 'white' : 'black'}; text-decoration: none; border-radius: 5px; font-weight: bold;">${buttonText}</a>
        </p>
        <p>${expiryText}</p>
        <p>If you did not expect this, please contact support or your administrator. For security reasons, do not share this link.</p>
        <p>Thanks,<br/>The Teamzy Team</p>`;
    return _sendEmailInternal(toEmail, subject, textBody, htmlBody);
}

/**
 * Sends an email informing a user that an admin has initiated a password reset for them.
 * DEPRECATED: Use sendAccountSetupEmail with isInitialSetup=false instead.
 * @param {string} toEmail - The email address of the user receiving the reset link.
 * @param {string} userFirstName - The first name of the user (for personalization).
 * @param {string} resetToken - The set_password_token generated for the user.
 * @param {string} requestingAdminName - The name or email of the admin who initiated the reset.
 */
export async function sendAdminPasswordResetEmail(toEmail, userFirstName, resetToken, requestingAdminName) {
    log.warn("Deprecated function called: sendAdminPasswordResetEmail. Use sendAccountSetupEmail instead.");
    return sendAccountSetupEmail(toEmail, userFirstName, resetToken, false, requestingAdminName);
}


// No single module.exports needed with ESM