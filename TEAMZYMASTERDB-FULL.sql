--
-- PostgreSQL database dump
--

-- Dumped from database version 15.12 (Debian 15.12-1.pgdg120+1)
-- Dumped by pg_dump version 17.2

-- Started on 2025-04-10 15:48:18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 7 (class 2615 OID 57358)
-- Name: teamzymaster; Type: SCHEMA; Schema: -; Owner: admin
--

CREATE SCHEMA teamzymaster;


ALTER SCHEMA teamzymaster OWNER TO admin;

--
-- TOC entry 2 (class 3079 OID 24582)
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- TOC entry 3533 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- TOC entry 898 (class 1247 OID 24614)
-- Name: invitation_status; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.invitation_status AS ENUM (
    'PENDING',
    'ACCEPTED',
    'EXPIRED',
    'REVOKED'
);


ALTER TYPE public.invitation_status OWNER TO admin;

--
-- TOC entry 862 (class 1247 OID 24606)
-- Name: subscription_tier; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.subscription_tier AS ENUM (
    'FREE',
    'BASIC',
    'PREMIUM'
);


ALTER TYPE public.subscription_tier OWNER TO admin;

--
-- TOC entry 897 (class 1247 OID 24594)
-- Name: user_role; Type: TYPE; Schema: public; Owner: admin
--

CREATE TYPE public.user_role AS ENUM (
    'PLATFORM_ADMIN',
    'CLUB_ADMIN',
    'COACH',
    'ATHLETE',
    'PARENT'
);


ALTER TYPE public.user_role OWNER TO admin;

--
-- TOC entry 237 (class 1255 OID 24815)
-- Name: trigger_set_timestamp(); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.trigger_set_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.trigger_set_timestamp() OWNER TO admin;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 220 (class 1259 OID 24699)
-- Name: audit_log; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.audit_log (
    log_id bigint NOT NULL,
    user_id uuid,
    club_id uuid,
    action character varying(255) NOT NULL,
    target_type character varying(100),
    target_id text,
    details jsonb,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_user_id uuid,
    actor_club_id uuid,
    target_user_id uuid,
    target_club_id uuid
);


ALTER TABLE public.audit_log OWNER TO admin;

--
-- TOC entry 219 (class 1259 OID 24698)
-- Name: audit_log_log_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.audit_log_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_log_log_id_seq OWNER TO admin;

--
-- TOC entry 3537 (class 0 OID 0)
-- Dependencies: 219
-- Name: audit_log_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.audit_log_log_id_seq OWNED BY public.audit_log.log_id;


--
-- TOC entry 216 (class 1259 OID 24623)
-- Name: clubs; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.clubs (
    club_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    subdomain character varying(63),
    logo_file_name character varying(255),
    logo_mime_type character varying(100),
    logo_data bytea,
    primary_color character varying(7),
    secondary_color character varying(7),
    address text,
    contact_email character varying(255),
    contact_phone character varying(50),
    terms_and_conditions text,
    subscription_tier public.subscription_tier DEFAULT 'FREE'::public.subscription_tier NOT NULL,
    subscription_status character varying(50) DEFAULT 'inactive'::character varying,
    stripe_customer_id character varying(255),
    stripe_subscription_id character varying(255),
    billing_cycle_anchor timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_user_id uuid,
    primary_contact_user_id uuid,
    is_active boolean DEFAULT false NOT NULL
);


ALTER TABLE public.clubs OWNER TO admin;

