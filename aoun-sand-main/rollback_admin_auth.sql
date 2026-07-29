-- ══════════════════════════════════════════════════════════════════════════
-- FULL ROLLBACK OF ADMIN AUTHENTICATION AND SECURITY HARDENING
-- Run this ONCE in Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════

-- 1. Drop the admins table and its policies (this was blocking access)
DROP TABLE IF EXISTS public.admins CASCADE;

-- 2. Restore USERS table policies (Allow all to read)
DROP POLICY IF EXISTS "users_read_own" ON public.users;
DROP POLICY IF EXISTS "admins_read_all_users" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "users_read_all" ON public.users;

CREATE POLICY "users_read_all" ON public.users FOR SELECT USING (true);

-- 3. Restore NOTIFICATIONS table policies
DROP POLICY IF EXISTS "admins_write_notifications" ON public.notifications;
DROP POLICY IF EXISTS "notif_read" ON public.notifications;
DROP POLICY IF EXISTS "notif_write" ON public.notifications;
DROP POLICY IF EXISTS "Only admin can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Anyone can view notifications" ON public.notifications;

CREATE POLICY "notif_read" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "notif_write" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- 4. Restore POLLS table policies
DROP POLICY IF EXISTS "admins_modify_polls" ON public.polls;
DROP POLICY IF EXISTS "polls_read" ON public.polls;
DROP POLICY IF EXISTS "polls_all" ON public.polls;

CREATE POLICY "polls_all" ON public.polls FOR ALL USING (true) WITH CHECK (true);

-- 5. Restore POLL_OPTIONS policies
DROP POLICY IF EXISTS "admins_modify_poll_options" ON public.poll_options;
DROP POLICY IF EXISTS "poll_options_read" ON public.poll_options;
DROP POLICY IF EXISTS "options_all" ON public.poll_options;

CREATE POLICY "options_all" ON public.poll_options FOR ALL USING (true) WITH CHECK (true);

-- 6. Restore POLL_VOTES policies
DROP POLICY IF EXISTS "admins_delete_any_vote" ON public.poll_votes;
DROP POLICY IF EXISTS "votes_delete_own" ON public.poll_votes;
DROP POLICY IF EXISTS "votes_read" ON public.poll_votes;
DROP POLICY IF EXISTS "votes_insert" ON public.poll_votes;
DROP POLICY IF EXISTS "votes_select" ON public.poll_votes;
DROP POLICY IF EXISTS "votes_delete" ON public.poll_votes;

CREATE POLICY "votes_select" ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY "votes_insert" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_delete" ON public.poll_votes FOR DELETE USING (auth.uid() = user_id);

-- 7. Restore SITE_SETTINGS policies
DROP POLICY IF EXISTS "admins_write_settings" ON public.site_settings;
DROP POLICY IF EXISTS "settings_read" ON public.site_settings;
DROP POLICY IF EXISTS "settings_write" ON public.site_settings;

CREATE POLICY "settings_read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "settings_write" ON public.site_settings FOR ALL USING (true) WITH CHECK (true);

-- 8. Restore STORAGE.OBJECTS policies (media bucket)
DROP POLICY IF EXISTS "media_insert_admins" ON storage.objects;
DROP POLICY IF EXISTS "media_delete_admins" ON storage.objects;
DROP POLICY IF EXISTS "media_read" ON storage.objects;
DROP POLICY IF EXISTS "media_insert" ON storage.objects;
DROP POLICY IF EXISTS "media_delete" ON storage.objects;

CREATE POLICY "media_read" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "media_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
CREATE POLICY "media_delete" ON storage.objects FOR DELETE USING (bucket_id = 'media');

-- 9. Restore PUSH_SUBSCRIPTIONS policies
DROP POLICY IF EXISTS "push_insert_auth" ON public.push_subscriptions;

-- 10. Restore get_registered_count RPC (Allow anon)
CREATE OR REPLACE FUNCTION get_registered_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM auth.users;
$$;
GRANT EXECUTE ON FUNCTION get_registered_count() TO anon, authenticated;

-- 11. Restore get_admin_users RPC (Since frontend relies on it optionally)
CREATE OR REPLACE FUNCTION public.get_admin_users(admin_pass text)
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF admin_pass = 'Awn&Sanad#2025' THEN
    RETURN QUERY SELECT * FROM public.users;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_admin_users(text) TO anon, authenticated;

-- 12. Revert auth.users trigger (handle_new_user) to the original simple version without EXCEPTION swallowing
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
