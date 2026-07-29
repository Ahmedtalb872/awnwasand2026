-- =====================================================================================
-- PATIENT MANAGEMENT SYSTEM — FULL UPDATED SETUP (v2)
-- Run this ENTIRE script in your Supabase SQL Editor
-- =====================================================================================

-- 1. Create / Update Patients Table (adds new columns safely)
CREATE TABLE IF NOT EXISTS public.patients (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name       TEXT NOT NULL,
    phone           TEXT,
    age             INTEGER,
    address         TEXT,
    health_condition TEXT,
    notes           TEXT,
    status          TEXT DEFAULT 'قيد المتابعة',
    unique_id       TEXT UNIQUE,
    national_id     TEXT,
    photo_url       TEXT,
    medical_report_urls JSONB DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_patient_status CHECK (status IN ('قيد المتابعة', 'مكتمل', 'موقوف'))
);

-- Add new columns to existing table if they don't exist
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS medical_report_urls JSONB DEFAULT '[]'::jsonb;

-- 2. Auto-generate unique_id sequence
CREATE SEQUENCE IF NOT EXISTS patient_short_id_seq START WITH 1000;

GRANT USAGE ON SEQUENCE patient_short_id_seq TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.generate_patient_unique_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.unique_id IS NULL OR NEW.unique_id = '' THEN
    NEW.unique_id := 'PAT-' || nextval('patient_short_id_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_generate_patient_id ON public.patients;
CREATE TRIGGER trg_generate_patient_id
  BEFORE INSERT ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.generate_patient_unique_id();

-- 3. Create Patient Services Table
CREATE TABLE IF NOT EXISTS public.patient_services (
    id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id   UUID REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
    service_type TEXT NOT NULL,
    service_date DATE DEFAULT CURRENT_DATE,
    description  TEXT,
    cost         NUMERIC DEFAULT 0,
    notes        TEXT,
    created_at   TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT valid_service_type CHECK (service_type IN ('فحص', 'عملية', 'تأمين صحي', 'أخرى'))
);

-- 4. Enable Row Level Security
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_services ENABLE ROW LEVEL SECURITY;

-- 5. DROP all old policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage patients" ON public.patients;
DROP POLICY IF EXISTS "Auth users can manage patients" ON public.patients;
DROP POLICY IF EXISTS "Admins can manage patient services" ON public.patient_services;
DROP POLICY IF EXISTS "Auth users can manage patient services" ON public.patient_services;
DROP POLICY IF EXISTS "patients_all_access" ON public.patients;
DROP POLICY IF EXISTS "patient_services_all_access" ON public.patient_services;

-- 6. Create simple, permissive policies (dashboard is already protected by frontend login)
CREATE POLICY "patients_all_access"
  ON public.patients FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "patient_services_all_access"
  ON public.patient_services FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. Storage buckets for patient images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient-photos',
  'patient-photos',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp'];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-reports',
  'medical-reports',
  true,
  20971520, -- 20MB
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];

-- 8. Storage policies (allow all read/write for simplicity; admin dashboard is gated at frontend)
DROP POLICY IF EXISTS "patient_photos_read"   ON storage.objects;
DROP POLICY IF EXISTS "patient_photos_write"  ON storage.objects;
DROP POLICY IF EXISTS "medical_reports_read"  ON storage.objects;
DROP POLICY IF EXISTS "medical_reports_write" ON storage.objects;

CREATE POLICY "patient_photos_read"   ON storage.objects FOR SELECT USING (bucket_id = 'patient-photos');
CREATE POLICY "patient_photos_write"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'patient-photos');
CREATE POLICY "patient_photos_delete" ON storage.objects FOR DELETE USING (bucket_id = 'patient-photos');
CREATE POLICY "medical_reports_read"  ON storage.objects FOR SELECT USING (bucket_id = 'medical-reports');
CREATE POLICY "medical_reports_write" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'medical-reports');
CREATE POLICY "medical_reports_delete" ON storage.objects FOR DELETE USING (bucket_id = 'medical-reports');

-- 9. Enable Realtime
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.patients;         EXCEPTION WHEN others THEN END; $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.patient_services; EXCEPTION WHEN others THEN END; $$;
