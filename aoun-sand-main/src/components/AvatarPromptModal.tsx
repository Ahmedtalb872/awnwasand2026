import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Camera, ShieldCheck } from 'lucide-react';

export const AvatarPromptModal = () => {
  const { language } = useLanguage();
  const { user, userProfile } = useAuth();
  const isRTL = language === 'ar';
  
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!avatarFile || !user) {
      toast.error(isRTL ? 'الرجاء اختيار صورة شخصية' : 'Please select a profile picture');
      return;
    }

    setIsLoading(true);
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile);
        
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const avatar_url = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success(isRTL ? 'تم تحديث الصورة الشخصية بنجاح' : 'Profile picture updated successfully');
      // The realtime subscription in AuthContext will automatically fetch the updated profile and unblock the UI
      // but just in case, we can force a reload after a short delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error(isRTL ? 'حدث خطأ أثناء رفع الصورة' : 'Error uploading profile picture');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md" dir={isRTL ? 'rtl' : 'ltr'}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 md:p-10 border border-slate-200 dark:border-slate-800 text-center w-full max-w-md relative overflow-hidden"
      >
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-[60px] pointer-events-none" />
        
        <div className="relative z-10">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-200 dark:border-indigo-800">
            <ShieldCheck className="w-8 h-8" />
          </div>
          
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-3">
            {isRTL ? 'تحديث البيانات المطلوبة' : 'Required Update'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8 font-medium">
            {isRTL 
              ? 'يرجى إضافة صورة شخصية لحسابك حتى تتمكن من الاستمرار في استخدام المنصة والوصول إلى كافة الميزات.' 
              : 'Please add a profile picture to your account to continue using the platform and access all features.'}
          </p>

          <div className="flex justify-center mb-8">
            <div className="relative group cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                id="avatar-upload-prompt"
              />
              <label htmlFor="avatar-upload-prompt" className="cursor-pointer block">
                <div className={`w-32 h-32 rounded-full border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-800/50 transition-all ${avatarPreview ? 'shadow-lg border-indigo-500' : 'group-hover:border-indigo-500'}`}>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-10 h-10 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                  )}
                </div>
                <div className="absolute bottom-1 right-1 w-10 h-10 bg-indigo-600 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-110">
                  <Upload className="w-5 h-5" />
                </div>
              </label>
            </div>
          </div>

          <button 
            onClick={handleUpload}
            disabled={isLoading || !avatarFile}
            className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold text-lg shadow-[0_8px_20px_-4px_rgba(79,70,229,0.4)] transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              isRTL ? 'حفظ المتابعة' : 'Save & Continue'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
