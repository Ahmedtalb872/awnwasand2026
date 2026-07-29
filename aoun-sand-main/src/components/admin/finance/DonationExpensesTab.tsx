import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import { useLanguage } from '../../../contexts/LanguageContext';
import toast from 'react-hot-toast';
import {
  HandHeart, Plus, Edit2, Trash2, Search, X, Save,
  ChevronLeft, ChevronRight, Upload, ExternalLink, Wallet, AlertTriangle, Download
} from 'lucide-react';
import { generateFinancialPDF, formatPDFDate } from '../../../utils/pdfGenerator';

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

const PAGE_SIZE = 10;

const emptyForm: Partial<DonationExpense> = {
  donation_source: '',
  description: '',
  amount: 0,
  beneficiary: '',
  expense_date: new Date().toISOString().split('T')[0],
  invoice_url: null,
  link_url: null,
  notes: '',
};

export const DonationExpensesTab = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [records, setRecords] = useState<DonationExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  // Stats for remaining balance tracking
  const [totalDonationRevenue, setTotalDonationRevenue] = useState(0);
  const [totalDonationExpenses, setTotalDonationExpenses] = useState(0);

  const [searchDesc, setSearchDesc] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState<Partial<DonationExpense>>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchBalance();
    fetchRecords();
  }, [page, searchDesc, filterDateFrom, filterDateTo]);

  const fetchBalance = async () => {
    const [drRes, deRes] = await Promise.all([
      supabase.from('donation_revenues').select('amount'),
      supabase.from('donation_expenses').select('amount'),
    ]);
    const totalRev = (drRes.data || []).reduce((s, r) => s + Number(r.amount), 0);
    const totalExp = (deRes.data || []).reduce((s, r) => s + Number(r.amount), 0);
    setTotalDonationRevenue(totalRev);
    setTotalDonationExpenses(totalExp);
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('donation_expenses')
        .select('*', { count: 'exact' })
        .order('expense_date', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (searchDesc) query = query.ilike('description', `%${searchDesc}%`);
      if (filterDateFrom) query = query.gte('expense_date', filterDateFrom);
      if (filterDateTo) query = query.lte('expense_date', filterDateTo);

      const { data, count, error } = await query;
      if (error) throw error;
      setRecords(data || []);
      setTotal(count || 0);
    } catch {
      toast.error(isRTL ? 'خطأ في تحميل البيانات' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  }, [page, searchDesc, filterDateFrom, filterDateTo, isRTL]);

  const handleUploadInvoice = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `donation_expenses/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('financial-docs').upload(fileName, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('financial-docs').getPublicUrl(fileName);
      setEditRecord(p => ({ ...p, invoice_url: data.publicUrl }));
      toast.success(isRTL ? 'تم رفع الفاتورة' : 'Invoice uploaded');
    } catch {
      toast.error(isRTL ? 'خطأ في الرفع' : 'Upload error');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      let query = supabase
        .from('donation_expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (searchDesc) query = query.ilike('description', `%${searchDesc}%`);
      if (filterDateFrom) query = query.gte('expense_date', filterDateFrom);
      if (filterDateTo) query = query.lte('expense_date', filterDateTo);

      const { data, error } = await query;
      if (error) throw error;

      let dateRangeStr = '';
      if (filterDateFrom && filterDateTo) {
        dateRangeStr = `${filterDateFrom} - ${filterDateTo}`;
      } else if (filterDateFrom) {
        dateRangeStr = `من ${filterDateFrom}`;
      } else if (filterDateTo) {
        dateRangeStr = `إلى ${filterDateTo}`;
      }

      const totalAmount = (data || []).reduce((s, r) => s + Number(r.amount), 0);
      const count = (data || []).length;
      const avg = count > 0 ? Math.round(totalAmount / count) : 0;

      const columns = isRTL 
        ? ['ملاحظات', 'التاريخ', 'المستفيد', 'المبلغ (MRU)', 'الوصف', '#'] 
        : ['#', 'Description', 'Amount', 'Beneficiary', 'Date', 'Notes'];
      
      const rows = (data || []).map((r, i) => {
        const _notes = r.notes || '-';
        const _date = formatPDFDate(r.expense_date);
        const _beneficiary = r.beneficiary || '-';
        const _amount = `${Number(r.amount).toLocaleString()}`;
        const _desc = r.description;
        const _op = `#${i + 1}`;
        return isRTL 
          ? [_notes, _date, _beneficiary, _amount, _desc, _op]
          : [_op, _desc, _amount, _beneficiary, _date, _notes];
      });

      const stats = [
        { label: isRTL ? 'عدد المصاريف' : 'Total Expenses', value: count, subLabel: isRTL ? 'مصروف' : 'expenses' },
        { label: isRTL ? 'متوسط المصروف' : 'Avg Amount', value: avg.toLocaleString(), subLabel: 'MRU' },
        { label: isRTL ? 'إجمالي المصاريف' : 'Total Amount', value: totalAmount.toLocaleString(), subLabel: 'MRU' },
        { label: isRTL ? 'عدد المستفيدين' : 'Beneficiaries', value: new Set((data || []).filter(r => r.beneficiary).map(r => r.beneficiary)).size, subLabel: isRTL ? 'مستفيد' : 'beneficiary' },
      ];

      const totalsRow = isRTL
        ? ['', '', '', `MRU ${totalAmount.toLocaleString()}`, 'الإجمالي', `${count} مصروف`]
        : [`${count} expenses`, 'Total', `MRU ${totalAmount.toLocaleString()}`, '', '', ''];

      await generateFinancialPDF({
        title: isRTL ? 'تقرير المصاريف' : 'Expenses Report',
        dateRange: dateRangeStr,
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

  const handleSave = async () => {
    if (!editRecord.description?.trim()) return toast.error(isRTL ? 'الوصف مطلوب' : 'Description required');
    if (!editRecord.amount || editRecord.amount <= 0) return toast.error(isRTL ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be > 0');

    setSaving(true);
    try {
      const payload = {
        donation_source: editRecord.donation_source || null,
        description: editRecord.description,
        amount: editRecord.amount,
        beneficiary: editRecord.beneficiary || null,
        expense_date: editRecord.expense_date,
        invoice_url: editRecord.invoice_url || null,
        link_url: editRecord.link_url?.trim() || null,
        notes: editRecord.notes || null,
      };

      if (isEditing && editRecord.id) {
        const { error } = await supabase.from('donation_expenses').update(payload).eq('id', editRecord.id);
        if (error) throw error;
        toast.success(isRTL ? '✓ تم التعديل' : '✓ Updated');
      } else {
        const { error } = await supabase.from('donation_expenses').insert(payload);
        if (error) throw error;
        toast.success(isRTL ? '✓ تمت الإضافة' : '✓ Added');
      }
      setShowModal(false);
      setEditRecord(emptyForm);
      setPage(0);
      await fetchBalance();
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || (isRTL ? 'حدث خطأ' : 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isRTL ? 'تأكيد الحذف؟' : 'Confirm delete?')) return;
    const { error } = await supabase.from('donation_expenses').delete().eq('id', id);
    if (error) toast.error(isRTL ? 'خطأ في الحذف' : 'Delete error');
    else { toast.success(isRTL ? 'تم الحذف' : 'Deleted'); await fetchBalance(); fetchRecords(); }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const remainingBalance = totalDonationRevenue - totalDonationExpenses;
  const usagePercent = totalDonationRevenue > 0 ? Math.min(100, (totalDonationExpenses / totalDonationRevenue) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-5"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-600 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute -top-6 -end-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <HandHeart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black">{isRTL ? 'مصاريف التبرعات' : 'Donation Expenses'}</h3>
              <p className="text-rose-100 text-xs opacity-90">
                {total} {isRTL ? 'عملية' : 'operations'} — {isRTL ? 'متبقي:' : 'Remaining:'} {remainingBalance.toLocaleString()} MRU
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-xl font-bold text-sm hover:bg-white/30 transition-colors shadow-sm disabled:opacity-60"
            >
              {downloadingPDF ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isRTL ? 'تحميل PDF' : 'Download PDF'}
            </button>
            <button
              onClick={() => { setEditRecord(emptyForm); setIsEditing(false); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-white text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-50 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />{isRTL ? 'إضافة' : 'Add'}
            </button>
          </div>
        </div>
      </div>

      {/* Balance Tracker */}
      <div className={`rounded-2xl p-5 border ${
        remainingBalance < 0
          ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
      } shadow-sm`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className={`w-5 h-5 ${remainingBalance < 0 ? 'text-red-500' : 'text-rose-500'}`} />
            <span className="font-black text-slate-800 dark:text-white text-sm">
              {isRTL ? 'متابعة رصيد التبرعات' : 'Donation Balance Tracker'}
            </span>
            {remainingBalance < 0 && (
              <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" />{isRTL ? 'تجاوز الرصيد!' : 'Balance Exceeded!'}
              </span>
            )}
          </div>
          <span className={`text-lg font-black ${remainingBalance < 0 ? 'text-red-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {remainingBalance.toLocaleString()} MRU
          </span>
        </div>
        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
            style={{ width: `${Math.min(100, usagePercent)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium">
          <span>{isRTL ? `إجمالي التبرعات: ${totalDonationRevenue.toLocaleString()} MRU` : `Total Received: ${totalDonationRevenue.toLocaleString()} MRU`}</span>
          <span>{isRTL ? `مصروف: ${totalDonationExpenses.toLocaleString()} MRU (${usagePercent.toFixed(0)}%)` : `Spent: ${totalDonationExpenses.toLocaleString()} MRU (${usagePercent.toFixed(0)}%)`}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className={`absolute top-3 w-4 h-4 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input type="text" placeholder={isRTL ? 'بحث بالوصف...' : 'Search description...'} value={searchDesc}
              onChange={e => { setSearchDesc(e.target.value); setPage(0); }}
              className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500 ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'}`} />
          </div>
          <input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPage(0); }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
          <input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setPage(0); }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
          {(searchDesc || filterDateFrom || filterDateTo) && (
            <button onClick={() => { setSearchDesc(''); setFilterDateFrom(''); setFilterDateTo(''); setPage(0); }}
              className="flex items-center gap-1 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-sm hover:bg-slate-200 transition-colors">
              <X className="w-3.5 h-3.5" />{isRTL ? 'مسح' : 'Clear'}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'الوصف' : 'Description'}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'مصدر التبرع' : 'Donation Source'}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'المستفيد' : 'Beneficiary'}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'التاريخ' : 'Date'}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'فاتورة' : 'Invoice'}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'رابط' : 'Link'}</th>
                  <th className="px-5 py-3.5 text-end text-xs font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {records.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center">
                    <div className="flex flex-col items-center text-slate-400">
                      <HandHeart className="w-10 h-10 mb-3 opacity-30" />
                      <p className="font-medium">{isRTL ? 'لا توجد مصاريف تبرعات' : 'No donation expenses yet'}</p>
                    </div>
                  </td></tr>
                ) : records.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{rec.description}</p>
                      {rec.notes && <p className="text-xs text-slate-400 truncate max-w-[150px]">{rec.notes}</p>}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">{rec.donation_source || '—'}</td>
                    <td className="px-5 py-4">
                      <span className="font-black text-rose-600 dark:text-rose-400">{Number(rec.amount).toLocaleString()} MRU</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">{rec.beneficiary || '—'}</td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {new Date(rec.expense_date).toLocaleDateString(isRTL ? 'ar-MA' : 'en-US')}
                    </td>
                    <td className="px-5 py-4">
                      {rec.invoice_url ? (
                        <a href={rec.invoice_url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-600 rounded-lg text-xs font-bold">
                          <ExternalLink className="w-3 h-3" />{isRTL ? 'عرض' : 'View'}
                        </a>
                      ) : <span className="text-xs text-slate-300 dark:text-slate-600">{isRTL ? 'لا يوجد إيصال مرفق' : 'No attached receipt'}</span>}
                    </td>
                    <td className="px-5 py-4">
                      {rec.link_url ? (
                        <a href={rec.link_url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-xs font-bold">
                          <ExternalLink className="w-3 h-3" />{isRTL ? 'رابط' : 'Link'}
                        </a>
                      ) : <span className="text-xs text-slate-200 dark:text-slate-700">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => { setEditRecord({ ...rec }); setIsEditing(true); setShowModal(true); }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(rec.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs text-slate-400">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 disabled:opacity-40 hover:bg-slate-100 transition-colors">
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <span className="px-3 py-2 text-sm font-bold text-slate-600 dark:text-slate-300">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 disabled:opacity-40 hover:bg-slate-100 transition-colors">
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className="bg-gradient-to-r from-rose-600 to-pink-600 p-6 text-white shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black">
                    {isEditing ? (isRTL ? 'تعديل مصروف تبرع' : 'Edit Donation Expense') : (isRTL ? 'إضافة مصروف تبرع' : 'Add Donation Expense')}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'مصدر التبرع' : 'Donation Source'}</label>
                  <input type="text" value={editRecord.donation_source || ''} onChange={e => setEditRecord(p => ({ ...p, donation_source: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'الوصف *' : 'Description *'}</label>
                  <input type="text" value={editRecord.description || ''} onChange={e => setEditRecord(p => ({ ...p, description: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'المبلغ (MRU) *' : 'Amount (MRU) *'}</label>
                    <input type="number" min="0" step="0.01" value={editRecord.amount || ''} onChange={e => setEditRecord(p => ({ ...p, amount: Number(e.target.value) }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'المستفيد' : 'Beneficiary'}</label>
                    <input type="text" value={editRecord.beneficiary || ''} onChange={e => setEditRecord(p => ({ ...p, beneficiary: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'تاريخ الصرف *' : 'Expense Date *'}</label>
                  <input type="date" value={editRecord.expense_date || ''} onChange={e => setEditRecord(p => ({ ...p, expense_date: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500" dir="ltr" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'الفاتورة' : 'Invoice'}</label>
                  {editRecord.invoice_url ? (
                    <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
                      <a href={editRecord.invoice_url} target="_blank" rel="noreferrer"
                        className="flex-1 text-teal-600 text-sm font-bold flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />{isRTL ? 'عرض' : 'View'}
                      </a>
                      <button onClick={() => setEditRecord(p => ({ ...p, invoice_url: null }))} className="p-1 text-slate-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-900/10 transition-colors">
                      {uploading ? <div className="w-6 h-6 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" /> : <Upload className="w-6 h-6 text-slate-400" />}
                      <span className="text-sm text-slate-500 font-medium">{uploading ? (isRTL ? 'جاري الرفع...' : 'Uploading...') : (isRTL ? 'رفع فاتورة' : 'Upload invoice')}</span>
                      <input type="file" accept=".pdf,image/*" className="hidden"
                        onChange={e => e.target.files?.[0] && handleUploadInvoice(e.target.files[0])} />
                    </label>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                  <textarea rows={2} value={editRecord.notes || ''} onChange={e => setEditRecord(p => ({ ...p, notes: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {isRTL ? 'الرابط (اختياري)' : 'Link URL (optional)'}
                  </label>
                  <input
                    type="url"
                    value={editRecord.link_url || ''}
                    onChange={e => setEditRecord(p => ({ ...p, link_url: e.target.value }))}
                    placeholder={isRTL ? 'أدخل رابط URL اختياري...' : 'Enter optional URL...'}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                    dir="ltr"
                  />
                </div>
              </div>
              {/* Sticky footer - always visible */}
              <div className="shrink-0 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-3">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {isRTL ? 'حفظ' : 'Save'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
