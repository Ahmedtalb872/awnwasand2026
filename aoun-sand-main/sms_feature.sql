-- ============================================================
-- sms_feature.sql
-- Adds an audit log for bulk SMS sends (via the send-sms Edge
-- Function / Chinguisoft Campaign API). Run in Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    lang TEXT NOT NULL DEFAULT 'ar',
    url TEXT,
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
    error TEXT,
    admin_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS enabled with no public policies — this table holds member phone
-- numbers, so it's written only by the send-sms Edge Function (service
-- role, bypasses RLS) and read only via the admin_get_sms_logs RPC below.
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION admin_get_sms_logs(p_admin_id UUID)
RETURNS SETOF public.sms_logs AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN QUERY SELECT * FROM public.sms_logs ORDER BY created_at DESC LIMIT 200;
    ELSE
        RAISE EXCEPTION 'Unauthorized';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
