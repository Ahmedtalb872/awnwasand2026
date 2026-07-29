-- =====================================================================================
-- FIX SEQUENCE PERMISSION ERROR
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- =====================================================================================

-- Problem: The insert/upsert fails silently when a new user registers because the
-- trigger `generate_unique_short_id` uses `nextval('user_short_id_seq')`, but the
-- `authenticated` role doesn't have permission to use that sequence.
-- This causes the entire user row creation to fail and rollback.

-- Fix 1: Grant usage on the sequence to the authenticated role
GRANT USAGE ON SEQUENCE public.user_short_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE public.user_short_id_seq TO anon;

-- Fix 2: Alternatively, make the trigger function run as the database owner (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.generate_unique_short_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unique_short_id IS NULL THEN
    NEW.unique_short_id := 'AUN-' || nextval('user_short_id_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
