import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { LogOut, User, Phone, Mail, MapPin, CreditCard, Activity, FileText, Hash, Camera } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export const AccountPage = () => {
  const { user, userProfile, logout } = useAuth();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const details = userProfile ? [
    { label: isRTL ? 'المعرف الفريد' : 'Unique ID', value: userProfile.unique_short_id || (isRTL ? 'غير محدد' : 'N/A'), icon: Hash },
    { label: isRTL ? 'الاسم الكامل' : 'Full Name', value: userProfile.full_name, icon: User },
    { label: isRTL ? 'البريد الإلكتروني' : 'Email', value: userProfile.email, icon: Mail },
    { label: isRTL ? 'رقم الهاتف' : 'Phone', value: userProfile.phone, icon: Phone },
    { label: isRTL ? 'الرقم الوطني' : 'National ID', value: userProfile.national_id, icon: FileText },
    { label: isRTL ? 'الانتساب' : 'Membership', value: userProfile.membership_type, icon: CreditCard },
    { label: isRTL ? 'الحالة الحالية' : 'Status', value: userProfile.current_status, icon: Activity },
    { label: isRTL ? 'السكن' : 'Location', value: userProfile.location, icon: MapPin },
  ] : [
    { label: isRTL ? 'البريد الإلكتروني' : 'Email', value: user?.email || '', icon: Mail },
  ];

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 bg-slate-50 dark:bg-slate-900" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white px-1">
          {isRTL ? 'الحساب' : 'My Account'}
        </h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 text-center"
        >
          {/* Avatar */}
          <div className="relative inline-block mb-4 group">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                if (!e.target.files || !e.target.files[0] || !user) return;
                const file = e.target.files[0];
                const toastId = toast.loading(isRTL ? 'جاري الرفع...' : 'Uploading...');
                
                try {
                  const fileExt = file.name.split('.').pop();
                  const fileName = `${user.id}-${Math.random()}.${fileExt}`;
                  
                  const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(fileName, file);
                    
                  if (uploadError) throw uploadError;

                  const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
                  const avatar_url = publicUrlData.publicUrl;

                  const { error: updateError } = await supabase
                    .from('users')
                    .update({ avatar_url })
                    .eq('id', user.id);

                  if (updateError) throw updateError;

                  toast.success(isRTL ? 'تم تحديث الصورة بنجاح' : 'Avatar updated successfully', { id: toastId });
                } catch (error: any) {
                  console.error(error);
                  toast.error(isRTL ? 'خطأ في تحديث الصورة' : 'Error updating avatar', { id: toastId });
                }
              }}
              className="hidden"
              id="account-avatar-upload"
            />
            <label htmlFor="account-avatar-upload" className="cursor-pointer block relative">
              {userProfile?.avatar_url ? (
                <img 
                  src={userProfile.avatar_url} 
                  alt={userProfile.full_name} 
                  className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-slate-700 shadow-lg mx-auto group-hover:opacity-80 transition-opacity"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-lg border-4 border-white dark:border-slate-700 group-hover:opacity-80 transition-opacity">
                  <span className="text-white text-3xl font-black uppercase">
                    {userProfile?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>

              {/* Status indicator */}
              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 z-10 ${
                userProfile?.approval_status === 'Approved' ? 'bg-emerald-500' :
                userProfile?.approval_status === 'Rejected' ? 'bg-red-500' :
                userProfile?.approval_status === 'Suspended' ? 'bg-rose-500' :
                'bg-amber-400'
              }`} />
            </label>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {userProfile?.full_name || (isRTL ? 'مستخدم' : 'User')}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {userProfile?.email || user?.email}
          </p>
          {userProfile?.unique_short_id && (
            <span className="inline-block mt-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-mono font-bold border border-indigo-100 dark:border-indigo-800">
              {userProfile.unique_short_id}
            </span>
          )}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden"
        >
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-white">
              {isRTL ? 'المعلومات الشخصية' : 'Personal Information'}
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {details.map((detail, idx) => (
              <div key={idx} className="p-4 flex items-center gap-4">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0">
                  <detail.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{detail.label}</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{detail.value}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <a
            href="/requests"
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4 flex items-center justify-between hover:border-primary transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-white">
                  {isRTL ? 'طلباتي ومدفوعاتي' : 'My Requests & Payments'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isRTL ? 'عرض الطلبات والمدفوعات الخاصة بك' : 'View your requests and payments'}
                </p>
              </div>
            </div>
            <div className="text-slate-400 group-hover:text-primary transition-colors">
              {isRTL ? '←' : '→'}
            </div>
          </a>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={logout}
          className="w-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 font-semibold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>{isRTL ? 'تسجيل الخروج' : 'Log Out'}</span>
        </motion.button>
      </div>
    </div>
  );
};
