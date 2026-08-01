-- انتساب أعضاء الجمعية (Association Members' Membership roster)
-- Run this in the Supabase SQL Editor (same convention as the other *.sql files in this repo).

CREATE TABLE IF NOT EXISTS public.association_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    name TEXT,
    paid BOOLEAN NOT NULL DEFAULT false,
    receipt_received BOOLEAN NOT NULL DEFAULT false,
    added_by UUID REFERENCES public.system_admins(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Which fee-collection month a member's current "paid" status belongs to
-- (e.g. '2026-07'), so the roster can be reset for a new month without
-- losing track of what the last payment was for.
ALTER TABLE public.association_members ADD COLUMN IF NOT EXISTS fee_month TEXT;

ALTER TABLE public.association_members ENABLE ROW LEVEL SECURITY;
-- No public policies: all access goes through the SECURITY DEFINER RPCs below.

CREATE OR REPLACE FUNCTION admin_get_association_members(p_admin_id UUID)
RETURNS SETOF public.association_members AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN;
    END IF;
    RETURN QUERY SELECT * FROM public.association_members ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_add_association_members(p_admin_id UUID, p_members JSON, p_fee_month TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_count INT := 0;
    v_member JSON;
    v_paid BOOLEAN;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    FOR v_member IN SELECT * FROM json_array_elements(p_members)
    LOOP
        v_paid := COALESCE((v_member->>'paid')::boolean, false);
        INSERT INTO public.association_members (phone, name, paid, fee_month, added_by)
        VALUES (v_member->>'phone', v_member->>'name', v_paid, CASE WHEN v_paid THEN p_fee_month ELSE NULL END, p_admin_id)
        ON CONFLICT (phone) DO UPDATE
            SET name = COALESCE(EXCLUDED.name, public.association_members.name),
                paid = public.association_members.paid OR EXCLUDED.paid,
                fee_month = CASE WHEN EXCLUDED.paid THEN COALESCE(EXCLUDED.fee_month, public.association_members.fee_month) ELSE public.association_members.fee_month END;
        v_count := v_count + 1;
    END LOOP;

    RETURN json_build_object('success', true, 'count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_delete_association_member(p_admin_id UUID, p_id UUID)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;
    DELETE FROM public.association_members WHERE id = p_id;
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_set_association_member_paid(p_admin_id UUID, p_id UUID, p_paid BOOLEAN, p_fee_month TEXT DEFAULT NULL)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;
    UPDATE public.association_members
    SET paid = p_paid,
        fee_month = CASE WHEN p_paid THEN COALESCE(p_fee_month, fee_month) ELSE fee_month END
    WHERE id = p_id;
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk-set paid status for a set of members at once (multi-select actions in the admin tab).
CREATE OR REPLACE FUNCTION admin_set_association_members_paid_bulk(p_admin_id UUID, p_ids UUID[], p_paid BOOLEAN, p_fee_month TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
    v_count INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;
    UPDATE public.association_members
    SET paid = p_paid,
        fee_month = CASE WHEN p_paid THEN COALESCE(p_fee_month, fee_month) ELSE fee_month END
    WHERE id = ANY(p_ids);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN json_build_object('success', true, 'count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resets every member to "unpaid" — used to start a new month's fee-collection cycle.
CREATE OR REPLACE FUNCTION admin_reset_association_members_paid(p_admin_id UUID)
RETURNS JSON AS $$
DECLARE
    v_count INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;
    UPDATE public.association_members SET paid = false WHERE paid = true;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN json_build_object('success', true, 'count', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_update_association_member(p_admin_id UUID, p_id UUID, p_name TEXT, p_phone TEXT)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;
    IF p_phone IS NULL OR btrim(p_phone) = '' THEN
        RETURN json_build_object('success', false, 'message', 'Phone is required');
    END IF;
    IF EXISTS (SELECT 1 FROM public.association_members WHERE phone = p_phone AND id <> p_id) THEN
        RETURN json_build_object('success', false, 'message', 'Phone already used by another member');
    END IF;
    UPDATE public.association_members SET name = NULLIF(btrim(p_name), ''), phone = p_phone WHERE id = p_id;
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_set_association_member_receipt(p_admin_id UUID, p_id UUID, p_received BOOLEAN)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;
    UPDATE public.association_members SET receipt_received = p_received WHERE id = p_id;
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
