import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Users, TrendingUp, Sparkles,
  BookOpen, Video, Info, Heart, ArrowLeft, ArrowRight,
  CheckCircle2, Bell, Receipt, Trophy, CreditCard, ChevronLeft, ChevronRight, Phone
} from 'lucide-react';
import { PollsSection } from '../components/PollsSection';
import { MembershipFeeModal } from '../components/MembershipFeeModal';

/* ── Animated Counter ── */
const useCounter = (target: number, duration = 2000) => {
  const [count, setCount] = useState(0);
  const ref = useRef<number | null>(null);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setCount(Math.floor(p * target));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [target, duration]);
  return count;
};

/* ── Removed old Quick Links Data ── */

/* ── Main Component ── */
export const HomePage = () => {
  const { user, userProfile } = useAuth();
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const hp = (t as any).homePage || {};

  const [usersCount, setUsersCount] = useState(0);
  const [membershipStatus, setMembershipStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [showFeeModal, setShowFeeModal] = useState(false);

  /* ── Fetch latest membership fee request status ── */
  const fetchMembershipStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_memberships')
      .select('status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setMembershipStatus((data?.status as any) || 'none');
  };

  /* ── Fetch accurate user count via RPC (reads auth.users) ── */
  const fetchUsersCount = async () => {
    // Primary: RPC reads directly from auth.users (most accurate)
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_registered_count');
    if (!rpcErr && rpcData !== null) {
      setUsersCount(Number(rpcData));
      return;
    }
    // Fallback: count from public.users
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    if (count !== null) setUsersCount(count);
  };

  useEffect(() => {
    // Initial load
    fetchUsersCount();

    // Periodic refresh — safety net for missed realtime events
    const interval = setInterval(() => {
      fetchUsersCount();
    }, 30000);

    // Realtime: user joins → re-fetch accurate count from auth.users
    const ch1 = supabase.channel('hp:users:v4')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' },
        () => fetchUsersCount())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'users' },
        () => fetchUsersCount())
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(ch1);
    };
  }, []);

  // Realtime: membership fee request status changes (e.g. admin approval)
  useEffect(() => {
    if (!user) return;
    fetchMembershipStatus();
    const chMembership = supabase.channel(`hp:memberships:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_memberships', filter: `user_id=eq.${user.id}` },
        () => fetchMembershipStatus())
      .subscribe();
    return () => { supabase.removeChannel(chMembership); };
  }, [user]);

  const animatedMembers = useCounter(usersCount, 2000);

  return (
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 overflow-x-hidden" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Background Hero & Wave ── */}
      <div aria-hidden className="absolute top-0 left-0 right-0 h-[380px] sm:h-[420px] bg-[#1a1c4b] z-0 overflow-hidden">
        {/* Soft glows in background */}
        <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-10 w-64 h-64 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
        
        {/* Wave SVG matching the mockup */}
        <svg className="absolute bottom-0 left-0 right-0 w-full h-[60px] sm:h-[100px] text-slate-50 dark:text-slate-950 preserve-3d" preserveAspectRatio="none" viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 50C240 100 480 0 720 50C960 100 1200 0 1440 50V100H0V50Z" fill="currentColor" />
        </svg>
      </div>

      <div className="relative z-10 max-w-lg sm:max-w-xl mx-auto px-4 sm:px-6 pt-28 sm:pt-32 pb-32">
        {/* ═══ HERO TEXT ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center sm:text-start mb-8"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/90 text-[11px] font-bold mb-4 backdrop-blur-sm shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>{isRTL ? 'منصة الأعضاء الرسمية' : 'Official Members Platform'}</span>
          </div>

          <p className="text-sm sm:text-base text-indigo-100/90 font-medium mb-1">
            {isRTL ? 'جمعية عون وسند ترحب بك' : 'Aoun & Sanad welcomes you'}
          </p>

          <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
            {userProfile?.full_name || (isRTL ? 'ضيفنا الكريم' : 'Dear Guest')}
          </h1>
        </motion.section>

        {/* ═══ QUICK LINKS ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-6 relative z-20"
        >
          <div className="flex items-center justify-between mb-4 px-2">
             <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
               <BookOpen className="w-4 h-4 text-[#1a1c4b] dark:text-indigo-400 opacity-80" />
               {isRTL ? 'روابط سريعة' : 'Quick Links'}
             </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* About Us Card */}
            <Link to="/about" className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-[2rem] p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-1 transition-transform border border-slate-100 dark:border-slate-700/50">
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 dark:text-white text-sm leading-tight">{isRTL ? 'من نحن' : 'About Us'}</h3>
                <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{isRTL ? 'تعرف على رسالتنا' : 'Our mission'}</p>
              </div>
            </Link>

            {/* Donate Now Card */}
            <Link to="/donate" className="flex items-center gap-3 bg-rose-600 rounded-[2rem] p-4 sm:p-5 shadow-[0_8px_30px_rgba(225,29,72,0.3)] hover:-translate-y-1 transition-transform">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 text-white">
                <Heart className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="font-black text-white text-sm leading-tight">{isRTL ? 'تبرع الآن' : 'Donate Now'}</h3>
                <p className="text-[10px] text-rose-100 font-medium leading-tight mt-0.5">{isRTL ? 'شارك في العطاء' : 'Give back'}</p>
              </div>
            </Link>

            {/* Lessons Card */}
            <Link to="/lessons" className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-[2rem] p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-1 transition-transform border border-slate-100 dark:border-slate-700/50">
              <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                <Video className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 dark:text-white text-sm leading-tight">{isRTL ? 'الدروس' : 'Lessons'}</h3>
                <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{isRTL ? 'سلسلة الدروس العلمية' : 'Educational series'}</p>
              </div>
            </Link>

            {/* Contact Card */}
            <Link to="/contact" className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-[2rem] p-4 sm:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-1 transition-transform border border-slate-100 dark:border-slate-700/50">
              <div className="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 dark:text-white text-sm leading-tight">{isRTL ? 'اتصل بنا' : 'Contact Us'}</h3>
                <p className="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">{isRTL ? 'نحن هنا لمساعدتك' : "We're here to help"}</p>
              </div>
            </Link>
          </div>
        </motion.section>

        {/* ═══ MAIN ACTION CARDS ═══ */}
        <div className="space-y-4">
          {/* Mahaja Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Link to="/mahaja" className="block bg-[#1a1c4b] rounded-[2rem] p-5 sm:p-6 shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-indigo-500/20 transition-colors" />
              
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-rose-200/20 flex items-center justify-center shrink-0">
                  <BookOpen className="w-7 h-7 text-rose-200" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-white text-base sm:text-lg mb-1 leading-tight">{isRTL ? 'محظرة المحجة البيضاء التعليمية' : 'Al-Mahaja Educational Institute'}</h3>
                  <p className="text-xs text-indigo-200/80 leading-relaxed font-medium">
                    {isRTL ? 'منصة العلوم الشرعية المتكاملة: قراءة وتدبر القرآن الكريم، الدروس والمحاضرات الفقهية والمكتبة الشرعية.' : 'Integrated Islamic sciences platform: Quran reading & contemplation, fiqh lessons, and library.'}
                  </p>
                </div>
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1">
                  {isRTL ? <ChevronLeft className="w-4 h-4 text-white" /> : <ChevronRight className="w-4 h-4 text-white" />}
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Subscription Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            {membershipStatus === 'approved' ? (
              <div className="block bg-emerald-50 dark:bg-emerald-900/20 rounded-[2rem] p-5 sm:p-6 shadow-md">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-emerald-900/40 flex items-center justify-center shrink-0 shadow-sm border border-emerald-100 dark:border-emerald-800">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-emerald-900 dark:text-emerald-100 text-sm sm:text-base mb-1">{isRTL ? 'تم دفع رسوم الانتساب' : 'Membership Fee Paid'}</h3>
                    <p className="text-[11px] sm:text-xs text-emerald-700/70 dark:text-emerald-300/70 font-medium leading-relaxed">
                      {isRTL ? 'شكراً لك، تم تأكيد استلام رسوم انتسابك من الإدارة.' : 'Thank you, your membership fee has been confirmed by the admin.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : membershipStatus === 'pending' ? (
              <div className="block bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] p-5 sm:p-6 shadow-md">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-amber-900/40 flex items-center justify-center shrink-0 shadow-sm border border-amber-100 dark:border-amber-800">
                    <CreditCard className="w-6 h-6 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-amber-900 dark:text-amber-100 text-sm sm:text-base mb-1">{isRTL ? 'طلبك قيد المراجعة' : 'Request Under Review'}</h3>
                    <p className="text-[11px] sm:text-xs text-amber-700/70 dark:text-amber-300/70 font-medium leading-relaxed">
                      {isRTL ? 'تم إرسال طلب دفع رسوم الانتساب، بانتظار موافقة الإدارة.' : 'Your membership fee request was submitted and is awaiting admin approval.'}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowFeeModal(true)} className="w-full text-start block bg-rose-50 dark:bg-rose-900/20 rounded-[2rem] p-5 sm:p-6 shadow-md hover:-translate-y-1 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white dark:bg-rose-900/40 flex items-center justify-center shrink-0 shadow-sm border border-rose-100 dark:border-rose-800">
                    <CreditCard className="w-6 h-6 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-rose-900 dark:text-rose-100 text-sm sm:text-base mb-1">{isRTL ? 'دفع رسوم الانتساب' : 'Pay Membership Fee'}</h3>
                    <p className="text-[11px] sm:text-xs text-rose-700/70 dark:text-rose-300/70 font-medium leading-relaxed">
                      {isRTL ? 'ساهم بانتظام في سداد اشتراكك لدعم واستمرارية المشاريع الإنسانية للجمعية.' : 'Contribute regularly to your subscription to support our humanitarian projects.'}
                    </p>
                  </div>
                  <div className="w-6 h-6 flex items-center justify-center shrink-0">
                    {isRTL ? <ChevronLeft className="w-5 h-5 text-rose-400" /> : <ChevronRight className="w-5 h-5 text-rose-400" />}
                  </div>
                </div>
              </button>
            )}
          </motion.div>

          {/* Transparency Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Link to="/donation-expenses" className="block bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] p-5 sm:p-6 shadow-md hover:-translate-y-1 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-blue-900/40 flex items-center justify-center shrink-0 shadow-sm border border-blue-100 dark:border-blue-800">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-blue-950 dark:text-blue-100 text-sm sm:text-base mb-1">{isRTL ? 'مصاريف التبرعات والشفافية المالية' : 'Donation Expenses & Transparency'}</h3>
                  <p className="text-[11px] sm:text-xs text-blue-800/70 dark:text-blue-200/70 font-medium leading-relaxed">
                    {isRTL ? 'اطلع على كشوفات وقنوات صرف التبرعات والمساعدات بكل مصداقية وشفافية إدارية.' : 'View statements and channels of donation disbursement with transparency.'}
                  </p>
                </div>
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  {isRTL ? <ChevronLeft className="w-5 h-5 text-blue-400" /> : <ChevronRight className="w-5 h-5 text-blue-400" />}
                </div>
              </div>
            </Link>
          </motion.div>

          {/* Competitions Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            {/* Note: Links to /projects for now if competitions page doesn't exist, change later if needed */}
            <Link to="/projects" className="block bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] p-5 sm:p-6 shadow-md hover:-translate-y-1 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-amber-900/40 flex items-center justify-center shrink-0 shadow-sm border border-amber-100 dark:border-amber-800">
                  <Trophy className="w-6 h-6 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-amber-950 dark:text-amber-100 text-sm sm:text-base mb-1">{isRTL ? 'مسابقات الجمعية' : 'Association Competitions'}</h3>
                  <p className="text-[11px] sm:text-xs text-amber-800/70 dark:text-amber-200/70 font-medium leading-relaxed">
                    {isRTL ? 'شارك في مسابقات الجمعية الثقافية والقرآنية واربح جوائز قيمة.' : 'Participate in our cultural and Quranic competitions and win valuable prizes.'}
                  </p>
                </div>
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  {isRTL ? <ChevronLeft className="w-5 h-5 text-amber-400" /> : <ChevronRight className="w-5 h-5 text-amber-400" />}
                </div>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* ═══ POLLS (Preserved) ═══ */}
        <div className="mt-8">
          <PollsSection />
        </div>

      </div>

      {showFeeModal && (
        <MembershipFeeModal
          onClose={() => setShowFeeModal(false)}
          onSubmitted={fetchMembershipStatus}
        />
      )}
    </div>
  );
};
