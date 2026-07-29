-- =====================================================
-- Membership Cards Schema
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Create membership_cards table
CREATE TABLE IF NOT EXISTS public.membership_cards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    card_id TEXT UNIQUE NOT NULL,
    issue_date TIMESTAMPTZ DEFAULT now() NOT NULL,
    expiry_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'نشطة' NOT NULL,
    qr_code_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS
ALTER TABLE public.membership_cards ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Users can view their own card
DROP POLICY IF EXISTS "Users can view own card" ON public.membership_cards;
CREATE POLICY "Users can view own card" ON public.membership_cards 
    FOR SELECT USING (auth.uid() = user_id);

-- 4. Policy: Users can create their own card
DROP POLICY IF EXISTS "Users can create own card" ON public.membership_cards;
CREATE POLICY "Users can create own card" ON public.membership_cards 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. RPC Function: Publicly verify membership card by card_id
-- This allows anyone scanning the QR code to verify the card without exposing the whole table
CREATE OR REPLACE FUNCTION verify_membership_card(p_card_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    card_data RECORD;
    user_data RECORD;
    result JSONB;
BEGIN
    -- Get card info
    SELECT * INTO card_data FROM public.membership_cards WHERE card_id = p_card_id LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN '{"valid": false, "message": "البطاقة غير موجودة"}'::JSONB;
    END IF;

    -- Get user info
    SELECT full_name, membership_type, current_status INTO user_data FROM public.users WHERE id = card_data.user_id LIMIT 1;

    IF NOT FOUND THEN
         RETURN '{"valid": false, "message": "بيانات العضو غير موجودة"}'::JSONB;
    END IF;

    result := jsonb_build_object(
        'valid', true,
        'card_id', card_data.card_id,
        'issue_date', card_data.issue_date,
        'expiry_date', card_data.expiry_date,
        'status', card_data.status,
        'full_name', user_data.full_name,
        'membership_type', user_data.membership_type,
        'current_status', user_data.current_status
    );

    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_membership_card(TEXT) TO anon, authenticated;
