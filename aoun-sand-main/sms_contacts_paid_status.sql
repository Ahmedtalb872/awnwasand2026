-- ============================================================
-- sms_contacts_paid_status.sql
-- Adds a manual paid/unpaid flag to saved SMS contacts, so admins
-- can mark someone as paid after they respond to a reminder and
-- stop them from being selected in future sends — same idea as the
-- automatic exclusion already in place for registered members, but
-- manual here since these numbers aren't tied to an account.
-- Run this in the Supabase SQL Editor (after sms_contacts.sql).
-- ============================================================

ALTER TABLE public.sms_contacts ADD COLUMN IF NOT EXISTS paid BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION admin_set_sms_contact_paid(p_admin_id UUID, p_id UUID, p_paid BOOLEAN)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    UPDATE public.sms_contacts SET paid = p_paid WHERE id = p_id;
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
