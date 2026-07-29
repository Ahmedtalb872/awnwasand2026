-- =====================================================================================
-- FIX MISSING INSERT POLICY SQL
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- =====================================================================================

-- This policy allows users to create their own record in the public.users table 
-- when they first register. Without this, the insert fails silently and the user
-- never appears in the admin dashboard.

CREATE POLICY "users_insert_own" ON public.users 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Note: Security is still maintained because the existing trigger 
-- "tr_check_user_status_insert" will automatically force their 
-- approval_status to 'Pending Approval', regardless of what they try to insert.
