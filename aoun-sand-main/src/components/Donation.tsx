import { useState } from 'react';
import { Heart, CheckCircle2, MessageCircle, ArrowRight, Upload, User, Phone, Utensils, Droplets, GraduationCap, Stethoscope, Baby, HelpCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  icon: any;
  color: string;
}

const WHATSAPP_NUMBER = '32203250';

export const Donation = () => {
  const { t, language } = useLanguage();
  const { user, userProfile } = useAuth();
  const isRTL = language === 'ar';

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [amount, setAmount] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const categories: Category[] = [
    { id: 'water', name: language === 'ar' ? 'سقاية الماء' : 'Water Supply', icon: Droplets, color: 'bg-blue-500' },
    { id: 'fasting', name: language === 'ar' ? 'إفطار الصائم' : 'Fasting Breakfast', icon: Utensils, color: 'bg-orange-500' },
    { id: 'poor', name: language === 'ar' ? 'دعم الأسر الفقيرة' : 'Support Poor Families', icon: Heart, color: 'bg-red-500' },
    { id: 'orphan', name: language === 'ar' ? 'كفالة يتيم' : 'Orphan Sponsoring', icon: Baby, color: 'bg-indigo-500' },
    { id: 'education', name: language === 'ar' ? 'دعم التعليم' : 'Education Support', icon: GraduationCap, color: 'bg-emerald-500' },
    { id: 'patient', name: language === 'ar' ? 'رعاية مريض' : 'Patient Care', icon: Stethoscope, color: 'bg-teal-500' },
    { id: 'other', name: language === 'ar' ? 'أخرى' : 'Other', icon: HelpCircle, color: 'bg-gray-500' },
  ];

  const handleCategorySelect = (category: Category) => {
    setSelectedCategory(category);
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setSelectedCategory(null);
    setAmount('');
    setReceiptFile(null);
    setPreviewUrl(null);
  };

  const getWhatsAppLink = () => {
    const message = isRTL
      ? `السلام عليكم، أرغب في التواصل بخصوص تبرع لـ: ${selectedCategory?.name || ''}`
      : `Hello, I'd like to reach out about a donation for: ${selectedCategory?.name || ''}`;
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error(isRTL ? 'يجب أن يكون الملف صورة' : 'File must be an image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(isRTL ? 'حجم الملف يجب أن لا يتجاوز 5 ميجابايت' : 'File size must not exceed 5MB'); return; }
    setReceiptFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedCategory) return;
    if (!amount || parseFloat(amount) <= 0) {
      toast.error(isRTL ? 'الرجاء إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      let receipt_url: string | null = null;
      if (receiptFile) {
        const ext = receiptFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('receipts').upload(fileName, receiptFile);
        if (uploadError) throw uploadError;
        receipt_url = supabase.storage.from('receipts').getPublicUrl(fileName).data.publicUrl;
      }

      const { error } = await supabase.from('user_donations').insert({
        user_id: user.id,
        amount: parseFloat(amount),
        receipt_url,
        notes: isRTL ? `مجال التبرع: ${selectedCategory.name}` : `Donation cause: ${selectedCategory.name}`,
      });
      if (error) throw error;

      toast.success(isRTL ? 'تم إرسال طلب التبرع، بانتظار موافقة الإدارة' : 'Donation request submitted, awaiting admin approval');
      setStep(3);
    } catch (err: any) {
      toast.error(err.message || (isRTL ? 'حدث خطأ أثناء الإرسال' : 'Something went wrong'));
    } finally {
      setIsLoading(false);
    }
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
              {step === 1 ? (isRTL ? 'اختر مجال التبرع' : 'Choose a donation cause') : step === 2 ? (isRTL ? 'أدخل مبلغ التبرع' : 'Enter donation amount') : (isRTL ? 'تم الإرسال' : 'Submitted')}
            </p>
          </div>

          {/* Navigation Back */}
          {step === 2 && (
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

          {/* Step 2: Amount form (same pattern as membership fee) */}
          {step === 2 && selectedCategory && (
            <div className="animate-fadeIn">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 md:p-10 max-w-lg mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`${selectedCategory.color} w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm`}>
                    <selectedCategory.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">{isRTL ? 'مجال التبرع' : 'Cause'}</p>
                    <h3 className="font-black text-gray-800 dark:text-white">{selectedCategory.name}</h3>
                  </div>
                </div>

                <form onSubmit={handleSubmit}>
                  {/* Auto-filled read-only user info */}
                  <div className="mb-5 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="font-bold text-slate-700 dark:text-slate-200">{userProfile?.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-slate-500 dark:text-slate-400">{userProfile?.phone}</span>
                    </div>
                  </div>

                  <div className="mb-5">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      {isRTL ? 'مبلغ التبرع' : 'Donation Amount'} *
                    </label>
                    <div className="relative">
                      <input
                        type="number" min="0" step="0.01" required autoFocus
                        value={amount} onChange={e => setAmount(e.target.value)}
                        className="input-field pe-16" placeholder="0.00"
                      />
                      <span className="absolute top-1/2 -translate-y-1/2 end-4 text-xs font-bold text-slate-400">MRU</span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                      {isRTL ? 'إرفاق إيصال (اختياري)' : 'Attach Receipt (optional)'}
                    </label>
                    <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 transition-colors overflow-hidden">
                      {previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="h-full object-contain" />
                      ) : (
                        <div className="flex flex-col items-center text-slate-400">
                          <Upload className="w-6 h-6 mb-1" />
                          <span className="text-xs font-bold">{isRTL ? 'اضغط للرفع' : 'Click to upload'}</span>
                        </div>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 px-6 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white rounded-2xl font-bold text-base shadow-[0_8px_20px_-4px_rgba(225,29,72,0.4)] transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center"
                  >
                    {isLoading ? (
                      <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      isRTL ? 'إرسال الطلب' : 'Submit Request'
                    )}
                  </button>
                </form>

                {/* WhatsApp contact block */}
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                    {isRTL ? 'يمكنك أيضاً التواصل معنا عبر واتساب' : 'You can also reach us on WhatsApp'}
                  </p>
                  <a
                    href={getWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 py-3 px-6 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {isRTL ? 'تواصل معنا على واتساب' : 'Contact us on WhatsApp'}
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && selectedCategory && (
            <div className="animate-fadeIn">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                <div className="p-8 md:p-12 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                    {isRTL ? 'شكراً لتبرعك!' : 'Thank you for your donation!'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-8">
                    {isRTL ? 'تم إرسال طلبك بنجاح، بانتظار موافقة الإدارة.' : 'Your request was submitted successfully and is awaiting admin approval.'}
                  </p>

                  <div className="max-w-md mx-auto">
                    <a
                      href={getWhatsAppLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-3 w-full py-4 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                    >
                      <MessageCircle className="w-6 h-6" />
                      {isRTL ? 'تواصل معنا على واتساب' : 'Contact us on WhatsApp'}
                    </a>
                  </div>

                  <button
                    onClick={handleBack}
                    className="mt-6 text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    {isRTL ? 'تبرع لمجال آخر' : 'Donate to another cause'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
