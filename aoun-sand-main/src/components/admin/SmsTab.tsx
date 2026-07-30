import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { MessageSquare, Send, RefreshCw, CheckCircle, XCircle, Search, AlertTriangle } from 'lucide-react';

const parsePhones = (raw: string): string[] => {
  const found = raw.split(/[\s,;]+/).map(p => p.trim()).filter(Boolean);
  return [...new Set(found)];
};

export const SmsTab = ({ users = [] }: { users?: any[] }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const adminId = sessionStorage.getItem('admin_id');

  const [lang, setLang] = useState<'ar' | 'fr'>('ar');
  const [url, setUrl] = useState('');
  const [messagePreview, setMessagePreview] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [extraPhonesRaw, setExtraPhonesRaw] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [paidUserIds, setPaidUserIds] = useState<Set<string>>(new Set());
  const [loadingMemberships, setLoadingMemberships] = useState(true);

  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    fetchLogs();
    fetchMemberships();
    const key = `sms_message_preview_${lang}`;
    setMessagePreview(localStorage.getItem(key) || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const key = `sms_message_preview_${lang}`;
    setMessagePreview(localStorage.getItem(key) || '');
  }, [lang]);

  const saveMessagePreview = (text: string) => {
    setMessagePreview(text);
    localStorage.setItem(`sms_message_preview_${lang}`, text);
  };

  const fetchMemberships = async () => {
    if (!adminId) { setLoadingMemberships(false); return; }
    setLoadingMemberships(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_all_memberships', { p_admin_id: adminId });
      if (error) throw error;
      const paid = new Set<string>((data || []).filter((m: any) => m.status === 'approved').map((m: any) => m.user_id));
      setPaidUserIds(paid);
    } catch (err: any) {
      toast.error(err.message || 'Error fetching membership status');
    } finally {
      setLoadingMemberships(false);
    }
  };

  const fetchLogs = async () => {
    if (!adminId) { setLoadingLogs(false); return; }
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_sms_logs', { p_admin_id: adminId });
      if (error) throw error;
      setLogs(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Error fetching SMS log');
    } finally {
      setLoadingLogs(false);
    }
  };

  const membersWithPhone = useMemo(() => users.filter(u => u.phone), [users]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return membersWithPhone;
    return membersWithPhone.filter(u =>
      u.full_name?.toLowerCase().includes(q) || u.phone?.includes(q)
    );
  }, [membersWithPhone, search]);

  const toggleMember = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllUnpaidVisible = () => {
    setSelected(prev => {
      const next = new Set(prev);
      filteredMembers.forEach(u => { if (!paidUserIds.has(u.id)) next.add(u.id); });
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const extraPhones = parsePhones(extraPhonesRaw);
  const selectedMemberPhones = users.filter(u => selected.has(u.id) && u.phone).map(u => u.phone);
  const allPhones = useMemo(() => [...new Set([...selectedMemberPhones, ...extraPhones])], [selectedMemberPhones, extraPhones]);

  const handleSend = async () => {
    if (!adminId) { toast.error(isRTL ? 'لا توجد جلسة إدارة' : 'No admin session'); return; }
    if (allPhones.length === 0) { toast.error(isRTL ? 'اختر عضواً واحداً على الأقل أو أضف رقماً' : 'Select at least one member or add a number'); return; }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { admin_id: adminId, phones: allPhones, lang, url: url.trim() || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(isRTL
        ? `تم الإرسال: ${data.sent} نجح، ${data.failed} فشل من أصل ${data.total}`
        : `Sent: ${data.sent} succeeded, ${data.failed} failed out of ${data.total}`);
      clearSelection();
      setExtraPhonesRaw('');
      fetchLogs();
    } catch (err: any) {
      toast.error(err.message || (isRTL ? 'فشل الإرسال' : 'Send failed'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3 mb-1">
          <MessageSquare className="w-8 h-8 text-amber-500" />
          {isRTL ? 'إرسال رسائل SMS' : 'Send SMS'}
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          {isRTL ? 'عبر حملة Chinguisoft — كل رسالة تُخصم من رصيد الحملة.' : 'Via your Chinguisoft campaign — each message is deducted from your balance.'}
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'اللغة' : 'Language'}</label>
            <select value={lang} onChange={e => setLang(e.target.value as 'ar' | 'fr')} className="input-field">
              <option value="ar">{isRTL ? 'العربية' : 'Arabic'}</option>
              <option value="fr">{isRTL ? 'الفرنسية' : 'French'}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'رابط (اختياري)' : 'URL (optional)'}</label>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} className="input-field" placeholder="https://example.com/..." />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            {isRTL ? `الرسالة التي سترسل (${lang === 'ar' ? 'عربي' : 'فرنسي'})` : `Message that will be sent (${lang})`}
          </label>
          <textarea
            rows={2}
            value={messagePreview}
            onChange={e => saveMessagePreview(e.target.value)}
            className="input-field"
            placeholder={isRTL ? 'اكتب هنا نص رسالتك المضبوطة في حسابك بشينقيسوفت، فقط للمعاينة والتذكير' : 'Write your campaign message here, for preview/reminder only'}
          />
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5 mt-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {isRTL
              ? 'هذا النص للمعاينة فقط ولا يُرسل من هنا — نص الرسالة الفعلي ثابت ومضبوط داخل حساب شينقيسوفت ولا يمكن تغييره من هذه الصفحة.'
              : 'This is a preview only and is not transmitted — the actual message text is fixed inside your Chinguisoft account and cannot be changed from this page.'}
          </p>
        </div>

        {/* Member list with payment status */}
        <div className="mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              {isRTL ? 'الأعضاء' : 'Members'}
            </label>
            <div className="flex items-center gap-2">
              <button onClick={selectAllUnpaidVisible} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                {isRTL ? 'تحديد كل من لم يدفع' : 'Select all unpaid'}
              </button>
              <button onClick={clearSelection} className="text-xs font-bold text-slate-500 hover:underline">
                {isRTL ? 'إلغاء التحديد' : 'Clear'}
              </button>
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
          {loadingMemberships ? (
            <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" /></div>
          ) : (
            <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
              {filteredMembers.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">{isRTL ? 'لا يوجد أعضاء' : 'No members'}</div>
              ) : filteredMembers.map(u => {
                const paid = paidUserIds.has(u.id);
                return (
                  <label key={u.id} className={`flex items-center gap-3 p-3 ${paid ? 'opacity-60' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    <input
                      type="checkbox"
                      checked={selected.has(u.id)}
                      disabled={paid}
                      onChange={() => toggleMember(u.id)}
                      className="w-4 h-4"
                    />
                    <span className="flex-1 min-w-0 font-bold text-sm text-slate-700 dark:text-slate-200 truncate">{u.full_name}</span>
                    <span className="font-mono text-xs text-slate-400">{u.phone}</span>
                    {paid ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0"><CheckCircle className="w-3 h-3" />{isRTL ? 'تم الدفع' : 'Paid'}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">{isRTL ? 'لم يدفع' : 'Unpaid'}</span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
          <p className="text-xs text-slate-400 mt-2">
            {isRTL
              ? `${selected.size} عضو محدد · الأعضاء اللي "تم الدفع" أمامهم لا يمكن تحديدهم، حتى لا تُرسل لهم الرسالة مجدداً.`
              : `${selected.size} members selected · Members marked "Paid" can't be selected, so they won't receive this message again.`}
          </p>
        </div>

        {/* Extra numbers not tied to a member account */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            {isRTL ? 'أرقام إضافية (غير مسجلين، اختياري)' : 'Extra numbers (not registered members, optional)'}
          </label>
          <textarea
            rows={3}
            value={extraPhonesRaw}
            onChange={e => setExtraPhonesRaw(e.target.value)}
            className="input-field font-mono text-sm"
            placeholder={isRTL ? '44800028\n46xxxxxx\n...' : '44800028\n46xxxxxx\n...'}
          />
        </div>

        <button
          onClick={handleSend}
          disabled={isSending || allPhones.length === 0}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold disabled:opacity-50"
        >
          {isSending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
          {isSending ? (isRTL ? 'جاري الإرسال...' : 'Sending...') : (isRTL ? `إرسال إلى ${allPhones.length} رقم` : `Send to ${allPhones.length} numbers`)}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">{isRTL ? 'سجل الإرسال الأخير' : 'Recent Send Log'}</h3>
          <button onClick={fetchLogs} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><RefreshCw className="w-4 h-4 text-slate-600 dark:text-slate-300" /></button>
        </div>
        {loadingLogs ? (
          <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">{isRTL ? 'لا يوجد سجل بعد' : 'No log yet'}</div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map(l => (
              <div key={l.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-sm">
                <div className="flex items-center gap-2">
                  {l.status === 'sent' ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" /> : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  <span className="font-mono font-bold text-slate-700 dark:text-slate-200">{l.phone}</span>
                  {l.error && <span className="text-xs text-red-500 truncate max-w-xs">{l.error}</span>}
                </div>
                <span className="text-xs text-slate-400">{new Date(l.created_at).toLocaleString('ar-EG')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
