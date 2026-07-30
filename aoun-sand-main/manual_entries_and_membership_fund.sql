-- ============================================================
-- manual_entries_and_membership_fund.sql
-- 1. Adds a public membership fund counter (mirrors donation_category_funds)
--    that increases automatically when a membership fee is approved.
-- 2. Lets admins record a donation or membership fee manually (e.g. cash
--    given in person), either against an existing member or a free-text
--    name, immediately approved and immediately counted in the fund.
-- Run this in the Supabase SQL Editor (after donation_category_funds.sql).
-- ============================================================

-- 1. Allow manual entries without a registered account
ALTER TABLE public.user_donations ADD COLUMN IF NOT EXISTS donor_name TEXT;
ALTER TABLE public.user_memberships ADD COLUMN IF NOT EXISTS member_name TEXT;

-- 2. Public membership fund counter (single running total)
CREATE TABLE IF NOT EXISTS public.membership_fund (
    key TEXT PRIMARY KEY DEFAULT 'total',
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.membership_fund (key, total_amount) VALUES ('total', 0)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.membership_fund ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read membership fund" ON public.membership_fund;
CREATE POLICY "Anyone can read membership fund"
  ON public.membership_fund FOR SELECT USING (true);
-- No INSERT/UPDATE/DELETE policy for regular users — writes only happen
-- through the SECURITY DEFINER RPCs below.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'membership_fund'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.membership_fund;
  END IF;
END;
$$;

-- 3. Replace admin_update_membership_status so approving/un-approving a
--    membership fee keeps the membership fund total in sync (same
--    signature, existing frontend calls keep working unchanged).
CREATE OR REPLACE FUNCTION admin_update_membership_status(
    p_admin_id UUID,
    p_membership_id UUID,
    p_status TEXT
)
RETURNS JSON AS $$
DECLARE
    v_old_status TEXT;
    v_amount NUMERIC;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    SELECT status, amount INTO v_old_status, v_amount
    FROM public.user_memberships WHERE id = p_membership_id;

    IF v_old_status IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Membership not found');
    END IF;

    UPDATE public.user_memberships
    SET status = p_status,
        updated_at = NOW()
    WHERE id = p_membership_id;

    IF p_status = 'approved' AND v_old_status IS DISTINCT FROM 'approved' THEN
        UPDATE public.membership_fund
        SET total_amount = total_amount + v_amount, updated_at = NOW()
        WHERE key = 'total';
    ELSIF p_status IS DISTINCT FROM 'approved' AND v_old_status = 'approved' THEN
        UPDATE public.membership_fund
        SET total_amount = GREATEST(0, total_amount - v_amount), updated_at = NOW()
        WHERE key = 'total';
    END IF;

    RETURN json_build_object('success', true, 'message', 'Status updated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Admin manually records a donation (already-received, e.g. cash) —
--    either against an existing member (p_user_id) or a free-text name
--    (p_donor_name) for someone without an account. Inserted as already
--    'approved' and counted in donation_category_funds immediately.
CREATE OR REPLACE FUNCTION admin_add_donation(
    p_admin_id UUID,
    p_user_id UUID,
    p_donor_name TEXT,
    p_amount NUMERIC,
    p_category TEXT,
    p_notes TEXT
)
RETURNS JSON AS $$
DECLARE
    v_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN json_build_object('success', false, 'message', 'Invalid amount');
    END IF;

    INSERT INTO public.user_donations (user_id, donor_name, amount, category, notes, status)
    VALUES (p_user_id, p_donor_name, p_amount, p_category, p_notes, 'approved')
    RETURNING id INTO v_id;

    IF p_category IS NOT NULL THEN
        INSERT INTO public.donation_category_funds (category, total_amount)
        VALUES (p_category, p_amount)
        ON CONFLICT (category) DO UPDATE
          SET total_amount = public.donation_category_funds.total_amount + p_amount,
              updated_at = NOW();
    END IF;

    RETURN json_build_object('success', true, 'id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Admin manually records a membership fee payment — same idea as #4.
CREATE OR REPLACE FUNCTION admin_add_membership(
    p_admin_id UUID,
    p_user_id UUID,
    p_member_name TEXT,
    p_amount NUMERIC,
    p_notes TEXT
)
RETURNS JSON AS $$
DECLARE
    v_id UUID;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RETURN json_build_object('success', false, 'message', 'Invalid amount');
    END IF;

    INSERT INTO public.user_memberships (user_id, member_name, amount, notes, status)
    VALUES (p_user_id, p_member_name, p_amount, p_notes, 'approved')
    RETURNING id INTO v_id;

    UPDATE public.membership_fund
    SET total_amount = total_amount + p_amount, updated_at = NOW()
    WHERE key = 'total';

    RETURN json_build_object('success', true, 'id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
