import { useState } from 'react';
import { Heart, CheckCircle2, Copy, MessageCircle, ArrowRight, Utensils, Droplets, GraduationCap, Stethoscope, Baby, HelpCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface Bank {
  name: string;
  image: string;
}

interface Category {
  id: string;
  name: string;
  icon: any;
  color: string;
}

export const Donation = () => {
  const { t, language } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const donationNumber = '32203250';

  const categories: Category[] = [
    { id: 'water', name: language === 'ar' ? 'سقاية الماء' : 'Water Supply', icon: Droplets, color: 'bg-blue-500' },
    { id: 'fasting', name: language === 'ar' ? 'إفطار الصائم' : 'Fasting Breakfast', icon: Utensils, color: 'bg-orange-500' },
    { id: 'poor', name: language === 'ar' ? 'دعم الأسر الفقيرة' : 'Support Poor Families', icon: Heart, color: 'bg-red-500' },
    { id: 'orphan', name: language === 'ar' ? 'كفالة يتيم' : 'Orphan Sponsoring', icon: Baby, color: 'bg-indigo-500' },
    { id: 'education', name: language === 'ar' ? 'دعم التعليم' : 'Education Support', icon: GraduationCap, color: 'bg-emerald-500' },
    { id: 'patient', name: language === 'ar' ? 'رعاية مريض' : 'Patient Care', icon: Stethoscope, color: 'bg-teal-500' },
    { id: 'other', name: language === 'ar' ? 'أخرى' : 'Other', icon: HelpCircle, color: 'bg-gray-500' },
  ];

  const banks: Bank[] = [
    { name: 'بنكيلي', image: '/bank.jpg' },
    { name: 'مصرفي', image: '/mas.jpg' },
    { name: 'السداد', image: '/salad.jpg' },
    { name: 'بيم بانك', image: '/bin.jpg' },
    { name: 'غازا بي', image: '/Gogo.jpg' },
    { name: 'كليك', image: '/klik.jpg' },
  ];

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setStep(2);
  };

  const handleBankSelect = (bank: string) => {
    setSelectedBank(bank);
    setStep(3);
  };

  const handleBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) {
      setStep(1);
      setSelectedCategory(null);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(donationNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getWhatsAppLink = () => {
    const message = `السلام عليكم، أرغب في التبرع لـ: ${selectedCategory?.name} عبر: ${selectedBank}. رقم العملية: ...`;
    return `https://wa.me/32203250?text=${encodeURIComponent(message)}`;
  };

  return (
    <section
      id="donate"
      className="py-20 bg-gradient-to-br from-rose-50 via-pink-50 to-red-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300 min-h-screen"
    >
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#2E8B57] to-[#1E88E5] rounded-full mb-6 shadow-2xl">
              <Heart className="w-10 h-10 text-white animate-pulse" />
            </div>
            <h2 className={`text-4xl font-bold mb-4 bg-gradient-to-r from-teal-700 to-blue-700 bg-clip-text text-transparent ${language === 'ar' ? 'font-arabic' : ''}`}>
              {t.donation.title}
            </h2>
            <p className={`text-xl text-gray-600 dark:text-gray-300 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {step === 1 ? 'اختر مجال التبرع' : step === 2 ? 'اختر وسيلة الدفع' : 'بيانات التحويل'}
            </p>
          </div>

          {/* Navigation Back */}
          {step > 1 && (
            <button
              onClick={handleBack}
              className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              <ArrowRight className={`w-5 h-5 ${language === 'ar' ? 'rotate-180' : ''}`} />
              <span>{language === 'ar' ? 'عودة' : 'Back'}</span>
            </button>
          )}

          {/* Step 1: Category Selection */}
          {step === 1 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-slideUp">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category)}
                  className="group flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                >
                  <div className={`${category.color} w-16 h-16 rounded-full flex items-center justify-center mb-4 text-white shadow-md group-hover:scale-110 transition-transform`}>
                    <category.icon className="w-8 h-8" />
                  </div>
                  <span className="font-bold text-gray-800 dark:text-white text-lg text-center">{category.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Bank Selection */}
          {step === 2 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 animate-slideUp">
              {banks.map((bank, index) => (
                <button
                  key={index}
                  onClick={() => handleBankSelect(bank.name)}
                  className="group flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-105"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center mb-4 border-4 border-transparent group-hover:border-teal-500 transition-all">
                    <img
                      src={bank.image}
                      alt={bank.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="font-bold text-gray-800 dark:text-white text-lg">{bank.name}</p>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Payment Details */}
          {step === 3 && selectedCategory && (
            <div className="animate-fadeIn">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-8 md:p-12 text-center">

                  {/* Selected Info */}
                  <div className="flex justify-center gap-4 mb-8 text-sm md:text-base text-gray-500">
                    <span className="bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full">{selectedCategory.name}</span>
                    <span className="bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded-full">{selectedBank}</span>
                  </div>

                  <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                    {t.donation.successTitle}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-8">
                    يرجى تحويل المبلغ على الرقم التالي:
                  </p>

                  {/* Copy Number */}
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-slate-700 dark:to-slate-600 rounded-2xl p-8 mb-8 relative group">
                    <div className="flex flex-col items-center justify-center gap-4">
                      <p className="text-5xl font-mono font-bold text-teal-600 dark:text-teal-400 tracking-wider">
                        {donationNumber}
                      </p>
                      <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-full transition-all shadow-md group-hover:scale-105"
                      >
                        {copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        <span>{copied ? 'تم النسخ' : 'نسخ الرقم'}</span>
                      </button>
                    </div>
                  </div>

                  {/* WhatsApp Action */}
                  <div className="max-w-md mx-auto">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-yellow-800 text-sm">
                      <p>✨ ملاحظة هامة: يرجى إرسال صورة إيصال التحويل عبر واتساب لتأكيد تبرعك.</p>
                    </div>

                    <a
                      href={getWhatsAppLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-3 w-full py-4 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                    >
                      <MessageCircle className="w-6 h-6" />
                      تأكيد التبرع عبر واتساب
                    </a>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
