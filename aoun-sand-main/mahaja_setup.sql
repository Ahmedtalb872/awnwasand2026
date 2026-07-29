-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Modify users table to add new columns
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_mahaja BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS date_of_birth DATE;

-- 2. Create mahaja_courses table
CREATE TABLE IF NOT EXISTS public.mahaja_courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    content_link TEXT,
    image_url TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for mahaja_courses
ALTER TABLE public.mahaja_courses ENABLE ROW LEVEL SECURITY;

-- Create Policies for mahaja_courses
DROP POLICY IF EXISTS "Public can view published courses" ON public.mahaja_courses;
CREATE POLICY "Public can view published courses"
    ON public.mahaja_courses FOR SELECT
    USING (is_published = true OR EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()));

DROP POLICY IF EXISTS "Admins can insert courses" ON public.mahaja_courses;
CREATE POLICY "Admins can insert courses"
    ON public.mahaja_courses FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update courses" ON public.mahaja_courses;
CREATE POLICY "Admins can update courses"
    ON public.mahaja_courses FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Admins can delete courses" ON public.mahaja_courses;
CREATE POLICY "Admins can delete courses"
    ON public.mahaja_courses FOR DELETE
    USING (true);

-- 3. Create mahaja_books table
CREATE TABLE IF NOT EXISTS public.mahaja_books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    download_link TEXT,
    cover_image_url TEXT,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for mahaja_books
ALTER TABLE public.mahaja_books ENABLE ROW LEVEL SECURITY;

-- Create Policies for mahaja_books
DROP POLICY IF EXISTS "Public can view published books" ON public.mahaja_books;
CREATE POLICY "Public can view published books"
    ON public.mahaja_books FOR SELECT
    USING (is_published = true OR EXISTS (SELECT 1 FROM admins WHERE admins.id = auth.uid()));

DROP POLICY IF EXISTS "Admins can insert books" ON public.mahaja_books;
CREATE POLICY "Admins can insert books"
    ON public.mahaja_books FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update books" ON public.mahaja_books;
CREATE POLICY "Admins can update books"
    ON public.mahaja_books FOR UPDATE
    USING (true);

DROP POLICY IF EXISTS "Admins can delete books" ON public.mahaja_books;
CREATE POLICY "Admins can delete books"
    ON public.mahaja_books FOR DELETE
    USING (true);

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_mahaja_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_mahaja_courses_timestamp ON public.mahaja_courses;
CREATE TRIGGER update_mahaja_courses_timestamp
    BEFORE UPDATE ON public.mahaja_courses
    FOR EACH ROW
    EXECUTE FUNCTION update_mahaja_timestamp();

DROP TRIGGER IF EXISTS update_mahaja_books_timestamp ON public.mahaja_books;
CREATE TRIGGER update_mahaja_books_timestamp
    BEFORE UPDATE ON public.mahaja_books
    FOR EACH ROW
    EXECUTE FUNCTION update_mahaja_timestamp();

-- Make sure buckets exist (This is better done via dashboard or app if it doesn't exist, but we can do it via SQL if we have access to storage.buckets)
-- Inserting into storage.buckets requires the storage schema which might not be accessible easily via standard SQL, 
-- but we assume "avatars", "mahaja_courses", "mahaja_books" are handled via the Supabase client when uploading, or we can create them:
INSERT INTO storage.buckets (id, name, public) 
VALUES ('mahaja_content', 'mahaja_content', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for mahaja_content
DROP POLICY IF EXISTS "Mahaja Public Access" ON storage.objects;
CREATE POLICY "Mahaja Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'mahaja_content');

DROP POLICY IF EXISTS "Mahaja Admin Uploads" ON storage.objects;
CREATE POLICY "Mahaja Admin Uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mahaja_content');

DROP POLICY IF EXISTS "Mahaja Admin Updates" ON storage.objects;
CREATE POLICY "Mahaja Admin Updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'mahaja_content');

DROP POLICY IF EXISTS "Mahaja Admin Deletes" ON storage.objects;
CREATE POLICY "Mahaja Admin Deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'mahaja_content');
