import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { MessageSquare, Send, Users, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

const parsePhones = (raw: string): string[] => {
  const found = raw.split(/[\s,;]+/).map(p => p.trim()).filter(Boolean);
  return [...new Set(found)];
};

export const SmsTab = ({ users = [] }: { users?: any[] }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const adminId = sessionStorage.getItem('admin_id');

  const [rawPhones, setRawPhones] = useState('');
  const [lang, setLang] = useState<'ar' | 'fr'>('ar');
  const [url, setUrl] = useState('');
  const [isSending, setIsSending] = useState(false);

  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const phones = parsePhones(rawPhones);

  useEffect(() => { fetchLogs(); }, []);

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

  const useAllMembers = () => {
    const memberPhones = users.map(u => u.phone).filter(Boolean);
    setRawPhones(memberPhones.join('\n'));
  };

  const handleSend = async () => {
    if (!adminId) { toast.error(isRTL ? 'لا توجد جلسة إدارة' : 'No admin session'); return; }
    if (phones.length === 0) { toast.error(isRTL ? 'أضف رقم هاتف واحد على الأقل' : 'Add at least one phone number'); return; }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: { admin_id: adminId, phones, lang, url: url.trim() || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(isRTL
        ? `تم الإرسال: ${data.sent} نجح، ${data.failed} فشل من أصل ${data.total}`
        : `Sent: ${data.sent} succeeded, ${data.failed} failed out of ${data.total}`);
      setRawPhones('');
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

        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
            {isRTL ? 'أرقام الهواتف (سطر أو فاصلة لكل رقم)' : 'Phone numbers (one per line or comma-separated)'}
          </label>
          <button onClick={useAllMembers} className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
            <Users className="w-3.5 h-3.5" />{isRTL ? 'استخدام كل أرقام الأعضاء' : 'Use all member numbers'}
          </button>
        </div>
        <textarea
          rows={6}
          value={rawPhones}
          onChange={e => setRawPhones(e.target.value)}
          className="input-field font-mono text-sm"
          placeholder={isRTL ? '44800028\n46xxxxxx\n...' : '44800028\n46xxxxxx\n...'}
        />
        <p className="text-xs text-slate-400 mt-1 mb-4">{phones.length} {isRTL ? 'رقم جاهز للإرسال' : 'numbers ready to send'}</p>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'اللغة' : 'Language'}</label>
            <select value={lang} onChange={e => setLang(e.target.value as 'ar' | 'fr')} className="input-field">
              <option value="ar">{isRTL ? 'العربية' : 'Arabic'}</option>
              <option value="fr">{isRTL ? 'الفرنسية' : 'French'}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'رابط (اختياري)' : 'URL (optional)'}</label>
            <input type="url" value={url} onChange={e => setUrl(e.target.value)} className="input-field" placeholder="https://awnwasand.site/..." />
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={isSending || phones.length === 0}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold disabled:opacity-50"
        >
          {isSending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
          {isSending ? (isRTL ? 'جاري الإرسال...' : 'Sending...') : (isRTL ? `إرسال إلى ${phones.length} رقم` : `Send to ${phones.length} numbers`)}
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
