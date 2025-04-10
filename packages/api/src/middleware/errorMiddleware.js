// packages/api/src/middleware/errorMiddleware.js

// Import utilities if needed (e.g., AppError, logger)
import { AppError } from '../utils/errorUtils.js'; // Assuming AppError provides statusCode
import log from '../utils/logger.js'; // Use logger for consistent logging

/**
 * Global Error Handling Middleware.
 * Catches errors passed via next(err) and sends a structured JSON response.
 * Hides internal error details in production.
 */
export const globalErrorHandler = (err, req, res, next) => {
    // Log the full error stack trace for server-side debugging
    // Use the logger utility
    log.error(`Unhandled Error on ${req.method} ${req.originalUrl}:`, err);

    let statusCode = 500;
    let message = 'An unexpected internal server error occurred.';
    let errorDetails = null; // For development mode

    // Check if it's our custom AppError or has a statusCode
    if (err instanceof AppError || (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600)) {
        statusCode = err.statusCode;
        message = err.message || message; // Use specific error message if available
    }
    // Handle specific error types if needed (e.g., database errors, validation errors)
    // else if (err.code === '23505') { // Example: Postgres unique violation
    //     statusCode = 409; // Conflict
    //     message = 'A record with the provided details already exists.';
    // }
    // else if (err.name === 'ValidationError') { // Example: Mongoose validation
    //     statusCode = 400;
    //     message = Object.values(err.errors).map(el => el.message).join('. ');
    // }

    // In development, provide more details
    if (process.env.NODE_ENV === 'development') {
        errorDetails = {
            type: err.name,
            stack: err.stack, // Include stack trace only in development
            // Optionally add other properties like err.code
        };
    }

    // Send JSON response
    res.status(statusCode).json({
        status: statusCode >= 500 ? 'error' : 'fail', // Indicate error type
        message: message,
        ...(errorDetails && { error: errorDetails }) // Conditionally spread details in dev
    });
};

/**
 * Route Not Found Handler.
 * Placed after all other routes to catch requests that didn't match.
 * Uses AppError to pass to the globalErrorHandler for consistent response format.
 */
export const routeNotFoundHandler = (req, res, next) => {
    // Use AppError to standardize 404 responses via the global handler
    const err = new AppError(`Resource not found at ${req.method} ${req.originalUrl}`, 404);
    next(err); // Pass the 404 error to the globalErrorHandler
};

// Note: No need for module.exports with ESM, functions are exported individually