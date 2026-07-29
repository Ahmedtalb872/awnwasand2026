-- ============================================================
-- MAHAJA FINAL FIX - Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create tables if they don't exist
CREATE TABLE IF NOT EXISTS public.mahaja_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    content_link TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mahaja_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    download_link TEXT DEFAULT '',
    cover_image_url TEXT DEFAULT '',
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add missing columns (safe to run even if they exist)
ALTER TABLE public.mahaja_courses ADD COLUMN IF NOT EXISTS content_link TEXT DEFAULT '';
ALTER TABLE public.mahaja_courses ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE public.mahaja_courses ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
ALTER TABLE public.mahaja_courses ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

ALTER TABLE public.mahaja_books ADD COLUMN IF NOT EXISTS download_link TEXT DEFAULT '';
ALTER TABLE public.mahaja_books ADD COLUMN IF NOT EXISTS cover_image_url TEXT DEFAULT '';
ALTER TABLE public.mahaja_books ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;
ALTER TABLE public.mahaja_books ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- 3. COMPLETELY disable RLS on both tables
ALTER TABLE public.mahaja_courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mahaja_books DISABLE ROW LEVEL SECURITY;

-- 4. Grant full permissions to all roles
GRANT ALL PRIVILEGES ON TABLE public.mahaja_courses TO anon;
GRANT ALL PRIVILEGES ON TABLE public.mahaja_courses TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.mahaja_courses TO service_role;

GRANT ALL PRIVILEGES ON TABLE public.mahaja_books TO anon;
GRANT ALL PRIVILEGES ON TABLE public.mahaja_books TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.mahaja_books TO service_role;

-- 5. Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verify: should return both tables with RLS disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('mahaja_courses', 'mahaja_books');
