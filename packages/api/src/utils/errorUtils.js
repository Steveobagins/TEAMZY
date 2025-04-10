// packages/api/src/utils/errorUtils.js - TEMPORARY DIAGNOSTIC VERSION

// Define a simple class (doesn't even need to extend Error for this test)
class AppError {
    constructor(message, code) {
        this.message = message;
        this.statusCode = code;
        console.log("--- Simple AppError Instantiated ---"); // Add log
    }
}

console.log("--- errorUtils.js executed ---"); // Add log

// Export it using the named export
export { AppError };