-- ═══════════════════════════════════════════════════════════
-- تفعيل نظام التحديث اللحظي (Realtime) لجميع الجداول المطلوبة
-- شغّل هذا الملف في Supabase SQL Editor لضمان التحديثات الفورية
-- بين لوحة المشرف وواجهة المستخدمين
-- ═══════════════════════════════════════════════════════════

DO $$ BEGIN
  -- الإشعارات
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  -- التصويتات وخياراتها وأصواتها
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  -- المستخدمون
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

  -- ✅ إعدادات الموقع (التبرعات والحملات) — كانت مفقودة وهي سبب عدم ظهور
  --    تحديثات لوحة المشرف فوراً للمستخدمين
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
  EXCEPTION WHEN duplicate_object THEN NULL; END;

END $$;

-- ═══════════════════════════════════════════════════════════
-- تفعيل REPLICA IDENTITY FULL لضمان إرسال البيانات الكاملة
-- عند كل تحديث (مطلوب لـ UPDATE events في Realtime)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.site_settings  REPLICA IDENTITY FULL;
ALTER TABLE public.notifications  REPLICA IDENTITY FULL;
ALTER TABLE public.polls          REPLICA IDENTITY FULL;
ALTER TABLE public.poll_options   REPLICA IDENTITY FULL;
ALTER TABLE public.poll_votes     REPLICA IDENTITY FULL;
ALTER TABLE public.users          REPLICA IDENTITY FULL;
