import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import { useLanguage } from '../../../contexts/LanguageContext';
import toast from 'react-hot-toast';
import {
  Heart, Plus, Edit2, Trash2, Search, X, Save,
  ChevronLeft, ChevronRight, Upload, ExternalLink, CreditCard, Calendar, Download
} from 'lucide-react';
import { generateFinancialPDF, formatPDFDate } from '../../../utils/pdfGenerator';

interface DonationRevenue {
  id: string;
  donor_name: string;
  amount: number;
  payment_method: string;
  donation_date: string;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
}

const PAGE_SIZE = 10;
const PAYMENT_METHODS_AR = ['بنكيلي', 'مصرفي', 'سداد', 'بيم بنك', 'أكليك', 'غزة أبي'];
const PAYMENT_METHODS_EN = ['Bankily', 'Masrvi', 'Sedad', 'BIM Bank', 'Click', 'Ghaza Abi'];

const emptyForm: Partial<DonationRevenue> = {
  donor_name: '',
  amount: 0,
  payment_method: 'بنكيلي',
  donation_date: new Date().toISOString().split('T')[0],
  receipt_url: null,
  notes: '',
};

export const DonationRevenuesTab = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [records, setRecords] = useState<DonationRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const [searchName, setSearchName] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState<Partial<DonationRevenue>>(emptyForm);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => { fetchRecords(); }, [page, searchName, filterMethod, filterDateFrom, filterDateTo]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('donation_revenues')
        .select('*', { count: 'exact' })
        .order('donation_date', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (searchName) query = query.ilike('donor_name', `%${searchName}%`);
      if (filterMethod) query = query.eq('payment_method', filterMethod);
      if (filterDateFrom) query = query.gte('donation_date', filterDateFrom);
      if (filterDateTo) query = query.lte('donation_date', filterDateTo);

      const { data, count, error } = await query;
      if (error) throw error;
      setRecords(data || []);
      setTotal(count || 0);
    } catch (err) {
      toast.error(isRTL ? 'خطأ في تحميل البيانات' : 'Error loading data');
    } finally {
      setLoading(false);
    }
  }, [page, searchName, filterMethod, filterDateFrom, filterDateTo, isRTL]);

  const handleUploadReceipt = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `receipts/donation_incomes/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('financial-docs').upload(fileName, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('financial-docs').getPublicUrl(fileName);
      setEditRecord(p => ({ ...p, receipt_url: data.publicUrl }));
      toast.success(isRTL ? 'تم رفع الإيصال' : 'Receipt uploaded');
    } catch (err: any) {
      toast.error(isRTL ? 'خطأ في رفع الإيصال — تأكد من إنشاء bucket financial-docs' : 'Upload error — ensure financial-docs bucket exists');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      let query = supabase
        .from('donation_revenues')
        .select('*')
        .order('donation_date', { ascending: false });

      if (searchName) query = query.ilike('donor_name', `%${searchName}%`);
      if (filterMethod) query = query.eq('payment_method', filterMethod);
      if (filterDateFrom) query = query.gte('donation_date', filterDateFrom);
      if (filterDateTo) query = query.lte('donation_date', filterDateTo);

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
        ? ['ملاحظات', 'التاريخ', 'طريقة الدفع', 'المبلغ (MRU)', 'اسم المتبرع', '#'] 
        : ['#', 'Donor', 'Amount', 'Bank', 'Date', 'Notes'];
      
      const rows = (data || []).map((r, i) => {
        const _notes = r.notes || '-';
        const _date = formatPDFDate(r.donation_date);
        const _bank = r.payment_method;
        const _amount = `${Number(r.amount).toLocaleString()}`;
        const _name = r.donor_name;
        const _op = `#${i + 1}`;
        return isRTL 
          ? [_notes, _date, _bank, _amount, _name, _op]
          : [_op, _name, _amount, _bank, _date, _notes];
      });

      const stats = [
        { label: isRTL ? 'عدد التبرعات' : 'Total Donations', value: count, subLabel: isRTL ? 'تبرع' : 'donations' },
        { label: isRTL ? 'متوسط التبرع' : 'Avg Amount', value: avg.toLocaleString(), subLabel: 'MRU' },
        { label: isRTL ? 'إجمالي التبرعات' : 'Total Amount', value: totalAmount.toLocaleString(), subLabel: 'MRU' },
        { label: isRTL ? 'عدد المتبرعين' : 'Donors Count', value: new Set((data || []).map(r => r.donor_name)).size, subLabel: isRTL ? 'متبرع' : 'donor' },
      ];

      const totalsRow = isRTL
        ? ['', '', '', `MRU ${totalAmount.toLocaleString()}`, 'الإجمالي', `${count} تبرع`]
        : [`${count} donations`, 'Total', `MRU ${totalAmount.toLocaleString()}`, '', '', ''];

      await generateFinancialPDF({
        title: isRTL ? 'تقرير التبرعات' : 'Donation Revenues Report',
        dateRange: dateRangeStr,
        stats,
        columns,
        data: rows,
        totalsRow,
        fileName: 'donation_revenues_report.pdf',
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
    if (!editRecord.donor_name?.trim()) return toast.error(isRTL ? 'اسم المتبرع مطلوب' : 'Donor name required');
    if (!editRecord.amount || editRecord.amount <= 0) return toast.error(isRTL ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be > 0');

    setSaving(true);
    try {
      const payload = {
        donor_name: editRecord.donor_name,
        amount: editRecord.amount,
        payment_method: editRecord.payment_method,
        donation_date: editRecord.donation_date,
        receipt_url: editRecord.receipt_url || null,
        notes: editRecord.notes || null,
      };

      if (isEditing && editRecord.id) {
        const { error } = await supabase.from('donation_revenues').update(payload).eq('id', editRecord.id);
        if (error) throw error;
        toast.success(isRTL ? '✓ تم التعديل' : '✓ Updated');
      } else {
        const { error } = await supabase.from('donation_revenues').insert(payload);
        if (error) throw error;
        toast.success(isRTL ? '✓ تمت الإضافة' : '✓ Added');
      }

      setShowModal(false);
      setEditRecord(emptyForm);
      setPage(0);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || (isRTL ? 'حدث خطأ' : 'Error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من الحذف؟' : 'Confirm delete?')) return;
    const { error } = await supabase.from('donation_revenues').delete().eq('id', id);
    if (error) toast.error(isRTL ? 'خطأ في الحذف' : 'Delete error');
    else { toast.success(isRTL ? 'تم الحذف' : 'Deleted'); fetchRecords(); }
  };

  const openAdd = () => {
    setEditRecord({ ...emptyForm, payment_method: isRTL ? 'بنكيلي' : 'Bankily' });
    setIsEditing(false);
    setShowModal(true);
  };

  const paymentMethods = isRTL ? PAYMENT_METHODS_AR : PAYMENT_METHODS_EN;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const totalAmount = records.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-5"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute -top-6 -end-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black">{isRTL ? 'مداخيل التبرعات' : 'Donation Revenues'}</h3>
              <p className="text-purple-100 text-xs opacity-90">
                {total} {isRTL ? 'تبرع' : 'donations'} — {isRTL ? 'إجمالي:' : 'Total:'} {totalAmount.toLocaleString()} MRU
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
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-white text-purple-600 rounded-xl font-bold text-sm hover:bg-purple-50 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {isRTL ? 'إضافة' : 'Add'}
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className={`absolute top-3 w-4 h-4 text-slate-400 ${isRTL ? 'right-3' : 'left-3'}`} />
            <input
              type="text"
              placeholder={isRTL ? 'بحث باسم المتبرع...' : 'Search donor name...'}
              value={searchName}
              onChange={e => { setSearchName(e.target.value); setPage(0); }}
              className={`w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500 ${isRTL ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
            />
          </div>
          <select
            value={filterMethod}
            onChange={e => { setFilterMethod(e.target.value); setPage(0); }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">{isRTL ? 'كل البنوك' : 'All Banks'}</option>
            {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setPage(0); }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            title={isRTL ? 'من تاريخ' : 'From'}
          />
          <input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setPage(0); }}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-purple-500"
            title={isRTL ? 'إلى تاريخ' : 'To'}
          />
          {(searchName || filterMethod || filterDateFrom || filterDateTo) && (
            <button
              onClick={() => { setSearchName(''); setFilterMethod(''); setFilterDateFrom(''); setFilterDateTo(''); setPage(0); }}
              className="flex items-center gap-1 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-sm hover:bg-slate-200 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> {isRTL ? 'مسح' : 'Clear'}
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'اسم المتبرع' : 'Donor'}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'المبلغ' : 'Amount'}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'البنك المحوِّل منه' : 'Bank'}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'التاريخ' : 'Date'}</th>
                  <th className="px-5 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'إيصال' : 'Receipt'}</th>
                  <th className="px-5 py-3.5 text-end text-xs font-bold text-slate-400 uppercase tracking-wider">{isRTL ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {records.length === 0 ? (
                  <tr><td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center text-slate-400">
                      <Heart className="w-10 h-10 mb-3 opacity-30" />
                      <p className="font-medium">{isRTL ? 'لا توجد تبرعات بعد' : 'No donations yet'}</p>
                    </div>
                  </td></tr>
                ) : records.map(rec => (
                  <tr key={rec.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{rec.donor_name}</p>
                      {rec.notes && <p className="text-xs text-slate-400 truncate max-w-[150px]">{rec.notes}</p>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-black text-purple-600 dark:text-purple-400">{Number(rec.amount).toLocaleString()} MRU</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs font-bold">
                        <CreditCard className="w-3 h-3" />{rec.payment_method}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-500">
                      {new Date(rec.donation_date).toLocaleDateString(isRTL ? 'ar-MA' : 'en-US')}
                    </td>
                    <td className="px-5 py-4">
                      {rec.receipt_url ? (
                        <a href={rec.receipt_url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-lg text-xs font-bold hover:bg-teal-100 transition-colors">
                          <ExternalLink className="w-3 h-3" />{isRTL ? 'عرض' : 'View'}
                        </a>
                      ) : <span className="text-xs text-slate-300 dark:text-slate-600">{isRTL ? 'لا يوجد إيصال مرفق' : 'No attached receipt'}</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => { setEditRecord({ ...rec }); setIsEditing(true); setShowModal(true); }}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors">
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
            <p className="text-xs text-slate-400">
              {isRTL ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} من ${total}` : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors">
                {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <span className="px-3 py-2 text-sm font-bold text-slate-600 dark:text-slate-300">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition-colors">
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
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black">
                    {isEditing ? (isRTL ? 'تعديل تبرع' : 'Edit Donation') : (isRTL ? 'إضافة تبرع جديد' : 'Add New Donation')}
                  </h3>
                  <button onClick={() => setShowModal(false)} className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'اسم المتبرع *' : 'Donor Name *'}</label>
                  <input type="text" value={editRecord.donor_name || ''} onChange={e => setEditRecord(p => ({ ...p, donor_name: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder={isRTL ? 'اسم المتبرع' : 'Donor name'} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'المبلغ (MRU) *' : 'Amount (MRU) *'}</label>
                    <input type="number" min="0" step="0.01" value={editRecord.amount || ''} onChange={e => setEditRecord(p => ({ ...p, amount: Number(e.target.value) }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'البنك المحوِّل منه' : 'Transferring Bank'}</label>
                    <select value={editRecord.payment_method || ''} onChange={e => setEditRecord(p => ({ ...p, payment_method: e.target.value }))}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500">
                      {paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'تاريخ التبرع' : 'Donation Date'}</label>
                  <input type="date" value={editRecord.donation_date || ''} onChange={e => setEditRecord(p => ({ ...p, donation_date: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500" dir="ltr" />
                </div>
                {/* Receipt upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'إيصال التبرع' : 'Donation Receipt'}</label>
                  {editRecord.receipt_url ? (
                    <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl">
                      <a href={editRecord.receipt_url} target="_blank" rel="noreferrer"
                        className="flex-1 text-teal-600 dark:text-teal-400 text-sm font-bold flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />{isRTL ? 'عرض الإيصال' : 'View Receipt'}
                      </a>
                      <button onClick={() => setEditRecord(p => ({ ...p, receipt_url: null }))}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-900/10 transition-colors">
                      {uploading ? (
                        <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                      ) : <Upload className="w-6 h-6 text-slate-400" />}
                      <span className="text-sm text-slate-500 font-medium">{uploading ? (isRTL ? 'جاري الرفع...' : 'Uploading...') : (isRTL ? 'رفع إيصال (PDF, صورة)' : 'Upload receipt (PDF, image)')}</span>
                      <input type="file" accept=".pdf,image/*" className="hidden"
                        onChange={e => e.target.files?.[0] && handleUploadReceipt(e.target.files[0])} />
                    </label>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                  <textarea rows={2} value={editRecord.notes || ''} onChange={e => setEditRecord(p => ({ ...p, notes: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
                </div>
              </div>
              {/* Sticky footer - always visible */}
              <div className="shrink-0 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-3">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
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
