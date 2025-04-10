// packages/api/src/middleware/uploadMiddleware.js
// Basic Multer configuration for handling file uploads, storing in memory

import multer from 'multer'; // Use ES Module import

// Configure multer to store files in memory as Buffer objects
// This is suitable for small files like logos/avatars that we immediately process/store elsewhere (e.g., DB BLOB, S3)
const storage = multer.memoryStorage();

// File filtering can be done globally here or within specific routes/controllers
// Example global image filter:
const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) { // Example: Only allow images
        cb(null, true); // Accept file
    } else {
        // Use Error for consistency, MulterError can be used for specific cases
        cb(new Error('Invalid file type. Only images are allowed.'), false); // Reject file
    }
};

// Create the multer instance
const upload = multer({
    storage: storage, // Use memory storage
    limits: {
        fileSize: 5 * 1024 * 1024 // Example: Set a global max file size limit (e.g., 5MB)
    },
    fileFilter: imageFileFilter // Apply the image filter globally
});

// Export the configured multer instance as the default export
export default upload;