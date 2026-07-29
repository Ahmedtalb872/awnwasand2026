import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  HandHeart, Calendar, FileText, ExternalLink, Activity,
  Download, Search, X, Filter
} from 'lucide-react';
import { generateFinancialPDF, formatPDFDate } from '../utils/pdfGenerator';
import toast from 'react-hot-toast';

interface DonationExpense {
  id: string;
  donation_source: string | null;
  description: string;
  amount: number;
  beneficiary: string | null;
  expense_date: string;
  invoice_url: string | null;
  link_url: string | null;
  notes: string | null;
  created_at: string;
}

export const DonationExpensesPage = () => {
  const { language } = useLanguage();
  const { userProfile } = useAuth();
  const isRTL = language === 'ar';

  const [expenses, setExpenses] = useState<DonationExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('donation_expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (error) throw error;
      const list = data || [];
      setExpenses(list);
      setTotalAmount(list.reduce((s, r) => s + Number(r.amount), 0));
    } catch (err) {
      console.error('Error fetching expenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();

    // Realtime subscription
    const channel = supabase.channel('donation_expenses_user_view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donation_expenses' }, () => {
        fetchExpenses();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredExpenses = expenses.filter(exp =>
    exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (exp.notes && exp.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (exp.beneficiary && exp.beneficiary.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const count = filteredExpenses.length;
      const total = filteredExpenses.reduce((s, r) => s + Number(r.amount), 0);
      const avg = count > 0 ? Math.round(total / count) : 0;

      const columns = isRTL
        ? ['ملاحظات', 'التاريخ', 'المستفيد', 'المبلغ (MRU)', 'الوصف', '#']
        : ['#', 'Description', 'Amount (MRU)', 'Beneficiary', 'Date', 'Notes'];

      const rows = filteredExpenses.map((r, i) => {
        const _notes = r.notes || '-';
        const _date = formatPDFDate(r.expense_date);
        const _beneficiary = r.beneficiary || '-';
        const _amount = Number(r.amount).toLocaleString();
        const _desc = r.description;
        const _op = `#${i + 1}`;
        return isRTL
          ? [_notes, _date, _beneficiary, _amount, _desc, _op]
          : [_op, _desc, _amount, _beneficiary, _date, _notes];
      });

      const stats = [
        { label: isRTL ? 'عدد المصاريف' : 'Total Expenses', value: count, subLabel: isRTL ? 'مصروف' : 'expenses' },
        { label: isRTL ? 'متوسط المصروف' : 'Avg Amount', value: avg.toLocaleString(), subLabel: 'MRU' },
        { label: isRTL ? 'إجمالي المصاريف' : 'Total Spent', value: total.toLocaleString(), subLabel: 'MRU' },
        {
          label: isRTL ? 'المستفيدون' : 'Beneficiaries',
          value: new Set(filteredExpenses.filter(r => r.beneficiary).map(r => r.beneficiary)).size,
          subLabel: isRTL ? 'مستفيد' : 'beneficiary'
        },
      ];

      const totalsRow = isRTL
        ? ['', '', '', `MRU ${total.toLocaleString()}`, 'الإجمالي', `${count} مصروف`]
        : [`${count} expenses`, 'Total', `MRU ${total.toLocaleString()}`, '', '', ''];

      await generateFinancialPDF({
        title: isRTL ? 'تقرير مصاريف التبرعات' : 'Donation Expenses Report',
        stats,
        columns,
        data: rows,
        totalsRow,
        fileName: 'donation_expenses_report.pdf',
        logoUrl: '/logo.png',
      });
      toast.success(isRTL ? 'تم تحميل التقرير بنجاح' : 'Report downloaded successfully');
    } catch (err) {
      console.error(err);
      toast.error(isRTL ? 'خطأ في تحميل التقرير' : 'Error downloading report');
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50 dark:bg-slate-900" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Page Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-600 py-16 mb-10">
        <div className="absolute -top-16 -end-16 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 start-0 w-48 h-48 rounded-full bg-emerald-400/20 blur-2xl pointer-events-none" />
        <div className="container-custom relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/15 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl mb-6 text-white">
            <Activity className="w-10 h-10" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            {isRTL ? 'مصاريف التبرعات' : 'Donation Expenses'}
          </h1>
          <p className="text-teal-100/80 text-lg max-w-2xl mx-auto">
            {isRTL
              ? 'سجل شفاف يوضح كيف يتم إنفاق تبرعاتكم الكريمة في أوجه الخير والبر المختلفة'
              : 'A transparent record showing how your generous donations are spent on various good causes'}
          </p>
          {/* Summary Stats */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-4 text-center">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">
                {isRTL ? 'إجمالي المصاريف' : 'Total Spent'}
              </p>
              <p className="text-white text-2xl font-black">{totalAmount.toLocaleString()} <span className="text-sm text-white/60">MRU</span></p>
            </div>
            <div className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl px-6 py-4 text-center">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">
                {isRTL ? 'عدد العمليات' : 'Total Records'}
              </p>
              <p className="text-white text-2xl font-black">{expenses.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom">
        {/* Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 w-full sm:max-w-md">
            <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={isRTL ? 'ابحث في المصاريف...' : 'Search expenses...'}
              className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 ${isRTL ? 'left-3' : 'right-3'}`}>
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* PDF Button */}
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF || filteredExpenses.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-sm transition-colors shadow-sm disabled:opacity-60 shrink-0"
          >
            {downloadingPDF
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Download className="w-4 h-4" />}
            {isRTL ? 'تنزيل PDF' : 'Download PDF'}
          </button>
        </div>

        {/* Results count */}
        {searchTerm && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            {isRTL ? `${filteredExpenses.length} نتيجة لـ "${searchTerm}"` : `${filteredExpenses.length} result(s) for "${searchTerm}"`}
          </p>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse bg-white dark:bg-slate-800 rounded-2xl h-52 border border-slate-100 dark:border-slate-700" />
            ))}
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
              <HandHeart className="w-10 h-10 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
              {isRTL ? 'لا توجد مصاريف تبرعات متاحة حالياً.' : 'No donation expenses available yet.'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm">
              {isRTL
                ? 'ستظهر مصاريف التبرعات هنا فور إضافتها من قبل المشرف.'
                : 'Donation expenses will appear here as soon as the admin adds them.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExpenses.map((expense, index) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.4), duration: 0.4 }}
                className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden"
              >
                {/* Top accent bar */}
                <div className="h-1 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-t-2xl" />

                <div className="p-6 flex flex-col flex-1">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-12 h-12 bg-teal-50 dark:bg-teal-900/30 rounded-xl flex items-center justify-center shrink-0">
                      <HandHeart className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                    </div>
                    <span className="font-black text-lg text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-3 py-1 rounded-full whitespace-nowrap">
                      {Number(expense.amount).toLocaleString()} MRU
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="font-bold text-slate-800 dark:text-white text-base leading-snug mb-2">
                    {expense.description}
                  </h4>

                  {/* Notes */}
                  {expense.notes && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 flex-1">
                      {expense.notes}
                    </p>
                  )}

                  {/* Meta */}
                  <div className="mt-auto space-y-2 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Calendar className="w-4 h-4 shrink-0 text-slate-400" />
                      <span>{new Date(expense.expense_date).toLocaleDateString(isRTL ? 'ar-MA' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>

                    {expense.beneficiary && (
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <FileText className="w-4 h-4 shrink-0 text-slate-400" />
                        <span className="truncate">
                          <span className="font-semibold">{isRTL ? 'المستفيد: ' : 'Beneficiary: '}</span>
                          {expense.beneficiary}
                        </span>
                      </div>
                    )}

                    {expense.donation_source && (
                      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Activity className="w-4 h-4 shrink-0 text-slate-400" />
                        <span className="truncate">
                          <span className="font-semibold">{isRTL ? 'المصدر: ' : 'Source: '}</span>
                          {expense.donation_source}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  {(expense.invoice_url || expense.link_url) && (
                    <div className="flex gap-2 mt-4">
                      {expense.invoice_url && (
                        <a
                          href={expense.invoice_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 rounded-xl text-xs font-bold transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {isRTL ? 'عرض الإيصال' : 'View Receipt'}
                        </a>
                      )}
                      {expense.link_url && (
                        <a
                          href={expense.link_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl text-xs font-bold transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          {isRTL ? 'رابط خارجي' : 'External Link'}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
