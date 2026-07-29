import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import { useLanguage } from '../../../contexts/LanguageContext';
import toast from 'react-hot-toast';
import {
  FileText, Printer, Download, TrendingUp, TrendingDown, Wallet,
  ChevronLeft, ChevronRight, Calendar
} from 'lucide-react';
import { generateMonthlyReportPDF, formatPDFDate } from '../../../utils/pdfGenerator';

interface ReportData {
  membershipRevenues: any[];
  donationRevenues: any[];
  membershipExpenses: any[];
  donationExpenses: any[];
  totalRevenues: number;
  totalExpenses: number;
  netBalance: number;
}

const ARABIC_MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

export const MonthlyReportsTab = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReport();
  }, [selectedMonth, selectedYear]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const startDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const endDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${lastDay}`;

      const [mrRes, drRes, meRes, deRes] = await Promise.all([
        supabase.from('membership_revenues').select('*').gte('payment_date', startDate).lte('payment_date', endDate).order('payment_date'),
        supabase.from('donation_revenues').select('*').gte('donation_date', startDate).lte('donation_date', endDate).order('donation_date'),
        supabase.from('membership_expenses').select('*').gte('expense_date', startDate).lte('expense_date', endDate).order('expense_date'),
        supabase.from('donation_expenses').select('*').gte('expense_date', startDate).lte('expense_date', endDate).order('expense_date'),
      ]);

      const mr = mrRes.data || [];
      const dr = drRes.data || [];
      const me = meRes.data || [];
      const de = deRes.data || [];

      const totalRevenues = [...mr, ...dr].reduce((s, r) => s + Number(r.amount), 0);
      const totalExpenses = [...me, ...de].reduce((s, r) => s + Number(r.amount), 0);

      setReportData({
        membershipRevenues: mr,
        donationRevenues: dr,
        membershipExpenses: me,
        donationExpenses: de,
        totalRevenues,
        totalExpenses,
        netBalance: totalRevenues - totalExpenses,
      });
    } catch (err) {
      toast.error(isRTL ? 'خطأ في إنشاء التقرير' : 'Error generating report');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!reportData) return;
    
    const tables = [];
    
    // 1. Membership Revenues
    if (reportData.membershipRevenues.length > 0) {
      const data = reportData.membershipRevenues;
      const totalAmount = data.reduce((s, r) => s + Number(r.amount), 0);
      tables.push({
        title: isRTL ? 'مداخيل الانتساب' : 'Membership Revenues',
        columns: isRTL 
          ? ['ملاحظات', 'التاريخ', 'طريقة الدفع', 'المبلغ (MRU)', 'اسم العضو', '#'] 
          : ['#', 'Member', 'Amount', 'Bank', 'Date', 'Notes'],
        data: data.map((r, i) => {
          const _notes = r.notes || '-';
          const _date = formatPDFDate(r.payment_date);
          const _bank = r.payment_method;
          const _amount = `${Number(r.amount).toLocaleString()}`;
          const _name = r.member_name;
          const _op = `#${i + 1}`;
          return isRTL ? [_notes, _date, _bank, _amount, _name, _op] : [_op, _name, _amount, _bank, _date, _notes];
        }),
        totalsRow: isRTL
          ? ['', '', '', `MRU ${totalAmount.toLocaleString()}`, 'الإجمالي', `${data.length} عملية`]
          : [`${data.length} ops`, 'Total', `MRU ${totalAmount.toLocaleString()}`, '', '', '']
      });
    }

    // 2. Donation Revenues
    if (reportData.donationRevenues.length > 0) {
      const data = reportData.donationRevenues;
      const totalAmount = data.reduce((s, r) => s + Number(r.amount), 0);
      tables.push({
        title: isRTL ? 'مداخيل التبرعات' : 'Donation Revenues',
        columns: isRTL 
          ? ['ملاحظات', 'التاريخ', 'طريقة الدفع', 'المبلغ (MRU)', 'اسم المتبرع', '#'] 
          : ['#', 'Donor', 'Amount', 'Bank', 'Date', 'Notes'],
        data: data.map((r, i) => {
          const _notes = r.notes || '-';
          const _date = formatPDFDate(r.donation_date);
          const _bank = r.payment_method;
          const _amount = `${Number(r.amount).toLocaleString()}`;
          const _name = r.donor_name;
          const _op = `#${i + 1}`;
          return isRTL ? [_notes, _date, _bank, _amount, _name, _op] : [_op, _name, _amount, _bank, _date, _notes];
        }),
        totalsRow: isRTL
          ? ['', '', '', `MRU ${totalAmount.toLocaleString()}`, 'الإجمالي', `${data.length} عملية`]
          : [`${data.length} ops`, 'Total', `MRU ${totalAmount.toLocaleString()}`, '', '', '']
      });
    }

    // 3. Membership Expenses
    if (reportData.membershipExpenses.length > 0) {
      const data = reportData.membershipExpenses;
      const totalAmount = data.reduce((s, r) => s + Number(r.amount), 0);
      tables.push({
        title: isRTL ? 'مصاريف الانتساب' : 'Membership Expenses',
        columns: isRTL 
          ? ['ملاحظات', 'التاريخ', 'المستفيد', 'المبلغ (MRU)', 'الوصف', '#'] 
          : ['#', 'Description', 'Amount', 'Beneficiary', 'Date', 'Notes'],
        data: data.map((r, i) => {
          const _notes = r.notes || '-';
          const _date = formatPDFDate(r.expense_date);
          const _beneficiary = r.beneficiary || '-';
          const _amount = `${Number(r.amount).toLocaleString()}`;
          const _desc = r.description;
          const _op = `#${i + 1}`;
          return isRTL ? [_notes, _date, _beneficiary, _amount, _desc, _op] : [_op, _desc, _amount, _beneficiary, _date, _notes];
        }),
        totalsRow: isRTL
          ? ['', '', '', `MRU ${totalAmount.toLocaleString()}`, 'الإجمالي', `${data.length} عملية`]
          : [`${data.length} ops`, 'Total', `MRU ${totalAmount.toLocaleString()}`, '', '', '']
      });
    }

    // 4. Donation Expenses
    if (reportData.donationExpenses.length > 0) {
      const data = reportData.donationExpenses;
      const totalAmount = data.reduce((s, r) => s + Number(r.amount), 0);
      tables.push({
        title: isRTL ? 'مصاريف التبرعات' : 'Donation Expenses',
        columns: isRTL 
          ? ['ملاحظات', 'التاريخ', 'المستفيد', 'المبلغ (MRU)', 'الوصف', '#'] 
          : ['#', 'Description', 'Amount', 'Beneficiary', 'Date', 'Notes'],
        data: data.map((r, i) => {
          const _notes = r.notes || '-';
          const _date = formatPDFDate(r.expense_date);
          const _beneficiary = r.beneficiary || '-';
          const _amount = `${Number(r.amount).toLocaleString()}`;
          const _desc = r.description;
          const _op = `#${i + 1}`;
          return isRTL ? [_notes, _date, _beneficiary, _amount, _desc, _op] : [_op, _desc, _amount, _beneficiary, _date, _notes];
        }),
        totalsRow: isRTL
          ? ['', '', '', `MRU ${totalAmount.toLocaleString()}`, 'الإجمالي', `${data.length} عملية`]
          : [`${data.length} ops`, 'Total', `MRU ${totalAmount.toLocaleString()}`, '', '', '']
      });
    }

    const stats = [
      { label: isRTL ? 'إجمالي المداخيل' : 'Total Revenues', value: reportData.totalRevenues.toLocaleString(), subLabel: 'MRU' },
      { label: isRTL ? 'إجمالي المصاريف' : 'Total Expenses', value: reportData.totalExpenses.toLocaleString(), subLabel: 'MRU' },
      { label: isRTL ? 'صافي الرصيد' : 'Net Balance', value: reportData.netBalance.toLocaleString(), subLabel: 'MRU' },
    ];

    const title = isRTL ? `التقرير المالي الشهري` : `Monthly Financial Report`;
    const dateRange = `${monthName} ${selectedYear}`;
    const fileName = `monthly_report_${selectedMonth + 1}_${selectedYear}.pdf`;

    try {
      toast.loading(isRTL ? 'جاري إنشاء التقرير...' : 'Generating report...', { id: 'pdf' });
      await generateMonthlyReportPDF({
        title,
        dateRange,
        stats,
        tables,
        fileName,
        logoUrl: '/logo.png'
      });
      toast.success(isRTL ? 'تم تحميل التقرير' : 'Report downloaded', { id: 'pdf' });
    } catch (err) {
      console.error(err);
      toast.error(isRTL ? 'حدث خطأ أثناء الإنشاء' : 'Error generating PDF', { id: 'pdf' });
    }
  };

  const monthName = isRTL ? ARABIC_MONTHS[selectedMonth] : new Date(selectedYear, selectedMonth).toLocaleString('en-US', { month: 'long' });

  const fmt = (n: number) => n.toLocaleString('ar-MA', { maximumFractionDigits: 0 }) + ' MRU';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-5"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-report, #print-report * { visibility: visible !important; }
          #print-report { position: fixed; inset: 0; padding: 24px; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-5 text-white relative overflow-hidden no-print">
        <div className="absolute -top-6 -end-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black">{isRTL ? 'التقارير الشهرية' : 'Monthly Reports'}</h3>
              <p className="text-teal-100 text-xs opacity-90">{isRTL ? 'عرض وتصدير التقارير المالية الشهرية' : 'View and export monthly financial reports'}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white text-teal-600 rounded-xl font-bold text-sm hover:bg-teal-50 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />{isRTL ? 'تحميل PDF' : 'Download PDF'}
            </button>
          </div>
        </div>
      </div>

      {/* Month/Year Selector */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm no-print">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{isRTL ? 'اختر الفترة:' : 'Select Period:'}</span>
          </div>
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-teal-500 font-medium"
          >
            {ARABIC_MONTHS.map((m, i) => (
              <option key={i} value={i}>{isRTL ? m : new Date(2000, i).toLocaleString('en-US', { month: 'long' })}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedYear(y => y - 1)}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <span className="text-base font-black text-slate-800 dark:text-white w-14 text-center">{selectedYear}</span>
            <button
              onClick={() => setSelectedYear(y => Math.min(now.getFullYear(), y + 1))}
              disabled={selectedYear >= now.getFullYear()}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
            >
              {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      ) : reportData && (
        <div id="print-report" dir={isRTL ? 'rtl' : 'ltr'}>
          {/* Report Header - printable */}
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-6 text-white text-center mb-5">
            <h2 className="text-2xl font-black">
              {isRTL ? `التقرير المالي الشهري — ${monthName} ${selectedYear}` : `Monthly Financial Report — ${monthName} ${selectedYear}`}
            </h2>
            <p className="text-teal-100 text-sm mt-1">{isRTL ? 'منظمة الغد' : 'Al-Ghad Organization'}</p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-5 text-center">
              <TrendingUp className="w-7 h-7 text-emerald-600 mx-auto mb-2" />
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{fmt(reportData.totalRevenues)}</p>
              <p className="text-xs font-bold text-emerald-600/70 uppercase tracking-wider mt-1">{isRTL ? 'إجمالي المداخيل' : 'Total Revenues'}</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800 rounded-2xl p-5 text-center">
              <TrendingDown className="w-7 h-7 text-rose-600 mx-auto mb-2" />
              <p className="text-2xl font-black text-rose-700 dark:text-rose-400">{fmt(reportData.totalExpenses)}</p>
              <p className="text-xs font-bold text-rose-600/70 uppercase tracking-wider mt-1">{isRTL ? 'إجمالي المصاريف' : 'Total Expenses'}</p>
            </div>
            <div className={`border rounded-2xl p-5 text-center ${reportData.netBalance >= 0 ? 'bg-teal-50 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800' : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
              <Wallet className={`w-7 h-7 mx-auto mb-2 ${reportData.netBalance >= 0 ? 'text-teal-600' : 'text-red-600'}`} />
              <p className={`text-2xl font-black ${reportData.netBalance >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-red-700 dark:text-red-400'}`}>
                {reportData.netBalance >= 0 ? '+' : ''}{fmt(reportData.netBalance)}
              </p>
              <p className={`text-xs font-bold uppercase tracking-wider mt-1 ${reportData.netBalance >= 0 ? 'text-teal-600/70' : 'text-red-600/70'}`}>
                {isRTL ? 'صافي الرصيد' : 'Net Balance'}
              </p>
            </div>
          </div>

          {/* Membership Revenues Table */}
          {reportData.membershipRevenues.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm mb-5">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 px-5 py-3 border-b border-indigo-100 dark:border-indigo-800">
                <h4 className="font-black text-indigo-700 dark:text-indigo-400 text-sm">
                  {isRTL ? `مداخيل الانتساب (${reportData.membershipRevenues.length})` : `Membership Revenues (${reportData.membershipRevenues.length})`}
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/40">
                    <tr>
                      <th className="px-4 py-3 text-start text-xs font-bold text-slate-400 uppercase">{isRTL ? 'العضو' : 'Member'}</th>
                      <th className="px-4 py-3 text-start text-xs font-bold text-slate-400 uppercase">{isRTL ? 'المبلغ' : 'Amount'}</th>
                      <th className="px-4 py-3 text-start text-xs font-bold text-slate-400 uppercase">{isRTL ? 'البنك المحوِّل منه' : 'Bank'}</th>
                      <th className="px-4 py-3 text-start text-xs font-bold text-slate-400 uppercase">{isRTL ? 'التاريخ' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {reportData.membershipRevenues.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-white">{r.member_name}</td>
                        <td className="px-4 py-3 text-sm font-black text-emerald-600">{Number(r.amount).toLocaleString()} MRU</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{r.payment_method}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{new Date(r.payment_date).toLocaleDateString(isRTL ? 'ar-MA' : 'en-US')}</td>
                      </tr>
                    ))}
                    <tr className="bg-indigo-50/50 dark:bg-indigo-900/10 font-black">
                      <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-400" colSpan={1}>{isRTL ? 'الإجمالي' : 'Total'}</td>
                      <td className="px-4 py-3 text-sm text-indigo-700 dark:text-indigo-400" colSpan={3}>
                        {fmt(reportData.membershipRevenues.reduce((s, r) => s + Number(r.amount), 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Donation Revenues Table */}
          {reportData.donationRevenues.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm mb-5">
              <div className="bg-purple-50 dark:bg-purple-900/20 px-5 py-3 border-b border-purple-100 dark:border-purple-800">
                <h4 className="font-black text-purple-700 dark:text-purple-400 text-sm">
                  {isRTL ? `مداخيل التبرعات (${reportData.donationRevenues.length})` : `Donation Revenues (${reportData.donationRevenues.length})`}
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/40">
                    <tr>
                      <th className="px-4 py-3 text-start text-xs font-bold text-slate-400 uppercase">{isRTL ? 'المتبرع' : 'Donor'}</th>
                      <th className="px-4 py-3 text-start text-xs font-bold text-slate-400 uppercase">{isRTL ? 'المبلغ' : 'Amount'}</th>
                      <th className="px-4 py-3 text-start text-xs font-bold text-slate-400 uppercase">{isRTL ? 'البنك المحوِّل منه' : 'Bank'}</th>
                      <th className="px-4 py-3 text-start text-xs font-bold text-slate-400 uppercase">{isRTL ? 'التاريخ' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {reportData.donationRevenues.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-white">{r.donor_name}</td>
                        <td className="px-4 py-3 text-sm font-black text-purple-600">{Number(r.amount).toLocaleString()} MRU</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{r.payment_method}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{new Date(r.donation_date).toLocaleDateString(isRTL ? 'ar-MA' : 'en-US')}</td>
                      </tr>
                    ))}
                    <tr className="bg-purple-50/50 dark:bg-purple-900/10 font-black">
                      <td className="px-4 py-3 text-sm text-purple-700 dark:text-purple-400" colSpan={1}>{isRTL ? 'الإجمالي' : 'Total'}</td>
                      <td className="px-4 py-3 text-sm text-purple-700 dark:text-purple-400" colSpan={3}>
                        {fmt(reportData.donationRevenues.reduce((s, r) => s + Number(r.amount), 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Membership Expenses Table */}
          {reportData.membershipExpenses.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm mb-5">
              <div className="bg-orange-50 dark:bg-orange-900/20 px-5 py-3 border-b border-orange-100 dark:border-orange-800">
                <h4 className="font-black text-orange-700 dark:text-orange-400 text-sm">
                  {isRTL ? `مصاريف الانتساب (${reportData.membershipExpenses.length})` : `Membership Expenses (${reportData.membershipExpenses.length})`}
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/40">
                    <tr>
                      <th className="px-4 py-3 text-start text-xs font-bold text-slate-400 uppercase">{isRTL ? 'الوصف' : 'Description'}</th>
                      <th className="px-4 py-3 text-start text-xs font-bold text-slate-400 uppercase">{isRTL ? 'المبلغ' : 'Amount'}</th>
                      <th className="px-4 py-3 text-start text-xs font-bold text-slate-400 uppercase">{isRTL ? 'الجهة' : 'Beneficiary'}</th>
                      <th className="px-4 py-3 text-start text-xs font-bold text-slate-400 uppercase">{isRTL ? 'التاريخ' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {reportData.membershipExpenses.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-white">{r.description}</td>
                        <td className="px-4 py-3 text-sm font-black text-orange-600">{Number(r.amount).toLocaleString()} MRU</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{r.beneficiary || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{new Date(r.expense_date).toLocaleDateString(isRTL ? 'ar-MA' : 'en-US')}</td>
                      </tr>
                    ))}
                    <tr className="bg-orange-50/50 dark:bg-orange-900/10 font-black">
                      <td className="px-4 py-3 text-sm text-orange-700 dark:text-orange-400" colSpan={1}>{isRTL ? 'الإجمالي' : 'Total'}</td>
                      <td className="px-4 py-3 text-sm text-orange-700 dark:text-orange-400" colSpan={3}>
                        {fmt(reportData.membershipExpenses.reduce((s, r) => s + Number(r.amount), 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Donation Expenses Table */}
          {reportData.donationExpenses.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm mb-5">
              <div className="bg-rose-50 dark:bg-rose-900/20 px-5 py-3 border-b border-rose-100 dark:border-rose-800">
                <h4 className="font-black text-rose-700 dark:text-rose-400 text-sm">
                  {isRTL ? `مصاريف التبرعات (${reportData.donationExpenses.length})` : `Donation Expenses (${reportData.donationExpenses.length})`}
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-800/40">
                    <tr>
                      <th className="px-4 py-3 text-start text-xs font-bold text-slate-400 uppercase">{isRTL ? 'الوصف' : 'Description'}</th>
                      <th className="px-4 py-3 text-start text-xs font-bold text-slate-400 uppercase">{isRTL ? 'المبلغ' : 'Amount'}</th>
                      <th className="px-4 py-3 text-start text-xs font-bold text-slate-400 uppercase">{isRTL ? 'المستفيد' : 'Beneficiary'}</th>
                      <th className="px-4 py-3 text-start text-xs font-bold text-slate-400 uppercase">{isRTL ? 'التاريخ' : 'Date'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {reportData.donationExpenses.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 text-sm font-bold text-slate-800 dark:text-white">{r.description}</td>
                        <td className="px-4 py-3 text-sm font-black text-rose-600">{Number(r.amount).toLocaleString()} MRU</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{r.beneficiary || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-500">{new Date(r.expense_date).toLocaleDateString(isRTL ? 'ar-MA' : 'en-US')}</td>
                      </tr>
                    ))}
                    <tr className="bg-rose-50/50 dark:bg-rose-900/10 font-black">
                      <td className="px-4 py-3 text-sm text-rose-700 dark:text-rose-400" colSpan={1}>{isRTL ? 'الإجمالي' : 'Total'}</td>
                      <td className="px-4 py-3 text-sm text-rose-700 dark:text-rose-400" colSpan={3}>
                        {fmt(reportData.donationExpenses.reduce((s, r) => s + Number(r.amount), 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {reportData.membershipRevenues.length === 0 && reportData.donationRevenues.length === 0 &&
            reportData.membershipExpenses.length === 0 && reportData.donationExpenses.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-16 text-center shadow-sm">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="font-bold text-slate-400">
                {isRTL ? `لا توجد عمليات مالية في ${monthName} ${selectedYear}` : `No financial operations in ${monthName} ${selectedYear}`}
              </p>
            </div>
          )}

          {/* Footer print signature */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
            {isRTL
              ? `تم إنشاء هذا التقرير بتاريخ ${new Date().toLocaleDateString('ar-MA')} — النظام الإداري`
              : `Report generated on ${new Date().toLocaleDateString('en-US')} — Admin System`}
          </div>
        </div>
      )}
    </motion.div>
  );
};
