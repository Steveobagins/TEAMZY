// packages/api/src/utils/constants.js

// Define and export user roles
export const USER_ROLES = Object.freeze({
    PLATFORM_ADMIN: 'PLATFORM_ADMIN',
    CLUB_ADMIN: 'CLUB_ADMIN',
    COACH: 'COACH',
    ATHLETE: 'ATHLETE', // Or 'PLAYER' if you use that elsewhere
    PARENT: 'PARENT',
});

// Define and export subscription tiers
export const SUBSCRIPTION_TIERS = Object.freeze({
    FREE: 'FREE',
    BASIC: 'BASIC',
    PREMIUM: 'PREMIUM',
    // Add other tiers if needed
});

// Define user/invitation statuses (expand as needed)
export const USER_STATUS = Object.freeze({
    PENDING_SETUP: 'PENDING_SETUP', // User created, needs to set password via link
    PENDING_VERIFICATION: 'PENDING_VERIFICATION', // User signed up, needs email verification
    INVITED: 'INVITED', // User invited, not yet accepted
    ACTIVE: 'ACTIVE', // User is active and can log in
    INACTIVE: 'INACTIVE', // User deactivated by admin or system
    DELETED: 'DELETED', // Soft deleted user (optional)
});

// Define subscription statuses (example)
export const SUBSCRIPTION_STATUS = Object.freeze({
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    TRIALING: 'trialing',
    PAST_DUE: 'past_due',
    CANCELED: 'canceled',
});

// Define default values (example)
export const DEFAULTS = Object.freeze({
    SUBSCRIPTION_TIER: SUBSCRIPTION_TIERS.FREE,
    SUBSCRIPTION_STATUS: SUBSCRIPTION_STATUS.ACTIVE, // Or maybe INACTIVE/TRIALING?
    USER_STATUS: USER_STATUS.PENDING_SETUP, // Default for admin creation
});

// Use Object.freeze to make the objects immutable, preventing accidental changes