-- ══════════════════════════════════════════════════════════════════════════
-- USER APPROVAL SYSTEM SETUP SQL
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ══════════════════════════════════════════════════════════════════════════

-- 0. CREATE ADMINS TABLE IF NOT EXISTS (to avoid relation missing errors)
CREATE TABLE IF NOT EXISTS public.admins (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now()
);

-- Enable RLS for admins table
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Only admins can read the admins table (prevents user enumeration)
DROP POLICY IF EXISTS "admins_self_read" ON public.admins;
CREATE POLICY "admins_self_read"
  ON public.admins FOR SELECT
  USING (auth.uid() = id);

-- 1. ADD COLUMN FOR APPROVAL STATUS (defaults to 'Pending Approval')
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'Pending Approval';

-- 2. ENFORCE VALID VALUES
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS valid_approval_status,
ADD CONSTRAINT valid_approval_status CHECK (approval_status IN ('Pending Approval', 'Approved', 'Rejected', 'Suspended'));

-- 3. MIGRATE EXISTING USERS TO 'Approved' SO NOBODY IS ACCIDENTALLY LOCKED OUT
UPDATE public.users 
SET approval_status = 'Approved' 
WHERE approval_status IS NULL OR approval_status = '';

-- Ensure admin users are always Approved
UPDATE public.users 
SET approval_status = 'Approved' 
WHERE id IN (SELECT id FROM public.admins);

-- 4. TRIGGER: PREVENT NON-ADMINS FROM SETTING STATUS OTHER THAN 'Pending Approval' ON INSERT
CREATE OR REPLACE FUNCTION check_user_status_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- For non-admins, force the status to 'Pending Approval'
  IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()) THEN
    NEW.approval_status := 'Pending Approval';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_user_status_insert ON public.users;
CREATE TRIGGER tr_check_user_status_insert
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION check_user_status_insert();

-- 5. TRIGGER: PREVENT NON-ADMINS FROM CHANGING THE STATUS ON UPDATE
CREATE OR REPLACE FUNCTION check_user_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is changing, check if the actor is an admin
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()) THEN
      -- If not admin, revert the status change to its old value
      NEW.approval_status := OLD.approval_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_user_status_update ON public.users;
CREATE TRIGGER tr_check_user_status_update
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION check_user_status_update();

-- 6. POLICY SECURITY: ENSURE POLICIES PERMIT ADMIN UPDATES AND PRESERVE REGULAR UPDATES
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "admins_update_all_users" ON public.users;

-- Regular users can update their own profile fields (triggers will block status updates)
CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any user's profile
CREATE POLICY "admins_update_all_users"
  ON public.users FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.id = auth.uid()));

-- Done!
