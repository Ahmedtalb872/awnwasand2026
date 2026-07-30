import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { CreditCard, CheckCircle, XCircle, Clock, ExternalLink, RefreshCw, Plus, X, Wallet } from 'lucide-react';
import { UserPicker, UserPickerValue } from './UserPicker';

export const MembershipsTab = ({ users = [] }: { users?: any[] }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [memberships, setMemberships] = useState<any[]>([]);
  const [fundTotal, setFundTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const adminId = sessionStorage.getItem('admin_id');

  const [showAddModal, setShowAddModal] = useState(false);
  const [addPerson, setAddPerson] = useState<UserPickerValue>({ userId: null, name: '' });
  const [addAmount, setAddAmount] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchMemberships();
    fetchFundTotal();
    const sub = supabase.channel('admin:memberships')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_memberships' }, fetchMemberships)
      .subscribe();
    const fundSub = supabase.channel('admin:membership_fund')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'membership_fund' }, fetchFundTotal)
      .subscribe();
    return () => { supabase.removeChannel(sub); supabase.removeChannel(fundSub); };
  }, []);

  const fetchFundTotal = async () => {
    const { data } = await supabase.from('membership_fund').select('total_amount').eq('key', 'total').maybeSingle();
    setFundTotal(Number(data?.total_amount) || 0);
  };

  const fetchMemberships = async () => {
    setLoading(true);
    try {
      if (adminId) {
        const { data, error } = await supabase.rpc('admin_get_all_memberships', { p_admin_id: adminId });
        if (error) throw error;
        // Enrich with user data
        const userIds = [...new Set((data || []).map((m: any) => m.user_id))];
        const usersMap: Record<string, any> = {};
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

  const resetAddForm = () => {
    setShowAddModal(false);
    setAddPerson({ userId: null, name: '' });
    setAddAmount('');
    setAddNotes('');
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminId) { toast.error('No admin session'); return; }
    if (!addPerson.name.trim()) { toast.error(isRTL ? 'الاسم مطلوب' : 'Name is required'); return; }
    if (!addAmount || parseFloat(addAmount) <= 0) { toast.error(isRTL ? 'الرجاء إدخال مبلغ صحيح' : 'Please enter a valid amount'); return; }

    setIsAdding(true);
    try {
      const { data, error } = await supabase.rpc('admin_add_membership', {
        p_admin_id: adminId,
        p_user_id: addPerson.userId,
        p_member_name: addPerson.userId ? null : addPerson.name.trim(),
        p_amount: parseFloat(addAmount),
        p_notes: addNotes || null,
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.message);
      toast.success(isRTL ? 'تمت إضافة رسم الانتساب' : 'Membership fee added');
      resetAddForm();
      fetchMemberships();
      fetchFundTotal();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setIsAdding(false);
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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl">
            <Wallet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs text-slate-500 font-bold">{isRTL ? 'خزينة الانتساب' : 'Fund'}</span>
            <span className="font-black text-sm text-indigo-700 dark:text-indigo-300">{fundTotal.toLocaleString()} MRU</span>
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold">
            <option value="all">{isRTL ? 'الكل' : 'All'}</option>
            <option value="pending">{isRTL ? 'قيد الانتظار' : 'Pending'}</option>
            <option value="approved">{isRTL ? 'مقبول' : 'Approved'}</option>
            <option value="rejected">{isRTL ? 'مرفوض' : 'Rejected'}</option>
          </select>
          <button onClick={fetchMemberships} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl"><RefreshCw className="w-5 h-5 text-slate-600 dark:text-slate-300" /></button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm">
            <Plus className="w-4 h-4" />{isRTL ? 'إضافة يدوياً' : 'Add Manually'}
          </button>
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
                <p className="font-bold text-slate-800 dark:text-white">{m.user?.full_name || m.member_name || m.user_id}</p>
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

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" dir={isRTL ? 'rtl' : 'ltr'}>
          <motion.form
            onSubmit={handleAddManual}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6 md:p-8 border border-slate-200 dark:border-slate-800 w-full max-w-md relative"
          >
            <button type="button" onClick={resetAddForm} className="absolute top-5 end-5 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-1">{isRTL ? 'إضافة رسم انتساب يدوياً' : 'Add Membership Fee Manually'}</h3>
            <p className="text-sm text-slate-500 mb-6">{isRTL ? 'يُسجَّل مباشرة كمقبول ويُضاف لخزينة الانتساب.' : 'Recorded as approved immediately and added to the fund.'}</p>

            <div className="mb-4">
              <UserPicker users={users} value={addPerson} onChange={setAddPerson} isRTL={isRTL} />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'المبلغ' : 'Amount'} *</label>
              <div className="relative">
                <input type="number" min="0" step="0.01" required value={addAmount} onChange={e => setAddAmount(e.target.value)} className="input-field pe-16" placeholder="0.00" />
                <span className="absolute top-1/2 -translate-y-1/2 end-4 text-xs font-bold text-slate-400">MRU</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'ملاحظات' : 'Notes'}</label>
              <textarea rows={2} value={addNotes} onChange={e => setAddNotes(e.target.value)} className="input-field" />
            </div>

            <button type="submit" disabled={isAdding} className="w-full py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg disabled:opacity-70 flex items-center justify-center">
              {isAdding ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (isRTL ? 'إضافة' : 'Add')}
            </button>
          </motion.form>
        </div>
      )}
    </motion.div>
  );
};
