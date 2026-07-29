-- ══════════════════════════════════════════════════════════════════════════
-- RLS SECURITY HARDENING — Supabase SQL Editor
-- Run ONCE in Supabase SQL Editor to lock down all write operations.
-- READ operations remain open where needed for the app to work.
-- ══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- HELPER: Reusable is_admin() function
-- Checks if the currently authenticated user is in the admins table.
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. NOTIFICATIONS TABLE
--    READ: public (anyone can read notifications)
--    WRITE: admins only
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_read"  ON public.notifications;
DROP POLICY IF EXISTS "notif_write" ON public.notifications;

CREATE POLICY "notif_read" ON public.notifications
  FOR SELECT USING (true);

CREATE POLICY "notif_write" ON public.notifications
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 2. POLLS & VOTING
--    READ: public
--    CREATE/UPDATE/DELETE polls & options: admins only
--    Votes: authenticated users (own votes only)
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "polls_all"    ON public.polls;
DROP POLICY IF EXISTS "polls_read"   ON public.polls;
DROP POLICY IF EXISTS "polls_write"  ON public.polls;

CREATE POLICY "polls_read"  ON public.polls FOR SELECT USING (true);
CREATE POLICY "polls_write" ON public.polls
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "options_all"   ON public.poll_options;
DROP POLICY IF EXISTS "options_read"  ON public.poll_options;
DROP POLICY IF EXISTS "options_write" ON public.poll_options;

CREATE POLICY "options_read"  ON public.poll_options FOR SELECT USING (true);
CREATE POLICY "options_write" ON public.poll_options
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "votes_select" ON public.poll_votes;
DROP POLICY IF EXISTS "votes_insert" ON public.poll_votes;
DROP POLICY IF EXISTS "votes_delete" ON public.poll_votes;

CREATE POLICY "votes_select" ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY "votes_insert" ON public.poll_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_delete" ON public.poll_votes
  FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. USERS TABLE
--    READ: public (for admin dashboard and verification)
--    INSERT: authenticated users (own row via trigger, handled by SECURITY DEFINER)
--    UPDATE: own row only (for profile edits)
--    DELETE: admins only
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_all"   ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_delete"     ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;

CREATE POLICY "users_read_all"   ON public.users FOR SELECT USING (true);
CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (auth.uid() = id OR public.is_admin());
CREATE POLICY "users_delete"     ON public.users
  FOR DELETE USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 4. SITE SETTINGS
--    READ: public
--    WRITE: admins only
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_read"  ON public.site_settings;
DROP POLICY IF EXISTS "settings_write" ON public.site_settings;

CREATE POLICY "settings_read"  ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "settings_write" ON public.site_settings
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 5. FINANCIAL TABLES — membership & donation revenues/expenses
--    These tables hold sensitive financial data.
--    READ: authenticated users (for finance dashboard)
--    WRITE: admins only
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.membership_revenues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all" ON public.membership_revenues;
CREATE POLICY "finance_read"  ON public.membership_revenues FOR SELECT TO authenticated USING (true);
CREATE POLICY "finance_write" ON public.membership_revenues
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.donation_revenues ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all" ON public.donation_revenues;
CREATE POLICY "finance_read"  ON public.donation_revenues FOR SELECT TO authenticated USING (true);
CREATE POLICY "finance_write" ON public.donation_revenues
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.membership_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all" ON public.membership_expenses;
CREATE POLICY "finance_read"  ON public.membership_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "finance_write" ON public.membership_expenses
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.donation_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all" ON public.donation_expenses;
CREATE POLICY "finance_read"  ON public.donation_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "finance_write" ON public.donation_expenses
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

ALTER TABLE public.daily_donation_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_all" ON public.daily_donation_stats;
CREATE POLICY "stats_read"  ON public.daily_donation_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "stats_write" ON public.daily_donation_stats
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 6. MAHAJA TABLES
--    READ: published content = anyone | all = admins
--    WRITE: admins only
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE public.mahaja_courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view published courses" ON public.mahaja_courses;
DROP POLICY IF EXISTS "Admins can insert courses"        ON public.mahaja_courses;
DROP POLICY IF EXISTS "Admins can update courses"        ON public.mahaja_courses;
DROP POLICY IF EXISTS "Admins can delete courses"        ON public.mahaja_courses;

CREATE POLICY "mahaja_courses_read" ON public.mahaja_courses
  FOR SELECT USING (is_published = true OR public.is_admin());
CREATE POLICY "mahaja_courses_insert" ON public.mahaja_courses
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "mahaja_courses_update" ON public.mahaja_courses
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "mahaja_courses_delete" ON public.mahaja_courses
  FOR DELETE USING (public.is_admin());

ALTER TABLE public.mahaja_books ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view published books" ON public.mahaja_books;
DROP POLICY IF EXISTS "Admins can insert books"        ON public.mahaja_books;
DROP POLICY IF EXISTS "Admins can update books"        ON public.mahaja_books;
DROP POLICY IF EXISTS "Admins can delete books"        ON public.mahaja_books;

CREATE POLICY "mahaja_books_read" ON public.mahaja_books
  FOR SELECT USING (is_published = true OR public.is_admin());
CREATE POLICY "mahaja_books_insert" ON public.mahaja_books
  FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "mahaja_books_update" ON public.mahaja_books
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "mahaja_books_delete" ON public.mahaja_books
  FOR DELETE USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- 7. STORAGE POLICIES
--    media bucket: read=public, write=admins only
--    financial-docs: read=authenticated, write=admins only
--    mahaja_content: read=public, write=admins only
--    avatars: read=public, write=own user only
-- ─────────────────────────────────────────────────────────────────────────

-- media bucket
DROP POLICY IF EXISTS "media_insert" ON storage.objects;
DROP POLICY IF EXISTS "media_delete" ON storage.objects;
DROP POLICY IF EXISTS "media_read"   ON storage.objects;
CREATE POLICY "media_read"   ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "media_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'media' AND public.is_admin());
CREATE POLICY "media_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'media' AND public.is_admin());

-- financial-docs bucket
DROP POLICY IF EXISTS "Public Access"  ON storage.objects;
DROP POLICY IF EXISTS "Allow Uploads"  ON storage.objects;
DROP POLICY IF EXISTS "Allow Updates"  ON storage.objects;
DROP POLICY IF EXISTS "Allow Deletes"  ON storage.objects;
CREATE POLICY "financial_read"   ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'financial-docs');
CREATE POLICY "financial_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'financial-docs' AND public.is_admin());
CREATE POLICY "financial_update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'financial-docs' AND public.is_admin());
CREATE POLICY "financial_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'financial-docs' AND public.is_admin());

-- mahaja_content bucket
DROP POLICY IF EXISTS "Mahaja Public Access"  ON storage.objects;
DROP POLICY IF EXISTS "Mahaja Admin Uploads"  ON storage.objects;
DROP POLICY IF EXISTS "Mahaja Admin Updates"  ON storage.objects;
DROP POLICY IF EXISTS "Mahaja Admin Deletes"  ON storage.objects;
CREATE POLICY "mahaja_read"   ON storage.objects FOR SELECT USING (bucket_id = 'mahaja_content');
CREATE POLICY "mahaja_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'mahaja_content' AND public.is_admin());
CREATE POLICY "mahaja_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'mahaja_content' AND public.is_admin());
CREATE POLICY "mahaja_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'mahaja_content' AND public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────
-- DONE ✓
-- ─────────────────────────────────────────────────────────────────────────
SELECT 'Security hardening applied successfully ✓' AS result;
