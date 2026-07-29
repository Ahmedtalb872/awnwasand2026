-- ================================================================
-- MAHAJA COMPLETE FIX - RPC Functions + Tables + Storage
-- Run this ENTIRE script in Supabase SQL Editor
-- ================================================================

-- 1. إنشاء الجداول إذا لم تكن موجودة مع كل الأعمدة المطلوبة
CREATE TABLE IF NOT EXISTS public.mahaja_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    content_link TEXT,
    image_url TEXT,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.mahaja_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    download_link TEXT,
    cover_image_url TEXT,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
);

-- إضافة الأعمدة إن لم تكن موجودة
ALTER TABLE public.mahaja_courses ADD COLUMN IF NOT EXISTS content_link TEXT;
ALTER TABLE public.mahaja_courses ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.mahaja_courses ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

ALTER TABLE public.mahaja_books ADD COLUMN IF NOT EXISTS download_link TEXT;
ALTER TABLE public.mahaja_books ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.mahaja_books ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- 2. الصلاحيات الكاملة لجميع الأدوار
GRANT ALL ON TABLE public.mahaja_courses TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.mahaja_books TO anon, authenticated, service_role;

-- 3. تعطيل RLS نهائياً لهذه الجداول (لأن لوحة التحكم لا تستخدم Supabase Auth)
ALTER TABLE public.mahaja_courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mahaja_books DISABLE ROW LEVEL SECURITY;

-- 4. حذف أي سياسات قديمة قد تسبب مشاكل
DROP POLICY IF EXISTS "Public can view published courses" ON public.mahaja_courses;
DROP POLICY IF EXISTS "Admins can insert courses" ON public.mahaja_courses;
DROP POLICY IF EXISTS "Admins can update courses" ON public.mahaja_courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON public.mahaja_courses;
DROP POLICY IF EXISTS "mahaja_courses_insert" ON public.mahaja_courses;
DROP POLICY IF EXISTS "mahaja_courses_update" ON public.mahaja_courses;
DROP POLICY IF EXISTS "mahaja_courses_delete" ON public.mahaja_courses;
DROP POLICY IF EXISTS "mahaja_courses_read" ON public.mahaja_courses;
DROP POLICY IF EXISTS "mahaja_courses_all" ON public.mahaja_courses;
DROP POLICY IF EXISTS "allow_all_courses" ON public.mahaja_courses;

DROP POLICY IF EXISTS "Public can view published books" ON public.mahaja_books;
DROP POLICY IF EXISTS "Admins can insert books" ON public.mahaja_books;
DROP POLICY IF EXISTS "Admins can update books" ON public.mahaja_books;
DROP POLICY IF EXISTS "Admins can delete books" ON public.mahaja_books;
DROP POLICY IF EXISTS "mahaja_books_insert" ON public.mahaja_books;
DROP POLICY IF EXISTS "mahaja_books_update" ON public.mahaja_books;
DROP POLICY IF EXISTS "mahaja_books_delete" ON public.mahaja_books;
DROP POLICY IF EXISTS "mahaja_books_read" ON public.mahaja_books;
DROP POLICY IF EXISTS "mahaja_books_all" ON public.mahaja_books;
DROP POLICY IF EXISTS "allow_all_books" ON public.mahaja_books;

