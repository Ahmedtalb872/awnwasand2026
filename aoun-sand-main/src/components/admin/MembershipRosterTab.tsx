import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { Contact2, UserPlus, Trash2, Search, CheckCircle, Image, FileDown } from 'lucide-react';
import { generateFinancialPDF } from '../../utils/pdfGenerator';

// Parses lines like "احمد, 44800028" or "44800028" or "فاطمة - 46xxxxxx"
// into { name, phone } pairs, same convention as the SMS saved-contacts list.
const parseMemberLines = (raw: string): { name: string | null; phone: string }[] => {
  return raw
    .split(/\n+/)
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const phoneMatch = trimmed.match(/(\+?\d[\d\s-]{5,}\d)/);
      if (!phoneMatch) return null;
      const phone = phoneMatch[0].replace(/[\s-]/g, '');
      const name = trimmed.replace(phoneMatch[0], '').replace(/^[,\-–\s]+|[,\-–\s]+$/g, '').trim() || null;
      return { name, phone };
    })
    .filter((c): c is { name: string | null; phone: string } => c !== null);
};

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

  useEffect(() => {
    fetchMembers();
  }, []);

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
    } catch (err: any) {
      toast.error(err.message || (isRTL ? 'فشل الحذف' : 'Failed to delete'));
    }
  };

  const handleTogglePaid = async (id: string, current: boolean) => {
    if (!adminId) return;
    const next = !current;
    setMembers(prev => prev.map(m => m.id === id ? { ...m, paid: next } : m));
    try {
      const { data, error } = await supabase.rpc('admin_set_association_member_paid', { p_admin_id: adminId, p_id: id, p_paid: next });
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
        { label: isRTL ? 'عدد الأعضاء' : 'Total Members', value: stats.total },
        { label: isRTL ? 'دفعوا الرسوم' : 'Paid', value: stats.paid },
        { label: isRTL ? 'استلمت صورة الدفع' : 'Receipt Received', value: stats.receipts },
      ];

      await generateFinancialPDF({
        title: isRTL ? 'تقرير انتساب أعضاء الجمعية' : 'Association Membership Report',
        stats: statCards,
        columns,
        data: rows,
        fileName: 'association_members_report.pdf',
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

        {loading ? (
          <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" /></div>
        ) : (
          <div className="max-h-[28rem] overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 mb-4">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">{isRTL ? 'لا يوجد أعضاء بعد' : 'No members yet'}</div>
            ) : filteredMembers.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 flex-wrap hover:bg-slate-50 dark:hover:bg-slate-800">
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
            placeholder={isRTL ? 'الاسم, الرقم (اختياري الاسم) — سطر لكل عضو\nمثال:\nأحمد, 44800028\n46xxxxxx' : 'Name, number (name optional) — one per line\ne.g.\nAhmed, 44800028\n46xxxxxx'}
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
            ? 'الصق الأسماء والأرقام هنا (سطر لكل عضو)، ثم بدّل حالة "الدفع" و"استلام صورة الدفع" لكل عضو حسب المتابعة.'
            : 'Paste names and numbers here (one per line), then toggle each member\'s "Paid" and "Receipt received" status as you follow up.'}
        </p>
      </div>
    </motion.div>
  );
};
