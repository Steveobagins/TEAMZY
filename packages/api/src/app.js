// packages/api/src/app.js - FULL CORRECT VERSION
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import 'dotenv/config';
import { AppError } from './utils/errorUtils.js';
import { globalErrorHandler, routeNotFoundHandler } from './middleware/errorMiddleware.js';
import log from './utils/logger.js';

// Import routes
import authRoutes from './routes/authRoutes.js';
import platformUserRoutes from './routes/platformUserRoutes.js';
import platformClubRoutes from './routes/platformClubRoutes.js';
import platformRoutes from './routes/platformRoutes.js';
import userRoutes from './routes/userRoutes.js';
import clubRoutes from './routes/clubRoutes.js';

const app = express();

// --- Middleware ---

// --- CORRECT CORS CONFIGURATION PARSING CLIENT_URLS ---
const clientUrlsString = process.env.CLIENT_URLS;
let allowedOrigins = [];

if (clientUrlsString) {
    allowedOrigins = clientUrlsString.split(',').map(url => url.trim()).filter(Boolean);
}

if (allowedOrigins.length === 0 && process.env.NODE_ENV !== 'production') {
    log.warn('CORS Warning: CLIENT_URLS environment variable not set or empty. Allowing localhost origins for development.');
    allowedOrigins.push('http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004', 'http://localhost:3005');
} else if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
    log.error('CORS Error: No allowed origins configured via CLIENT_URLS for production!');
}

log.info(`Configured CORS allowed origins: [${allowedOrigins.join(', ')}]`);

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            log.debug(`CORS: Allowing origin: ${origin || 'No Origin'}`);
            callback(null, true);
        } else {
            log.warn(`CORS: Blocking origin: ${origin}. Not in allowed list: [${allowedOrigins.join(', ')}]`);
            callback(new Error(`Origin ${origin} not allowed by CORS policy.`));
        }
    },
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204
};
app.use(cors(corsOptions));
// --- END CORS CONFIGURATION ---

// Logging
app.use(morgan('dev'));

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// --- API Routes ---
const apiRouter = express.Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/platform-admin/users', platformUserRoutes);
apiRouter.use('/platform-admin/clubs', platformClubRoutes);
apiRouter.use('/platform', platformRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/club', clubRoutes);

// Apply the /api prefix
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});


// --- Catch-all for undefined API routes ---
app.use('/api/*', routeNotFoundHandler);

// Catch-all for any other routes
app.all('*', (req, res, next) => {
    log.warn(`Non-API route not found: ${req.method} ${req.originalUrl}`);
    next(new AppError(`Resource not found at ${req.originalUrl}`, 404));
});

// --- Global Error Handling Middleware ---
app.use(globalErrorHandler);

export default app;