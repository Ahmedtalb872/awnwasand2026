-- ============================================================
-- site_settings_schema.sql - Full setup for aoun-sand
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create table
CREATE TABLE IF NOT EXISTS public.site_settings (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Insert default donation_section row
INSERT INTO public.site_settings (id, value)
VALUES (
  'donation_section',
  '{
    "title_ar": "\u0645\u0639\u0627\u064b \u0646\u0635\u0646\u0639 \u0627\u0644\u0623\u062b\u0631",
    "title_fr": "Ensemble, nous cr\u00e9ons l''impact",
    "title_en": "Together We Make an Impact",
    "desc_ar": "\u0628\u0641\u0636\u0644 \u0645\u0633\u0627\u0647\u0645\u0627\u062a\u0643\u0645 \u0646\u0633\u062a\u0645\u0631 \u0641\u064a \u062e\u062f\u0645\u0629 \u0627\u0644\u0645\u062c\u062a\u0645\u0639 \u0648\u062a\u062d\u0642\u064a\u0642 \u0627\u0644\u062a\u063a\u064a\u064a\u0631 \u0627\u0644\u0625\u064a\u062c\u0627\u0628\u064a.",
    "desc_fr": "Gr\u00e2ce \u00e0 vos contributions, nous continuons \u00e0 servir la communaut\u00e9.",
    "desc_en": "Thanks to your contributions, we continue to serve the community.",
    "total_donations": 0,
    "is_visible": true,
    "campaigns": []
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 3. Enable Row Level Security
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- 4. Drop old policies safely
DROP POLICY IF EXISTS "Anyone can read settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.site_settings;
DROP POLICY IF EXISTS "Admins can upsert settings" ON public.site_settings;

-- 5. Allow everyone to READ
CREATE POLICY "Anyone can read settings"
  ON public.site_settings FOR SELECT USING (true);

-- 6. Allow authenticated users to INSERT
CREATE POLICY "Admins can insert settings"
  ON public.site_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 7. Allow authenticated users to UPDATE
CREATE POLICY "Admins can update settings"
  ON public.site_settings FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ============================================================
-- 8. Enable Realtime SAFELY (skip if already added)
-- ============================================================
DO $$
BEGIN
  -- site_settings
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'site_settings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
  END IF;

  -- notifications
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;

  -- polls
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'polls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
  END IF;

  -- poll_options
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'poll_options'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;
  END IF;

  -- poll_votes
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'poll_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
  END IF;

  -- users
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
END;
$$;
