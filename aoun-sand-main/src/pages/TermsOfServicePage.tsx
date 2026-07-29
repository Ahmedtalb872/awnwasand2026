import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export const TermsOfServicePage = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-20 px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm border border-slate-200 dark:border-slate-800">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-white mb-8">
          {isRTL ? 'شروط الخدمة' : 'Terms of Service'}
        </h1>

        <div className="space-y-6 text-slate-600 dark:text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-3">
              {isRTL ? '1. القبول بالشروط' : '1. Acceptance of Terms'}
            </h2>
            <p>
              {isRTL 
                ? 'باستخدامك لتطبيق "جمعية عون وسند"، فإنك توافق على الالتزام بشروط الخدمة هذه. إذا كنت لا توافق على أي من هذه الشروط، يُرجى عدم استخدام التطبيق.'
                : 'By using the "Aoun & Sand Charity" app, you agree to be bound by these terms of service. If you do not agree to any of these terms, please do not use the app.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-3">
              {isRTL ? '2. التبرعات' : '2. Donations'}
            </h2>
            <p>
              {isRTL 
                ? 'جميع التبرعات التي تتم عبر التطبيق غير قابلة للاسترداد وتوجه مباشرة لدعم مشاريع وأهداف الجمعية المعلنة. نضمن الشفافية التامة في إيصال تبرعاتك لمستحقيها.'
                : 'All donations made through the app are non-refundable and go directly to support the announced projects and goals of the charity. We guarantee full transparency in delivering your donations to those in need.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-3">
              {isRTL ? '3. حساب المستخدم' : '3. User Account'}
            </h2>
            <p>
              {isRTL 
                ? 'أنت مسؤول عن الحفاظ على سرية بيانات حسابك وكلمة المرور الخاصة بك. تحتفظ الجمعية بالحق في تعليق أو إنهاء الحسابات التي تنتهك سياساتنا.'
                : 'You are responsible for maintaining the confidentiality of your account details and password. The charity reserves the right to suspend or terminate accounts that violate our policies.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-3">
              {isRTL ? '4. المحتوى والسلوك' : '4. Content and Behavior'}
            </h2>
            <p>
              {isRTL 
                ? 'يُمنع منعاً باتاً استخدام التطبيق لأي أغراض غير قانونية أو نشر محتوى مسيء أو ضار. يتم مراقبة المحتوى والإبلاغ عن أي تجاوزات للسلطات المختصة.'
                : 'It is strictly forbidden to use the app for any illegal purposes or to post offensive or harmful content. Content is monitored and violations may be reported to the relevant authorities.'}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-white mb-3">
              {isRTL ? '5. التعديلات' : '5. Modifications'}
            </h2>
            <p>
              {isRTL 
                ? 'نحتفظ بالحق في تعديل شروط الخدمة في أي وقت. سيتم إشعارك بأي تعديلات جوهرية.'
                : 'We reserve the right to modify these terms of service at any time. You will be notified of any material changes.'}
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-sm">
            <p>
              {isRTL 
                ? 'لأي استفسارات حول هذه الشروط، يرجى التواصل معنا عبر نموذج "اتصل بنا".'
                : 'For any inquiries regarding these terms, please contact us via the "Contact Us" form.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
