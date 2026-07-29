import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { X, CreditCard, User, Phone, Upload } from 'lucide-react';

interface MembershipFeeModalProps {
  onClose: () => void;
  onSubmitted: () => void;
}

export const MembershipFeeModal: React.FC<MembershipFeeModalProps> = ({ onClose, onSubmitted }) => {
  const { language } = useLanguage();
  const { user, userProfile } = useAuth();
  const isRTL = language === 'ar';

  const [amount, setAmount] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    if (!user) return;
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

      const { error } = await supabase.from('user_memberships').insert({
        user_id: user.id,
        amount: parseFloat(amount),
        receipt_url,
      });
      if (error) throw error;

      toast.success(isRTL ? 'تم إرسال طلب دفع رسوم الانتساب، بانتظار موافقة الإدارة' : 'Membership fee request submitted, awaiting admin approval');
      onSubmitted();
      onClose();
    } catch (err: any) {
      toast.error(err.message || (isRTL ? 'حدث خطأ أثناء الإرسال' : 'Something went wrong'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 w-full max-w-md relative overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-5 end-5 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 transition-colors z-10">
          <X className="w-5 h-5" />
        </button>

        <div className="w-14 h-14 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mb-5 text-rose-600 dark:text-rose-400 shadow-sm border border-rose-200 dark:border-rose-800">
          <CreditCard className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-black text-slate-800 dark:text-white mb-1">
          {isRTL ? 'دفع رسوم الانتساب' : 'Pay Membership Fee'}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm font-medium">
          {isRTL ? 'بياناتك معبأة تلقائياً، يبقى فقط إدخال المبلغ.' : 'Your info is pre-filled, just enter the amount.'}
        </p>

        <form onSubmit={handleSubmit}>
          {/* Auto-filled read-only user info */}
          <div className="mb-5 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
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
              {isRTL ? 'مبلغ رسوم الانتساب' : 'Membership Fee Amount'} *
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
      </motion.div>
    </div>
  );
};
