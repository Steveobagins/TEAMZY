// packages/api/src/utils/hash.js
import bcrypt from 'bcrypt'; // Use import
import log from './logger.js'; // Import logger utility

// Get salt rounds from environment variable or use default
const SALT_ROUNDS = process.env.BCRYPT_SALT_ROUNDS ? parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) : 12; // 10-12 is typical

/**
 * Hashes a plain text password using bcrypt.
 * @param {string} password - The plain text password.
 * @returns {Promise<string>} A promise resolving with the hashed password.
 * @throws {Error} If password is invalid or hashing fails.
 */
export async function hashPassword(password) {
    // Basic input validation
    if (!password || typeof password !== 'string' || password.length === 0) {
        throw new Error('Password must be a non-empty string');
    }
    try {
        const hash = await bcrypt.hash(password, SALT_ROUNDS);
        log.debug("Password hashed successfully."); // Avoid logging hash itself
        return hash;
    } catch (error) {
        log.error("Error hashing password:", error);
        // Throw generic error to avoid leaking details
        throw new Error("Failed to hash password.");
    }
}

/**
 * Compares a plain text password with a bcrypt hash.
 * @param {string} password - The plain text password to compare.
 * @param {string} hash - The bcrypt hash to compare against.
 * @returns {Promise<boolean>} A promise resolving with true if passwords match, false otherwise.
 */
export async function comparePassword(password, hash) {
    // Check for non-empty inputs
    if (!password || !hash) {
        log.warn("comparePassword called with empty password or hash.");
        return false;
    }
    try {
        const isMatch = await bcrypt.compare(password, hash);
        log.debug(`Password comparison result: ${isMatch}`);
        return isMatch;
    } catch (error) {
        // Log unexpected errors during comparison, but typically return false for security
        log.error("Error comparing password:", error);
        // Return false on error to prevent potential timing attacks or error-based vulnerabilities
        return false;
    }
}

// No module.exports needed, use individual exports