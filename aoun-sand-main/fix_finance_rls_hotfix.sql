-- ══════════════════════════════════════════════════════════════════════════
-- HOTFIX: Restore Finance Table RLS Policies
-- Run this in Supabase SQL Editor to restore financial data access
-- ══════════════════════════════════════════════════════════════════════════

-- 1. membership_revenues
DROP POLICY IF EXISTS "finance_read"  ON public.membership_revenues;
DROP POLICY IF EXISTS "finance_write" ON public.membership_revenues;
DROP POLICY IF EXISTS "public_all"    ON public.membership_revenues;

CREATE POLICY "public_all" ON public.membership_revenues
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 2. donation_revenues
DROP POLICY IF EXISTS "finance_read"  ON public.donation_revenues;
DROP POLICY IF EXISTS "finance_write" ON public.donation_revenues;
DROP POLICY IF EXISTS "public_all"    ON public.donation_revenues;

CREATE POLICY "public_all" ON public.donation_revenues
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. membership_expenses
DROP POLICY IF EXISTS "finance_read"  ON public.membership_expenses;
DROP POLICY IF EXISTS "finance_write" ON public.membership_expenses;
DROP POLICY IF EXISTS "public_all"    ON public.membership_expenses;

CREATE POLICY "public_all" ON public.membership_expenses
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. donation_expenses
DROP POLICY IF EXISTS "finance_read"  ON public.donation_expenses;
DROP POLICY IF EXISTS "finance_write" ON public.donation_expenses;
DROP POLICY IF EXISTS "public_all"    ON public.donation_expenses;

CREATE POLICY "public_all" ON public.donation_expenses
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. daily_donation_stats
DROP POLICY IF EXISTS "stats_read"  ON public.daily_donation_stats;
DROP POLICY IF EXISTS "stats_write" ON public.daily_donation_stats;
DROP POLICY IF EXISTS "public_all"  ON public.daily_donation_stats;

CREATE POLICY "public_all" ON public.daily_donation_stats
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 6. storage.objects - financial-docs bucket
DROP POLICY IF EXISTS "financial_read"   ON storage.objects;
DROP POLICY IF EXISTS "financial_insert" ON storage.objects;
DROP POLICY IF EXISTS "financial_update" ON storage.objects;
DROP POLICY IF EXISTS "financial_delete" ON storage.objects;
DROP POLICY IF EXISTS "Public Access"    ON storage.objects;
DROP POLICY IF EXISTS "Allow Uploads"    ON storage.objects;
DROP POLICY IF EXISTS "Allow Updates"    ON storage.objects;
DROP POLICY IF EXISTS "Allow Deletes"    ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'financial-docs');

CREATE POLICY "Allow Uploads" ON storage.objects
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'financial-docs');

CREATE POLICY "Allow Updates" ON storage.objects
  FOR UPDATE TO anon, authenticated USING (bucket_id = 'financial-docs');

CREATE POLICY "Allow Deletes" ON storage.objects
  FOR DELETE TO anon, authenticated USING (bucket_id = 'financial-docs');

-- Done!
SELECT 'Finance policies restored successfully ✓' AS result;
