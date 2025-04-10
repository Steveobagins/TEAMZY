-- Canvas: database/schema.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum for user roles
DO $$
BEGIN
    CREATE TYPE user_role AS ENUM (
        'PLATFORM_ADMIN',
        'CLUB_ADMIN',
        'COACH',
        'ATHLETE',
        'PARENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END;
$$;

-- Enum for subscription tiers
DO $$
BEGIN
    CREATE TYPE subscription_tier AS ENUM (
        'FREE',
        'BASIC',
        'PREMIUM'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END;
$$;

-- Enum for invitation status
DO $$
BEGIN
    CREATE TYPE invitation_status AS ENUM (
        'PENDING',
        'ACCEPTED',
        'EXPIRED',
        'REVOKED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END;
$$;

-- Clubs Table (Tenants)
CREATE TABLE IF NOT EXISTS clubs (
    club_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(63) UNIQUE,
    -- Logo stored as BLOB for MVP
    logo_file_name VARCHAR(255),
    logo_mime_type VARCHAR(100),
    logo_data BYTEA, -- *** BLOB storage for logo ***
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    terms_and_conditions TEXT,
    -- Subscription Details
    subscription_tier subscription_tier NOT NULL DEFAULT 'FREE',
    subscription_status VARCHAR(50) DEFAULT 'inactive', -- Start as inactive until subscription completes
    stripe_customer_id VARCHAR(255) UNIQUE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    billing_cycle_anchor TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_user_id UUID -- Link to the initial Platform Admin or system process that created it (Optional)
    -- created_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL -- Add FK if users table exists first
);

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255), -- Nullable initially if created via invite before password set
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    -- Profile picture stored as BLOB for MVP
    profile_picture_file_name VARCHAR(255),
    profile_picture_mime_type VARCHAR(100),
    profile_picture_data BYTEA, -- *** BLOB storage for profile pic ***
    phone_number VARCHAR(50),
    -- Authentication & Status
    primary_role user_role NOT NULL,
    club_id UUID REFERENCES clubs(club_id) ON DELETE SET NULL, -- Club association (NULL for PLATFORM_ADMIN)
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    -- Email verification/invite token handling
    verification_token VARCHAR(255) UNIQUE, -- Can be used for email verification OR invite acceptance
    verification_token_expires TIMESTAMPTZ,
    -- Password Reset
    password_reset_token VARCHAR(255) UNIQUE,
    password_reset_expires TIMESTAMPTZ,
    -- MFA (Placeholders for future implementation)
    mfa_secret VARCHAR(255),
    is_mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_recovery_codes TEXT[], -- Array of recovery codes
    -- Status & Tracking
    last_login_at TIMESTAMPTZ,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    account_locked_until TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT FALSE, -- Start inactive, activate upon verification/invite acceptance
    invitation_status invitation_status DEFAULT NULL, -- Track status if user was created via invite
    invited_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL, -- Track who invited this user
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add foreign key constraint now that users table exists
-- Ensure this runs after both tables are created, ideally via migration tool later
-- ALTER TABLE clubs
-- ADD CONSTRAINT fk_clubs_created_by FOREIGN KEY (created_by_user_id)
-- REFERENCES users(user_id) ON DELETE SET NULL;

-- Index for login performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- Index for finding users by club
CREATE INDEX IF NOT EXISTS idx_users_club_id ON users(club_id);
-- Index for verification/reset tokens
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);

-- Parent-Child Relationships (Linking Parent/Guardian users to Athlete users)
CREATE TABLE IF NOT EXISTS parent_child_relationships (
    relationship_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    child_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) DEFAULT 'guardian', -- e.g., guardian, parent
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (parent_user_id, child_user_id),
    CONSTRAINT check_user_types CHECK (
        -- Enforcement might be better in application logic during link creation
        parent_user_id <> child_user_id
    )
);
CREATE INDEX IF NOT EXISTS idx_parent_child_parent_id ON parent_child_relationships(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_child_id ON parent_child_relationships(child_user_id);

-- Audit Log Table (Example - Essential for tracking actions)
CREATE TABLE IF NOT EXISTS audit_log (
    log_id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    club_id UUID REFERENCES clubs(club_id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL, -- e.g., 'USER_LOGIN', 'USER_INVITED', 'PROFILE_PIC_UPLOADED', 'CLUB_CREATED'
    target_type VARCHAR(100), -- e.g., 'USER', 'CLUB', 'INVITATION'
    target_id TEXT,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_club_id ON audit_log(club_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Simple Teams Table (Placeholder for MVP Skeleton)
CREATE TABLE IF NOT EXISTS teams (
    team_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(club_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    season VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_teams_club_id ON teams(club_id);

-- Team Members Junction Table (Placeholder for MVP Skeleton)
CREATE TABLE IF NOT EXISTS team_members (
    team_member_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    team_role user_role NOT NULL, -- Role within the team (e.g., COACH, ATHLETE)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);

-- Placeholder Tables for other major sections (just PK and club_id for RLS demo)
CREATE TABLE IF NOT EXISTS events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(club_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Placeholder Event',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_club_id ON events(club_id);

CREATE TABLE IF NOT EXISTS performance_metrics (
    metric_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(club_id) ON DELETE CASCADE,
    athlete_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL DEFAULT 'Placeholder Metric',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_club_id ON performance_metrics(club_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_athlete_id ON performance_metrics(athlete_user_id);

CREATE TABLE IF NOT EXISTS payments (
    payment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID NOT NULL REFERENCES clubs(club_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE, -- User making/receiving payment
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    description VARCHAR(255) DEFAULT 'Placeholder Payment',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_club_id ON payments(club_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);

-- Trigger function to automatically update 'updated_at' columns
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql; -- <<< CORRECTED: Added semicolon

-- Apply the trigger to tables with 'updated_at'
-- NOTE: Changed EXECUTE PROCEDURE back to EXECUTE FUNCTION as the function returns TRIGGER, not void.
CREATE OR REPLACE TRIGGER set_timestamp_clubs
BEFORE UPDATE ON clubs FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE OR REPLACE TRIGGER set_timestamp_users
BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE OR REPLACE TRIGGER set_timestamp_teams
BEFORE UPDATE ON teams FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Apply RLS policies (Example for 'teams' - apply similarly to events, payments, etc.)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
-- Note: Using text comparison for roles might be simpler if app.current_user_role is set as text
CREATE POLICY platform_admin_access_teams ON teams FOR ALL USING (current_setting('app.current_user_role', TRUE)::text = 'PLATFORM_ADMIN');
-- Note: Ensure app.current_club_id is set correctly as a valid UUID string
CREATE POLICY club_isolation_teams ON teams FOR ALL USING (club_id::text = current_setting('app.current_club_id', TRUE)) WITH CHECK (club_id::text = current_setting('app.current_club_id', TRUE));
ALTER TABLE teams FORCE ROW LEVEL SECURITY;

-- Apply RLS to users table carefully
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- Note: Using text comparison for roles
CREATE POLICY platform_admin_access_users ON users FOR ALL USING (current_setting('app.current_user_role', TRUE)::text = 'PLATFORM_ADMIN');
-- Note: Ensure app.current_club_id is set correctly as a valid UUID string
CREATE POLICY club_member_access_users ON users FOR SELECT USING (club_id::text = current_setting('app.current_club_id', TRUE));
-- Note: Ensure app.current_user_id is set correctly as a valid UUID string
CREATE POLICY own_profile_access_users ON users FOR ALL USING (user_id::text = current_setting('app.current_user_id', TRUE)) WITH CHECK (user_id::text = current_setting('app.current_user_id', TRUE));
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- *** ADD RLS policies similarly for ALL tenant-specific tables (events, team_members, performance_metrics, payments, parent_child_relationships, etc.) ***
-- Example for events:
-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY platform_admin_access_events ON events FOR ALL USING (current_setting('app.current_user_role', TRUE)::text = 'PLATFORM_ADMIN');
-- CREATE POLICY club_isolation_events ON events FOR ALL USING (club_id::text = current_setting('app.current_club_id', TRUE)) WITH CHECK (club_id::text = current_setting('app.current_club_id', TRUE));
-- ALTER TABLE events FORCE ROW LEVEL SECURITY;

-- Add FK constraint after both tables exist (if not done inline)
-- Using IF NOT EXISTS to avoid errors on re-runs, requires PostgreSQL 9.5+ for ALTER TABLE ADD CONSTRAINT IF NOT EXISTS
-- If using older versions, you might need more complex logic or handle potential errors
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_clubs_created_by' AND conrelid = 'clubs'::regclass) THEN
        ALTER TABLE clubs ADD CONSTRAINT fk_clubs_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL;
    END IF;
END;
$$;