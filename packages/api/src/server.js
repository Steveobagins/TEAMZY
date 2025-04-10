// packages/api/src/server.js
import 'dotenv/config'; // Load environment variables early using import
import app from './app.js'; // Import the Express app instance - Added .js
import { pool as dbPool } from './config/db.js'; // Import the db pool directly - Added .js
import log from './utils/logger.js'; // Import logger - Added .js
// import redisClient from './config/redis.js'; // Import Redis client if used - Added .js (if uncommented)

const PORT = process.env.PORT || 3001;
let serverInstance = null; // To hold the server instance for graceful shutdown

async function startServer() {
    try {
        // 1. Test Database Connection
        log.info('Attempting to connect to database...');
        const dbClient = await dbPool.connect();
        log.info(`?? Database connected successfully to "${dbClient.database}" on ${dbClient.host}:${dbClient.port}`);
        dbClient.release();

        // 2. TODO: Connect to Redis (if using it)
        // try {
        //     await redisClient.connect(); // Assuming redisClient has a connect method
        //     log.info('?? Redis connected successfully.');
        // } catch (redisError) {
        //     log.error('? Failed to connect to Redis:', redisError);
        //     // Decide if Redis connection failure is fatal or not
        //     // process.exit(1); // Uncomment to make Redis connection mandatory
        // }

        // 3. Start the Express server
        serverInstance = app.listen(PORT, () => { // Store server instance
            log.info(`?? Teamzy API Server is running on port ${PORT}`);
            log.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
            // Log specific client URLs if needed
            log.info(`   Platform Admin Client URL: ${process.env.CLIENT_URL_PLATFORM_ADMIN || 'Not Set'}`);
            log.info(`   Club Admin Client URL: ${process.env.CLIENT_URL_CLUB_ADMIN || 'Not Set'}`);
            log.info(`   App Client URL: ${process.env.CLIENT_URL_APP || 'Not Set'}`);
        });

        // Handle server startup errors (e.g., port already in use)
        serverInstance.on('error', (error) => {
            if (error.syscall !== 'listen') {
                throw error;
            }
            const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;
            switch (error.code) {
                case 'EACCES':
                    log.error(`? ${bind} requires elevated privileges`);
                    process.exit(1);
                    break;
                case 'EADDRINUSE':
                    log.error(`? ${bind} is already in use`);
                    process.exit(1);
                    break;
                default:
                    throw error;
            }
        });

    } catch (error) {
        // Catch database connection errors from pool.connect()
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            log.error(`? Database Connection Error: Could not connect. Please ensure the database is running and accessible via DATABASE_URL.`);
        } else if (error.code === '28P01' /* invalid_password */ || error.code === '3D000' /* invalid_catalog_name */) {
            log.error(`? Database Authentication/Configuration Error: ${error.message}. Please check DATABASE_URL credentials/db name.`);
        } else {
            log.error('? Failed to start server due to an unexpected error:', error);
        }
        process.exit(1); // Exit the process if critical startup steps fail
    }
}

// Graceful Shutdown Handling
async function gracefulShutdown(signal) {
    log.warn(`\nReceived ${signal}. Shutting down gracefully...`);

    // 1. Stop accepting new connections
    if (serverInstance) {
        serverInstance.close(async () => {
            log.info('?? HTTP server closed.');

            // 2. Close database pool
            try {
                await dbPool.end();
                log.info('?? Database pool closed.');
            } catch (dbErr) {
                log.error('Error closing database pool:', dbErr);
            }

            // 3. Close Redis connection if used
            // try {
            //    if (redisClient?.quit) await redisClient.quit(); // Assuming quit method exists
            //    log.info('?? Redis client closed.');
            // } catch (redisErr) {
            //    log.error('Error closing Redis client:', redisErr);
            // }

            log.info('Cleanup finished. Exiting.');
            process.exit(0); // Exit cleanly
        });

        // 3. Force shutdown if cleanup takes too long
        setTimeout(() => {
            log.error('Could not close connections in time, forcing shutdown.');
            process.exit(1); // Exit with error
        }, 10000); // 10 seconds timeout

    } else {
        // If server never started, just exit
        log.info('Server was not running. Exiting.');
        process.exit(0);
    }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Standard signal for termination
process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // Catches Ctrl+C

// --- Start the server ---
startServer();