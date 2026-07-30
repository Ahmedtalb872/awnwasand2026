-- ============================================================
-- donation_category_funds.sql
-- Adds a per-category donation counter that increases automatically
-- when an admin approves a user donation (public.user_donations).
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Track which cause a donation was made for
ALTER TABLE public.user_donations ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Public fund counter per category
CREATE TABLE IF NOT EXISTS public.donation_category_funds (
    category TEXT PRIMARY KEY,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.donation_category_funds (category, total_amount) VALUES
    ('water', 0), ('fasting', 0), ('poor', 0), ('orphan', 0),
    ('education', 0), ('patient', 0), ('mahaja', 0), ('other', 0)
ON CONFLICT (category) DO NOTHING;

ALTER TABLE public.donation_category_funds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read donation category funds" ON public.donation_category_funds;
CREATE POLICY "Anyone can read donation category funds"
  ON public.donation_category_funds FOR SELECT USING (true);
-- No INSERT/UPDATE/DELETE policy for regular users — writes only happen
-- through the SECURITY DEFINER RPC below.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'donation_category_funds'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.donation_category_funds;
  END IF;
END;
$$;

-- 3. Replace admin_update_donation_status so approving/un-approving a
--    donation keeps the category fund total in sync (same signature,
--    existing frontend calls keep working unchanged).
CREATE OR REPLACE FUNCTION admin_update_donation_status(
    p_admin_id UUID,
    p_donation_id UUID,
    p_status TEXT
)
RETURNS JSON AS $$
DECLARE
    v_old_status TEXT;
    v_amount NUMERIC;
    v_category TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    SELECT status, amount, category INTO v_old_status, v_amount, v_category
    FROM public.user_donations WHERE id = p_donation_id;

    IF v_old_status IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Donation not found');
    END IF;

    UPDATE public.user_donations
    SET status = p_status,
        updated_at = NOW()
    WHERE id = p_donation_id;

    IF v_category IS NOT NULL THEN
        IF p_status = 'approved' AND v_old_status IS DISTINCT FROM 'approved' THEN
            INSERT INTO public.donation_category_funds (category, total_amount)
            VALUES (v_category, v_amount)
            ON CONFLICT (category) DO UPDATE
              SET total_amount = public.donation_category_funds.total_amount + v_amount,
                  updated_at = NOW();
        ELSIF p_status IS DISTINCT FROM 'approved' AND v_old_status = 'approved' THEN
            UPDATE public.donation_category_funds
            SET total_amount = GREATEST(0, total_amount - v_amount), updated_at = NOW()
            WHERE category = v_category;
        END IF;
    END IF;

    RETURN json_build_object('success', true, 'message', 'Status updated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
