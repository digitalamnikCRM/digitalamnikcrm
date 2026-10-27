-- ====================================================================
-- DIGITAL AMNIK CRM — SUPABASE DATABASE SCHEMA & REALTIME SETUP
-- Run this entire script in your Supabase Project:
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste & Click Run
-- ====================================================================

-- 1. Enable UUID Extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ====================================================================
-- 2. TABLE: CLIENTS (Client Accounts & Brands)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    industry TEXT DEFAULT 'Digital Marketing & Media',
    status TEXT DEFAULT 'Active', -- 'Active', 'On Hold', 'Archived'
    lead TEXT DEFAULT 'Amaan Khan (Owner)',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 3. TABLE: TEAM_MEMBERS (Agency Specialists & Management)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.team_members (
    id TEXT PRIMARY KEY, -- e.g. 'EMP-000', 'EMP-001'
    name TEXT NOT NULL,
    role TEXT NOT NULL, -- 'Admin', 'Video Editor', 'Social Media Management', 'Graphic Design', etc.
    shift TEXT DEFAULT '10:00 AM – 07:00 PM',
    password TEXT NOT NULL DEFAULT '123',
    is_founder BOOLEAN DEFAULT FALSE,
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    late_lunch_reason TEXT DEFAULT NULL,
    late_lunch_time BIGINT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 4. TABLE: PROJECTS (Deliverables, Video Edits, Campaigns)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client TEXT DEFAULT '',
    service TEXT NOT NULL DEFAULT 'Video Editor',
    priority TEXT DEFAULT 'Medium', -- 'Urgent', 'High', 'Medium', 'Low'
    status TEXT DEFAULT 'Assigned', -- 'Assigned', 'In Progress', 'Review', 'Completed', 'Cancelled'
    deadline TEXT DEFAULT '',
    assigned JSONB DEFAULT '[]'::JSONB, -- Array of specialist names/ids
    description TEXT DEFAULT '',
    total_time_spent BIGINT DEFAULT 0, -- Time tracked in milliseconds
    sessions JSONB DEFAULT '[]'::JSONB, -- Array of tracked work sessions
    created_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 5. TABLE: ATTENDANCE_LOGS (Daily Shift Clock-In / Out & Lunch)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id TEXT PRIMARY KEY,
    employee_id TEXT REFERENCES public.team_members(id) ON DELETE SET NULL,
    employee_name TEXT NOT NULL,
    date TEXT NOT NULL,
    check_in BIGINT,
    lunch_start BIGINT,
    lunch_end BIGINT,
    check_out BIGINT,
    effective_hours TEXT DEFAULT '0h 0m',
    late_lunch_reason TEXT DEFAULT NULL,
    status TEXT DEFAULT 'done', -- 'in', 'lunch', 'done', 'out'
    photo_url TEXT DEFAULT NULL, -- Check-in verification photo (auto-purged after 7 days to preserve storage)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration safety for existing tables:
ALTER TABLE public.attendance_logs ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL;

-- ====================================================================
-- 6. TABLE: CALENDARS (Social Media Monthly Content Schedules)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.calendars (
    id TEXT PRIMARY KEY,
    client TEXT NOT NULL,
    month TEXT NOT NULL, -- e.g. '2026-10'
    month_label TEXT NOT NULL, -- e.g. 'October 2026'
    title TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size TEXT DEFAULT '',
    uploaded_by TEXT DEFAULT 'Admin',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 7. TABLE: TIME_LOGS (Billable Time Tracking Logs)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.time_logs (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    project_name TEXT,
    user_name TEXT,
    date TEXT,
    start_time TEXT,
    end_time TEXT,
    duration_ms BIGINT DEFAULT 0,
    duration_str TEXT DEFAULT '0h 0m',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 8. TABLE: ACTIVITY_LOGS (Agency Real-time Feed)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    color TEXT DEFAULT 'purple',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS and grant read/write access to public anon client
-- ====================================================================
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create Open Policies for Anon / Public web client
DROP POLICY IF EXISTS "Public Full Access on clients" ON public.clients;
CREATE POLICY "Public Full Access on clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access on team_members" ON public.team_members;
CREATE POLICY "Public Full Access on team_members" ON public.team_members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access on projects" ON public.projects;
CREATE POLICY "Public Full Access on projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access on attendance_logs" ON public.attendance_logs;
CREATE POLICY "Public Full Access on attendance_logs" ON public.attendance_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access on calendars" ON public.calendars;
CREATE POLICY "Public Full Access on calendars" ON public.calendars FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access on time_logs" ON public.time_logs;
CREATE POLICY "Public Full Access on time_logs" ON public.time_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public Full Access on activity_logs" ON public.activity_logs;
CREATE POLICY "Public Full Access on activity_logs" ON public.activity_logs FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- 10. ENABLE SUPABASE REALTIME REPLICATION
-- This allows instant cross-device updates without page reloads!
-- ====================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calendars;

-- ====================================================================
-- 11. INSERT INITIAL REAL FOUNDER / ADMIN DATA (Amaan Khan)
-- Real Agency Admin Credentials — NO DUMMY EMPLOYEES!
-- ====================================================================
INSERT INTO public.team_members (id, name, role, shift, password, is_founder)
VALUES ('EMP-000', 'Amaan Khan', 'Admin', '09:30 AM – 07:30 PM', 'amnik2026', true)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 12. 7-DAY PHOTO RETENTION AUTO-PURGE FUNCTION
-- Clears heavy photos older than 7 days, preserves attendance 'Present' record forever!
-- ====================================================================
CREATE OR REPLACE FUNCTION public.purge_old_attendance_photos()
RETURNS void AS $$
BEGIN
    UPDATE public.attendance_logs
    SET photo_url = NULL
    WHERE created_at < NOW() - INTERVAL '7 days'
      AND photo_url IS NOT NULL;
END;
$$ LANGUAGE plpgsql;
