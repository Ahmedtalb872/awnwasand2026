import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';
import { HandHeart, Calendar, FileText, ExternalLink, Activity } from 'lucide-react';

interface DonationExpense {
  id: string;
  description: string;
  amount: number;
  beneficiary: string | null;
  expense_date: string;
  invoice_url: string | null;
  notes: string | null;
}

export const DonationExpensesViewer = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [expenses, setExpenses] = useState<DonationExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = async () => {
    try {
      const { data, error } = await supabase
        .from('donation_expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (error) {
        console.error('Error fetching expenses:', error);
      } else {
        setExpenses(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();

    // Subscribe to realtime updates
    const channel = supabase.channel('donation_expenses_public')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donation_expenses' }, () => {
        fetchExpenses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return null; // Don't show the section if there are no expenses
  }

  return (
    <div className="mt-16 w-full max-w-5xl mx-auto px-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center mb-10">
        <h3 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-white mb-3 flex items-center justify-center gap-3">
          <Activity className="w-8 h-8 text-teal-500" />
          {isRTL ? 'أين تذهب تبرعاتكم؟' : 'Where Do Your Donations Go?'}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          {isRTL 
            ? 'نحن نؤمن بالشفافية الكاملة. إليك سجل يوضح كيف يتم إنفاق تبرعاتكم السخية في أوجه الخير المختلفة.' 
            : 'We believe in complete transparency. Here is a record showing how your generous donations are spent on various good causes.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {expenses.map((expense, index) => (
          <motion.div
            key={expense.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:shadow-md border border-slate-100 dark:border-slate-700 p-6 flex flex-col transition-all duration-300"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-xl flex items-center justify-center shrink-0">
                <HandHeart className="w-6 h-6" />
              </div>
              <span className="font-black text-lg text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-3 py-1 rounded-full">
                {Number(expense.amount).toLocaleString()} MRU
              </span>
            </div>
            
            <h4 className="font-bold text-slate-800 dark:text-white text-lg mb-2">
              {expense.description}
            </h4>
            
            {expense.notes && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                {expense.notes}
              </p>
            )}

            <div className="mt-auto space-y-2 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>{new Date(expense.expense_date).toLocaleDateString(isRTL ? 'ar-MA' : 'en-US')}</span>
              </div>
              
              {expense.beneficiary && (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>{isRTL ? 'المستفيد:' : 'Beneficiary:'} {expense.beneficiary}</span>
                </div>
              )}
            </div>

            {expense.invoice_url && (
              <a 
                href={expense.invoice_url} 
                target="_blank" 
                rel="noreferrer"
                className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {isRTL ? 'عرض الإيصال' : 'View Receipt'}
              </a>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
