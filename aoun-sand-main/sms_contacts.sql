-- ============================================================
-- sms_contacts.sql
-- A persistent, admin-managed list of phone numbers for the SMS
-- feature, separate from registered members (e.g. numbers the
-- association collected outside the app). Numbers are added once,
-- kept in a table, and can be selected again on every future send
-- instead of being re-typed each time.
-- Run this in the Supabase SQL Editor (after sms_feature.sql).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sms_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    name TEXT,
    added_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS enabled with no public policies — same reasoning as sms_logs:
-- this table holds phone numbers, so it's only readable/writable
-- through the SECURITY DEFINER RPCs below, gated on admin session.
ALTER TABLE public.sms_contacts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION admin_get_sms_contacts(p_admin_id UUID)
RETURNS SETOF public.sms_contacts AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN QUERY SELECT * FROM public.sms_contacts ORDER BY created_at DESC;
    ELSE
        RAISE EXCEPTION 'Unauthorized';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk add/update contacts. p_contacts is a JSON array like
-- '[{"phone":"44800028","name":"احمد"}, {"phone":"46xxxxxx"}]'.
-- Numbers that already exist are updated (name filled in if missing)
-- instead of duplicated.
CREATE OR REPLACE FUNCTION admin_add_sms_contacts(p_admin_id UUID, p_contacts JSONB)
RETURNS JSON AS $$
DECLARE
    v_item JSONB;
    v_phone TEXT;
    v_name TEXT;
    v_count INT := 0;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_contacts)
    LOOP
        v_phone := NULLIF(trim(v_item->>'phone'), '');
        v_name := NULLIF(trim(v_item->>'name'), '');
        IF v_phone IS NOT NULL THEN
            INSERT INTO public.sms_contacts (phone, name, added_by)
            VALUES (v_phone, v_name, p_admin_id)
            ON CONFLICT (phone) DO UPDATE
              SET name = COALESCE(public.sms_contacts.name, EXCLUDED.name);
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN json_build_object('success', true, 'count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_delete_sms_contact(p_admin_id UUID, p_id UUID)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    DELETE FROM public.sms_contacts WHERE id = p_id;
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
