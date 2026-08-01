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

CREATE OR REPLACE FUNCTION admin_add_association_members(p_admin_id UUID, p_members JSON)
RETURNS JSON AS $$
DECLARE
    v_count INT := 0;
    v_member JSON;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    FOR v_member IN SELECT * FROM json_array_elements(p_members)
    LOOP
        INSERT INTO public.association_members (phone, name, added_by)
        VALUES (v_member->>'phone', v_member->>'name', p_admin_id)
        ON CONFLICT (phone) DO UPDATE
            SET name = COALESCE(EXCLUDED.name, public.association_members.name);
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

CREATE OR REPLACE FUNCTION admin_set_association_member_paid(p_admin_id UUID, p_id UUID, p_paid BOOLEAN)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;
    UPDATE public.association_members SET paid = p_paid WHERE id = p_id;
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
