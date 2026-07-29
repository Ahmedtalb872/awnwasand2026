import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { Heart, CheckCircle, XCircle, Clock, ExternalLink, RefreshCw } from 'lucide-react';

export const UserDonationsTab = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const adminId = sessionStorage.getItem('admin_id');

  useEffect(() => {
    fetchDonations();
    const sub = supabase.channel('admin:user_donations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_donations' }, fetchDonations)
      .subscribe();
    return () => { supabase.removeChannel(sub); };
  }, []);

  const fetchDonations = async () => {
    setLoading(true);
    try {
      if (adminId) {
        const { data, error } = await supabase.rpc('admin_get_all_donations', { p_admin_id: adminId });
        if (error) throw error;
        const userIds = [...new Set((data || []).map((d: any) => d.user_id))];
        let usersMap: Record<string, any> = {};
        if (userIds.length > 0) {
          const { data: usersData } = await supabase.from('users').select('id, name, phone').in('id', userIds);
          (usersData || []).forEach((u: any) => { usersMap[u.id] = u; });
        }
        setDonations((data || []).map((d: any) => ({ ...d, user: usersMap[d.user_id] })));
      } else {
        const { data } = await supabase.from('user_donations').select('*').order('created_at', { ascending: false });
        setDonations(data || []);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (!adminId) { toast.error('No admin session'); return; }
    setProcessingId(id);
    try {
      const { data } = await supabase.rpc('admin_update_donation_status', {
        p_admin_id: adminId,
        p_donation_id: id,
        p_status: status
      });
      if (data?.success === false) throw new Error(data.message);
      toast.success(status === 'approved' ? (isRTL ? 'تم القبول' : 'Approved') : (isRTL ? 'تم الرفض' : 'Rejected'));
      fetchDonations();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = filterStatus === 'all' ? donations : donations.filter(d => d.status === filterStatus);
  const totalApproved = donations.filter(d => d.status === 'approved').reduce((sum, d) => sum + Number(d.amount || 0), 0);

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === 'approved') return <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full"><CheckCircle className="w-3 h-3"/>مقبول</span>;
    if (status === 'rejected') return <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2 py-1 rounded-full"><XCircle className="w-3 h-3"/>مرفوض</span>;
    return <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full"><Clock className="w-3 h-3"/>قيد الانتظار</span>;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <Heart className="w-8 h-8 text-rose-500" />
            {isRTL ? 'التبرعات' : 'Donations'}
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            {isRTL ? 'إجمالي التبرعات المقبولة:' : 'Total Approved:'} <span className="font-black text-rose-600">{totalApproved.toFixed(2)} MRU</span>
          </p>
        </div>
        <div className="flex gap-2">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold">
            <option value="all">{isRTL ? 'الكل' : 'All'}</option>
            <option value="pending">{isRTL ? 'قيد الانتظار' : 'Pending'}</option>
            <option value="approved">{isRTL ? 'مقبول' : 'Approved'}</option>
            <option value="rejected">{isRTL ? 'مرفوض' : 'Rejected'}</option>
          </select>
          <button onClick={fetchDonations} className="p-2 bg-slate-100 rounded-xl"><RefreshCw className="w-5 h-5 text-slate-600"/></button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin"/></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">{isRTL ? 'لا توجد تبرعات' : 'No donations'}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => (
            <div key={d.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 dark:text-white">{d.user?.name || d.user_id}</p>
                <p className="text-sm text-slate-500">{d.user?.phone} · {new Date(d.created_at).toLocaleDateString('ar-EG')}</p>
                {d.notes && <p className="text-sm mt-1 text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg">{d.notes}</p>}
              </div>
              <div className="flex items-center gap-3">
                <p className="font-black text-lg text-rose-600 dark:text-rose-400">{d.amount} <span className="text-xs font-bold">MRU</span></p>
                <StatusBadge status={d.status} />
                {d.receipt_url && <a href={d.receipt_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-blue-50 text-blue-600 rounded-xl"><ExternalLink className="w-4 h-4"/></a>}
                {d.status === 'pending' && (
                  <>
                    <button disabled={processingId === d.id} onClick={() => updateStatus(d.id, 'approved')} className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-50">
                      {processingId === d.id ? '...' : (isRTL ? 'قبول' : 'Approve')}
                    </button>
                    <button disabled={processingId === d.id} onClick={() => updateStatus(d.id, 'rejected')} className="px-4 py-2 bg-red-500 text-white rounded-xl font-bold text-sm disabled:opacity-50">
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
