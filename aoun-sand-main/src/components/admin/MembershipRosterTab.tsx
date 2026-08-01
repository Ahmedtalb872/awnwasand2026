import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { Contact2, UserPlus, Trash2, Search, CheckCircle, Image, FileDown, CalendarClock, RotateCcw } from 'lucide-react';
import { generateFinancialPDF } from '../../utils/pdfGenerator';

// Parses lines like "احمد, 44800028" or "44800028" or "فاطمة - 46xxxxxx"
// into { name, phone, paid } triples, same convention as the SMS saved-contacts list.
// A trailing ✅ marks the member as already paid (e.g. from a WhatsApp roster export).
const parseMemberLines = (raw: string): { name: string | null; phone: string; paid: boolean }[] => {
  return raw
    .split(/\n+/)
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const paid = /✅️?/.test(trimmed);
      const withoutCheck = trimmed.replace(/✅️?/g, '').trim();
      const phoneMatch = withoutCheck.match(/(\+?\d[\d\s-]{5,}\d)/);
      if (!phoneMatch) return null;
      const phone = phoneMatch[0].replace(/[\s-]/g, '');
      const name = withoutCheck.replace(phoneMatch[0], '').replace(/^[,\-–\s]+|[,\-–\s]+$/g, '').trim() || null;
      return { name, phone, paid };
    })
    .filter((c): c is { name: string | null; phone: string; paid: boolean } => c !== null);
};

const currentMonthValue = () => new Date().toISOString().slice(0, 7);

