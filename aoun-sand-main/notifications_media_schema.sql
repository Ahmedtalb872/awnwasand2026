-- ══════════════════════════════════════════════════════
-- Notifications Table — ensure media_url column exists
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════════════

-- 1. Ensure notifications table exists with all needed columns
CREATE TABLE IF NOT EXISTS public.notifications (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title        text NOT NULL,
  message      text NOT NULL,
  link         text,
  media_url    text,
  scheduled_at timestamptz,
  created_at   timestamptz DEFAULT now()
);

-- 2. Add missing columns if table already exists
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS media_url    text,
  ADD COLUMN IF NOT EXISTS link         text,
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

-- 3. Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Allow everyone to READ notifications
DROP POLICY IF EXISTS "notifications_read_all" ON public.notifications;
CREATE POLICY "notifications_read_all"
  ON public.notifications FOR SELECT
  USING (true);

-- 5. Allow insert/update/delete (admin panel)
DROP POLICY IF EXISTS "notifications_write_anon" ON public.notifications;
CREATE POLICY "notifications_write_anon"
  ON public.notifications FOR ALL
  USING (true)
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════
-- Enable Realtime safely (skip if already added)
-- ══════════════════════════════════════════════════════
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN others THEN
  -- already a member, skip silently
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
EXCEPTION WHEN others THEN END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
EXCEPTION WHEN others THEN END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;
EXCEPTION WHEN others THEN END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
EXCEPTION WHEN others THEN END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
EXCEPTION WHEN others THEN END;
$$;

-- ══════════════════════════════════════════════════════
-- Supabase Storage — ensure "media" bucket is public
-- ══════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','image/avif',
        'video/mp4','video/webm','video/ogg','video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Storage policies
DROP POLICY IF EXISTS "media_upload_anon" ON storage.objects;
CREATE POLICY "media_upload_anon"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "media_upload_auth" ON storage.objects;
CREATE POLICY "media_upload_auth"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media');

DROP POLICY IF EXISTS "media_read_public" ON storage.objects;
CREATE POLICY "media_read_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

DROP POLICY IF EXISTS "media_delete_auth" ON storage.objects;
CREATE POLICY "media_delete_auth"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'media');
