import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { MessageSquare, Send, RefreshCw, CheckCircle, XCircle, Search, AlertTriangle, UserPlus, Trash2, Table2 } from 'lucide-react';

const parsePhones = (raw: string): string[] => {
  const found = raw.split(/[\s,;]+/).map(p => p.trim()).filter(Boolean);
  return [...new Set(found)];
};

// Parses lines like "احمد, 44800028" or "44800028" or "فاطمة - 46xxxxxx"
// into { name, phone } pairs for the saved-contacts table.
const parseContactLines = (raw: string): { name: string | null; phone: string }[] => {
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

const DONATION_NUMBER = '32203250';
const DEFAULT_MESSAGES: Record<'ar' | 'fr', string> = {
  ar: `تذكير من جمعية عون وسند: يرجى دفع رسوم الانتساب على الرقم ${DONATION_NUMBER}. جزاكم الله خيراً.`,
  fr: `Rappel de l'association Awn Wa Sanad : merci de régler vos frais d'adhésion au numéro ${DONATION_NUMBER}.`,
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

  const [contacts, setContacts] = useState<any[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [selectedContactIds, setSelectedContactIds] = useState<Set<string>>(new Set());
  const [newContactsRaw, setNewContactsRaw] = useState('');
  const [isAddingContacts, setIsAddingContacts] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  useEffect(() => {
    fetchLogs();
    fetchMemberships();
    fetchContacts();
    const key = `sms_message_preview_${lang}`;
    setMessagePreview(localStorage.getItem(key) || DEFAULT_MESSAGES[lang]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const key = `sms_message_preview_${lang}`;
    setMessagePreview(localStorage.getItem(key) || DEFAULT_MESSAGES[lang]);
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

  const fetchContacts = async () => {
    if (!adminId) { setLoadingContacts(false); return; }
    setLoadingContacts(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_sms_contacts', { p_admin_id: adminId });
      if (error) throw error;
      setContacts(data || []);
    } catch (err: any) {
      toast.error(err.message || 'Error fetching contacts');
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleAddContacts = async () => {
    if (!adminId) return;
    const parsed = parseContactLines(newContactsRaw);
    if (parsed.length === 0) {
      toast.error(isRTL ? 'لم يتم العثور على أرقام صالحة' : 'No valid numbers found');
      return;
    }
    setIsAddingContacts(true);
    try {
      const { data, error } = await supabase.rpc('admin_add_sms_contacts', {
        p_admin_id: adminId,
        p_contacts: parsed,
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.message);
      toast.success(isRTL ? `تمت إضافة ${data.count} رقم` : `Added ${data.count} number(s)`);
      setNewContactsRaw('');
      fetchContacts();
    } catch (err: any) {
      toast.error(err.message || (isRTL ? 'فشلت الإضافة' : 'Failed to add'));
    } finally {
      setIsAddingContacts(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!adminId) return;
    try {
      const { error } = await supabase.rpc('admin_delete_sms_contact', { p_admin_id: adminId, p_id: id });
      if (error) throw error;
      setContacts(prev => prev.filter(c => c.id !== id));
      setSelectedContactIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    } catch (err: any) {
      toast.error(err.message || (isRTL ? 'فشل الحذف' : 'Failed to delete'));
    }
  };

  const handleToggleContactPaid = async (id: string, currentPaid: boolean) => {
    if (!adminId) return;
    const nextPaid = !currentPaid;
    // Optimistic update
    setContacts(prev => prev.map(c => c.id === id ? { ...c, paid: nextPaid } : c));
    if (nextPaid) setSelectedContactIds(prev => { const next = new Set(prev); next.delete(id); return next; });
    try {
      const { data, error } = await supabase.rpc('admin_set_sms_contact_paid', { p_admin_id: adminId, p_id: id, p_paid: nextPaid });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.message);
    } catch (err: any) {
      // Revert on failure
      setContacts(prev => prev.map(c => c.id === id ? { ...c, paid: currentPaid } : c));
      toast.error(err.message || (isRTL ? 'فشل تحديث حالة الدفع' : 'Failed to update paid status'));
    }
  };

  const toggleContact = (id: string) => {
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filteredContacts = useMemo(() => {
    const q = contactSearch.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(c =>
      c.name?.toLowerCase().includes(q) || c.phone?.includes(q)
    );
  }, [contacts, contactSearch]);

  const selectAllUnpaidContacts = () => {
    setSelectedContactIds(prev => {
      const next = new Set(prev);
      filteredContacts.forEach(c => { if (!c.paid) next.add(c.id); });
      return next;
    });
  };
  const clearContactSelection = () => setSelectedContactIds(new Set());

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
  const selectedContactPhones = contacts.filter(c => selectedContactIds.has(c.id)).map(c => c.phone);
  const allPhones = useMemo(
    () => [...new Set([...selectedMemberPhones, ...selectedContactPhones, ...extraPhones])],
    [selectedMemberPhones, selectedContactPhones, extraPhones]
  );

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
      clearContactSelection();
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
              ? 'هذا النص للمعاينة فقط، لا يُرسل من هنا. لجعله فعلياً هو النص المُرسل، تواصل مع دعم شينقيسوفت واطلب منهم ضبط نص هذه الحملة بهذا النص بالضبط لكل لغة — لا يوجد إعداد بالموقع أو بحسابك يتيح تغييره غير ذلك.'
              : 'Preview only — not transmitted from here. To make this the actual text sent, contact Chinguisoft support and ask them to set this campaign\'s message to this exact wording per language — there is no setting on this site or in your account that changes it otherwise.'}
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

        {/* Saved contacts table (persistent, not tied to a member account) */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Table2 className="w-4 h-4" />
              {isRTL ? 'قائمة أرقام محفوظة' : 'Saved contacts list'}
            </label>
            <div className="flex items-center gap-2">
              <button onClick={selectAllUnpaidContacts} className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
                {isRTL ? 'تحديد كل من لم يدفع' : 'Select all unpaid'}
              </button>
              <button onClick={clearContactSelection} className="text-xs font-bold text-slate-500 hover:underline">
                {isRTL ? 'إلغاء التحديد' : 'Clear'}
              </button>
            </div>
          </div>

          <div className="relative mb-2">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-slate-400" />
            <input
              type="text" value={contactSearch} onChange={e => setContactSearch(e.target.value)}
              className="input-field ps-9"
              placeholder={isRTL ? 'ابحث بالاسم أو الهاتف...' : 'Search name or phone...'}
            />
          </div>

          {loadingContacts ? (
            <div className="flex justify-center py-6"><div className="w-6 h-6 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" /></div>
          ) : (
            <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 mb-3">
              {filteredContacts.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">{isRTL ? 'لا توجد أرقام محفوظة بعد' : 'No saved contacts yet'}</div>
              ) : filteredContacts.map(c => (
                <div key={c.id} className={`flex items-center gap-3 p-3 ${c.paid ? 'opacity-60' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                  <input
                    type="checkbox"
                    checked={selectedContactIds.has(c.id)}
                    disabled={c.paid}
                    onChange={() => toggleContact(c.id)}
                    className="w-4 h-4"
                  />
                  <span className="flex-1 min-w-0 font-bold text-sm text-slate-700 dark:text-slate-200 truncate">
                    {c.name || (isRTL ? 'بدون اسم' : 'No name')}
                  </span>
                  <span className="font-mono text-xs text-slate-400">{c.phone}</span>
                  <button
                    onClick={() => handleToggleContactPaid(c.id, c.paid)}
                    className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full shrink-0 transition-colors ${
                      c.paid
                        ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200'
                        : 'text-amber-700 bg-amber-100 hover:bg-amber-200'
                    }`}
                    title={isRTL ? 'اضغط لتغيير حالة الدفع' : 'Click to toggle paid status'}
                  >
                    {c.paid && <CheckCircle className="w-3 h-3" />}
                    {c.paid ? (isRTL ? 'تم الدفع' : 'Paid') : (isRTL ? 'لم يدفع' : 'Unpaid')}
                  </button>
                  <button
                    onClick={() => handleDeleteContact(c.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg shrink-0"
                    aria-label={isRTL ? 'حذف' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new numbers to the saved list */}
          <div className="flex flex-col sm:flex-row gap-2 items-start">
            <textarea
              rows={2}
              value={newContactsRaw}
              onChange={e => setNewContactsRaw(e.target.value)}
              className="input-field font-mono text-sm flex-1"
              placeholder={isRTL ? 'الاسم, الرقم (اختياري الاسم) — سطر لكل رقم\nمثال:\nأحمد, 44800028\n46xxxxxx' : 'Name, number (name optional) — one per line\ne.g.\nAhmed, 44800028\n46xxxxxx'}
            />
            <button
              onClick={handleAddContacts}
              disabled={isAddingContacts || !newContactsRaw.trim()}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm disabled:opacity-50 shrink-0 w-full sm:w-auto"
            >
              {isAddingContacts ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UserPlus className="w-4 h-4" />}
              {isRTL ? 'إضافة إلى القائمة' : 'Add to list'}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {isRTL
              ? `${selectedContactIds.size} رقم محدد من القائمة المحفوظة · اضغط على "لم يدفع" بجانب أي رقم لتعليمه كـ"تم الدفع" فلا يعود يُمكن تحديده لإرسال آخر.`
              : `${selectedContactIds.size} selected from the saved list · click "Unpaid" next to a number to mark it "Paid", after which it can no longer be selected for another send.`}
          </p>
        </div>

        {/* Extra numbers not tied to a member account */}
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
            {isRTL ? 'أرقام إضافية لمرة واحدة (اختياري)' : 'One-off extra numbers (optional)'}
          </label>
          <textarea
            rows={3}
            value={extraPhonesRaw}
            onChange={e => setExtraPhonesRaw(e.target.value)}
            className="input-field font-mono text-sm"
            placeholder={isRTL ? '44800028\n46xxxxxx\n...' : '44800028\n46xxxxxx\n...'}
          />
          <p className="text-xs text-slate-400 mt-2">
            {isRTL ? 'أرقام تُستخدم لهذا الإرسال فقط ولا تُحفظ. لحفظها بشكل دائم استخدم "قائمة أرقام محفوظة" أعلاه.' : 'Used only for this send and not saved. To keep numbers permanently, use "Saved contacts list" above.'}
          </p>
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
