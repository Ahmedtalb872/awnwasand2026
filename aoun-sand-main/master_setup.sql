-- ══════════════════════════════════════════════════════════════════════════
-- MASTER SETUP SQL — Supabase SQL Editor
-- Fixes: push subscriptions, triggers, polls, donations, user count RPC
-- Run this ONCE in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ─────────────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pg_net";  -- for calling Edge Functions from triggers

-- ─────────────────────────────────────────────────────────────────────────
-- 2. ACCURATE USER COUNT via auth.users (cannot be accessed client-side)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_registered_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM auth.users;
$$;
GRANT EXECUTE ON FUNCTION get_registered_count() TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. PUSH SUBSCRIPTIONS TABLE
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth_key    text NOT NULL,
  user_agent  text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_own" ON public.push_subscriptions;
CREATE POLICY "push_own"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow anon users to subscribe (before they log in — optional)
DROP POLICY IF EXISTS "push_insert_anon" ON public.push_subscriptions;
CREATE POLICY "push_insert_anon"
  ON public.push_subscriptions FOR INSERT
  TO anon
  WITH CHECK (true);

-- Service role can read all (Edge Function)
DROP POLICY IF EXISTS "push_read_service" ON public.push_subscriptions;
CREATE POLICY "push_read_service"
  ON public.push_subscriptions FOR SELECT
  TO service_role
  USING (true);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON public.push_subscriptions(user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. AUTO-TRIGGER: call Edge Function when notification is inserted
--    IMPORTANT: replace <YOUR_PROJECT_REF> with your actual Supabase project ref
--    Example: abcdefghijklmnop
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_send_push_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_ref text := '<YOUR_PROJECT_REF>';  -- ← REPLACE THIS
  service_key text := current_setting('app.service_role_key', true);
BEGIN
  -- Skip future-scheduled notifications
  IF NEW.scheduled_at IS NOT NULL AND NEW.scheduled_at > now() THEN
    RETURN NEW;
  END IF;

  -- Call Edge Function asynchronously via pg_net
  PERFORM net.http_post(
    url     := 'https://' || project_ref || '.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || COALESCE(service_key, '')
    ),
    body    := jsonb_build_object(
      'title',     NEW.title,
      'message',   NEW.message,
      'link',      COALESCE(NEW.link, '/'),
      'media_url', NEW.media_url
    )
  );

  RETURN NEW;
EXCEPTION WHEN others THEN
  -- Never fail the notification INSERT if push fails
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_notification_insert ON public.notifications;
CREATE TRIGGER on_notification_insert
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_send_push_notification();

-- ─────────────────────────────────────────────────────────────────────────
-- 5. NOTIFICATIONS TABLE — ensure all columns exist
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title        text NOT NULL,
  message      text NOT NULL,
  link         text,
  media_url    text,
  scheduled_at timestamptz,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS media_url    text,
  ADD COLUMN IF NOT EXISTS link         text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_read" ON public.notifications;
CREATE POLICY "notif_read" ON public.notifications FOR SELECT USING (true);

DROP POLICY IF EXISTS "notif_write" ON public.notifications;
CREATE POLICY "notif_write" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. POLLS — fix RLS + add missing columns
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.polls
  ADD COLUMN IF NOT EXISTS is_closed      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_multiple boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at     timestamptz;

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "polls_all" ON public.polls;
CREATE POLICY "polls_all" ON public.polls FOR ALL USING (true) WITH CHECK (true);

-- POLL OPTIONS
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "options_all" ON public.poll_options;
CREATE POLICY "options_all" ON public.poll_options FOR ALL USING (true) WITH CHECK (true);

-- POLL VOTES
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "votes_select" ON public.poll_votes;
CREATE POLICY "votes_select" ON public.poll_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS "votes_insert" ON public.poll_votes;
CREATE POLICY "votes_insert" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "votes_delete" ON public.poll_votes;
CREATE POLICY "votes_delete" ON public.poll_votes FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 7. USERS — allow count queries
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read_all" ON public.users;
CREATE POLICY "users_read_all" ON public.users FOR SELECT USING (true);

-- ─────────────────────────────────────────────────────────────────────────
-- 8. SITE SETTINGS — donations & other admin settings
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.site_settings (
  id    text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_read" ON public.site_settings;
CREATE POLICY "settings_read" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "settings_write" ON public.site_settings;
CREATE POLICY "settings_write" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────
-- 9. ENABLE REALTIME (safe — ignores duplicates)
-- ─────────────────────────────────────────────────────────────────────────
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;      EXCEPTION WHEN others THEN END; $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions; EXCEPTION WHEN others THEN END; $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;               EXCEPTION WHEN others THEN END; $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;        EXCEPTION WHEN others THEN END; $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;          EXCEPTION WHEN others THEN END; $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;       EXCEPTION WHEN others THEN END; $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.users;               EXCEPTION WHEN others THEN END; $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 10. STORAGE — media bucket (for notification attachments)
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media', 'media', true, 52428800,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif',
        'video/mp4','video/webm','video/ogg','video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 52428800;

DROP POLICY IF EXISTS "media_read"   ON storage.objects;
CREATE POLICY "media_read"   ON storage.objects FOR SELECT USING (bucket_id = 'media');

DROP POLICY IF EXISTS "media_insert" ON storage.objects;
CREATE POLICY "media_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "media_delete" ON storage.objects;
CREATE POLICY "media_delete" ON storage.objects FOR DELETE USING (bucket_id = 'media');

-- ─────────────────────────────────────────────────────────────────────────
-- 11. AUTH TRIGGER — Automatically copy new users to public.users
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, phone, membership_type, current_status, location, national_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NEW.raw_user_meta_data->>'membership_type', 'عضو'),
    COALESCE(NEW.raw_user_meta_data->>'current_status', 'لا شيء'),
    NEW.raw_user_meta_data->>'location',
    NEW.raw_user_meta_data->>'national_id'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    membership_type = EXCLUDED.membership_type,
    current_status = EXCLUDED.current_status,
    location = EXCLUDED.location,
    national_id = EXCLUDED.national_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
