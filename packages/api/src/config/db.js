// packages/api/src/config/db.js
import Pool from 'pg-pool'; // Use ES Module import
// --- CORRECTED IMPORT for pg-connection-string ---
import pkg_pg_connection_string from 'pg-connection-string'; // Import the default export
const { parse } = pkg_pg_connection_string; // Destructure 'parse' from the default export
// -------------------------------------------------
import 'dotenv/config'; // Load .env file automatically - ensure dotenv is installed
import log from '../utils/logger.js'; // Import logger utility

// Basic UUID validation regex
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
// Define allowed roles (Consider moving to constants.js and importing)
const ALLOWED_ROLES = ['PLATFORM_ADMIN', 'CLUB_ADMIN', 'COACH', 'ATHLETE', 'PARENT'];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    log.error("FATAL ERROR: DATABASE_URL environment variable is not set.");
    process.exit(1);
}

let dbConfig;
try {
    // Use the imported parse function correctly now
    dbConfig = parse(connectionString);
} catch (error) {
    log.error("FATAL ERROR: Could not parse DATABASE_URL.", error);
    process.exit(1);
}

// --- Pool Definition ---
// Use export here to make it available to other modules
export const pool = new Pool({
    user: dbConfig.user,
    password: dbConfig.password,
    host: dbConfig.host,
    port: dbConfig.port ? parseInt(dbConfig.port, 10) : 5432, // Ensure port is number
    database: dbConfig.database,
    // Adjust SSL based on environment, consider more robust check than just 'production'
    ssl: process.env.DB_SSL_MODE === 'require' || process.env.DB_SSL_MODE === 'verify-full'
        ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
        : false,
    max: process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 20, // Max connections
    idleTimeoutMillis: process.env.DB_IDLE_TIMEOUT ? parseInt(process.env.DB_IDLE_TIMEOUT, 10) : 30000, // Idle timeout
    connectionTimeoutMillis: process.env.DB_CONN_TIMEOUT ? parseInt(process.env.DB_CONN_TIMEOUT, 10) : 5000, // Connection timeout
});
// --- End Pool Definition ---

pool.on('connect', (client) => {
    // log.debug('Database client connected'); // Use debug level
});

pool.on('error', (err, client) => {
    log.error('Unexpected error on idle PostgreSQL client', { error: err.message, stack: err.stack });
    // Consider if process exit is desired, maybe just log and let connection retry?
    // process.exit(-1);
});

// Test connection on startup using an async IIFE
(async () => {
    let client;
    try {
        client = await pool.connect();
        log.info(`Database pool connected successfully to: ${dbConfig.host}:${dbConfig.port || 5432}/${dbConfig.database}`);
        client.release();
    } catch (err) {
        log.error("FATAL ERROR: Database pool failed to connect on startup.", { error: err.message, stack: err.stack });
        if (client) client.release(); // Ensure release even on error
        process.exit(1); // Exit if initial connection fails
    }
})();


/**
 * Basic query function without RLS context.
 * @param {string} text - The SQL query text.
 * @param {Array} params - Optional array of query parameters.
 * @returns {Promise<QueryResult>} A promise resolving with the query result.
 */
export async function query(text, params) {
    const start = Date.now();
    let client;
    try {
        client = await pool.connect();
        const res = await client.query(text, params);
        const duration = Date.now() - start;
        log.debug('Executed query', { text: text.substring(0, 150).replace(/\s+/g, ' '), duration, rows: res.rowCount });
        return res;
    } catch (err) {
        log.error(`Error executing query: ${text.substring(0, 150).replace(/\s+/g, ' ')}`, { error: err.message, code: err.code, params });
        throw err; // Re-throw the error for controller handling
    } finally {
        if (client) client.release(); // Ensure client is always released
    }
}

/**
 * Executes a query within a transaction, setting RLS context variables locally.
 * Uses SET LOCAL ... TO DEFAULT for NULL/invalid context values.
 *
 * @param {object} tenantContext - Object containing { userId, clubId, role }.
 * @param {string} text - The SQL query text.
 * @param {Array} params - Optional array of query parameters for the main query.
 * @returns {Promise<QueryResult>} A promise resolving with the query result.
 */
export async function queryWithTenantContext(tenantContext = {}, text, params = []) {
    let client;
    const start = Date.now();
    let queryResult;

    // Helper to safely escape single quotes for SQL string literals used ONLY for SET LOCAL
    // Consider using query parameters for SET if possible, though complex for dynamic values
    const escapeSqlString = (val) => `'${String(val).replace(/'/g, "''")}'`;

    try {
        client = await pool.connect();
        await client.query('BEGIN');
        log.debug(`[RLS] Context:`, tenantContext);

        // Set User ID Context
        if (tenantContext.userId && typeof tenantContext.userId === 'string' && UUID_REGEX.test(tenantContext.userId)) {
            await client.query(`SET LOCAL app.current_user_id = ${escapeSqlString(tenantContext.userId)}`);
        } else {
            await client.query(`SET LOCAL app.current_user_id TO DEFAULT`);
            if (tenantContext.userId) log.warn(`[RLS] Invalid userId format: ${tenantContext.userId}. Resetting context.`);
        }

        // Set Club ID Context
        if (tenantContext.clubId && typeof tenantContext.clubId === 'string' && UUID_REGEX.test(tenantContext.clubId)) {
            await client.query(`SET LOCAL app.current_club_id = ${escapeSqlString(tenantContext.clubId)}`);
        } else {
            await client.query(`SET LOCAL app.current_club_id TO DEFAULT`);
            if (tenantContext.clubId) log.warn(`[RLS] Invalid clubId format: ${tenantContext.clubId}. Resetting context.`);
        }

        // Set Role Context
        if (tenantContext.role && typeof tenantContext.role === 'string' && ALLOWED_ROLES.includes(tenantContext.role)) {
            await client.query(`SET LOCAL app.current_user_role = ${escapeSqlString(tenantContext.role)}`);
        } else {
            await client.query(`SET LOCAL app.current_user_role TO DEFAULT`);
            if (tenantContext.role) log.warn(`[RLS] Invalid role: ${tenantContext.role}. Resetting context.`);
        }

        // Execute the main query using Parameterized Query
        const finalParams = Array.isArray(params) ? params : [];
        queryResult = await client.query(text, finalParams);

        await client.query('COMMIT');
        const duration = Date.now() - start;
        log.debug(`Executed query w/ context`, { text: text.substring(0, 150).replace(/\s+/g, ' '), duration, rows: queryResult.rowCount });
        return queryResult;

    } catch (e) {
        log.error("Error in transaction with tenant context:", {
            query: text.substring(0, 250).replace(/\s+/g, ' '),
            tenantContext: tenantContext,
            error: e.message,
            code: e.code,
            position: e.position,
        });
        if (client) {
            try { await client.query('ROLLBACK'); log.info("Transaction rolled back due to error."); }
            catch (rollbackError) { log.error("Rollback failed:", rollbackError); }
        }
        throw e; // Re-throw original error
    } finally {
        if (client) client.release(); // Ensure client is always released
    }
}

// Graceful shutdown handler
const shutdown = async (signal) => {
    log.warn(`Received ${signal}. Closing database pool...`);
    try {
        await pool.end();
        log.info('Database pool closed successfully.');
        process.exit(0);
    } catch (err) {
        log.error('Error closing database pool during shutdown:', err);
        process.exit(1); // Exit with error code
    }
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// No module.exports needed, functions/pool are exported individually using 'export' keyword