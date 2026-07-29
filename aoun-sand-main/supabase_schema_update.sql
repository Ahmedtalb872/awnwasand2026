-- سياسة إدخال البيانات للواجهة الأمامية
-- السماح للمستخدمين بتحديث أو إدخال بياناتهم الخاصة إذا دعت الحاجة
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- المزامنة التلقائية (Trigger) بين Authentication وجدول users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, phone, membership_type, current_status, location, national_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'مستخدم جديد'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE(new.raw_user_meta_data->>'membership_type', 'عضو'),
    COALESCE(new.raw_user_meta_data->>'current_status', 'غير محدد'),
    COALESCE(new.raw_user_meta_data->>'location', ''),
    COALESCE(new.raw_user_meta_data->>'national_id', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- NOTE: The old get_admin_users(admin_pass text) function with hardcoded password
-- has been REMOVED. Run security_hardening.sql to apply proper RLS-based admin access.
DROP FUNCTION IF EXISTS public.get_admin_users(text);
