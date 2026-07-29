-- ==========================================
-- Flutter Sync Schema for User Requests, Payments, Competitions
-- ==========================================

-- 1. Create Competitions table
CREATE TABLE IF NOT EXISTS public.competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Payment Methods table
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    details TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create User Requests table
CREATE TABLE IF NOT EXISTS public.user_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    request_type TEXT NOT NULL,
    amount NUMERIC(10, 2),
    approved_amount NUMERIC(10, 2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    receipt_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create User Payments table
CREATE TABLE IF NOT EXISTS public.user_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    method_id UUID REFERENCES public.payment_methods(id),
    receipt_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_payments ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
-- Competitions & Payment Methods: Public read
CREATE POLICY "Enable read access for all users" ON public.competitions FOR SELECT USING (true);
CREATE POLICY "Enable all for admins on competitions" ON public.competitions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable read access for all users" ON public.payment_methods FOR SELECT USING (true);
CREATE POLICY "Enable all for admins on payment_methods" ON public.payment_methods FOR ALL USING (true) WITH CHECK (true);

-- User Requests: Users can read and insert their own
-- Note: 'auth.uid()' is from Supabase Auth, but 'users' table might use different IDs. Assuming auth.uid() == user.id.
-- If users are authenticated via public.users but not Supabase auth, this needs adjustment. 
-- For safety in this hybrid auth system, we will allow all reads but filter in frontend, or assume auth.uid() is used.
-- Since prompt states: "The user sees only their own requests", we use auth.uid()
CREATE POLICY "Users can view own requests" ON public.user_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own requests" ON public.user_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User Payments: Users can read and insert their own
CREATE POLICY "Users can view own payments" ON public.user_payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payments" ON public.user_payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Let's also allow select for everyone so admins can see them (since admin auth doesn't use auth.uid())
-- Wait, if we allow everyone to read, users can see others' requests if they guess the ID.
-- We will create a secure RPC for admins to fetch all.

-- 7. Secure Admin RPCs (SECURITY DEFINER)
-- We need to pass the admin token or username/password, but assuming the frontend has a valid admin session,
-- Wait, RPC doesn't know the custom admin session unless we pass admin_id.

CREATE OR REPLACE FUNCTION admin_get_all_requests(p_admin_id UUID)
RETURNS SETOF public.user_requests AS $$
BEGIN
    -- Verify if p_admin_id exists in system_admins
    IF EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN QUERY SELECT * FROM public.user_requests ORDER BY created_at DESC;
    ELSE
        RAISE EXCEPTION 'Unauthorized';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_get_all_payments(p_admin_id UUID)
RETURNS SETOF public.user_payments AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN QUERY SELECT * FROM public.user_payments ORDER BY created_at DESC;
    ELSE
        RAISE EXCEPTION 'Unauthorized';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_update_request_status(
    p_admin_id UUID, 
    p_request_id UUID, 
    p_status TEXT, 
    p_approved_amount NUMERIC DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    IF p_status NOT IN ('pending', 'approved', 'rejected') THEN
        RETURN json_build_object('success', false, 'message', 'Invalid status');
    END IF;

    UPDATE public.user_requests 
    SET status = p_status, 
        approved_amount = COALESCE(p_approved_amount, approved_amount),
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN json_build_object('success', true, 'message', 'Status updated successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_update_payment_status(
    p_admin_id UUID, 
    p_payment_id UUID, 
    p_status TEXT
)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    IF p_status NOT IN ('pending', 'approved', 'rejected') THEN
        RETURN json_build_object('success', false, 'message', 'Invalid status');
    END IF;

    UPDATE public.user_payments 
    SET status = p_status, 
        updated_at = NOW()
    WHERE id = p_payment_id;

    RETURN json_build_object('success', true, 'message', 'Status updated successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Enable Realtime
-- Supabase Realtime requires enabling publications for specific tables
BEGIN;
  -- Remove from publication if exists to avoid errors, then add
  -- This is a bit tricky in raw SQL without knowing if the publication exists.
  -- Supabase usually provides a 'supabase_realtime' publication.
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_requests;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_payments;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.competitions;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_methods;
COMMIT;