export const MembershipRosterTab = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const adminId = sessionStorage.getItem('admin_id');

  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newMembersRaw, setNewMembersRaw] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [feeMonth, setFeeMonth] = useState(() => localStorage.getItem('association_members_fee_month') || currentMonthValue());
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  const changeFeeMonth = (value: string) => {
    setFeeMonth(value);
    localStorage.setItem('association_members_fee_month', value);
  };

  const fetchMembers = async () => {
    if (!adminId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_association_members', { p_admin_id: adminId });
      if (error) throw error;
      setMembers(data || []);
    } catch (err: any) {
      toast.error(err.message || (isRTL ? 'فشل جلب قائمة الأعضاء' : 'Failed to fetch members'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddMembers = async () => {
    if (!adminId) return;
    const parsed = parseMemberLines(newMembersRaw);
    if (parsed.length === 0) {
      toast.error(isRTL ? 'لم يتم العثور على أرقام صالحة' : 'No valid numbers found');
      return;
    }
    setIsAdding(true);
    try {
      const { data, error } = await supabase.rpc('admin_add_association_members', {
        p_admin_id: adminId,
        p_members: parsed,
        p_fee_month: feeMonth,
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.message);
      toast.success(isRTL ? `تمت إضافة ${data.count} عضو` : `Added ${data.count} member(s)`);
      setNewMembersRaw('');
      fetchMembers();
    } catch (err: any) {
      toast.error(err.message || (isRTL ? 'فشلت الإضافة' : 'Failed to add'));
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!adminId) return;
    try {
      const { error } = await supabase.rpc('admin_delete_association_member', { p_admin_id: adminId, p_id: id });
      if (error) throw error;
      setMembers(prev => prev.filter(m => m.id !== id));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    } catch (err: any) {
      toast.error(err.message || (isRTL ? 'فشل الحذف' : 'Failed to delete'));
    }
  };

  const handleTogglePaid = async (id: string, current: boolean) => {
    if (!adminId) return;
    const next = !current;
    setMembers(prev => prev.map(m => m.id === id ? { ...m, paid: next, fee_month: next ? feeMonth : m.fee_month } : m));
    try {
      const { data, error } = await supabase.rpc('admin_set_association_member_paid', { p_admin_id: adminId, p_id: id, p_paid: next, p_fee_month: feeMonth });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.message);
    } catch (err: any) {
      setMembers(prev => prev.map(m => m.id === id ? { ...m, paid: current } : m));
      toast.error(err.message || (isRTL ? 'فشل تحديث حالة الدفع' : 'Failed to update paid status'));
    }
  };

  const handleToggleReceipt = async (id: string, current: boolean) => {
    if (!adminId) return;
    const next = !current;
    setMembers(prev => prev.map(m => m.id === id ? { ...m, receipt_received: next } : m));
    try {
      const { data, error } = await supabase.rpc('admin_set_association_member_receipt', { p_admin_id: adminId, p_id: id, p_received: next });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.message);
    } catch (err: any) {
      setMembers(prev => prev.map(m => m.id === id ? { ...m, receipt_received: current } : m));
      toast.error(err.message || (isRTL ? 'فشل تحديث حالة الإيصال' : 'Failed to update receipt status'));
    }
  };

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(m => m.name?.toLowerCase().includes(q) || m.phone?.includes(q));
  }, [members, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAllVisible = () => setSelectedIds(new Set(filteredMembers.map(m => m.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkSetPaid = async (paid: boolean) => {
    if (!adminId || selectedIds.size === 0) return;
    const ids = [...selectedIds];
    const prevMembers = members;
    setMembers(prev => prev.map(m => ids.includes(m.id) ? { ...m, paid, fee_month: paid ? feeMonth : m.fee_month } : m));
    try {
      const { data, error } = await supabase.rpc('admin_set_association_members_paid_bulk', {
        p_admin_id: adminId, p_ids: ids, p_paid: paid, p_fee_month: feeMonth,
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.message);
      toast.success(paid
        ? (isRTL ? `تم وضع ${ids.length} عضو كـ"دفعوا"` : `${ids.length} member(s) marked as paid`)
        : (isRTL ? `تم وضع ${ids.length} عضو كـ"لم يدفعوا"` : `${ids.length} member(s) marked as unpaid`));
      clearSelection();
    } catch (err: any) {
      setMembers(prevMembers);
      toast.error(err.message || (isRTL ? 'فشل تحديث الحالة' : 'Failed to update status'));
    }
  };

  const handleResetAllPaid = async () => {
    if (!adminId) return;
    const confirmed = window.confirm(isRTL
      ? `هل أنت متأكد؟ سيتم وضع جميع الأعضاء (${stats.total}) كـ"لم يدفعوا" — يُستخدم هذا لبدء تحصيل شهر جديد.`
      : `Are you sure? All ${stats.total} members will be marked "unpaid" — use this to start a new month's collection.`);
    if (!confirmed) return;
    setIsResetting(true);
    const prevMembers = members;
    setMembers(prev => prev.map(m => ({ ...m, paid: false })));
    try {
      const { data, error } = await supabase.rpc('admin_reset_association_members_paid', { p_admin_id: adminId });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.message);
      toast.success(isRTL ? 'تم وضع جميع الأعضاء كـ"لم يدفعوا"' : 'All members marked as unpaid');
      clearSelection();
    } catch (err: any) {
      setMembers(prevMembers);
      toast.error(err.message || (isRTL ? 'فشلت العملية' : 'Failed to reset'));
    } finally {
      setIsResetting(false);
    }
  };

  const stats = useMemo(() => ({
    total: members.length,
    paid: members.filter(m => m.paid).length,
    receipts: members.filter(m => m.receipt_received).length,
  }), [members]);

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const columns = isRTL
        ? ['استلام صورة الدفع', 'حالة الدفع', 'الهاتف', 'الاسم', '#']
        : ['#', 'Name', 'Phone', 'Paid', 'Receipt received'];

      const rows = filteredMembers.map((m, i) => {
        const num = `#${i + 1}`;
        const name = m.name || (isRTL ? 'بدون اسم' : 'No name');
        const paidLabel = m.paid ? (isRTL ? 'تم الدفع' : 'Paid') : (isRTL ? 'لم يدفع' : 'Unpaid');
        const receiptLabel = m.receipt_received ? (isRTL ? 'نعم' : 'Yes') : (isRTL ? 'لا' : 'No');
        return isRTL
          ? [receiptLabel, paidLabel, m.phone, name, num]
          : [num, name, m.phone, paidLabel, receiptLabel];
      });

      const statCards = [
        { label: isRTL ? 'شهر التحصيل' : 'Collection Month', value: feeMonth },
        { label: isRTL ? 'عدد الأعضاء' : 'Total Members', value: stats.total },
        { label: isRTL ? 'دفعوا الرسوم' : 'Paid', value: stats.paid },
        { label: isRTL ? 'استلمت صورة الدفع' : 'Receipt Received', value: stats.receipts },
      ];

      await generateFinancialPDF({
        title: isRTL ? 'تقرير انتساب أعضاء الجمعية' : 'Association Membership Report',
        stats: statCards,
        columns,
        data: rows,
        fileName: `association_members_report_${feeMonth}.pdf`,
        logoUrl: '/logo.png',
      });
    } catch (err: any) {
      toast.error(err.message || (isRTL ? 'فشل إنشاء التقرير' : 'Failed to generate report'));
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-1">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Contact2 className="w-8 h-8 text-indigo-500" />
            {isRTL ? 'انتساب أعضاء الجمعية' : "Association Members' Membership"}
          </h2>
          <button
            onClick={handleDownloadPDF}
            disabled={downloadingPDF || filteredMembers.length === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 shrink-0"
          >
            {downloadingPDF ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FileDown className="w-4 h-4" />}
            {isRTL ? 'تنزيل تقرير PDF' : 'Download PDF report'}
          </button>
        </div>
        <p className="text-slate-500 text-sm mb-6">
          {isRTL ? 'قائمة أعضاء الجمعية مع حالة دفع رسوم الانتساب واستلام صورة إيصال الدفع.' : 'Association members list with membership fee payment status and receipt-photo status.'}
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300 shrink-0">
            <CalendarClock className="w-4 h-4 text-indigo-500" />
            {isRTL ? 'شهر جمع الرسوم الحالي' : 'Current fee-collection month'}
          </label>
          <input
            type="month"
            value={feeMonth}
            onChange={e => changeFeeMonth(e.target.value)}
            className="input-field w-full sm:w-auto"
          />
          <button
            onClick={handleResetAllPaid}
            disabled={isResetting || stats.total === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-bold text-sm disabled:opacity-50 sm:ms-auto"
            title={isRTL ? 'يضع جميع الأعضاء كـ"لم يدفعوا" لبدء تحصيل شهر جديد' : 'Marks all members "unpaid" to start a new month\'s collection'}
          >
            {isResetting ? <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            {isRTL ? 'جعل الجميع لم يدفعوا' : 'Mark everyone unpaid'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-slate-800 dark:text-white">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-1">{isRTL ? 'إجمالي الأعضاء' : 'Total members'}</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{stats.paid}</p>
            <p className="text-xs text-slate-500 mt-1">{isRTL ? 'دفعوا الرسوم' : 'Paid'}</p>
          </div>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-indigo-700 dark:text-indigo-400">{stats.receipts}</p>
            <p className="text-xs text-slate-500 mt-1">{isRTL ? 'استلمت صورة الدفع' : 'Receipt received'}</p>
          </div>
        </div>

        <div className="relative mb-2">
          <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-slate-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            className="input-field ps-9"
            placeholder={isRTL ? 'ابحث بالاسم أو الهاتف...' : 'Search name or phone...'}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-2">
          <button onClick={selectAllVisible} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
            {isRTL ? 'تحديد الكل' : 'Select all'}
          </button>
          <button onClick={clearSelection} className="text-xs font-bold text-slate-500 hover:underline">
            {isRTL ? 'إلغاء التحديد' : 'Clear'}
          </button>
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-slate-400">{isRTL ? `${selectedIds.size} محدد` : `${selectedIds.size} selected`}</span>
              <button
                onClick={() => handleBulkSetPaid(true)}
                className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full text-emerald-700 bg-emerald-100 hover:bg-emerald-200"
              >
                <CheckCircle className="w-3 h-3" />
                {isRTL ? 'وضع المحددين: دفعوا' : 'Mark selected: paid'}
              </button>
              <button
                onClick={() => handleBulkSetPaid(false)}
                className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full text-amber-700 bg-amber-100 hover:bg-amber-200"
              >
                {isRTL ? 'وضع المحددين: لم يدفعوا' : 'Mark selected: unpaid'}
              </button>
            </>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" /></div>
        ) : (
          <div className="max-h-[28rem] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 mb-4">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">{isRTL ? 'لا يوجد أعضاء بعد' : 'No members yet'}</div>
            ) : filteredMembers.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 flex-wrap hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={selectedIds.has(m.id)}
                  onChange={() => toggleSelect(m.id)}
                  className="w-4 h-4"
                />
                <span className="flex-1 min-w-0 font-bold text-sm text-slate-700 dark:text-slate-200 truncate">
                  {m.name || (isRTL ? 'بدون اسم' : 'No name')}
                </span>
                <span className="font-mono text-xs text-slate-400">{m.phone}</span>
                <button
                  onClick={() => handleTogglePaid(m.id, m.paid)}
                  className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full shrink-0 transition-colors ${
                    m.paid
                      ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200'
                      : 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                  }`}
                  title={isRTL ? 'اضغط لتغيير حالة الدفع' : 'Click to toggle paid status'}
                >
                  {m.paid && <CheckCircle className="w-3 h-3" />}
                  {m.paid ? (isRTL ? 'تم الدفع' : 'Paid') : (isRTL ? 'لم يدفع' : 'Unpaid')}
                  {m.paid && m.fee_month && <span className="opacity-70">({m.fee_month})</span>}
                </button>
                <button
                  onClick={() => handleToggleReceipt(m.id, m.receipt_received)}
                  className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full shrink-0 transition-colors ${
                    m.receipt_received
                      ? 'text-indigo-700 bg-indigo-100 hover:bg-indigo-200'
                      : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                  }`}
                  title={isRTL ? 'اضغط لتغيير حالة استلام صورة الدفع' : 'Click to toggle receipt-received status'}
                >
                  {m.receipt_received && <Image className="w-3 h-3" />}
                  {m.receipt_received ? (isRTL ? 'استُلمت الصورة' : 'Receipt received') : (isRTL ? 'لم تُستلم الصورة' : 'No receipt')}
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg shrink-0"
                  aria-label={isRTL ? 'حذف' : 'Delete'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 items-start">
          <textarea
            rows={3}
            value={newMembersRaw}
            onChange={e => setNewMembersRaw(e.target.value)}
            className="input-field font-mono text-sm flex-1"
            placeholder={isRTL ? 'الاسم, الرقم ✅ (اختياري الاسم، و✅ تعني تم الدفع) — سطر لكل عضو\nمثال:\nأحمد, 44800028 ✅\n46xxxxxx' : 'Name, number ✅ (name optional, ✅ marks paid) — one per line\ne.g.\nAhmed, 44800028 ✅\n46xxxxxx'}
          />
          <button
            onClick={handleAddMembers}
            disabled={isAdding || !newMembersRaw.trim()}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 shrink-0 w-full sm:w-auto"
          >
            {isAdding ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {isRTL ? 'إضافة أعضاء' : 'Add members'}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {isRTL
            ? `الصق الأسماء والأرقام هنا (سطر لكل عضو). إضافة ✅ في نهاية السطر تُدرج العضو كـ"تم الدفع" لشهر ${feeMonth} مباشرة. بعد ذلك بدّل حالة "الدفع" و"استلام صورة الدفع" لكل عضو، أو حدّد عدة أعضاء وبدّل حالتهم دفعة واحدة، أو اضغط "جعل الجميع لم يدفعوا" عند بدء شهر تحصيل جديد.`
            : `Paste names and numbers here (one per line). A trailing ✅ marks that member as already paid for ${feeMonth}. Afterward, toggle each member's status individually, select several and change them together, or click "Mark everyone unpaid" to start a new month's collection.`}
        </p>
      </div>
    </motion.div>
  );
};
