import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Upload, FileText, CheckCircle, Clock, XCircle, CreditCard, Heart, Plus, User, Phone, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

type TabType = 'requests' | 'payments' | 'memberships' | 'donations';

export const UserRequestsPage = () => {
  const { user, userProfile } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [activeTab, setActiveTab] = useState<TabType>('requests');
  const [data, setData] = useState<Record<TabType, any[]>>({ requests: [], payments: [], memberships: [], donations: [] });
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const submitLock = useRef(false);

  // Form states
  const [type, setType] = useState('');
  const [amount, setAmount] = useState('');
  const [methodId, setMethodId] = useState('');
  const [notes, setNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchAll();
      
      const channels = ['user_requests', 'user_payments', 'user_memberships', 'user_donations'].map(table =>
        supabase.channel(`user:${table}`)
          .on('postgres_changes', { event: '*', schema: 'public', table, filter: `user_id=eq.${user.id}` }, fetchAll)
          .subscribe()
      );
      return () => channels.forEach(c => supabase.removeChannel(c));
    }
  }, [user]);

  const fetchAll = async () => {
    if (!user) return;
    const [reqsRes, paysRes, membRes, donRes, methodsRes] = await Promise.all([
      supabase.from('user_requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('user_payments').select('*, payment_methods(name)').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('user_memberships').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('user_donations').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('payment_methods').select('*').eq('is_active', true)
    ]);
    setData({
      requests: reqsRes.data || [],
      payments: paysRes.data || [],
      memberships: membRes.data || [],
      donations: donRes.data || []
    });
    if (methodsRes.data) setPaymentMethods(methodsRes.data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error(isRTL ? 'يجب أن يكون الملف صورة' : 'File must be an image'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error(isRTL ? 'حجم الملف يجب أن لا يتجاوز 5 ميجابايت' : 'File size must not exceed 5MB'); return; }
    setReceiptFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const uploadReceipt = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    const ext = file.name.split('.').pop();
    const fileName = `${user?.id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('receipts').upload(fileName, file);
    setIsUploading(false);
    if (error) { toast.error(isRTL ? 'فشل رفع الصورة' : 'Failed to upload image'); return null; }
    return supabase.storage.from('receipts').getPublicUrl(fileName).data.publicUrl;
  };

  const resetForm = () => {
    setShowForm(false); setType(''); setAmount(''); setMethodId(''); setNotes('');
    setReceiptFile(null); setPreviewUrl(null); submitLock.current = false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || submitLock.current) return;
    submitLock.current = true;
    setIsLoading(true);

    try {
      let receipt_url: string | null = null;
      if (receiptFile) {
        receipt_url = await uploadReceipt(receiptFile);
        if (!receipt_url) { submitLock.current = false; setIsLoading(false); return; }
      }

      const base = { user_id: user.id, amount: amount ? parseFloat(amount) : undefined, notes, receipt_url };

      if (activeTab === 'requests') {
        if (!type.trim()) { toast.error(isRTL ? 'نوع الطلب مطلوب' : 'Request type is required'); submitLock.current = false; setIsLoading(false); return; }
        const { error } = await supabase.from('user_requests').insert({ ...base, request_type: type });
        if (error) throw error;
        toast.success(isRTL ? 'تم إرسال الطلب بنجاح' : 'Request submitted');
      } else if (activeTab === 'payments') {
        if (!methodId) { toast.error(isRTL ? 'اختر طريقة الدفع' : 'Select payment method'); submitLock.current = false; setIsLoading(false); return; }
        const { error } = await supabase.from('user_payments').insert({ ...base, method_id: methodId });
        if (error) throw error;
        toast.success(isRTL ? 'تم إرسال الدفعة بنجاح' : 'Payment submitted');
      } else if (activeTab === 'memberships') {
        if (!amount) { toast.error(isRTL ? 'المبلغ مطلوب' : 'Amount required'); submitLock.current = false; setIsLoading(false); return; }
        const { error } = await supabase.from('user_memberships').insert({ user_id: user.id, amount: parseFloat(amount), notes, receipt_url });
        if (error) throw error;
        toast.success(isRTL ? 'تم إرسال طلب الانتساب' : 'Membership request submitted');
      } else if (activeTab === 'donations') {
        if (!amount) { toast.error(isRTL ? 'المبلغ مطلوب' : 'Amount required'); submitLock.current = false; setIsLoading(false); return; }
        const { error } = await supabase.from('user_donations').insert({ user_id: user.id, amount: parseFloat(amount), notes, receipt_url });
        if (error) throw error;
        toast.success(isRTL ? 'شكراً على تبرعك!' : 'Thank you for your donation!');
      }

      resetForm();
      fetchAll();
    } catch (err: any) {
      toast.error(err.message || 'Error');
      submitLock.current = false;
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'approved') return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (status === 'rejected') return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };
  const getStatusText = (status: string) => {
    if (status === 'approved') return isRTL ? 'مقبول' : 'Approved';
    if (status === 'rejected') return isRTL ? 'مرفوض' : 'Rejected';
    return isRTL ? 'قيد الانتظار' : 'Pending';
  };

  const tabs: { id: TabType; label: string; icon: any; color: string }[] = [
    { id: 'requests', label: isRTL ? 'الطلبات' : 'Requests', icon: FileText, color: 'text-blue-600' },
    { id: 'payments', label: isRTL ? 'المدفوعات' : 'Payments', icon: CreditCard, color: 'text-indigo-600' },
    { id: 'memberships', label: isRTL ? 'الانتساب' : 'Membership', icon: User, color: 'text-teal-600' },
    { id: 'donations', label: isRTL ? 'التبرعات' : 'Donations', icon: Heart, color: 'text-rose-600' },
  ];

  return (
    <div className="container-custom py-8" dir={isRTL ? 'rtl' : 'ltr'}>
      <h1 className="section-title mb-6">{isRTL ? 'حسابي' : 'My Account'}</h1>

      {/* User Info Banner */}
      {userProfile && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-black text-lg">
            {(userProfile.name || '?').charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-white">{userProfile.name}</p>
            <p className="text-sm text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3"/>{userProfile.phone}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setShowForm(false); }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-lg' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">{data[tab.id].length}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {!showForm ? (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {tabs.find(t => t.id === activeTab)?.label}
              </h2>
              <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
                <Plus className="w-5 h-5" />
                {isRTL ? 'إضافة جديد' : 'Add New'}
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data[activeTab].map(item => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-5 border-l-4 border-primary hover:border-secondary transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</span>
                      <h3 className="font-bold text-slate-800 dark:text-white mt-0.5">
                        {activeTab === 'requests' ? item.request_type :
                         activeTab === 'payments' ? (item.payment_methods?.name || 'Payment') :
                         activeTab === 'memberships' ? (isRTL ? 'رسم انتساب' : 'Membership Fee') :
                         (isRTL ? 'تبرع' : 'Donation')}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700">
                      {getStatusIcon(item.status)}
                      <span className="text-slate-700 dark:text-slate-200">{getStatusText(item.status)}</span>
                    </div>
                  </div>

                  {item.amount && (
                    <div className="mb-2 text-sm"><span className="text-slate-500">{isRTL ? 'المبلغ: ' : 'Amount: '}</span>
                      <span className="font-black text-primary">{item.amount} MRU</span>
                    </div>
                  )}
                  {item.approved_amount && (
                    <div className="mb-2 text-sm"><span className="text-slate-500">{isRTL ? 'المعتمد: ' : 'Approved: '}</span>
                      <span className="font-bold text-emerald-600">{item.approved_amount} MRU</span>
                    </div>
                  )}
                  {item.notes && <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg mt-2">{item.notes}</p>}
                  {item.receipt_url && (
                    <a href={item.receipt_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-bold">
                      <FileText className="w-3 h-3" />{isRTL ? 'عرض الإيصال' : 'View Receipt'}
                    </a>
                  )}
                </motion.div>
              ))}
              {data[activeTab].length === 0 && (
                <div className="col-span-full text-center py-16 bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-400 font-medium">{isRTL ? 'لا توجد سجلات لعرضها' : 'No records yet'}</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="card p-6 md:p-8 max-w-2xl mx-auto"
          >
            <div className="flex items-center gap-3 mb-6">
              <button type="button" onClick={resetForm} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              </button>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                {activeTab === 'requests' ? (isRTL ? 'طلب جديد' : 'New Request') :
                 activeTab === 'payments' ? (isRTL ? 'دفعة جديدة' : 'New Payment') :
                 activeTab === 'memberships' ? (isRTL ? 'رسم انتساب جديد' : 'New Membership Fee') :
                 (isRTL ? 'تبرع جديد' : 'New Donation')}
              </h2>
            </div>

            {/* Read-only User Info */}
            <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-400 mb-1 font-bold uppercase tracking-wide">{isRTL ? 'بيانات المستخدم (للقراءة فقط)' : 'User Info (Read-only)'}</p>
              <p className="font-bold text-slate-700 dark:text-slate-200">{userProfile?.name}</p>
              <p className="text-sm text-slate-500">{userProfile?.phone}</p>
            </div>

            {activeTab === 'requests' && (
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'نوع الطلب' : 'Request Type'} *</label>
                <input type="text" required value={type} onChange={e => setType(e.target.value)} className="input-field" placeholder={isRTL ? 'مثال: مساعدة مالية، استفسار...' : 'e.g. Financial aid...'} />
              </div>
            )}
            {activeTab === 'payments' && (
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'طريقة الدفع' : 'Payment Method'} *</label>
                <select required value={methodId} onChange={e => setMethodId(e.target.value)} className="input-field">
                  <option value="">{isRTL ? 'اختر طريقة الدفع' : 'Select method'}</option>
                  {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}

            {(activeTab !== 'requests' || true) && (
              <div className="mb-4">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  {isRTL ? 'المبلغ' : 'Amount'} {activeTab === 'requests' && <span className="text-slate-400 text-xs">({isRTL ? 'اختياري' : 'Optional'})</span>}
                </label>
                <input type="number" min="0" step="0.01" required={activeTab !== 'requests'} value={amount} onChange={e => setAmount(e.target.value)} className="input-field" placeholder="0.00" />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'ملاحظات' : 'Notes'}</label>
              <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} className="input-field" />
            </div>

            {/* Receipt Upload */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'إرفاق صورة الإيصال' : 'Attach Receipt'}</label>
              <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl cursor-pointer bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 transition-colors overflow-hidden">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center py-6">
                    <Upload className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400"><span className="font-bold">{isRTL ? 'اضغط للرفع' : 'Click to upload'}</span></p>
                    <p className="text-xs text-slate-300 mt-1">PNG, JPG (Max 5MB)</p>
                  </div>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
              {isUploading && (
                <p className="text-sm text-primary mt-2 flex items-center gap-2">
                  <span className="animate-spin border-2 border-primary border-t-transparent rounded-full w-4 h-4 inline-block" />
                  {isRTL ? 'جاري رفع الصورة...' : 'Uploading...'}
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <button type="button" onClick={resetForm} className="btn-outline flex-1" disabled={isLoading || isUploading}>
                {isRTL ? 'إلغاء' : 'Cancel'}
              </button>
              <button type="submit" className="btn-primary flex-1 flex items-center justify-center gap-2" disabled={isLoading || isUploading}>
                {(isLoading || isUploading) && <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4 inline-block" />}
                {isLoading ? (isRTL ? 'جاري الإرسال...' : 'Submitting...') : (isRTL ? 'إرسال' : 'Submit')}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};
