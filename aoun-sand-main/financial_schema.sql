-- =====================================================
-- الوحدة المالية - Financial Module Schema
-- قم بتشغيل هذا الملف في Supabase SQL Editor
-- =====================================================

-- 1. جدول مداخيل الانتساب (Membership Revenues)
CREATE TABLE IF NOT EXISTS membership_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_number BIGSERIAL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. جدول مداخيل التبرعات (Donation Revenues)
CREATE TABLE IF NOT EXISTS donation_revenues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  payment_method TEXT NOT NULL DEFAULT 'cash',
  donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. جدول مصاريف الانتساب (Membership Expenses)
CREATE TABLE IF NOT EXISTS membership_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  beneficiary TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. جدول مصاريف التبرعات (Donation Expenses)
CREATE TABLE IF NOT EXISTS donation_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donation_source TEXT,
  description TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  beneficiary TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Update existing tables with new columns
-- =====================================================
ALTER TABLE membership_revenues ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE donation_revenues ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE membership_expenses ADD COLUMN IF NOT EXISTS invoice_url TEXT;
ALTER TABLE donation_expenses ADD COLUMN IF NOT EXISTS invoice_url TEXT;

-- =====================================================
-- Indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_membership_revenues_date ON membership_revenues(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_membership_revenues_user ON membership_revenues(user_id);
CREATE INDEX IF NOT EXISTS idx_donation_revenues_date ON donation_revenues(donation_date DESC);
CREATE INDEX IF NOT EXISTS idx_membership_expenses_date ON membership_expenses(expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_donation_expenses_date ON donation_expenses(expense_date DESC);

-- =====================================================
-- RLS Policies (Row Level Security)
-- =====================================================

-- Enable RLS
ALTER TABLE membership_revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_expenses ENABLE ROW LEVEL SECURITY;

-- Allow admin full access (using service role / anon for admin panel)
DROP POLICY IF EXISTS "Allow all for authenticated" ON membership_revenues;
CREATE POLICY "Allow all for authenticated" ON membership_revenues
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON donation_revenues;
CREATE POLICY "Allow all for authenticated" ON donation_revenues
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON membership_expenses;
CREATE POLICY "Allow all for authenticated" ON membership_expenses
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated" ON donation_expenses;
CREATE POLICY "Allow all for authenticated" ON donation_expenses
  FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- Storage bucket for financial receipts/invoices
-- =====================================================
-- Create bucket and setup policies
INSERT INTO storage.buckets (id, name, public) VALUES ('financial-docs', 'financial-docs', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage bucket
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'financial-docs');

DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;
CREATE POLICY "Allow Uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'financial-docs');

DROP POLICY IF EXISTS "Allow Updates" ON storage.objects;
CREATE POLICY "Allow Updates" ON storage.objects FOR UPDATE USING (bucket_id = 'financial-docs');

DROP POLICY IF EXISTS "Allow Deletes" ON storage.objects;
CREATE POLICY "Allow Deletes" ON storage.objects FOR DELETE USING (bucket_id = 'financial-docs');

-- =====================================================
-- 5. جدول الإحصائيات اليومية للتبرعات (Daily Donation Stats)
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_donation_stats (
  stat_date DATE PRIMARY KEY,
  bankily_total DECIMAL(12,2) DEFAULT 0,
  masrvi_total DECIMAL(12,2) DEFAULT 0,
  sedad_total DECIMAL(12,2) DEFAULT 0,
  bim_bank_total DECIMAL(12,2) DEFAULT 0,
  click_total DECIMAL(12,2) DEFAULT 0,
  ghaza_abi_total DECIMAL(12,2) DEFAULT 0,
  other_banks_total DECIMAL(12,2) DEFAULT 0,
  total_donations DECIMAL(12,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- Triggers for Daily Donation Stats
-- =====================================================
CREATE OR REPLACE FUNCTION update_daily_donation_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_date DATE;
BEGIN
  -- Determine the date to update based on operation type
  IF TG_OP = 'DELETE' THEN
    v_date := OLD.donation_date;
  ELSE
    v_date := NEW.donation_date;
  END IF;

  -- Upsert stats for the given date
  INSERT INTO daily_donation_stats (
    stat_date, 
    bankily_total, masrvi_total, sedad_total, bim_bank_total, 
    click_total, ghaza_abi_total, other_banks_total, total_donations
  )
  SELECT 
    v_date,
    COALESCE(SUM(amount) FILTER (WHERE payment_method = 'بنكيلي'), 0),
    COALESCE(SUM(amount) FILTER (WHERE payment_method = 'مصرفي'), 0),
    COALESCE(SUM(amount) FILTER (WHERE payment_method = 'سداد'), 0),
    COALESCE(SUM(amount) FILTER (WHERE payment_method = 'بيم بنك'), 0),
    COALESCE(SUM(amount) FILTER (WHERE payment_method = 'أكليك'), 0),
    COALESCE(SUM(amount) FILTER (WHERE payment_method = 'غزة أبي'), 0),
    COALESCE(SUM(amount) FILTER (WHERE payment_method IN ('مصرفي', 'سداد', 'بيم بنك', 'أكليك', 'غزة أبي')), 0),
    COALESCE(SUM(amount), 0)
  FROM donation_revenues
  WHERE donation_date = v_date
  ON CONFLICT (stat_date) DO UPDATE SET
    bankily_total = EXCLUDED.bankily_total,
    masrvi_total = EXCLUDED.masrvi_total,
    sedad_total = EXCLUDED.sedad_total,
    bim_bank_total = EXCLUDED.bim_bank_total,
    click_total = EXCLUDED.click_total,
    ghaza_abi_total = EXCLUDED.ghaza_abi_total,
    other_banks_total = EXCLUDED.other_banks_total,
    total_donations = EXCLUDED.total_donations,
    updated_at = NOW();

  -- Also update old date if date changed on update
  IF TG_OP = 'UPDATE' AND OLD.donation_date != NEW.donation_date THEN
    INSERT INTO daily_donation_stats (
      stat_date, bankily_total, masrvi_total, sedad_total, bim_bank_total, 
      click_total, ghaza_abi_total, other_banks_total, total_donations
    )
    SELECT 
      OLD.donation_date,
      COALESCE(SUM(amount) FILTER (WHERE payment_method = 'بنكيلي'), 0),
      COALESCE(SUM(amount) FILTER (WHERE payment_method = 'مصرفي'), 0),
      COALESCE(SUM(amount) FILTER (WHERE payment_method = 'سداد'), 0),
      COALESCE(SUM(amount) FILTER (WHERE payment_method = 'بيم بنك'), 0),
      COALESCE(SUM(amount) FILTER (WHERE payment_method = 'أكليك'), 0),
      COALESCE(SUM(amount) FILTER (WHERE payment_method = 'غزة أبي'), 0),
      COALESCE(SUM(amount) FILTER (WHERE payment_method IN ('مصرفي', 'سداد', 'بيم بنك', 'أكليك', 'غزة أبي')), 0),
      COALESCE(SUM(amount), 0)
    FROM donation_revenues
    WHERE donation_date = OLD.donation_date
    ON CONFLICT (stat_date) DO UPDATE SET
      bankily_total = EXCLUDED.bankily_total,
      masrvi_total = EXCLUDED.masrvi_total,
      sedad_total = EXCLUDED.sedad_total,
      bim_bank_total = EXCLUDED.bim_bank_total,
      click_total = EXCLUDED.click_total,
      ghaza_abi_total = EXCLUDED.ghaza_abi_total,
      other_banks_total = EXCLUDED.other_banks_total,
      total_donations = EXCLUDED.total_donations,
      updated_at = NOW();
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_daily_stats ON donation_revenues;
CREATE TRIGGER trigger_update_daily_stats
AFTER INSERT OR UPDATE OR DELETE ON donation_revenues
FOR EACH ROW EXECUTE FUNCTION update_daily_donation_stats();

