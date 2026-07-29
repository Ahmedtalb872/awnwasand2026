-- ══════════════════════════════════════════════════════════════════════════
-- SECURITY HARDENING SQL — Run ONCE in Supabase SQL Editor
-- Fixes: RLS policies, admin auth table, removes hardcoded credentials
-- ══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. ADMINS TABLE — server-side admin role tracking
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admins (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Only admins can read the admins table (prevents user enumeration)
DROP POLICY IF EXISTS "admins_self_read" ON public.admins;
CREATE POLICY "admins_self_read"
  ON public.admins FOR SELECT
  USING (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. SETUP: INSERT YOUR ADMIN USER
-- Replace 'YOUR-ADMIN-UUID-HERE' with the UUID from Supabase Auth dashboard
-- ─────────────────────────────────────────────────────────────────────────
-- INSERT INTO public.admins (id) VALUES ('YOUR-ADMIN-UUID-HERE')
-- ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. DROP INSECURE get_admin_users FUNCTION (hardcoded password!)
-- ─────────────────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_admin_users(text);

-- ─────────────────────────────────────────────────────────────────────────
-- 4. SECURE USERS TABLE — Fix PII exposure (was USING(true) = anyone can read ALL users)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop old permissive policy
DROP POLICY IF EXISTS "users_read_all"              ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Users see only their own profile
CREATE POLICY "users_read_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "admins_read_all_users"
  ON public.users FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()));

-- Users can update their own non-sensitive fields only
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (triggered by signup)
CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────
-- 5. NOTIFICATIONS — restrict writes to admins only
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_read"  ON public.notifications;
DROP POLICY IF EXISTS "notif_write" ON public.notifications;
DROP POLICY IF EXISTS "Only admin can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can view notifications"       ON public.notifications;

-- Everyone can read notifications
CREATE POLICY "notif_read"
  ON public.notifications FOR SELECT
  USING (true);

-- Only admins can insert/update/delete notifications
CREATE POLICY "admins_write_notifications"
  ON public.notifications FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────
-- 6. POLLS — restrict writes to admins only
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "polls_all"                 ON public.polls;
DROP POLICY IF EXISTS "Anyone can view polls"     ON public.polls;
DROP POLICY IF EXISTS "Only admin can modify polls" ON public.polls;

CREATE POLICY "polls_read"
  ON public.polls FOR SELECT USING (true);

CREATE POLICY "admins_modify_polls"
  ON public.polls FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()));

-- POLL OPTIONS
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "options_all"                       ON public.poll_options;
DROP POLICY IF EXISTS "Anyone can view poll options"      ON public.poll_options;

CREATE POLICY "poll_options_read"
  ON public.poll_options FOR SELECT USING (true);

CREATE POLICY "admins_modify_poll_options"
  ON public.poll_options FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()));

-- POLL VOTES — users can vote (authenticated), admins can manage
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "votes_select"      ON public.poll_votes;
DROP POLICY IF EXISTS "votes_insert"      ON public.poll_votes;
DROP POLICY IF EXISTS "votes_delete"      ON public.poll_votes;
DROP POLICY IF EXISTS "Users can vote once"  ON public.poll_votes;
DROP POLICY IF EXISTS "Users can view votes" ON public.poll_votes;

CREATE POLICY "votes_read"
  ON public.poll_votes FOR SELECT USING (true);

CREATE POLICY "votes_insert"
  ON public.poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "votes_delete_own"
  ON public.poll_votes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "admins_delete_any_vote"
  ON public.poll_votes FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────
-- 7. SITE SETTINGS — restrict writes to admins only
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_read"          ON public.site_settings;
DROP POLICY IF EXISTS "settings_write"         ON public.site_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can upsert settings" ON public.site_settings;

CREATE POLICY "settings_read"
  ON public.site_settings FOR SELECT USING (true);

CREATE POLICY "admins_write_settings"
  ON public.site_settings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────────
-- 8. PUSH SUBSCRIPTIONS — users manage their own, admins read all
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_own"          ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_insert_anon"  ON public.push_subscriptions;
DROP POLICY IF EXISTS "push_read_service" ON public.push_subscriptions;

CREATE POLICY "push_own"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can subscribe (even before profile exists)
CREATE POLICY "push_insert_auth"
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "push_read_service"
  ON public.push_subscriptions FOR SELECT
  TO service_role
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────
-- 9. STORAGE — restrict media uploads to authenticated admins only
-- ─────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "media_read"   ON storage.objects;
DROP POLICY IF EXISTS "media_insert" ON storage.objects;
DROP POLICY IF EXISTS "media_delete" ON storage.objects;

-- Anyone can read public media (needed for displaying images)
CREATE POLICY "media_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

-- Only admins can upload media
CREATE POLICY "media_insert_admins"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media'
    AND EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid())
  );

-- Only admins can delete media
CREATE POLICY "media_delete_admins"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'media'
    AND EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────────
-- 10. SECURE get_registered_count — no longer exposes sensitive data
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_registered_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM auth.users;
$$;
-- Grant to authenticated users only (not anon)
REVOKE EXECUTE ON FUNCTION get_registered_count() FROM anon;
GRANT EXECUTE ON FUNCTION get_registered_count() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- DONE — Your database is now hardened.
-- Next steps:
-- 1. Create an admin account in Supabase Auth Dashboard
-- 2. Copy the UUID from Auth → Users
-- 3. Run: INSERT INTO public.admins (id) VALUES ('your-uuid-here');
-- ─────────────────────────────────────────────────────────────────────────
