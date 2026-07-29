import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ShieldCheck, XCircle, ChevronRight, CheckCircle2 } from 'lucide-react';

interface VerificationResult {
  valid: boolean;
  message?: string;
  card_id?: string;
  issue_date?: string;
  expiry_date?: string;
  status?: string;
  full_name?: string;
  membership_type?: string;
  current_status?: string;
}

export const VerifyCardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifyCard = async () => {
      if (!id) return;
      
      try {
        const { data, error } = await supabase.rpc('verify_membership_card', { p_card_id: id });
        
        if (error) throw error;
        setResult(data as VerificationResult);
      } catch (err) {
        console.error("Error verifying card:", err);
        setResult({ valid: false, message: 'حدث خطأ أثناء التحقق من البطاقة.' });
      } finally {
        setIsLoading(false);
      }
    };

    verifyCard();
  }, [id]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
        
        {/* Header */}
        <div className="bg-[#26233f] p-6 text-center relative">
           <div className="w-16 h-16 bg-white rounded-full mx-auto mb-3 flex items-center justify-center border-4 border-[#f7b2b0] shadow-md">
             <img src="/ABC.jpg" alt="Logo" className="w-full h-full object-cover rounded-full" />
           </div>
           <h1 className="text-xl font-bold text-[#f7b2b0]">جمعية عون وسند الخيرية</h1>
           <p className="text-white/80 text-sm mt-1">نظام التحقق من العضوية</p>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-[#f7b2b0] border-t-[#26233f] rounded-full animate-spin mb-4" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">جاري التحقق من صحة البطاقة...</p>
            </div>
          ) : result?.valid ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-800/50 rounded-full flex items-center justify-center mb-3">
                  <ShieldCheck className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mb-1">بطاقة رسمية صالحة</h2>
                <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">
                  تم التحقق من صحة هذه البطاقة وهي مسجلة رسمياً في سجلات الجمعية.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-sm text-slate-500 dark:text-slate-400">الاسم الكامل</span>
                  <span className="font-bold text-slate-800 dark:text-white">{result.full_name}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-sm text-slate-500 dark:text-slate-400">رقم العضوية</span>
                  <span className="font-bold text-slate-800 dark:text-white">{result.card_id}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-sm text-slate-500 dark:text-slate-400">الصفة</span>
                  <span className="font-bold text-[#f7b2b0] bg-[#f7b2b0]/10 px-2 py-0.5 rounded-full">{result.membership_type}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-sm text-slate-500 dark:text-slate-400">تاريخ الإصدار</span>
                  <span className="font-bold text-slate-800 dark:text-white">
                    {result.issue_date ? new Date(result.issue_date).toLocaleDateString('ar-SA') : '---'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm text-slate-500 dark:text-slate-400">حالة العضوية</span>
                  <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    {result.status}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mb-2">
                <XCircle className="w-10 h-10 text-rose-600 dark:text-rose-400" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">بطاقة غير صالحة</h2>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                {result?.message || 'لم يتم العثور على بيانات لهذه البطاقة في سجلاتنا الرسمية.'}
              </p>
            </div>
          )}

          <div className="mt-8">
            <Link 
              to="/" 
              className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <span>العودة للرئيسية</span>
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
