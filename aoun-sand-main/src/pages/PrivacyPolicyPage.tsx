import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export const PrivacyPolicyPage = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-20 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-8">
          {isRTL ? 'سياسة الخصوصية' : 'Privacy Policy'}
        </h1>

        <div className="space-y-6 text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-3">
              {isRTL ? '1. جمع المعلومات' : '1. Information Collection'}
            </h2>
            <p>
              {isRTL 
                ? 'نحن في جمعية عون وسند نجمع معلوماتك الشخصية (مثل الاسم، رقم الهاتف، والبريد الإلكتروني) عند التسجيل في التطبيق، أو عند التبرع، أو عند تقديم طلب للتطوع أو العضوية.'
                : 'At Aoun & Sand Charity, we collect your personal information (such as name, phone number, and email) when you register in the app, donate, or apply for volunteering or membership.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-3">
              {isRTL ? '2. استخدام المعلومات' : '2. Use of Information'}
            </h2>
            <p>
              {isRTL 
                ? 'تستخدم المعلومات التي نجمعها في: التحقق من هويتك كعضو أو مستفيد، تسهيل عمليات التبرع، إرسال إشعارات هامة حول حسابك أو حملات الجمعية، وتحسين جودة خدماتنا.'
                : 'The information we collect is used to: verify your identity as a member or beneficiary, facilitate donations, send important notifications about your account or our campaigns, and improve our services.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-3">
              {isRTL ? '3. حماية البيانات' : '3. Data Protection'}
            </h2>
            <p>
              {isRTL 
                ? 'نحن نتخذ إجراءات أمنية صارمة وتشفير متقدم (عبر تقنيات Supabase) لحماية بياناتك من الوصول غير المصرح به أو التعديل أو الإتلاف. لا نشارك بياناتك مع أي أطراف ثالثة لأغراض تجارية.'
                : 'We implement strict security measures and advanced encryption (via Supabase technologies) to protect your data from unauthorized access, alteration, or destruction. We do not share your data with third parties for commercial purposes.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-3">
              {isRTL ? '4. حقوق المستخدم (حذف الحساب)' : '4. User Rights (Account Deletion)'}
            </h2>
            <p>
              {isRTL 
                ? 'يحق لك في أي وقت تعديل بياناتك من خلال صفحة "حسابي". كما يمكنك طلب حذف حسابك وكافة بياناتك نهائياً عن طريق التواصل معنا عبر صفحة "اتصل بنا" أو من خلال إعدادات الحساب.'
                : 'You have the right to edit your data at any time through the "My Account" page. You can also request the complete deletion of your account and data by contacting us via the "Contact Us" page or through account settings.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-3">
              {isRTL ? '5. التغييرات على هذه السياسة' : '5. Changes to This Policy'}
            </h2>
            <p>
              {isRTL 
                ? 'نحتفظ بالحق في تحديث سياسة الخصوصية هذه. سنقوم بإعلامك بأي تغييرات جوهرية من خلال إشعارات التطبيق.'
                : 'We reserve the right to update this privacy policy. We will notify you of any material changes through app notifications.'}
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-sm">
            <p>
              {isRTL 
                ? 'لأي استفسارات حول هذه السياسة، يرجى التواصل معنا عبر نموذج "اتصل بنا".'
                : 'For any inquiries regarding this policy, please contact us via the "Contact Us" form.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