--
-- TOC entry 223 (class 1259 OID 24760)
-- Name: events; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.events (
    event_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    club_id uuid NOT NULL,
    name character varying(255) DEFAULT 'Placeholder Event'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.events OWNER TO admin;

--
-- TOC entry 218 (class 1259 OID 24675)
-- Name: parent_child_relationships; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.parent_child_relationships (
    relationship_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    parent_user_id uuid NOT NULL,
    child_user_id uuid NOT NULL,
    relationship_type character varying(50) DEFAULT 'guardian'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT check_user_types CHECK ((parent_user_id <> child_user_id))
);


ALTER TABLE public.parent_child_relationships OWNER TO admin;

--
-- TOC entry 225 (class 1259 OID 24794)
-- Name: payments; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.payments (
    payment_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    club_id uuid NOT NULL,
    user_id uuid NOT NULL,
    amount numeric(10,2) DEFAULT 0.00 NOT NULL,
    description character varying(255) DEFAULT 'Placeholder Payment'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.payments OWNER TO admin;

--
-- TOC entry 224 (class 1259 OID 24774)
-- Name: performance_metrics; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.performance_metrics (
    metric_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    club_id uuid NOT NULL,
    athlete_user_id uuid NOT NULL,
    metric_name character varying(255) DEFAULT 'Placeholder Metric'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.performance_metrics OWNER TO admin;

--
-- TOC entry 226 (class 1259 OID 32773)
-- Name: platform_settings; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.platform_settings (
    setting_id integer DEFAULT 1 NOT NULL,
    platform_name character varying(100) DEFAULT 'Teamzy'::character varying,
    platform_logo_file_name character varying(255),
    platform_logo_mime_type character varying(100),
    platform_logo_data bytea,
    support_email character varying(255),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT platform_settings_singleton CHECK ((setting_id = 1))
);


ALTER TABLE public.platform_settings OWNER TO admin;

--
-- TOC entry 222 (class 1259 OID 24738)
-- Name: team_members; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.team_members (
    team_member_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    team_role public.user_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    joined_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.team_members OWNER TO admin;

--
-- TOC entry 221 (class 1259 OID 24722)
-- Name: teams; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.teams (
    team_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    club_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    season character varying(100),
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.teams FORCE ROW LEVEL SECURITY;


ALTER TABLE public.teams OWNER TO admin;

--
-- TOC entry 217 (class 1259 OID 24641)
-- Name: users; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.users (
    user_id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255),
    first_name character varying(100),
    last_name character varying(100),
    profile_picture_file_name character varying(255),
    profile_picture_mime_type character varying(100),
    profile_picture_data bytea,
    phone_number character varying(50),
    primary_role public.user_role NOT NULL,
    club_id uuid,
    is_email_verified boolean DEFAULT false NOT NULL,
    verification_token character varying(255),
    verification_token_expires timestamp with time zone,
    password_reset_token character varying(255),
    password_reset_expires timestamp with time zone,
    mfa_secret character varying(255),
    is_mfa_enabled boolean DEFAULT false NOT NULL,
    mfa_recovery_codes text[],
    last_login_at timestamp with time zone,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    account_locked_until timestamp with time zone,
    is_active boolean DEFAULT false NOT NULL,
    invitation_status public.invitation_status,
    invited_by_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    set_password_token character varying(255),
    set_password_token_expires timestamp with time zone,
    has_profile_picture boolean DEFAULT false NOT NULL
);

ALTER TABLE ONLY public.users FORCE ROW LEVEL SECURITY;


ALTER TABLE public.users OWNER TO admin;

--
-- TOC entry 3274 (class 2604 OID 24702)
-- Name: audit_log log_id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_log ALTER COLUMN log_id SET DEFAULT nextval('public.audit_log_log_id_seq'::regclass);


--
-- TOC entry 3327 (class 2606 OID 24707)
-- Name: audit_log audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_pkey PRIMARY KEY (log_id);


--
-- TOC entry 3298 (class 2606 OID 24634)
-- Name: clubs clubs_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_pkey PRIMARY KEY (club_id);


--
-- TOC entry 3300 (class 2606 OID 24638)
-- Name: clubs clubs_stripe_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_stripe_customer_id_key UNIQUE (stripe_customer_id);


--
-- TOC entry 3302 (class 2606 OID 24640)
-- Name: clubs clubs_stripe_subscription_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_stripe_subscription_id_key UNIQUE (stripe_subscription_id);


--
-- TOC entry 3304 (class 2606 OID 24636)
-- Name: clubs clubs_subdomain_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_subdomain_key UNIQUE (subdomain);


--
-- TOC entry 3346 (class 2606 OID 24767)
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (event_id);


--
-- TOC entry 3323 (class 2606 OID 24685)
-- Name: parent_child_relationships parent_child_relationships_parent_user_id_child_user_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.parent_child_relationships
    ADD CONSTRAINT parent_child_relationships_parent_user_id_child_user_id_key UNIQUE (parent_user_id, child_user_id);


--
-- TOC entry 3325 (class 2606 OID 24683)
-- Name: parent_child_relationships parent_child_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.parent_child_relationships
    ADD CONSTRAINT parent_child_relationships_pkey PRIMARY KEY (relationship_id);


--
-- TOC entry 3355 (class 2606 OID 24802)
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (payment_id);


--
-- TOC entry 3351 (class 2606 OID 24781)
-- Name: performance_metrics performance_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.performance_metrics
    ADD CONSTRAINT performance_metrics_pkey PRIMARY KEY (metric_id);


--
-- TOC entry 3357 (class 2606 OID 32783)
-- Name: platform_settings platform_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.platform_settings
    ADD CONSTRAINT platform_settings_pkey PRIMARY KEY (setting_id);


--
-- TOC entry 3342 (class 2606 OID 24745)
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (team_member_id);


--
-- TOC entry 3344 (class 2606 OID 24747)
-- Name: team_members team_members_team_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_user_id_key UNIQUE (team_id, user_id);


--
-- TOC entry 3338 (class 2606 OID 24731)
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (team_id);


--
-- TOC entry 3311 (class 2606 OID 24656)
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- TOC entry 3313 (class 2606 OID 24660)
-- Name: users users_password_reset_token_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_password_reset_token_key UNIQUE (password_reset_token);


--
-- TOC entry 3315 (class 2606 OID 24654)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- TOC entry 3317 (class 2606 OID 40979)
-- Name: users users_set_password_token_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_set_password_token_key UNIQUE (set_password_token);


--
-- TOC entry 3319 (class 2606 OID 24658)
-- Name: users users_verification_token_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_verification_token_key UNIQUE (verification_token);


--
-- TOC entry 3328 (class 1259 OID 24720)
-- Name: idx_audit_log_action; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_audit_log_action ON public.audit_log USING btree (action);


--
-- TOC entry 3329 (class 1259 OID 57351)
-- Name: idx_audit_log_actor_club_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_audit_log_actor_club_id ON public.audit_log USING btree (actor_club_id);


--
-- TOC entry 3330 (class 1259 OID 57350)
-- Name: idx_audit_log_actor_user_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_audit_log_actor_user_id ON public.audit_log USING btree (actor_user_id);


--
-- TOC entry 3331 (class 1259 OID 24719)
-- Name: idx_audit_log_club_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_audit_log_club_id ON public.audit_log USING btree (club_id);


--
-- TOC entry 3332 (class 1259 OID 24721)
-- Name: idx_audit_log_created_at; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_audit_log_created_at ON public.audit_log USING btree (created_at);


--
-- TOC entry 3333 (class 1259 OID 57353)
-- Name: idx_audit_log_target_club_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_audit_log_target_club_id ON public.audit_log USING btree (target_club_id);


--
-- TOC entry 3334 (class 1259 OID 57352)
-- Name: idx_audit_log_target_user_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_audit_log_target_user_id ON public.audit_log USING btree (target_user_id);


--
-- TOC entry 3335 (class 1259 OID 24718)
-- Name: idx_audit_log_user_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_audit_log_user_id ON public.audit_log USING btree (user_id);


--
-- TOC entry 3305 (class 1259 OID 40976)
-- Name: idx_clubs_primary_contact_user_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_clubs_primary_contact_user_id ON public.clubs USING btree (primary_contact_user_id);


--
-- TOC entry 3347 (class 1259 OID 24773)
-- Name: idx_events_club_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_events_club_id ON public.events USING btree (club_id);


--
-- TOC entry 3320 (class 1259 OID 24697)
-- Name: idx_parent_child_child_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_parent_child_child_id ON public.parent_child_relationships USING btree (child_user_id);


--
-- TOC entry 3321 (class 1259 OID 24696)
-- Name: idx_parent_child_parent_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_parent_child_parent_id ON public.parent_child_relationships USING btree (parent_user_id);


--
-- TOC entry 3352 (class 1259 OID 24813)
-- Name: idx_payments_club_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_payments_club_id ON public.payments USING btree (club_id);


--
-- TOC entry 3353 (class 1259 OID 24814)
-- Name: idx_payments_user_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_payments_user_id ON public.payments USING btree (user_id);


--
-- TOC entry 3348 (class 1259 OID 24793)
-- Name: idx_performance_metrics_athlete_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_performance_metrics_athlete_id ON public.performance_metrics USING btree (athlete_user_id);


--
-- TOC entry 3349 (class 1259 OID 24792)
-- Name: idx_performance_metrics_club_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_performance_metrics_club_id ON public.performance_metrics USING btree (club_id);


--
-- TOC entry 3339 (class 1259 OID 24758)
-- Name: idx_team_members_team_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_team_members_team_id ON public.team_members USING btree (team_id);


--
-- TOC entry 3340 (class 1259 OID 24759)
-- Name: idx_team_members_user_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_team_members_user_id ON public.team_members USING btree (user_id);


--
-- TOC entry 3336 (class 1259 OID 24737)
-- Name: idx_teams_club_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_teams_club_id ON public.teams USING btree (club_id);


--
-- TOC entry 3306 (class 1259 OID 24672)
-- Name: idx_users_club_id; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_users_club_id ON public.users USING btree (club_id);


--
-- TOC entry 3307 (class 1259 OID 24671)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 3308 (class 1259 OID 24674)
-- Name: idx_users_password_reset_token; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_users_password_reset_token ON public.users USING btree (password_reset_token);


--
-- TOC entry 3309 (class 1259 OID 24673)
-- Name: idx_users_verification_token; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_users_verification_token ON public.users USING btree (verification_token);


--
-- TOC entry 3374 (class 2620 OID 24816)
-- Name: clubs set_timestamp_clubs; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER set_timestamp_clubs BEFORE UPDATE ON public.clubs FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- TOC entry 3377 (class 2620 OID 32784)
-- Name: platform_settings set_timestamp_platform_settings; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER set_timestamp_platform_settings BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- TOC entry 3376 (class 2620 OID 24818)
-- Name: teams set_timestamp_teams; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER set_timestamp_teams BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- TOC entry 3375 (class 2620 OID 24817)
-- Name: users set_timestamp_users; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER set_timestamp_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();


--
-- TOC entry 3364 (class 2606 OID 24713)
-- Name: audit_log audit_log_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(club_id) ON DELETE SET NULL;


--
-- TOC entry 3365 (class 2606 OID 24708)
-- Name: audit_log audit_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.audit_log
    ADD CONSTRAINT audit_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 3358 (class 2606 OID 40971)
-- Name: clubs clubs_primary_contact_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT clubs_primary_contact_user_id_fkey FOREIGN KEY (primary_contact_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 3369 (class 2606 OID 24768)
-- Name: events events_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(club_id) ON DELETE CASCADE;


--
-- TOC entry 3359 (class 2606 OID 24824)
-- Name: clubs fk_clubs_created_by; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.clubs
    ADD CONSTRAINT fk_clubs_created_by FOREIGN KEY (created_by_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 3362 (class 2606 OID 24691)
-- Name: parent_child_relationships parent_child_relationships_child_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.parent_child_relationships
    ADD CONSTRAINT parent_child_relationships_child_user_id_fkey FOREIGN KEY (child_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3363 (class 2606 OID 24686)
-- Name: parent_child_relationships parent_child_relationships_parent_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.parent_child_relationships
    ADD CONSTRAINT parent_child_relationships_parent_user_id_fkey FOREIGN KEY (parent_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3372 (class 2606 OID 24803)
-- Name: payments payments_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(club_id) ON DELETE CASCADE;


--
-- TOC entry 3373 (class 2606 OID 24808)
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3370 (class 2606 OID 24787)
-- Name: performance_metrics performance_metrics_athlete_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.performance_metrics
    ADD CONSTRAINT performance_metrics_athlete_user_id_fkey FOREIGN KEY (athlete_user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3371 (class 2606 OID 24782)
-- Name: performance_metrics performance_metrics_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.performance_metrics
    ADD CONSTRAINT performance_metrics_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(club_id) ON DELETE CASCADE;


--
-- TOC entry 3367 (class 2606 OID 24748)
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(team_id) ON DELETE CASCADE;


--
-- TOC entry 3368 (class 2606 OID 24753)
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- TOC entry 3366 (class 2606 OID 24732)
-- Name: teams teams_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(club_id) ON DELETE CASCADE;


--
-- TOC entry 3360 (class 2606 OID 24661)
-- Name: users users_club_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_club_id_fkey FOREIGN KEY (club_id) REFERENCES public.clubs(club_id) ON DELETE SET NULL;


--
-- TOC entry 3361 (class 2606 OID 24666)
-- Name: users users_invited_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_invited_by_user_id_fkey FOREIGN KEY (invited_by_user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- TOC entry 3523 (class 3256 OID 24820)
-- Name: teams club_isolation_teams; Type: POLICY; Schema: public; Owner: admin
--

CREATE POLICY club_isolation_teams ON public.teams USING (((club_id)::text = current_setting('app.current_club_id'::text, true))) WITH CHECK (((club_id)::text = current_setting('app.current_club_id'::text, true)));


--
-- TOC entry 3526 (class 3256 OID 57357)
-- Name: users club_member_access_users; Type: POLICY; Schema: public; Owner: admin
--

CREATE POLICY club_member_access_users ON public.users FOR SELECT USING ((club_id = (NULLIF(current_setting('app.current_club_id'::text, true), ''::text))::uuid));


--
-- TOC entry 3524 (class 3256 OID 57355)
-- Name: users own_profile_access_users; Type: POLICY; Schema: public; Owner: admin
--

CREATE POLICY own_profile_access_users ON public.users USING ((user_id = (NULLIF(current_setting('app.current_user_id'::text, true), ''::text))::uuid)) WITH CHECK ((user_id = (NULLIF(current_setting('app.current_user_id'::text, true), ''::text))::uuid));


--
-- TOC entry 3522 (class 3256 OID 24819)
-- Name: teams platform_admin_access_teams; Type: POLICY; Schema: public; Owner: admin
--

CREATE POLICY platform_admin_access_teams ON public.teams USING ((current_setting('app.current_user_role'::text, true) = 'PLATFORM_ADMIN'::text));


--
-- TOC entry 3525 (class 3256 OID 57356)
-- Name: users platform_admin_access_users; Type: POLICY; Schema: public; Owner: admin
--

CREATE POLICY platform_admin_access_users ON public.users USING ((current_setting('app.current_user_role'::text, true) = 'PLATFORM_ADMIN'::text));


--
-- TOC entry 3521 (class 0 OID 24722)
-- Dependencies: 221
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: admin
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3520 (class 0 OID 24641)
-- Dependencies: 217
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: admin
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 3532 (class 0 OID 0)
-- Dependencies: 6
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO api_user;


--
-- TOC entry 3534 (class 0 OID 0)
-- Dependencies: 898
-- Name: TYPE invitation_status; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TYPE public.invitation_status TO api_user;


--
-- TOC entry 3535 (class 0 OID 0)
-- Dependencies: 897
-- Name: TYPE user_role; Type: ACL; Schema: public; Owner: admin
--

GRANT ALL ON TYPE public.user_role TO api_user;


--
-- TOC entry 3536 (class 0 OID 0)
-- Dependencies: 220
-- Name: TABLE audit_log; Type: ACL; Schema: public; Owner: admin
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.audit_log TO api_user;


--
-- TOC entry 3538 (class 0 OID 0)
-- Dependencies: 219
-- Name: SEQUENCE audit_log_log_id_seq; Type: ACL; Schema: public; Owner: admin
--

GRANT SELECT,USAGE ON SEQUENCE public.audit_log_log_id_seq TO api_user;


--
-- TOC entry 3539 (class 0 OID 0)
-- Dependencies: 216
-- Name: TABLE clubs; Type: ACL; Schema: public; Owner: admin
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.clubs TO api_user;


--
-- TOC entry 3540 (class 0 OID 0)
-- Dependencies: 217
-- Name: TABLE users; Type: ACL; Schema: public; Owner: admin
--

GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE public.users TO api_user;


-- Completed on 2025-04-10 15:48:18

--
-- PostgreSQL database dump complete
--

