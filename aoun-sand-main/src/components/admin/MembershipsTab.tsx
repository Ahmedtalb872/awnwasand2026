import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { CreditCard, CheckCircle, XCircle, Clock, ExternalLink, RefreshCw } from 'lucide-react';

export const MembershipsTab = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [memberships, setMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const adminId = sessionStorage.getItem('admin_id');

  useEffect(() => {
    fetchMemberships();
    const sub = supabase.channel('admin:memberships')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_memberships' }, fetchMemberships)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const fetchMemberships = async () => {
    setLoading(true);
    try {
      if (adminId) {
        const { data, error } = await supabase.rpc('admin_get_all_memberships', { p_admin_id: adminId });
        if (error) throw error;
        // Enrich with user data
        const userIds = [...new Set((data || []).map((m: any) => m.user_id))];
        let usersMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: usersData } = await supabase.from('users').select('id, full_name, phone').in('id', userIds);
          (usersData || []).forEach((u: any) => { usersMap[u.id] = u; });
        }
        setMemberships((data || []).map((m: any) => ({ ...m, user: usersMap[m.user_id] })));
      } else {
        // Fallback – no admin ID in session, try directly (for env-based admin)
        const { data } = await supabase.from('user_memberships').select('*').order('created_at', { ascending: false });
        setMemberships(data || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error fetching memberships');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (!adminId) { toast.error('No admin session'); return; }
    setProcessingId(id);
    try {
      const { data } = await supabase.rpc('admin_update_membership_status', {
        p_admin_id: adminId,
        p_membership_id: id,
        p_status: status
      });
      if (data?.success === false) throw new Error(data.message);
      toast.success(status === 'approved' ? (isRTL ? 'تم القبول' : 'Approved') : (isRTL ? 'تم الرفض' : 'Rejected'));
      fetchMemberships();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = filterStatus === 'all' ? memberships : memberships.filter(m => m.status === filterStatus);

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'approved') return <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3"/>تم الدفع</span>;
    if (status === 'rejected') return <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full"><XCircle className="w-3 h-3"/>مرفوض</span>;
    return <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full"><Clock className="w-3 h-3"/>قيد الانتظار</span>;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-indigo-500" />
            {isRTL ? 'رسوم الانتساب' : 'Membership Fees'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">{memberships.length} {isRTL ? 'إجمالي' : 'Total'} · {memberships.filter(m => m.status === 'pending').length} {isRTL ? 'بانتظار المراجعة' : 'Pending'}</p>
        </div>
        <div className="flex gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold">
            <option value="all">{isRTL ? 'الكل' : 'All'}</option>
            <option value="pending">{isRTL ? 'قيد الانتظار' : 'Pending'}</option>
            <option value="approved">{isRTL ? 'مقبول' : 'Approved'}</option>
            <option value="rejected">{isRTL ? 'مرفوض' : 'Rejected'}</option>
          </select>
          <button onClick={fetchMemberships} className="p-2 bg-slate-100 rounded-xl"><RefreshCw className="w-5 h-5 text-slate-600" /></button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"/></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">{isRTL ? 'لا توجد سجلات' : 'No records'}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <div key={m.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 dark:text-white">{m.user?.full_name || m.user_id}</p>
                <p className="text-sm text-slate-500">{m.user?.phone} · {new Date(m.created_at).toLocaleDateString('ar-EG')}</p>
                {m.notes && <p className="text-sm mt-1 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg">{m.notes}</p>}
              </div>
              <div className="flex items-center gap-3">
                <p className="font-black text-lg text-indigo-600 dark:text-indigo-400">{m.amount} <span className="text-xs font-bold">MRU</span></p>
                <StatusBadge status={m.status} />
                {m.receipt_url && <a href={m.receipt_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 text-blue-600 rounded-xl"><ExternalLink className="w-4 h-4"/></a>}
                {m.status === 'pending' && (
                  <>
                    <button disabled={processingId === m.id} onClick={() => updateStatus(m.id, 'approved')} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">
                      {processingId === m.id ? '...' : (isRTL ? 'قبول' : 'Approve')}
                    </button>
                    <button disabled={processingId === m.id} onClick={() => updateStatus(m.id, 'rejected')} className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-sm disabled:opacity-50">
                      {isRTL ? 'رفض' : 'Reject'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
