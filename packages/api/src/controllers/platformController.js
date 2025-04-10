// packages/api/src/controllers/platformController.js

// Use named import for query from db.js
import { query as dbQuery } from '../config/db.js';
// Import AppError for consistent error handling
import { AppError } from '../utils/errorUtils.js';
// Import logger utility
import log from '../utils/logger.js';
// Import audit log service if you have it separate
// import { createAuditLog } from '../services/auditLogService.js';

// --- GET Platform Logo ---
// Retrieves the stored logo data and mimetype
export const getPlatformLogo = async (req, res, next) => {
    try {
        // Fetch the relevant columns from the single settings row (setting_id = 1)
        const result = await dbQuery(
            'SELECT platform_logo_data, platform_logo_mime_type FROM platform_settings WHERE setting_id = 1'
        );
        const settings = result.rows[0];

        // Check if logo data exists
        if (!settings || !settings.platform_logo_data || !settings.platform_logo_mime_type) {
            log.warn('Platform logo requested but not found in settings.');
            // Send 404 - frontend can handle displaying a placeholder
            return next(new AppError('Platform logo not found.', 404));
        }

        // Set the correct Content-Type header based on the stored mimetype
        res.setHeader('Content-Type', settings.platform_logo_mime_type);
        // Send the raw image data (Buffer)
        res.send(settings.platform_logo_data);

    } catch (error) {
        log.error("Get Platform Logo Controller Error:", error);
        next(new AppError('Failed to retrieve platform logo.', 500)); // Generic error
    }
};

// --- PUT (Upload/Update) Platform Logo ---
// Handles file upload, validation, and database update
export const updatePlatformLogo = async (req, res, next) => {
    // User and file are attached by preceding middleware
    const user = req.user; // User performing action
    const file = req.file; // Uploaded file info from multer

    if (!file) {
        return next(new AppError('No logo file was included in the request.', 400));
    }

    const { buffer, mimetype, originalname } = file;

    // --- Basic Validation (already handled by multer middleware, but can add extra checks) ---
    // const maxSize = 2 * 1024 * 1024; // 2MB limit
    // const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/svg+xml'];
    // ... validation logic ...
    // --- End Validation ---

    try {
        // Use INSERT ... ON CONFLICT DO UPDATE (Upsert) for robustness
        const upsertQuery = `
            INSERT INTO platform_settings (setting_id, platform_logo_data, platform_logo_mime_type, platform_logo_file_name, updated_at)
            VALUES (1, $1, $2, $3, NOW())
            ON CONFLICT (setting_id) DO UPDATE SET
                platform_logo_data = EXCLUDED.platform_logo_data,
                platform_logo_mime_type = EXCLUDED.platform_logo_mime_type,
                platform_logo_file_name = EXCLUDED.platform_logo_file_name,
                updated_at = NOW()
            RETURNING setting_id;`; // Return something to confirm

        const result = await dbQuery(upsertQuery, [buffer, mimetype, originalname]);

        if (result.rowCount === 0) {
            // This shouldn't happen with ON CONFLICT DO UPDATE
            log.error("Platform logo upsert failed unexpectedly.");
            return next(new AppError('Failed to update platform logo settings.', 500));
        }

        log.info(`Platform logo updated successfully by user: ${user?.email} (ID: ${user?.userId})`);

        // --- Audit Logging ---
        // Replace direct query with service call if available
        // createAuditLog(req.tenantContext || { userId: user?.userId }, 1, 'PLATFORM_SETTINGS', 'PLATFORM_LOGO_UPDATED', { filename: originalname, mimetype: mimetype, size: buffer.length });
        // --- OR direct query ---
        dbQuery(
            'INSERT INTO audit_log (actor_user_id, action, target_type, target_id, details, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [
                user?.userId, // User performing the action
                'PLATFORM_LOGO_UPDATED',
                'PLATFORM_SETTINGS',
                '1', // Target ID is the settings row ID
                JSON.stringify({ filename: originalname, mimetype: mimetype, size: buffer.length }),
                req.ip, // User's IP address
                req.headers['user-agent'] // User's browser/client info
            ]
        ).catch(auditErr => {
            // Log audit errors but don't fail the main request
            log.error("Failed to write platform logo update to audit log:", auditErr);
        });
        // --- End Audit Logging ---

        // Send success response
        res.status(200).json({ message: 'Platform logo updated successfully.' });

    } catch (error) {
        log.error("Update Platform Logo Controller Error:", error);
        next(new AppError('Failed to update platform logo.', 500)); // Generic error
    }
};

// --- TODO: Add functions for other platform settings ---
// export const getPlatformSettings = async (req, res, next) => { ... };
// export const updatePlatformSettings = async (req, res, next) => { ... };

// No module.exports needed