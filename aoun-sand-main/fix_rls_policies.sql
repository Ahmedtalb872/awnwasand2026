-- =====================================================
-- إصلاح سياسات RLS لتعمل مع anon key (لوحة التحكم)
-- Fix RLS Policies to allow anon access (Admin Panel)
-- قم بتشغيل هذا الملف في Supabase SQL Editor
-- =====================================================

-- 1. مداخيل الانتساب - Membership Revenues
ALTER TABLE membership_revenues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON membership_revenues;
DROP POLICY IF EXISTS "Allow anon full access" ON membership_revenues;
DROP POLICY IF EXISTS "public_all" ON membership_revenues;

CREATE POLICY "public_all" ON membership_revenues
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 2. مداخيل التبرعات - Donation Revenues
ALTER TABLE donation_revenues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON donation_revenues;
DROP POLICY IF EXISTS "Allow anon full access" ON donation_revenues;
DROP POLICY IF EXISTS "public_all" ON donation_revenues;

CREATE POLICY "public_all" ON donation_revenues
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 3. مصاريف الانتساب - Membership Expenses
ALTER TABLE membership_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON membership_expenses;
DROP POLICY IF EXISTS "Allow anon full access" ON membership_expenses;
DROP POLICY IF EXISTS "public_all" ON membership_expenses;

CREATE POLICY "public_all" ON membership_expenses
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 4. مصاريف التبرعات - Donation Expenses
ALTER TABLE donation_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON donation_expenses;
DROP POLICY IF EXISTS "Allow anon full access" ON donation_expenses;
DROP POLICY IF EXISTS "public_all" ON donation_expenses;

CREATE POLICY "public_all" ON donation_expenses
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 5. الإحصائيات اليومية - Daily Donation Stats
ALTER TABLE daily_donation_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_all" ON daily_donation_stats;

CREATE POLICY "public_all" ON daily_donation_stats
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Storage bucket policies (financial-docs)
INSERT INTO storage.buckets (id, name, public) 
  VALUES ('financial-docs', 'financial-docs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow Updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow Deletes" ON storage.objects;

CREATE POLICY "Public Access" ON storage.objects 
  FOR SELECT TO anon, authenticated USING (bucket_id = 'financial-docs');

CREATE POLICY "Allow Uploads" ON storage.objects 
  FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'financial-docs');

CREATE POLICY "Allow Updates" ON storage.objects 
  FOR UPDATE TO anon, authenticated USING (bucket_id = 'financial-docs');

CREATE POLICY "Allow Deletes" ON storage.objects 
  FOR DELETE TO anon, authenticated USING (bucket_id = 'financial-docs');

-- =====================================================
-- إضافة عمود الرابط لجدول مصاريف التبرعات
-- Add link_url column to donation_expenses table
-- =====================================================
ALTER TABLE donation_expenses ADD COLUMN IF NOT EXISTS link_url TEXT;

-- Done! ✓
SELECT 'تم إصلاح سياسات RLS وإضافة عمود الرابط بنجاح ✓' AS result;
