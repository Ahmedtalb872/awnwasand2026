-- ==========================================
-- Schema V2: Memberships, Donations, Al-Mahaja
-- ==========================================

-- 1. Create Memberships Table
CREATE TABLE IF NOT EXISTS public.user_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    receipt_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Donations Table
CREATE TABLE IF NOT EXISTS public.user_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    receipt_url TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Mahaja Courses Table
CREATE TABLE IF NOT EXISTS public.mahaja_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    instructor TEXT,
    description TEXT,
    image_url TEXT,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Mahaja Lessons Table
CREATE TABLE IF NOT EXISTS public.mahaja_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.mahaja_courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('video', 'audio', 'pdf')),
    content_url TEXT NOT NULL,
    lesson_number INTEGER NOT NULL,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Mahaja User Progress Table
CREATE TABLE IF NOT EXISTS public.mahaja_user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.mahaja_courses(id) ON DELETE CASCADE,
    last_lesson_id UUID REFERENCES public.mahaja_lessons(id) ON DELETE SET NULL,
    completed_lessons JSONB DEFAULT '[]'::jsonb,
    progress_percentage NUMERIC(5, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- 6. Enable RLS
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mahaja_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mahaja_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mahaja_user_progress ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- Memberships
CREATE POLICY "Users can view own memberships" ON public.user_memberships FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memberships" ON public.user_memberships FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Donations
CREATE POLICY "Users can view own donations" ON public.user_donations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own donations" ON public.user_donations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Mahaja Courses
CREATE POLICY "Enable read access for all users on courses" ON public.mahaja_courses FOR SELECT USING (true);
CREATE POLICY "Enable all for admins on courses" ON public.mahaja_courses FOR ALL USING (true) WITH CHECK (true);

-- Mahaja Lessons
CREATE POLICY "Enable read access for all users on lessons" ON public.mahaja_lessons FOR SELECT USING (true);
CREATE POLICY "Enable all for admins on lessons" ON public.mahaja_lessons FOR ALL USING (true) WITH CHECK (true);

-- Mahaja Progress
CREATE POLICY "Users can view own progress" ON public.mahaja_user_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON public.mahaja_user_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON public.mahaja_user_progress FOR UPDATE USING (auth.uid() = user_id);

-- 8. Admin RPCs

CREATE OR REPLACE FUNCTION admin_get_all_memberships(p_admin_id UUID)
RETURNS SETOF public.user_memberships AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN QUERY SELECT * FROM public.user_memberships ORDER BY created_at DESC;
    ELSE
        RAISE EXCEPTION 'Unauthorized';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_get_all_donations(p_admin_id UUID)
RETURNS SETOF public.user_donations AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN QUERY SELECT * FROM public.user_donations ORDER BY created_at DESC;
    ELSE
        RAISE EXCEPTION 'Unauthorized';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_update_membership_status(
    p_admin_id UUID, 
    p_membership_id UUID, 
    p_status TEXT
)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    UPDATE public.user_memberships 
    SET status = p_status, 
        updated_at = NOW()
    WHERE id = p_membership_id;

    RETURN json_build_object('success', true, 'message', 'Status updated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_update_donation_status(
    p_admin_id UUID, 
    p_donation_id UUID, 
    p_status TEXT
)
RETURNS JSON AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.system_admins WHERE id = p_admin_id AND is_active = true) THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    UPDATE public.user_donations 
    SET status = p_status, 
        updated_at = NOW()
    WHERE id = p_donation_id;

    RETURN json_build_object('success', true, 'message', 'Status updated');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC for User Progress
CREATE OR REPLACE FUNCTION update_user_mahaja_progress(
    p_user_id UUID,
    p_course_id UUID,
    p_lesson_id UUID,
    p_completed_lessons JSONB,
    p_percentage NUMERIC
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.mahaja_user_progress (user_id, course_id, last_lesson_id, completed_lessons, progress_percentage)
    VALUES (p_user_id, p_course_id, p_lesson_id, p_completed_lessons, p_percentage)
    ON CONFLICT (user_id, course_id) DO UPDATE SET
        last_lesson_id = p_lesson_id,
        completed_lessons = p_completed_lessons,
        progress_percentage = p_percentage,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Realtime Setup
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_memberships;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_donations;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mahaja_courses;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mahaja_lessons;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mahaja_user_progress;
COMMIT;

-- 10. Initial Data (Courses)
INSERT INTO public.mahaja_courses (title, is_published)
VALUES 
    ('دورة الأخضري (15 درسًا)', true),
    ('دورة ابن عاشر (22 درسًا)', true),
    ('الأربعون النووية (8 دروس)', true),
    ('سلسلة تأملات (6 دروس)', true)
ON CONFLICT DO NOTHING;
