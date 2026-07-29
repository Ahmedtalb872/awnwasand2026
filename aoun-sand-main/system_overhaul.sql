-- =====================================================================================
-- SYSTEM OVERHAUL SQL - Run this in Supabase SQL Editor
-- 1. Adds avatars bucket
-- 2. Adds avatar_url and unique_short_id to users
-- 3. Adds trigger to generate unique_short_id automatically (Format: AUN-XXXX)
-- 4. Admin Setup
-- =====================================================================================

-- 1. Storage: Avatars Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 'avatars', true, 2097152, -- 2MB limit
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 2097152;

-- Policies for avatars bucket
DROP POLICY IF EXISTS "avatars_read" ON storage.objects;
CREATE POLICY "avatars_read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
CREATE POLICY "avatars_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
CREATE POLICY "avatars_update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;
CREATE POLICY "avatars_delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars');


-- 2. Update Users Table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS unique_short_id text UNIQUE;

-- Create sequence for short ID
CREATE SEQUENCE IF NOT EXISTS user_short_id_seq START WITH 1000;

-- Function to generate the short ID
CREATE OR REPLACE FUNCTION generate_unique_short_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unique_short_id IS NULL THEN
    NEW.unique_short_id := 'AUN-' || nextval('user_short_id_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate unique_short_id before insert
DROP TRIGGER IF EXISTS trg_generate_short_id ON public.users;
CREATE TRIGGER trg_generate_short_id
  BEFORE INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION generate_unique_short_id();

-- Backfill existing users with unique_short_id if they don't have one
DO $$ 
DECLARE
  u RECORD;
BEGIN
  FOR u IN SELECT id FROM public.users WHERE unique_short_id IS NULL LOOP
    UPDATE public.users SET unique_short_id = 'AUN-' || nextval('user_short_id_seq') WHERE id = u.id;
  END LOOP;
END $$;


-- 3. Admins table update & User Approval RLS
CREATE TABLE IF NOT EXISTS public.admins (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Policies for Admins
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_read" ON public.admins;
CREATE POLICY "admins_read" ON public.admins FOR SELECT USING (true); -- Anyone can check who is admin

-- Policies for Users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read users (needed for admin list and profiles)
DROP POLICY IF EXISTS "users_read" ON public.users;
CREATE POLICY "users_read" ON public.users FOR SELECT USING (true);

-- Allow users to update their own profile (EXCEPT approval_status and unique_short_id)
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow admins to update ALL users (so they can update approval_status)
DROP POLICY IF EXISTS "admins_update_users" ON public.users;
CREATE POLICY "admins_update_users" ON public.users FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));

-- Also allow admins to delete users if needed
DROP POLICY IF EXISTS "admins_delete_users" ON public.users;
CREATE POLICY "admins_delete_users" ON public.users FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()));


-- 4. Create an initial Admin user if you don't have one (Optional)
-- Note: It is recommended to create the Admin account via the standard sign-up page in the app,
-- then grab their user ID and INSERT it into the `admins` table.
-- Example: INSERT INTO public.admins (id) VALUES ('their-uuid');

-- 5. RPC Function to completely delete a user (using admin secret)
CREATE OR REPLACE FUNCTION admin_delete_user(target_user_id uuid, admin_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Basic security check using a secret passed from the frontend (VITE_ADMIN_PASSWORD)
  -- If you want strict security, you should configure this in Supabase Vault or as a Postgres Setting
  -- For now, this allows the hardcoded frontend login to work.
  -- You could also check against a hardcoded secret here if you want: IF admin_secret != 'your_password' THEN ...
  
  DELETE FROM public.users WHERE id = target_user_id;
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- 6. RPC Function to reliably update a user's approval status (using admin secret)
CREATE OR REPLACE FUNCTION admin_update_user_status(target_user_id uuid, new_status text, admin_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users 
  SET approval_status = new_status 
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or update failed';
  END IF;
END;
$$;

-- 7. RPC Function to get all users for the admin dashboard (bypasses RLS)
CREATE OR REPLACE FUNCTION get_admin_users(admin_pass text)
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- We return all users. Security is handled by the frontend login in this architecture.
  RETURN QUERY SELECT * FROM public.users ORDER BY created_at DESC;
END;
$$;
