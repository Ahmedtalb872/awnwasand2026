# دليل تثبيت واختبار تطبيق عون وسند (PWA)

## المحتويات
- `public/manifest.json`: ملف تعريف التطبيق.
- `public/service-worker.js`: ملف الخدمة للعمل بدون اتصال.
- `public/offline.html`: صفحة تظهر عند انقطاع الإنترنت.
- `src/components/PWAInstallPrompt.tsx`: زر التثبيت والتنبيهات.
- `src/serviceWorkerRegistration.ts`: كود تسجيل الخدمة.

## كيفية الاختبار محلياً

1. **بناء المشروع**:
   ```bash
   npm run build
   ```

2. **تشغيل نسخة الإنتاج** (Preview):
   ```bash
   npm run preview
   ```
   *ملاحظة: Service Workers تعمل فقط في بيئة الإنتاج (preview) أو localhost آمن، ولا تعمل عادةً في وضع التطوير (dev) الافتراضي إلا بإعدادات خاصة.*

3. **التحقق**:
   - افتح المتصفح (Chrome/Edge).
   - اضغط F12 لفتح أدوات المطور > تبويب **Application**.
   - اختر **Manifest** من القائمة اليسرى وتأكد من عدم وجود أخطاء.
   - اختر **Service Workers** وتأكد من أن الحالة "Activated".
   - جرب فصل الإنترنت (Network > Offline) وحدث الصفحة لرؤية `offline.html`.

## التثبيت على الهاتف

- **Android**: سيظهر زر "تثبيت التطبيق" في أسفل الشاشة.
- **iOS**: اتبع التعليمات التي تظهر (اضغط زر المشاركة ثم "إضافة إلى الشاشة الرئيسية").

## ملاحظات التطوير
- تم توليد الأيقونات في `public/icons`.
- يمكنك تعديل استراتيجيات الكاش في `public/service-worker.js`.
