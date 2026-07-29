-- ==========================================
-- SCRIPT TO FIX THE ADMIN APPROVAL ISSUE
-- Run this in your Supabase SQL Editor
-- ==========================================

-- 1. Update the Trigger Function to allow the RPC to bypass the admin check
CREATE OR REPLACE FUNCTION check_user_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is changing
  IF NEW.approval_status IS DISTINCT FROM OLD.approval_status THEN
    
    -- Check if it's bypassed via our RPC
    IF current_setting('app.bypass_admin_check', true) = 'true' THEN
      RETURN NEW;
    END IF;

    -- Otherwise, check if the actor is an actual admin in the admins table
    IF NOT EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid()) THEN
      -- If not admin, revert the status change to its old value
      NEW.approval_status := OLD.approval_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update the RPC Function to set the bypass flag before updating
CREATE OR REPLACE FUNCTION admin_update_user_status(target_user_id uuid, new_status text, admin_secret text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set a local variable for this transaction so the trigger knows we are updating via the Admin RPC
  PERFORM set_config('app.bypass_admin_check', 'true', true);

  UPDATE public.users 
  SET approval_status = new_status 
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found or update failed';
  END IF;
END;
$$;
