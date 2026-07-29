import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Phone, User, Briefcase, MapPin, CreditCard, ChevronRight, ChevronLeft, ShieldCheck, Upload, Camera, Calendar } from 'lucide-react';

// Modern input field component
const PremiumInput = ({ icon: Icon, label, ...props }: any) => (
  <div className="relative group">
    <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 pl-4 rtl:pr-4 rtl:pl-0 flex items-center pointer-events-none">
      <Icon className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
    </div>
    <input 
      className="block w-full ltr:pl-11 rtl:pr-11 rtl:pl-4 py-4 bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 bg-clip-padding backdrop-filter backdrop-blur-sm transition-all hover:bg-white/60 dark:hover:bg-slate-900/60 outline-none shadow-sm"
      {...props} 
    />
  </div>
);

export const AuthPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const isRTL = language === 'ar';

  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'login' | 'select_signup' | 'signup_awn' | 'signup_mahaja'>('login');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Prevent redirect if we are in the middle of our own manual signup flow
  const [isManualSignupInProgress, setIsManualSignupInProgress] = useState(false);

  React.useEffect(() => {
    if (!authLoading && !isManualSignupInProgress && (user || isAdmin)) {
      navigate('/', { replace: true });
    }
  }, [user, isAdmin, authLoading, isManualSignupInProgress, navigate]);

  // Common Login/Signup Fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [location, setLocation] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Awn Specific Fields
  const [membershipType, setMembershipType] = useState('عضو');
  const [currentStatus, setCurrentStatus] = useState('أدرس');
  const [nationalId, setNationalId] = useState('');

  // Mahaja Specific Fields
  const [dateOfBirth, setDateOfBirth] = useState('');

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

  const validatePhone = (p: string) => {
    return /^[234]\d{7}$/.test(p);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!email || !phone) {
      setErrorMsg(isRTL ? 'الرجاء إدخال البريد الإلكتروني ورقم الهاتف' : 'Please enter email and phone');
      return;
    }

    if (!validatePhone(phone)) {
      setErrorMsg(isRTL ? 'رقم الهاتف غير صالح. يجب أن يتكون من 8 أرقام ويبدأ بـ 2، 3، أو 4.' : 'Invalid phone. Must be 8 digits and start with 2, 3, or 4.');
      return;
    }
    
    setIsLoading(true);
    const securePassword = `${phone}Awn1!`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: securePassword,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setStep('select_signup');
        setErrorMsg('');
      } else {
        setErrorMsg(error.message);
      }
    } else {
      if (data.user) {
        const { data: existingUser } = await supabase.from('users').select('id, full_name, is_mahaja').eq('id', data.user.id).single();
        if (!existingUser) {
          // If the auth user exists but the public profile doesn't, we insert a placeholder to avoid breaking the app
          const { error: insertError } = await supabase.from('users').insert([{
            id: data.user.id,
            email: email,
            phone: phone,
            full_name: 'مستخدم جديد',
            membership_type: 'عضو',
            current_status: 'لا شيء',
            location: '',
            national_id: '',
            approval_status: 'Pending Approval'
          }]);
          if (insertError) {
            console.error('Insert error:', insertError);
            toast.error(isRTL ? 'خطأ في قاعدة البيانات: ' + insertError.message : 'Database error: ' + insertError.message);
          }
          toast.success(isRTL ? 'مرحباً بك يا مستخدم جديد!' : 'Welcome, new user!');
        } else {
          toast.success(isRTL ? `مرحباً بك مجدداً، ${existingUser.full_name}!` : `Welcome back, ${existingUser.full_name}!`);
        }
      } else {
        toast.success(isRTL ? 'تم تسجيل الدخول بنجاح!' : 'Logged in successfully!');
      }
      
      navigate('/');
    }
    setIsLoading(false);
  };

  const executeSignup = async (isMahaja: boolean) => {
    setErrorMsg('');

    if (!avatarFile) {
      setErrorMsg(isRTL ? 'الرجاء اختيار صورة شخصية لإكمال التسجيل' : 'Please select a profile picture to complete registration');
      return;
    }

    if (!validatePhone(phone)) {
      setErrorMsg(isRTL ? 'رقم الهاتف غير صالح' : 'Invalid phone');
      return;
    }

    if (isMahaja && !dateOfBirth) {
      setErrorMsg(isRTL ? 'الرجاء إدخال تاريخ الميلاد' : 'Please enter date of birth');
      return;
    }

    setIsLoading(true);
    setIsManualSignupInProgress(true); // Prevent AuthContext from redirecting prematurely
    const securePassword = `${phone}Awn1!`;

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: securePassword,
      });

      if (error) {
        throw new Error(error.message);
      } 
      
      if (data.user) {
        let avatar_url = null;
        if (avatarFile) {
          const fileExt = avatarFile.name.split('.').pop();
          const fileName = `${data.user.id}-${Math.random()}.${fileExt}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, avatarFile);
            
          if (uploadData) {
            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
            avatar_url = publicUrlData.publicUrl;
          }
        }

        const userDataToUpsert: any = {
          id: data.user.id,
          full_name: fullName,
          email: email,
          phone: phone,
          location: location,
          avatar_url: avatar_url,
          approval_status: isMahaja ? 'Approved' : 'Pending Approval', // Maybe auto-approve Mahaja users or wait for admin? Let's leave Awn as Pending
          is_mahaja: isMahaja
        };

        if (isMahaja) {
          userDataToUpsert.date_of_birth = dateOfBirth;
          userDataToUpsert.membership_type = 'محجة';
          userDataToUpsert.current_status = 'طالب علم';
          userDataToUpsert.national_id = 'N/A';
          userDataToUpsert.approval_status = 'Approved'; // Mahaja users get immediate access to courses
        } else {
          userDataToUpsert.membership_type = membershipType;
          userDataToUpsert.current_status = currentStatus;
          userDataToUpsert.national_id = nationalId;
        }

        const { error: upsertError } = await supabase.from('users').upsert([userDataToUpsert], { onConflict: 'id' });
        
        if (upsertError) {
          console.error('Upsert error:', upsertError);
          toast.error(isRTL ? 'حدث خطأ في حفظ بياناتك: ' + upsertError.message : 'Error saving data: ' + upsertError.message);
        }
        
        if (!data.session) {
          await supabase.auth.signInWithPassword({
            email,
            password: securePassword,
          });
        }
        toast.success(isRTL ? `مرحباً بك يا ${fullName}!` : `Welcome, ${fullName}!`);
        setIsManualSignupInProgress(false);
        navigate(isMahaja ? '/mahaja' : '/');
      }
    } catch (err: any) {
      setErrorMsg(err.message || (isRTL ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'));
      setIsManualSignupInProgress(false);
    }
    
    setIsLoading(false);
  };

  const handleSignupAwn = (e: React.FormEvent) => {
    e.preventDefault();
    executeSignup(false);
  };

  const handleSignupMahaja = (e: React.FormEvent) => {
    e.preventDefault();
    executeSignup(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8 bg-[#f8fafc] dark:bg-[#0f172a] relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Premium Animated Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 blur-[120px] pointer-events-none animate-pulse-slow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-teal-500/20 to-emerald-500/20 blur-[120px] pointer-events-none animate-pulse-slow" style={{ animationDelay: '2s' }} />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-5xl flex flex-col lg:flex-row bg-white/70 dark:bg-slate-800/60 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/40 dark:border-slate-700/50 overflow-hidden relative z-10"
      >
        {/* Left Side: Branding / Info */}
        <div className="w-full lg:w-5/12 bg-gradient-to-br from-indigo-600 to-purple-700 p-10 lg:p-14 text-white flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
          
          <div className="relative z-10 flex items-center gap-3 mb-12">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-lg">
              <img src="/ABC.jpg" alt="Logo" className="w-8 h-8 object-cover rounded-xl" />
            </div>
            <span className="text-2xl font-black tracking-tight">
              {isRTL ? 'عون وسند' : 'Awn & Sanad'}
            </span>
          </div>

          <div className="relative z-10 flex-1 flex flex-col justify-center">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl lg:text-5xl font-bold mb-6 leading-tight"
            >
              {isRTL ? 'أهلاً بك في منصتنا الحديثة' : 'Welcome to our Modern Platform'}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-indigo-100 text-lg leading-relaxed mb-8"
            >
              {isRTL 
                ? 'انضم إلينا اليوم وكن جزءاً من مجتمع نابض بالحياة، يصنع الأثر ويبني المستقبل بلمسة عصرية.' 
                : 'Join us today and be part of a vibrant community making an impact and building the future with a modern touch.'}
            </motion.p>

            <div className="space-y-4">
              {[
                { label: isRTL ? 'تصفح سريع وآمن' : 'Fast & Secure Browsing', delay: 0.4 },
                { label: isRTL ? 'إشعارات حية وتصويتات' : 'Live Notifications & Polls', delay: 0.5 },
                { label: isRTL ? 'تواصل دائم ومستمر' : 'Continuous Communication', delay: 0.6 }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: item.delay }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-emerald-400/20 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="font-medium text-indigo-50">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full lg:w-7/12 p-8 lg:p-14 flex flex-col justify-center relative min-h-[500px]">
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute top-6 left-6 right-6 p-4 bg-red-50/80 dark:bg-red-900/30 backdrop-blur-md text-red-600 dark:text-red-400 rounded-2xl text-sm font-medium border border-red-100 dark:border-red-800 shadow-sm flex items-start gap-3 z-50"
              >
                <div className="w-5 h-5 mt-0.5 shrink-0 rounded-full bg-red-100 dark:bg-red-800/50 flex items-center justify-center">!</div>
                <p>{errorMsg}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="max-w-md w-full mx-auto">
            <AnimatePresence mode="wait">
              {step === 'login' && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="mb-10 text-center">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">
                      {isRTL ? 'تسجيل الدخول' : 'Sign In'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                      {isRTL ? 'أدخل بياناتك للوصول إلى حسابك أو إنشاء حساب جديد' : 'Enter your details to access your account or create a new one'}
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-5">
                    <PremiumInput 
                      icon={Mail}
                      type="email" 
                      required
                      value={email}
                      onChange={(e: any) => setEmail(e.target.value)}
                      placeholder={isRTL ? 'البريد الإلكتروني' : 'Email Address'}
                      dir="ltr"
                    />
                    
                    <PremiumInput 
                      icon={Phone}
                      type="tel" 
                      required
                      value={phone}
                      onChange={(e: any) => setPhone(e.target.value)}
                      placeholder={isRTL ? 'رقم الهاتف (8 أرقام)' : 'Phone Number (8 digits)'}
                      dir="ltr"
                    />

                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full mt-8 py-4 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold text-lg shadow-[0_8px_20px_-4px_rgba(79,70,229,0.4)] transform transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 group"
                    >
                      {isLoading ? (
                        <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>{isRTL ? 'متابعة' : 'Continue'}</span>
                          {isRTL ? <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> : <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                        </>
                      )}
                    </button>
                    
                    <div className="mt-6 text-center">
                      <button type="button" onClick={() => setStep('select_signup')} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                        {isRTL ? 'لا تملك حساباً؟ أنشئ حساباً جديداً' : 'Don\'t have an account? Create one'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

              {step === 'select_signup' && (
                <motion.div
                  key="select_signup"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col gap-6 items-center text-center py-8"
                >
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                    {isRTL ? 'اختر نوع الحساب' : 'Choose Account Type'}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">
                    {isRTL ? 'يرجى اختيار المنصة التي تود التسجيل بها' : 'Please select the platform you want to register for'}
                  </p>

                  <button 
                    onClick={() => setStep('signup_awn')}
                    className="w-full py-5 px-6 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Users className="w-6 h-6" />
                      </div>
                      <div className="text-start">
                        <h3 className="font-bold text-slate-800 dark:text-white">{isRTL ? 'عون وسند' : 'Awn & Sanad'}</h3>
                        <p className="text-sm text-slate-500">{isRTL ? 'التسجيل في الموقع الرئيسي' : 'Register for the main site'}</p>
                      </div>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                  </button>

                  <button 
                    onClick={() => setStep('signup_mahaja')}
                    className="w-full py-5 px-6 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 hover:from-teal-100 hover:to-emerald-100 dark:hover:from-teal-900/40 dark:hover:to-emerald-900/40 border-2 border-teal-200 dark:border-teal-800 rounded-2xl flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/50 rounded-full flex items-center justify-center text-teal-600 dark:text-teal-400">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div className="text-start">
                        <h3 className="font-bold text-slate-800 dark:text-white">{isRTL ? 'المحجة البيضاء' : 'Al-Mahaja Al-Baydaa'}</h3>
                        <p className="text-sm text-slate-500">{isRTL ? 'منصة الدورات والكتب' : 'Courses & Books Platform'}</p>
                      </div>
                    </div>
                    <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-teal-600 transition-colors" />
                  </button>

                  <button type="button" onClick={() => setStep('login')} className="mt-4 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium">
                    {isRTL ? 'رجوع إلى تسجيل الدخول' : 'Back to Login'}
                  </button>
                </motion.div>
              )}

              {(step === 'signup_awn' || step === 'signup_mahaja') && (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="mb-8 text-center">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">
                      {isRTL ? (step === 'signup_mahaja' ? 'التسجيل في المحجة البيضاء' : 'إكمال التسجيل') : 'Complete Registration'}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">
                      {isRTL ? 'يرجى تزويدنا ببعض التفاصيل لإنشاء حسابك' : 'Please provide details to create your account'}
                    </p>
                  </div>

                  <form onSubmit={step === 'signup_mahaja' ? handleSignupMahaja : handleSignupAwn} className="space-y-4">
                    
                    <div className="flex justify-center mb-6">
                      <div className="relative group cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                          id="avatar-upload"
                        />
                        <label htmlFor="avatar-upload" className="cursor-pointer block">
                          <div className={`w-24 h-24 rounded-full border-4 border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 transition-all ${avatarPreview ? '' : 'group-hover:border-indigo-500'}`}>
                            {avatarPreview ? (
                              <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                            ) : (
                              <Camera className="w-8 h-8 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                            )}
                          </div>
                          <div className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110">
                            <Upload className="w-4 h-4" />
                          </div>
                        </label>
                      </div>
                    </div>

                    <PremiumInput 
                      icon={User}
                      type="text" 
                      required
                      value={fullName}
                      onChange={(e: any) => setFullName(e.target.value)}
                      placeholder={isRTL ? 'الاسم الكامل' : 'Full Name'}
                    />
                    
                    <PremiumInput 
                      icon={Mail}
                      type="email" 
                      required
                      value={email}
                      onChange={(e: any) => setEmail(e.target.value)}
                      placeholder={isRTL ? 'البريد الإلكتروني' : 'Email'}
                      dir="ltr"
                    />

                    <PremiumInput 
                      icon={Phone}
                      type="tel" 
                      required
                      value={phone}
                      onChange={(e: any) => setPhone(e.target.value)}
                      placeholder={isRTL ? 'رقم الهاتف (8 أرقام)' : 'Phone Number'}
                      dir="ltr"
                    />

                    {step === 'signup_awn' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative group">
                          <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 pl-4 rtl:pr-4 rtl:pl-0 flex items-center pointer-events-none">
                            <Briefcase className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                          </div>
                          <select 
                            value={membershipType}
                            onChange={(e) => setMembershipType(e.target.value)}
                            className="block w-full ltr:pl-11 rtl:pr-11 rtl:pl-4 py-4 bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/50 outline-none backdrop-blur-sm appearance-none cursor-pointer"
                          >
                            <option value="عضو">{isRTL ? 'عضو' : 'Member'}</option>
                            <option value="منتسب">{isRTL ? 'منتسب' : 'Affiliate'}</option>
                          </select>
                        </div>

                        <div className="relative group">
                          <div className="absolute inset-y-0 ltr:left-0 rtl:right-0 pl-4 rtl:pr-4 rtl:pl-0 flex items-center pointer-events-none">
                            <User className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                          </div>
                          <select 
                            value={currentStatus}
                            onChange={(e) => setCurrentStatus(e.target.value)}
                            className="block w-full ltr:pl-11 rtl:pr-11 rtl:pl-4 py-4 bg-white/40 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/50 outline-none backdrop-blur-sm appearance-none cursor-pointer"
                          >
                            <option value="أدرس">{isRTL ? 'أدرس' : 'Studying'}</option>
                            <option value="أعمل">{isRTL ? 'أعمل' : 'Working'}</option>
                            <option value="لا شيء">{isRTL ? 'لا شيء' : 'None'}</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <PremiumInput 
                      icon={MapPin}
                      type="text" 
                      required
                      value={location}
                      onChange={(e: any) => setLocation(e.target.value)}
                      placeholder={isRTL ? 'مكان السكن' : 'Location'}
                    />

                    {step === 'signup_awn' && (
                      <PremiumInput 
                        icon={CreditCard}
                        type="text" 
                        required
                        value={nationalId}
                        onChange={(e: any) => setNationalId(e.target.value)}
                        placeholder={isRTL ? 'الرقم الوطني' : 'National ID'}
                      />
                    )}

                    {step === 'signup_mahaja' && (
                      <PremiumInput 
                        icon={Calendar}
                        type="date" 
                        required
                        value={dateOfBirth}
                        onChange={(e: any) => setDateOfBirth(e.target.value)}
                        placeholder={isRTL ? 'تاريخ الميلاد' : 'Date of Birth'}
                        className="w-full text-slate-500"
                      />
                    )}

                    <div className="pt-4 flex gap-4">
                      <button 
                        type="button" 
                        onClick={() => setStep('select_signup')}
                        className="w-1/3 py-4 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold transition-all"
                      >
                        {isRTL ? 'رجوع' : 'Back'}
                      </button>
                      <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-2/3 py-4 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-bold shadow-[0_8px_20px_-4px_rgba(79,70,229,0.4)] transform transition-all active:scale-[0.98] disabled:opacity-70 flex justify-center items-center"
                      >
                        {isLoading ? <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" /> : (isRTL ? 'إنشاء حساب' : 'Create Account')}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Extra icons needed for the selection screen
const Users = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const BookOpen = (props: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>;
