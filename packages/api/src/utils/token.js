// packages/api/src/utils/token.js
import jwt from 'jsonwebtoken'; // Use import
import crypto from 'crypto'; // Use import
import 'dotenv/config'; // Use import for dotenv
import log from './logger.js'; // Import logger utility

const JWT_SECRET = process.env.JWT_SECRET;
// Default to '1h' if not specified or empty
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Perform validation after potential dotenv loading
if (!JWT_SECRET || JWT_SECRET === 'replace_with_a_very_strong_random_secret_key_32_chars_or_more') {
    log.error('FATAL ERROR: JWT_SECRET is not defined or is set to the default placeholder in .env. Please generate a strong secret.');
    process.exit(1);
}

/**
 * Generates a JWT authentication token.
 * @param {object} payload - Data to include in the token. Must include userId and primary_role. // *** DOC Updated ***
 * @param {string} payload.userId - The user's unique identifier.
 * @param {string} payload.primary_role - The user's primary role. // *** DOC Updated ***
 * @param {string} [payload.clubId] - The user's associated club ID (optional).
 * @returns {string} The generated JWT token.
 * @throws {Error} If payload is missing required fields.
 */
export function generateAuthToken(payload) {
    // Ensure payload contains essential identifiers
    // *** FIXED: Check for primary_role instead of role ***
    if (!payload || !payload.userId || !payload.primary_role) {
        log.error('generateAuthToken error: Payload missing required fields (userId, primary_role). Payload received:', payload);
        // *** FIXED: Update error message ***
        throw new Error("Payload must include userId and primary_role to generate auth token.");
    }
    // Construct claims carefully - avoid sensitive data
    const claims = {
        userId: payload.userId,
        // *** FIXED: Use primary_role key in claims ***
        primary_role: payload.primary_role,
        // Conditionally include clubId only if it exists in the payload
        ...(payload.clubId && { clubId: payload.clubId }),
        // Add other non-sensitive claims if necessary (e.g., session ID if used, email?)
         ...(payload.email && { email: payload.email }), // Optionally include email if needed by middleware/client decode
    };

    try {
        return jwt.sign(claims, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    } catch (error) {
        log.error("Error signing JWT:", error);
        // Re-throw or handle appropriately depending on context
        throw new Error("Failed to generate authentication token.");
    }
}

/**
 * Verifies a JWT authentication token.
 * @param {string} token - The JWT token string.
 * @returns {object | null} The decoded payload if the token is valid and not expired, otherwise null.
 */
export function verifyAuthToken(token) {
    if (!token) {
        log.debug("verifyAuthToken called with no token.");
        return null;
    }
    try {
        // Returns the decoded payload if valid, otherwise throws error
        const decoded = jwt.verify(token, JWT_SECRET);
        // *** Log the decoded payload to verify it contains primary_role ***
        log.debug("JWT verified successfully. Payload:", decoded);
        return decoded;
    } catch (error) {
        // Log different JWT errors for debugging
        if (error instanceof jwt.TokenExpiredError) {
            log.warn('JWT Verification Warning: Token expired');
        } else if (error instanceof jwt.JsonWebTokenError) {
            log.warn(`JWT Verification Warning: Invalid token - ${error.message}`);
        } else {
            // Log unexpected errors during verification
            log.error('Unexpected JWT Verification Error:', error);
        }
        return null; // Return null for any verification failure
    }
}

/**
 * Generates a cryptographically secure random token string (hex encoded).
 * @param {number} [length=48] - The number of random bytes to generate (default 48 -> 96 hex chars).
 * @returns {string} The generated hex token string.
 */
export function generateSecureToken(length = 48) {
    // Generate a secure random token (e.g., for email verification, password reset)
    // Defaulting to 48 bytes (96 hex chars) provides good security
    try {
        return crypto.randomBytes(length).toString('hex');
    } catch (error) {
        log.error("Error generating secure token:", error);
        // Handle error appropriately - maybe throw a custom error?
        throw new Error("Failed to generate secure token.");
    }
}
