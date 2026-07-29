-- ════════════════════════════════════════════════════════
-- Push Subscriptions Table — Web Push API
-- Run in Supabase SQL Editor
-- ════════════════════════════════════════════════════════

-- 1. Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL UNIQUE,
  p256dh      text NOT NULL,
  auth_key    text NOT NULL,
  user_agent  text,
  created_at  timestamptz DEFAULT now()
);

-- 2. RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_subscriptions" ON public.push_subscriptions;
CREATE POLICY "users_manage_own_subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to read all (for Edge Function)
DROP POLICY IF EXISTS "service_role_read_all" ON public.push_subscriptions;
CREATE POLICY "service_role_read_all"
  ON public.push_subscriptions FOR SELECT
  TO service_role
  USING (true);

-- 3. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id
  ON public.push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subs_endpoint
  ON public.push_subscriptions(endpoint);

-- 4. Enable Realtime (optional)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;
EXCEPTION WHEN others THEN END; $$;
