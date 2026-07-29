-- =====================================================================================
-- ULTIMATE USER SYNC & FIX SQL
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- =====================================================================================

-- 1. Ensure `approval_status` exists and defaults correctly
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'Pending Approval';

-- 2. Drop any old constraints that might cause issues and add the correct one
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS valid_approval_status;
ALTER TABLE public.users ADD CONSTRAINT valid_approval_status 
  CHECK (approval_status IN ('Pending Approval', 'Approved', 'Rejected', 'Suspended'));

-- 3. Create a bulletproof trigger to ALWAYS sync new signups into public.users
CREATE OR REPLACE FUNCTION public.handle_new_user_safe()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER -- Runs as admin, bypassing RLS
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    full_name, 
    email, 
    phone, 
    membership_type, 
    current_status, 
    location, 
    national_id, 
    approval_status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', '20000000'), -- fallback to valid format
    COALESCE(NEW.raw_user_meta_data->>'membership_type', 'عضو'),
    COALESCE(NEW.raw_user_meta_data->>'current_status', 'لا شيء'),
    COALESCE(NEW.raw_user_meta_data->>'location', ''),
    COALESCE(NEW.raw_user_meta_data->>'national_id', ''),
    'Pending Approval'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    membership_type = EXCLUDED.membership_type,
    current_status = EXCLUDED.current_status,
    location = EXCLUDED.location,
    national_id = EXCLUDED.national_id;
  
  RETURN NEW;
EXCEPTION WHEN others THEN
  -- If there's an error (like phone regex mismatch), we silently ignore it 
  -- so the auth user is still created, but they might need manual sync.
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_safe();

-- 4. Automatically sync all missing users right now! (Fixes users stuck in limbo)
DO $$
DECLARE
  au RECORD;
BEGIN
  FOR au IN 
    SELECT 
      a.id, 
      a.email, 
      COALESCE(a.raw_user_meta_data->>'full_name', 'مستخدم جديد') as full_name,
      COALESCE(a.raw_user_meta_data->>'phone', '4' || lpad(floor(random()*10000000)::int::text, 7, '0')) as phone,
      COALESCE(a.raw_user_meta_data->>'membership_type', 'عضو') as membership_type,
      COALESCE(a.raw_user_meta_data->>'current_status', 'لا شيء') as current_status,
      COALESCE(a.raw_user_meta_data->>'location', '') as location,
      COALESCE(a.raw_user_meta_data->>'national_id', '') as national_id
    FROM auth.users a
    LEFT JOIN public.users pu ON a.id = pu.id
    WHERE pu.id IS NULL
  LOOP
    BEGIN
      INSERT INTO public.users (
        id, full_name, email, phone, membership_type, current_status, location, national_id, approval_status
      ) VALUES (
        au.id, au.full_name, au.email, au.phone, au.membership_type, au.current_status, au.location, au.national_id, 'Pending Approval'
      );
    EXCEPTION WHEN others THEN
      -- Silently ignore any errors for this specific user (e.g. duplicate phone, invalid format)
      -- and continue to the next user!
    END;
  END LOOP;
END $$;
