-- Supabase Schema for Awn and Sanad Platform
-- Run this SQL in your Supabase SQL Editor

-- 1. Users Table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    membership_type TEXT,
    current_status TEXT,
    location TEXT,
    national_id TEXT,
    fcm_token TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_phone CHECK (phone ~ '^[234][0-9]{7}$')
);

-- Enable RLS for users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- 2. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view notifications" ON public.notifications;
CREATE POLICY "Anyone can view notifications" ON public.notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admin can insert notifications" ON public.notifications;
CREATE POLICY "Only admin can insert notifications" ON public.notifications FOR INSERT WITH CHECK (true); -- Note: Secure this properly in production

-- 3. Polls Table
CREATE TABLE IF NOT EXISTS public.polls (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Poll Options Table
CREATE TABLE IF NOT EXISTS public.poll_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL
);

-- 5. Poll Votes Table
CREATE TABLE IF NOT EXISTS public.poll_votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    poll_id UUID REFERENCES public.polls(id) ON DELETE CASCADE,
    option_id UUID REFERENCES public.poll_options(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(poll_id, user_id) -- Ensures user votes only once per poll
);

-- Disable RLS or set policies for polls, options, and votes so users can read them and vote.
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view polls" ON public.polls;
CREATE POLICY "Anyone can view polls" ON public.polls FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admin can modify polls" ON public.polls;
CREATE POLICY "Only admin can modify polls" ON public.polls FOR ALL USING (true); -- update for prod

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view poll options" ON public.poll_options;
CREATE POLICY "Anyone can view poll options" ON public.poll_options FOR SELECT USING (true);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can vote once" ON public.poll_votes;
CREATE POLICY "Users can vote once" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view votes" ON public.poll_votes;
CREATE POLICY "Users can view votes" ON public.poll_votes FOR SELECT USING (true);
