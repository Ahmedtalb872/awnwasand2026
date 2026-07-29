import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { 
  Users, Search, ShieldCheck, Clock, Check, X, Ban, 
  AlertTriangle, Calendar, Mail, Phone, RefreshCw, Trash2,
  ChevronLeft, ChevronRight
} from 'lucide-react';

interface ApprovalsTabProps {
  users: any[];
  onRefresh: () => Promise<void>;
}

export const ApprovalsTab = ({ users, onRefresh }: ApprovalsTabProps) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected' | 'Suspended'>('All');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localUsers, setLocalUsers] = useState<any[]>(users);

  // Sync local users when props change
  useEffect(() => {
    setLocalUsers(users);
  }, [users]);

  // Status counters
  const totalCount = localUsers.length;
  const pendingCount = localUsers.filter(u => {
    const status = (u.approval_status || 'Pending Approval').toLowerCase();
    return status.includes('pending') || status === 'في انتظار المراجعة';
  }).length;
  const approvedCount = localUsers.filter(u => u.approval_status === 'Approved').length;
  const rejectedCount = localUsers.filter(u => u.approval_status === 'Rejected').length;
  const suspendedCount = localUsers.filter(u => u.approval_status === 'Suspended').length;

  const handleStatusUpdate = async (userId: string, newStatus: string) => {
    setUpdatingId(userId);
    // Store old users for rollback
    const previousUsers = [...localUsers];
    // Optimistic Update
    setLocalUsers(prev => prev.map(u => u.id === userId ? { ...u, approval_status: newStatus } : u));
    try {
      const adminSecret = import.meta.env.VITE_ADMIN_PASSWORD || '';
      const { error } = await supabase.rpc('admin_update_user_status', {
        target_user_id: userId,
        new_status: newStatus,
        admin_secret: adminSecret
      });

      if (error) {
        throw error;
      }

      toast.success(
        isRTL 
          ? 'تم تحديث حالة الحساب بنجاح' 
          : `Account status updated to ${newStatus}`
      );
      
      // Force refresh to guarantee UI matches database exactly
      await onRefresh();
    } catch (err: any) {
      console.error("RPC Error:", err);
      // Revert optimistic update
      setLocalUsers(previousUsers);
      
      let errorMsg = err.message;
      if (errorMsg?.includes('Could not find the function') || errorMsg?.includes('function admin_update_user_status does not exist')) {
        errorMsg = 'لم يتم العثور على الدالة في قاعدة البيانات. يرجى تشغيل كود SQL المطلوب في Supabase.';
      } else if (errorMsg?.includes('Unauthorized')) {
        errorMsg = 'غير مصرح لك بتحديث حالة المستخدمين.';
      }

      toast.error(
        isRTL 
          ? 'فشل تحديث الحالة: ' + errorMsg 
          : `Failed to update: ${errorMsg}`
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setIsDeleting(true);
    try {
      const adminSecret = import.meta.env.VITE_ADMIN_PASSWORD || '';
      const { error } = await supabase.rpc('admin_delete_user', { 
        target_user_id: userId,
        admin_secret: adminSecret 
      });
      if (error) throw error;
      
      // Optimistic UI Update
      setLocalUsers(prev => prev.filter(u => u.id !== userId));
      
      toast.success(isRTL ? 'تم حذف المستخدم نهائياً' : 'User completely deleted');
      // No need to call onRefresh, optimistic update + realtime takes care of it
    } catch (err: any) {
      console.error("Delete Error:", err);
      toast.error(isRTL ? 'فشل حذف المستخدم: ' + err.message : `Failed to delete: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const filteredUsers = localUsers.filter(u => {
    const status = u.approval_status || 'Pending Approval';
    const isPending = status.toLowerCase().includes('pending') || status === 'في انتظار المراجعة';
    
    let matchesStatus = false;
    if (statusFilter === 'All') matchesStatus = true;
    else if (statusFilter === 'Pending') matchesStatus = isPending;
    else matchesStatus = status === statusFilter;
    
    const matchesSearch = 
      u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone?.includes(searchTerm) ||
      u.unique_short_id?.toLowerCase().includes(searchTerm.toLowerCase());
      
    return matchesStatus && matchesSearch;
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  return (
    <motion.div 
      key="approvals" 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: -20 }} 
      className="space-y-6"
    >
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">{isRTL ? 'إجمالي طلبات' : 'Total'}</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-slate-800 dark:text-white">{totalCount}</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="bg-amber-50/50 dark:bg-amber-950/20 p-5 rounded-3xl border border-amber-200/50 dark:border-amber-900/30 shadow-sm flex flex-col justify-between">
          <span className="text-amber-600 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">{isRTL ? 'في انتظار المراجعة' : 'Pending'}</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-5 rounded-3xl border border-emerald-200/50 dark:border-emerald-900/30 shadow-sm flex flex-col justify-between">
          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">{isRTL ? 'مقبول' : 'Approved'}</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{approvedCount}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
        </div>

        <div className="bg-red-50/50 dark:bg-red-950/20 p-5 rounded-3xl border border-red-200/50 dark:border-red-900/30 shadow-sm flex flex-col justify-between">
          <span className="text-red-600 dark:text-red-400 font-bold text-xs uppercase tracking-wider">{isRTL ? 'مرفوض' : 'Rejected'}</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-red-600 dark:text-red-400">{rejectedCount}</span>
            <X className="w-4 h-4 text-red-500" />
          </div>
        </div>

        <div className="bg-rose-50/50 dark:bg-rose-950/20 p-5 rounded-3xl border border-rose-200/50 dark:border-rose-900/30 shadow-sm flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">{isRTL ? 'معلق' : 'Suspended'}</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400">{suspendedCount}</span>
            <Ban className="w-4 h-4 text-rose-500" />
          </div>
        </div>
      </div>

      {/* Filters & Actions Header */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto">
          {(['All', 'Pending', 'Approved', 'Rejected', 'Suspended'] as const).map((filter) => {
            const isActive = statusFilter === filter;
            const label = 
              filter === 'All' ? (isRTL ? 'الكل' : 'All') :
              filter === 'Pending' ? (isRTL ? 'قيد المراجعة' : 'Pending') :
              filter === 'Approved' ? (isRTL ? 'مقبول' : 'Approved') :
              filter === 'Rejected' ? (isRTL ? 'مرفوض' : 'Rejected') :
              (isRTL ? 'معلق' : 'Suspended');

            return (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  isActive 
                    ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <input 
            type="text" 
            placeholder={isRTL ? 'بحث بالاسم، البريد، الهاتف أو المعرف...' : 'Search by name, email, phone or ID...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl py-3 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm ${isRTL ? 'pl-4 pr-11' : 'pl-11 pr-4'}`}
          />
          <Search className={`absolute top-3 w-4 h-4 text-slate-400 ${isRTL ? 'right-4' : 'left-4'}`} />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" dir={isRTL ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-right">
                <th className={`p-5 text-sm font-bold text-slate-500 dark:text-slate-400 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'المستخدم' : 'User'}</th>
                <th className={`p-5 text-sm font-bold text-slate-500 dark:text-slate-400 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'بيانات الاتصال' : 'Contact Details'}</th>
                <th className={`p-5 text-sm font-bold text-slate-500 dark:text-slate-400 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'تاريخ التسجيل' : 'Registration Date'}</th>
                <th className={`p-5 text-sm font-bold text-slate-500 dark:text-slate-400 ${isRTL ? 'text-right' : 'text-left'}`}>{isRTL ? 'الحالة' : 'Status'}</th>
                <th className={`p-5 text-sm font-bold text-slate-500 dark:text-slate-400 ${isRTL ? 'text-center' : 'text-center'}`}>{isRTL ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedUsers.map((u, i) => {
                const status = u.approval_status || 'Pending Approval';
                const isUserUpdating = updatingId === u.id;

                const isPending = status.toLowerCase().includes('pending') || status === 'في انتظار المراجعة';

                let statusBadge = '';
                if (isPending) {
                  statusBadge = 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
                } else if (status === 'Approved') {
                  statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
                } else if (status === 'Rejected') {
                  statusBadge = 'bg-red-50 text-red-700 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';
                } else if (status === 'Suspended') {
                  statusBadge = 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
                }

                return (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    key={u.id || i} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    {/* User Profile */}
                    <td className="p-5">
                      <div className="flex items-center gap-3">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.full_name} className="w-11 h-11 rounded-2xl object-cover shadow-sm shrink-0" />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-950 dark:to-purple-950 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-black text-lg uppercase border border-indigo-200/50 dark:border-indigo-800/40 shadow-sm shrink-0">
                            {u.full_name?.charAt(0) || 'U'}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-slate-800 dark:text-white text-base">{u.full_name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            ID: <span className="font-mono">{u.unique_short_id || u.national_id || (isRTL ? 'غير محدد' : 'N/A')}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="p-5">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {u.email}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {u.phone}
                        </span>
                      </div>
                    </td>

                    {/* Joined Date */}
                    <td className="p-5 text-sm text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{new Date(u.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-5">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${statusBadge}`}>
                        {isPending && <Clock className="w-3.5 h-3.5" />}
                        {status === 'Approved' && <ShieldCheck className="w-3.5 h-3.5" />}
                        {status === 'Rejected' && <X className="w-3.5 h-3.5" />}
                        {status === 'Suspended' && <AlertTriangle className="w-3.5 h-3.5" />}
                        {isPending ? (isRTL ? 'في انتظار الموافقة' : 'Pending Approval') :
                         status === 'Approved' ? (isRTL ? 'مقبول' : 'Approved') :
                         status === 'Rejected' ? (isRTL ? 'مرفوض' : 'Rejected') :
                         (isRTL ? 'معلق' : 'Suspended')}
                      </span>
                    </td>

                    {/* Action Controls */}
                    <td className="p-5">
                      <div className="flex items-center justify-center gap-2">
                        {isUserUpdating ? (
                          <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                        ) : (
                          <>
                            {/* APPROVE / RE-APPROVE */}
                            {status !== 'Approved' && (
                              <button
                                onClick={() => handleStatusUpdate(u.id, 'Approved')}
                                title={isRTL ? 'قبول / إعادة تفعيل' : 'Approve / Re-activate'}
                                className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-100 dark:border-emerald-500/20 shadow-sm transition-all hover:scale-110"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}

                            {/* REJECT — available for Pending & Approved */}
                            {(isPending || status === 'Approved' || status === 'Suspended') && (
                              <button
                                onClick={() => handleStatusUpdate(u.id, 'Rejected')}
                                title={isRTL ? 'رفض' : 'Reject'}
                                className="p-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 border border-red-100 dark:border-red-500/20 shadow-sm transition-all hover:scale-110"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}

                            {/* SUSPEND — only for Approved */}
                            {status === 'Approved' && (
                              <button
                                onClick={() => handleStatusUpdate(u.id, 'Suspended')}
                                title={isRTL ? 'تعليق مؤقت' : 'Suspend'}
                                className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-100 dark:border-rose-500/20 shadow-sm transition-all hover:scale-110"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}

                            {/* DELETE ACTION */}
                            <button
                              onClick={() => setDeleteConfirmId(u.id)}
                              title={isRTL ? 'حذف نهائي' : 'Delete'}
                              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-500/30 shadow-sm transition-all hover:scale-110 ml-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-3">
                      <Search className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                      <p className="text-lg font-bold">{isRTL ? 'لم يتم العثور على نتائج' : 'No users found'}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {isRTL 
                ? `عرض ${startIndex + 1} إلى ${Math.min(startIndex + itemsPerPage, filteredUsers.length)} من أصل ${filteredUsers.length} مستخدم` 
                : `Showing ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, filteredUsers.length)} of ${filteredUsers.length} users`}
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 disabled:opacity-50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-600"
              >
                {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = currentPage;
                  if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  
                  if (pageNum > 0 && pageNum <= totalPages) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                          currentPage === pageNum 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 disabled:opacity-50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-600"
              >
                {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-rose-600"></div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                    {isRTL ? 'تأكيد الحذف' : 'Confirm Deletion'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {isRTL ? 'هذا الإجراء لا يمكن التراجع عنه.' : 'This action cannot be undone.'}
                  </p>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 mb-6 border border-slate-100 dark:border-slate-700">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {isRTL 
                    ? 'سيتم حذف حساب المستخدم وجميع بياناته المرتبطة من قاعدة البيانات بشكل نهائي.' 
                    : 'The user account and all associated data will be permanently deleted from the database.'}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={() => handleDeleteUser(deleteConfirmId)}
                  disabled={isDeleting}
                  className="flex-1 py-3 px-4 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/30 transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center"
                >
                  {isDeleting ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    isRTL ? 'حذف نهائي' : 'Delete Permanently'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
};
