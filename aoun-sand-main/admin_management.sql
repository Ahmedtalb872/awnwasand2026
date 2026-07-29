-- ==========================================
-- Admins Management System Schema
-- ==========================================

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create system_admins table
CREATE TABLE IF NOT EXISTS public.system_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    permissions TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create admin_activity_log table
CREATE TABLE IF NOT EXISTS public.admin_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.system_admins(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Set up RLS for system_admins
ALTER TABLE public.system_admins ENABLE ROW LEVEL SECURITY;

-- Allow all read access to system_admins for authenticated requests (needed for checking roles in frontend)
-- or we can restrict it to only those with Super Admin role. Let's make it public read for now, but restrict writes.
CREATE POLICY "Enable read access for all authenticated users" ON public.system_admins
    FOR SELECT USING (true);

-- Allow insert/update/delete only if we want to enforce it. For this system, we'll do operations via RPC 
-- or we can just allow everything if we handle auth in the frontend layer for Super Admins.
-- For simplicity, since the env Super Admin manages everything, we'll allow all operations 
-- and let the frontend ensure only the Super Admin does it.
CREATE POLICY "Enable all operations for all users" ON public.system_admins
    FOR ALL USING (true) WITH CHECK (true);

-- 4. Set up RLS for admin_activity_log
ALTER TABLE public.admin_activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all operations for admin_activity_log" ON public.admin_activity_log
    FOR ALL USING (true) WITH CHECK (true);

-- 5. RPC to verify admin login
-- This function checks the username and password against the hash.
CREATE OR REPLACE FUNCTION verify_admin_login(p_username TEXT, p_password TEXT)
RETURNS JSON AS $$
DECLARE
    v_admin RECORD;
BEGIN
    SELECT id, username, password_hash, role, permissions, is_active 
    INTO v_admin
    FROM public.system_admins
    WHERE username = p_username;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Invalid credentials');
    END IF;

    IF NOT v_admin.is_active THEN
        RETURN json_build_object('success', false, 'message', 'Account is disabled');
    END IF;

    IF v_admin.password_hash = crypt(p_password, v_admin.password_hash) THEN
        -- Update last login
        UPDATE public.system_admins SET last_login = NOW() WHERE id = v_admin.id;
        
        -- Log the login action
        INSERT INTO public.admin_activity_log (admin_id, action, details)
        VALUES (v_admin.id, 'login', '{"method": "database"}'::jsonb);
        
        RETURN json_build_object(
            'success', true, 
            'admin', json_build_object(
                'id', v_admin.id,
                'username', v_admin.username,
                'role', v_admin.role,
                'permissions', v_admin.permissions
            )
        );
    ELSE
        RETURN json_build_object('success', false, 'message', 'Invalid credentials');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RPC to hash password for initial inserts or resets
CREATE OR REPLACE FUNCTION hash_admin_password(p_password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(p_password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: To create an admin manually from SQL:
-- INSERT INTO public.system_admins (username, password_hash, role, permissions)
-- VALUES ('finance_admin', hash_admin_password('secret123'), 'Finance Admin', ARRAY['view', 'edit']);