-- 5. دوال RPC تتجاوز RLS تلقائياً عبر SECURITY DEFINER
-- دالة إضافة دورة
CREATE OR REPLACE FUNCTION mahaja_insert_course(
    p_title TEXT,
    p_description TEXT,
    p_content_link TEXT,
    p_image_url TEXT,
    p_is_published BOOLEAN DEFAULT true
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_row mahaja_courses;
BEGIN
    INSERT INTO mahaja_courses (title, description, content_link, image_url, is_published)
    VALUES (p_title, p_description, p_content_link, p_image_url, p_is_published)
    RETURNING * INTO new_row;
    RETURN row_to_json(new_row);
END;
$$;

-- دالة تعديل دورة
CREATE OR REPLACE FUNCTION mahaja_update_course(
    p_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_content_link TEXT,
    p_image_url TEXT,
    p_is_published BOOLEAN
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_row mahaja_courses;
BEGIN
    UPDATE mahaja_courses
    SET title = p_title,
        description = p_description,
        content_link = p_content_link,
        image_url = p_image_url,
        is_published = p_is_published,
        updated_at = timezone('utc', now())
    WHERE id = p_id
    RETURNING * INTO updated_row;
    RETURN row_to_json(updated_row);
END;
$$;

-- دالة حذف دورة
CREATE OR REPLACE FUNCTION mahaja_delete_course(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM mahaja_courses WHERE id = p_id;
END;
$$;

-- دالة جلب جميع الدورات
CREATE OR REPLACE FUNCTION mahaja_get_courses()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (SELECT json_agg(row_to_json(c) ORDER BY c.created_at DESC) FROM mahaja_courses c);
END;
$$;

-- دالة إضافة كتاب
CREATE OR REPLACE FUNCTION mahaja_insert_book(
    p_title TEXT,
    p_description TEXT,
    p_download_link TEXT,
    p_cover_image_url TEXT,
    p_is_published BOOLEAN DEFAULT true
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_row mahaja_books;
BEGIN
    INSERT INTO mahaja_books (title, description, download_link, cover_image_url, is_published)
    VALUES (p_title, p_description, p_download_link, p_cover_image_url, p_is_published)
    RETURNING * INTO new_row;
    RETURN row_to_json(new_row);
END;
$$;

-- دالة تعديل كتاب
CREATE OR REPLACE FUNCTION mahaja_update_book(
    p_id UUID,
    p_title TEXT,
    p_description TEXT,
    p_download_link TEXT,
    p_cover_image_url TEXT,
    p_is_published BOOLEAN
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    updated_row mahaja_books;
BEGIN
    UPDATE mahaja_books
    SET title = p_title,
        description = p_description,
        download_link = p_download_link,
        cover_image_url = p_cover_image_url,
        is_published = p_is_published,
        updated_at = timezone('utc', now())
    WHERE id = p_id
    RETURNING * INTO updated_row;
    RETURN row_to_json(updated_row);
END;
$$;

-- دالة حذف كتاب
CREATE OR REPLACE FUNCTION mahaja_delete_book(p_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM mahaja_books WHERE id = p_id;
END;
$$;

-- دالة جلب جميع الكتب
CREATE OR REPLACE FUNCTION mahaja_get_books()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (SELECT json_agg(row_to_json(b) ORDER BY b.created_at DESC) FROM mahaja_books b);
END;
$$;

-- 6. منح صلاحية تنفيذ الدوال لجميع المستخدمين
GRANT EXECUTE ON FUNCTION mahaja_insert_course TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mahaja_update_course TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mahaja_delete_course TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mahaja_get_courses TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mahaja_insert_book TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mahaja_update_book TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mahaja_delete_book TO anon, authenticated;
GRANT EXECUTE ON FUNCTION mahaja_get_books TO anon, authenticated;

-- 7. إصلاح صلاحيات Storage (رفع الصور)
INSERT INTO storage.buckets (id, name, public)
VALUES ('mahaja_content', 'mahaja_content', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "mahaja_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "mahaja_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "mahaja_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "mahaja_storage_delete" ON storage.objects;
DROP POLICY IF EXISTS "Mahaja Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Mahaja Admin Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Mahaja Admin Updates" ON storage.objects;
DROP POLICY IF EXISTS "Mahaja Admin Deletes" ON storage.objects;
DROP POLICY IF EXISTS "mahaja_insert" ON storage.objects;
DROP POLICY IF EXISTS "mahaja_update" ON storage.objects;
DROP POLICY IF EXISTS "mahaja_delete" ON storage.objects;

CREATE POLICY "mahaja_storage_select" ON storage.objects FOR SELECT USING (bucket_id = 'mahaja_content');
CREATE POLICY "mahaja_storage_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'mahaja_content');
CREATE POLICY "mahaja_storage_update" ON storage.objects FOR UPDATE USING (bucket_id = 'mahaja_content');
CREATE POLICY "mahaja_storage_delete" ON storage.objects FOR DELETE USING (bucket_id = 'mahaja_content');

-- 8. تحديث الكاش
NOTIFY pgrst, 'reload schema';

SELECT '✓ تم الإصلاح الكامل - الدوال والصلاحيات جاهزة' AS result;
