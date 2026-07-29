import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { FileText, CheckCircle, XCircle, Clock, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

export const RequestsManagementTab = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [activeTab, setActiveTab] = useState<'requests' | 'payments'>('requests');
  const [requests, setRequests] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // For approval modal
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [approvedAmount, setApprovedAmount] = useState('');

  const fetchAll = async () => {
    setIsLoading(true);
    const adminId = sessionStorage.getItem('admin_id');
    
    // We try to call our secure RPCs. If adminId is missing, it will pass null and might fail unless the RPC allows it (e.g. for superadmin).
    // For now, to ensure it works even if RPC has issues during development, we'll try direct fetch which might work if RLS allows admins.
    try {
      let reqData, payData;
      
      if (adminId) {
        const [reqRes, payRes] = await Promise.all([
          supabase.rpc('admin_get_all_requests', { p_admin_id: adminId }),
          supabase.rpc('admin_get_all_payments', { p_admin_id: adminId })
        ]);
        reqData = reqRes.data;
        payData = payRes.data;
      } else {
        // Fallback to direct query (might be blocked by RLS if not configured for public read)
        const [reqRes, payRes] = await Promise.all([
          supabase.from('user_requests').select('*, users(full_name, unique_short_id)').order('created_at', { ascending: false }),
          supabase.from('user_payments').select('*, users(full_name, unique_short_id), payment_methods(name)').order('created_at', { ascending: false })
        ]);
        reqData = reqRes.data;
        payData = payRes.data;
      }

      if (reqData) setRequests(reqData);
      if (payData) setPayments(payData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    
    // Listen for realtime updates
    const channel = supabase.channel('admin-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_requests' }, () => fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_payments' }, () => fetchAll())
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleUpdateStatus = async (status: string) => {
    if (!selectedItem) return;
    
    const adminId = sessionStorage.getItem('admin_id');
    const toastId = toast.loading(isRTL ? 'جاري التحديث...' : 'Updating...');
    
    try {
      if (activeTab === 'requests') {
        if (adminId) {
          const { data, error } = await supabase.rpc('admin_update_request_status', {
            p_admin_id: adminId,
            p_request_id: selectedItem.id,
            p_status: status,
            p_approved_amount: status === 'approved' && approvedAmount ? parseFloat(approvedAmount) : null
          });
          if (error) throw error;
          if (!data.success) throw new Error(data.message);
        } else {
          // Fallback direct update
          const { error } = await supabase.from('user_requests').update({
            status,
            approved_amount: status === 'approved' && approvedAmount ? parseFloat(approvedAmount) : null
          }).eq('id', selectedItem.id);
          if (error) throw error;
        }
      } else {
        if (adminId) {
          const { data, error } = await supabase.rpc('admin_update_payment_status', {
            p_admin_id: adminId,
            p_payment_id: selectedItem.id,
            p_status: status
          });
          if (error) throw error;
          if (!data.success) throw new Error(data.message);
        } else {
          const { error } = await supabase.from('user_payments').update({ status }).eq('id', selectedItem.id);
          if (error) throw error;
        }
      }
      
      toast.success(isRTL ? 'تم تحديث الحالة بنجاح' : 'Status updated successfully', { id: toastId });
      setSelectedItem(null);
      setApprovedAmount('');
      fetchAll();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (isRTL ? 'خطأ في التحديث' : 'Error updating'), { id: toastId });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => { setActiveTab('requests'); setSelectedItem(null); }}
          className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${activeTab === 'requests' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}
        >
          <FileText className="w-5 h-5" />
          {isRTL ? 'الطلبات' : 'Requests'}
        </button>
        <button 
          onClick={() => { setActiveTab('payments'); setSelectedItem(null); }}
          className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${activeTab === 'payments' ? 'bg-primary text-white' : 'bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300'}`}
        >
          <CreditCard className="w-5 h-5" />
          {isRTL ? 'المدفوعات' : 'Payments'}
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-6 py-4 font-semibold">{isRTL ? 'التاريخ' : 'Date'}</th>
                <th className="px-6 py-4 font-semibold">{isRTL ? 'المستخدم' : 'User'}</th>
                <th className="px-6 py-4 font-semibold">{activeTab === 'requests' ? (isRTL ? 'النوع' : 'Type') : (isRTL ? 'الطريقة' : 'Method')}</th>
                <th className="px-6 py-4 font-semibold">{isRTL ? 'المبلغ' : 'Amount'}</th>
                <th className="px-6 py-4 font-semibold">{isRTL ? 'الحالة' : 'Status'}</th>
                <th className="px-6 py-4 font-semibold text-center">{isRTL ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    <span className="animate-spin border-2 border-primary border-t-transparent rounded-full w-6 h-6 inline-block"></span>
                  </td>
                </tr>
              ) : (activeTab === 'requests' ? requests : payments).length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    {isRTL ? 'لا توجد بيانات' : 'No data found'}
                  </td>
                </tr>
              ) : (
                (activeTab === 'requests' ? requests : payments).map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 dark:text-white">{item.users?.full_name || 'Unknown'}</div>
                      <div className="text-xs text-slate-500">{item.users?.unique_short_id}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {activeTab === 'requests' ? item.request_type : (item.payment_methods?.name || 'Payment')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-primary">{item.amount ? `${item.amount} MRU` : '-'}</div>
                      {item.approved_amount && (
                        <div className="text-xs text-green-600 font-bold">{item.approved_amount} MRU {isRTL ? '(معتمد)' : '(Approved)'}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                        item.status === 'approved' ? 'bg-green-100 text-green-700' :
                        item.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.status === 'approved' ? <CheckCircle className="w-3 h-3" /> :
                         item.status === 'rejected' ? <XCircle className="w-3 h-3" /> :
                         <Clock className="w-3 h-3" />}
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => {
                          setSelectedItem(item);
                          setApprovedAmount(item.amount ? String(item.amount) : '');
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors"
                      >
                        {isRTL ? 'إدارة' : 'Manage'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
              {isRTL ? 'إدارة الطلب' : 'Manage Request'}
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <span className="text-sm text-slate-500 block mb-1">{isRTL ? 'المستخدم' : 'User'}</span>
                <div className="font-medium text-slate-800 dark:text-white">{selectedItem.users?.full_name}</div>
              </div>
              
              {selectedItem.notes && (
                <div>
                  <span className="text-sm text-slate-500 block mb-1">{isRTL ? 'ملاحظات' : 'Notes'}</span>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm">{selectedItem.notes}</div>
                </div>
              )}
              
              {selectedItem.receipt_url && (
                <div>
                  <span className="text-sm text-slate-500 block mb-2">{isRTL ? 'صورة الإيصال' : 'Receipt'}</span>
                  <a href={selectedItem.receipt_url} target="_blank" rel="noopener noreferrer">
                    <img src={selectedItem.receipt_url} alt="Receipt" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
                  </a>
                </div>
              )}
              
              {activeTab === 'requests' && (
                <div>
                  <label className="text-sm text-slate-500 block mb-1">{isRTL ? 'المبلغ المعتمد (اختياري)' : 'Approved Amount (Optional)'}</label>
                  <input 
                    type="number" 
                    value={approvedAmount}
                    onChange={e => setApprovedAmount(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setSelectedItem(null)} className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold">
                {isRTL ? 'إغلاق' : 'Close'}
              </button>
              <button onClick={() => handleUpdateStatus('rejected')} className="flex-1 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-bold">
                {isRTL ? 'رفض' : 'Reject'}
              </button>
              <button onClick={() => handleUpdateStatus('approved')} className="flex-1 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold">
                {isRTL ? 'اعتماد' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
