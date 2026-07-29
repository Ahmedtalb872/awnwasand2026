# 🚀 إعداد متغيرات البيئة في Vercel (Environment Variables)

بعد إزالة Firebase، أصبح المشروع يعتمد بالكامل على **Supabase**.
لقد تم تنظيف المشروع من أي مفاتيح غير ضرورية. يجب عليك وضع المتغيرات التالية فقط في منصة Vercel.

## 📌 أين تضع هذه المتغيرات؟
1. اذهب إلى لوحة تحكم مشروعك في **Vercel**.
2. من القائمة العلوية اضغط على **Settings** (الإعدادات).
3. من القائمة الجانبية اختر **Environment Variables**.
4. قم بإضافة المفاتيح (Key) والقيم (Value) التالية:

---

### 🟢 المتغيرات العامة (Public Variables)
هذه المتغيرات ضرورية لعمل الواجهة الأمامية للموقع (Frontend).

| المفتاح (Key) | القيمة (Value) |
| --- | --- |
| `VITE_SUPABASE_URL` | *(انسخ من Supabase → Project Settings → API → Project URL)* |
| `VITE_SUPABASE_ANON_KEY` | *(انسخ من Supabase → Project Settings → API → anon public)* |
| `VITE_ADMIN_USERNAME` | *(اسم المستخدم للمشرف — لا تضعه داخل الكود أبداً)* |
| `VITE_ADMIN_PASSWORD` | *(كلمة مرور المشرف — لا تضعها داخل الكود أبداً)* |

---

### 🔴 المتغيرات الخاصة بالخادم (Server-Only / Backend) - سري جداً ⚠️
هذا المفتاح يتم استخدامه في الـ Serverless Functions (لوجود مجلد `api`) للقيام بمهام الإدمن لتجاوز الـ RLS. **يجب ألا يتم استخدامه في الواجهة أبداً ولا يجب وضعه في الكود**.

| المفتاح (Key) | مصدر القيمة |
| --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | *(انسخ من Supabase → Project Settings → API → service_role secret)* |

> ⚠️ **تحذير أمني**: لا تضع مفاتيحك الفعلية داخل ملفات الكود أو GitHub أبداً. استخدم دائماً Environment Variables.

---

### ✅ ملاحظات إضافية:
- تم مسح **Firebase بالكامل** من الكود (الحزم، الأكواد، Service Worker، المتغيرات).
- لا تترك أي متغيرات قديمة تحمل اسم `FIREBASE_` داخل Vercel حتى لا تسبب مشاكل.
- المشروع يعتمد الآن بالكامل على **Supabase فقط** لإدارة المستخدمين، الإشعارات، قاعدة البيانات، والتخزين.
