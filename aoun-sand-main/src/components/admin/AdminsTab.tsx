import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { Search, Shield, UserPlus, Edit, Trash2, Key, CheckCircle, XCircle, ChevronLeft, ChevronRight, Save, X } from 'lucide-react';

export const AdminsTab = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [admins, setAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  
  // Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Super Admin');
  const [permissions, setPermissions] = useState<string[]>([]);
  
  const roles = [
    'Super Admin',
    'Finance Admin',
    'Membership Admin',
    'Patients Admin',
    'Al-Mahajja Al-Baydaa Admin',
    'Content Admin',
    'Read Only'
  ];

  const availablePermissions = [
    { id: 'view', label: isRTL ? 'عرض' : 'View' },
    { id: 'create', label: isRTL ? 'إنشاء' : 'Create' },
    { id: 'edit', label: isRTL ? 'تعديل' : 'Edit' },
    { id: 'delete', label: isRTL ? 'حذف' : 'Delete' },
    { id: 'publish', label: isRTL ? 'نشر' : 'Publish' },
    { id: 'manage_users', label: isRTL ? 'إدارة المستخدمين' : 'Manage Users' },
    { id: 'manage_settings', label: isRTL ? 'إدارة الإعدادات' : 'Manage Settings' }
  ];

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('system_admins')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching admins:', error);
      toast.error(isRTL ? 'فشل في جلب بيانات المشرفين' : 'Failed to fetch admins');
    } else {
      setAdmins(data || []);
    }
    setIsLoading(false);
  };

  const handleOpenAddModal = () => {
    setIsEditMode(false);
    setCurrentAdmin(null);
    setUsername('');
    setPassword('');
    setRole('Read Only');
    setPermissions(['view']);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (admin: any) => {
    setIsEditMode(true);
    setCurrentAdmin(admin);
    setUsername(admin.username);
    setPassword(''); // leave blank if not changing
    setRole(admin.role);
    setPermissions(admin.permissions || []);
    setIsModalOpen(true);
  };

  const handleTogglePermission = (permId: string) => {
    if (permissions.includes(permId)) {
      setPermissions(permissions.filter(p => p !== permId));
    } else {
      setPermissions([...permissions, permId]);
    }
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      toast.error(isRTL ? 'اسم المستخدم مطلوب' : 'Username is required');
      return;
    }

    try {
      if (isEditMode) {
        let updateData: any = {
          username,
          role,
          permissions,
          updated_at: new Date().toISOString()
        };

        if (password) {
          const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_admin_password', { p_password: password });
          if (hashError) throw hashError;
          updateData.password_hash = hashedPassword;
        }

        const { error } = await supabase
          .from('system_admins')
          .update(updateData)
          .eq('id', currentAdmin.id);

        if (error) throw error;
        toast.success(isRTL ? 'تم تحديث المشرف بنجاح' : 'Admin updated successfully');
      } else {
        if (!password) {
          toast.error(isRTL ? 'كلمة المرور مطلوبة' : 'Password is required');
          return;
        }

        const { data: hashedPassword, error: hashError } = await supabase.rpc('hash_admin_password', { p_password: password });
        if (hashError) throw hashError;

        const { error } = await supabase
          .from('system_admins')
          .insert({
            username,
            password_hash: hashedPassword,
            role,
            permissions
          });

        if (error) throw error;
        toast.success(isRTL ? 'تم إضافة المشرف بنجاح' : 'Admin added successfully');
      }

      setIsModalOpen(false);
      fetchAdmins();
    } catch (err: any) {
      console.error('Error saving admin:', err);
      toast.error(isRTL ? 'حدث خطأ أثناء الحفظ' : 'Error saving admin');
    }
  };

  const handleToggleActive = async (admin: any) => {
    if (admin.username === import.meta.env.VITE_ADMIN_USERNAME) {
      toast.error(isRTL ? 'لا يمكن تعطيل هذا الحساب' : 'Cannot disable this account');
      return;
    }

    try {
      const { error } = await supabase
        .from('system_admins')
        .update({ is_active: !admin.is_active })
        .eq('id', admin.id);

      if (error) throw error;
      toast.success(isRTL ? 'تم تغيير حالة الحساب' : 'Account status changed');
      fetchAdmins();
    } catch (err) {
      console.error('Error toggling active:', err);
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
    }
  };

  const handleDelete = async (admin: any) => {
    if (admin.username === import.meta.env.VITE_ADMIN_USERNAME) {
      toast.error(isRTL ? 'لا يمكن حذف هذا الحساب' : 'Cannot delete this account');
      return;
    }
    
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذا المشرف نهائياً؟' : 'Are you sure you want to delete this admin?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('system_admins')
        .delete()
        .eq('id', admin.id);

      if (error) throw error;
      toast.success(isRTL ? 'تم الحذف بنجاح' : 'Deleted successfully');
      fetchAdmins();
    } catch (err) {
      console.error('Error deleting admin:', err);
      toast.error(isRTL ? 'حدث خطأ أثناء الحذف' : 'Error deleting admin');
    }
  };

  const filteredAdmins = admins.filter(a => 
    a.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div key="admins" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-orange-500" />
          {isRTL ? 'إدارة المشرفين والصلاحيات' : 'Admins & Permissions'}
        </h3>
        
        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <input 
              type="text" 
              placeholder={isRTL ? 'بحث بالاسم أو الدور...' : 'Search name or role...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-10 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all ${isRTL ? 'pl-4 pr-10' : 'pl-10 pr-4'}`}
            />
            <Search className={`absolute top-3 w-4 h-4 text-slate-400 ${isRTL ? 'right-4' : 'left-4'}`} />
          </div>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-colors whitespace-nowrap"
          >
            <UserPlus className="w-5 h-5" />
            <span className="hidden sm:inline">{isRTL ? 'إضافة مشرف' : 'Add Admin'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-4 border-orange-500/30 border-t-orange-600 rounded-full animate-spin mx-auto mb-4" />
            {isRTL ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                  <th className="p-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{isRTL ? 'المشرف' : 'Admin'}</th>
                  <th className="p-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{isRTL ? 'الدور' : 'Role'}</th>
                  <th className="p-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{isRTL ? 'الحالة' : 'Status'}</th>
                  <th className="p-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{isRTL ? 'آخر ظهور' : 'Last Login'}</th>
                  <th className="p-5 text-sm font-semibold text-slate-500 dark:text-slate-400 text-center">{isRTL ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAdmins.map((admin, i) => (
                  <motion.tr 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={admin.id} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td className="p-5">
                      <div className="font-bold text-slate-800 dark:text-white">{admin.username}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {admin.permissions?.length || 0} {isRTL ? 'صلاحيات' : 'permissions'}
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {admin.role}
                      </span>
                    </td>
                    <td className="p-5">
                      <button
                        onClick={() => handleToggleActive(admin)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          admin.is_active 
                            ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100' 
                            : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 hover:bg-red-100'
                        }`}
                      >
                        {admin.is_active ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {admin.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Inactive')}
                      </button>
                    </td>
                    <td className="p-5 text-sm text-slate-500">
                      {admin.last_login 
                        ? new Date(admin.last_login).toLocaleString(isRTL ? 'ar-SA' : 'en-US') 
                        : (isRTL ? 'لم يسجل الدخول أبداً' : 'Never logged in')}
                    </td>
                    <td className="p-5">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleOpenEditModal(admin)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title={isRTL ? 'تعديل' : 'Edit'}
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(admin)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title={isRTL ? 'حذف' : 'Delete'}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
                {filteredAdmins.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Shield className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg font-medium">{isRTL ? 'لا يوجد مشرفين' : 'No admins found'}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Add/Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  {isEditMode ? <Edit className="w-6 h-6 text-orange-500" /> : <UserPlus className="w-6 h-6 text-orange-500" />}
                  {isEditMode ? (isRTL ? 'تعديل بيانات المشرف' : 'Edit Admin') : (isRTL ? 'إضافة مشرف جديد' : 'Add New Admin')}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <form id="adminForm" onSubmit={handleSaveAdmin} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        {isRTL ? 'اسم المستخدم' : 'Username'}
                      </label>
                      <input 
                        type="text" 
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        {isRTL ? 'كلمة المرور' : 'Password'}
                        {isEditMode && <span className="text-xs text-slate-400 font-normal ml-2">({isRTL ? 'اتركه فارغاً لعدم التغيير' : 'leave blank to keep current'})</span>}
                      </label>
                      <input 
                        type="password" 
                        required={!isEditMode}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      {isRTL ? 'الدور (Role)' : 'Role'}
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                    >
                      {roles.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                      {isRTL ? 'الصلاحيات (Permissions)' : 'Permissions'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {availablePermissions.map(perm => {
                        const isSelected = permissions.includes(perm.id);
                        return (
                          <button
                            type="button"
                            key={perm.id}
                            onClick={() => handleTogglePermission(perm.id)}
                            className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-colors text-right ${
                              isSelected 
                                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400 font-bold' 
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                              isSelected ? 'bg-orange-500 border-orange-500' : 'border-slate-300 dark:border-slate-600'
                            }`}>
                              {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                            </div>
                            {perm.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  form="adminForm"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-lg shadow-orange-500/30 transition-all hover:scale-105 active:scale-95"
                >
                  <Save className="w-5 h-5" />
                  {isRTL ? 'حفظ البيانات' : 'Save Admin'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
