-- ============================================================
-- sms_contacts_sent_status.sql
-- Tracks, per saved contact, whether a reminder SMS has actually
-- been delivered to them — separate from the manual "paid" flag.
-- A contact is marked sent automatically once a send to their
-- number comes back as "sent" from Chinguisoft, and sent contacts
-- are then excluded from future sends (same exclusion pattern as
-- "paid"), so the same reminder is never sent to them twice.
-- Run this in the Supabase SQL Editor (after sms_contacts.sql).
-- ============================================================

ALTER TABLE public.sms_contacts ADD COLUMN IF NOT EXISTS sent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.sms_contacts ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Bulk-marks contacts as sent by phone number (called right after a
-- send completes, with the list of phones that actually succeeded).
CREATE OR REPLACE FUNCTION admin_mark_sms_contacts_sent(p_admin_id UUID, p_phones TEXT[])
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    UPDATE public.sms_contacts
    SET sent = true, sent_at = NOW()
    WHERE phone = ANY(p_phones);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lets an admin manually flip the sent status back (e.g. to
-- deliberately allow a second reminder for one person).
CREATE OR REPLACE FUNCTION admin_set_sms_contact_sent(p_admin_id UUID, p_id UUID, p_sent BOOLEAN)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    UPDATE public.sms_contacts
    SET sent = p_sent, sent_at = CASE WHEN p_sent THEN NOW() ELSE NULL END
    WHERE id = p_id;

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
