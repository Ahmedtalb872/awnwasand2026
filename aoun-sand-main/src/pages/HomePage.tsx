import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  Users, TrendingUp, HandHeart, Sparkles,
  BookOpen, Video, Info, Heart, ArrowLeft, ArrowRight,
  Target, CheckCircle2, Bell, Receipt, Trophy, CreditCard, ChevronLeft, ChevronRight
} from 'lucide-react';
import { PollsSection } from '../components/PollsSection';

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

/* ── Campaign Card ── */
const CampaignCard = ({ campaign, isRTL }: { campaign: any; isRTL: boolean }) => {
  const percent = Math.min(100, Math.round((campaign.current_amount / Math.max(campaign.target_amount, 1)) * 100));
  const isComplete = campaign.status === 'completed' || percent >= 100;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="relative bg-white dark:bg-slate-800/80 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-md hover:shadow-xl transition-all overflow-hidden group"
    >
      {/* Glow top */}
      <div className={`absolute top-0 inset-x-0 h-1 rounded-t-3xl ${isComplete ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} />

      {isComplete && (
        <div className="absolute top-4 end-4">
          <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
        </div>
      )}

      <div className="mb-3 pe-10">
        <h4 className="font-bold text-base text-slate-800 dark:text-white leading-snug mb-1">{campaign.title}</h4>
        {campaign.description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{campaign.description}</p>
        )}
      </div>

      {/* Amounts */}
      <div className="flex justify-between items-center text-xs font-bold mb-2" dir="ltr">
        <span className={`text-base font-black ${isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
          {campaign.current_amount.toLocaleString()} <span className="text-xs font-medium text-slate-400">MRO</span>
        </span>
        <span className="text-slate-400 font-medium">
          {isRTL ? 'من' : 'of'} {campaign.target_amount.toLocaleString()} MRO
        </span>
      </div>

      {/* Progress */}
      <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${percent}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: [0.34, 1.56, 0.64, 1] }}
          className={`h-full rounded-full ${isComplete ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Users className="w-3.5 h-3.5" />
          <span>{campaign.donors_count || 0} {isRTL ? 'متبرع' : 'donors'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-black ${isComplete ? 'text-emerald-500' : 'text-indigo-600 dark:text-indigo-400'}`}>
            {percent}%
          </span>
          <Link
            to="/donate"
            className="text-xs font-bold px-3 py-1 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
            onClick={e => e.stopPropagation()}
          >
            {isRTL ? 'تبرع' : 'Donate'}
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

/* ── Donation Banner (shows when admin publishes campaigns) ── */
const DonationBanner = ({ campaigns, settings, isRTL, language }: { campaigns: any[]; settings: any; isRTL: boolean; language: string }) => {
  const donationRef = useRef(null);
  const isDonationInView = useInView(donationRef, { once: true, margin: '-60px' });
  const totalDonations = settings?.campaigns?.reduce((s: number, c: any) => s + (c.current_amount || 0), 0) || settings?.total_donations || 0;
  const animatedDonations = useCounter(totalDonations, 2500);

  return (
    <motion.section
      ref={donationRef}
      initial={{ opacity: 0, y: 30 }}
      animate={isDonationInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Donations"
      className="mb-10"
    >
      {/* Banner Header */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-rose-500 p-6 sm:p-8 mb-5 shadow-xl shadow-indigo-500/20">
        {/* Animated blobs */}
        <div className="absolute -top-10 -end-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 -start-8 w-32 h-32 rounded-full bg-rose-400/20 blur-xl" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner shrink-0">
              <HandHeart className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-white/60 uppercase tracking-widest">
                  {isRTL ? 'حملة التبرعات' : 'Donation Campaign'}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-400 text-white px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  {isRTL ? 'نشطة' : 'Live'}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {isRTL
                  ? (settings?.title_ar || 'معاً نصنع الأثر')
                  : (language === 'fr' ? (settings?.title_fr || 'Ensemble') : (settings?.title_en || 'Together We Make an Impact'))}
              </h2>
              {(isRTL ? settings?.desc_ar : language === 'fr' ? settings?.desc_fr : settings?.desc_en) && (
                <p className="text-sm text-white/70 mt-1 leading-relaxed line-clamp-2">
                  {isRTL ? settings?.desc_ar : language === 'fr' ? settings?.desc_fr : settings?.desc_en}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Collected amount */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl px-4 py-3 text-center border border-white/20">
              <p className="text-xs text-white/60 font-semibold mb-0.5">
                {isRTL ? 'إجمالي التبرعات' : 'Total Collected'}
              </p>
              <div className="flex items-baseline gap-1" dir="ltr">
                <span className="text-2xl font-black text-white tabular-nums">{animatedDonations.toLocaleString()}</span>
                <span className="text-xs font-bold text-white/70">MRO</span>
              </div>
            </div>

            <Link
              to="/donate"
              className="flex items-center gap-2 px-5 py-3.5 bg-white text-indigo-700 hover:bg-indigo-50 active:scale-95 font-black text-sm rounded-2xl shadow-lg transition-all group"
            >
              <Heart className="w-4 h-4 fill-current group-hover:scale-125 transition-transform" />
              {isRTL ? 'تبرع الآن' : 'Donate Now'}
              {isRTL ? <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </Link>
          </div>
        </div>
      </div>

      {/* Campaign Cards */}
      {campaigns.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Target className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              {isRTL ? `حملات التبرع النشطة (${campaigns.length})` : `Active Campaigns (${campaigns.length})`}
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {campaigns.map((campaign: any) => (
              <CampaignCard key={campaign.id} campaign={campaign} isRTL={isRTL} />
            ))}
          </div>
        </div>
      )}
    </motion.section>
  );
};

/* ── Main Component ── */
export const HomePage = () => {
  const { userProfile } = useAuth();
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const hp = (t as any).homePage || {};

  const [usersCount, setUsersCount] = useState(0);
  const [settings, setSettings] = useState<any>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

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

  /* ── Fetch donation settings ── */
  const fetchSettings = async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', 'donation_section')
      .maybeSingle();
    if (data?.value) setSettings(data.value);
    else setSettings(null);
    setSettingsLoaded(true);
  };

  useEffect(() => {
    // Initial load
    fetchUsersCount();
    fetchSettings();

    // Periodic refresh — safety net for missed realtime events
    const interval = setInterval(() => {
      fetchUsersCount();
      fetchSettings(); // ✅ also refresh settings so donations always stay current
    }, 30000);

    // Realtime: user joins → re-fetch accurate count from auth.users
    const ch1 = supabase.channel('hp:users:v4')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' },
        () => fetchUsersCount())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'users' },
        () => fetchUsersCount())
      .subscribe();

    // Realtime: donation settings change — always re-fetch for reliability
    // (payload.new only works if REPLICA IDENTITY FULL is set on the table)
    const ch2 = supabase.channel('hp:settings:v5')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'site_settings', filter: 'id=eq.donation_section' },
        () => fetchSettings())
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'site_settings', filter: 'id=eq.donation_section' },
        () => fetchSettings())
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'site_settings', filter: 'id=eq.donation_section' },
        () => { setSettings(null); setSettingsLoaded(true); })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, []);

  const animatedMembers = useCounter(usersCount, 2000);

  // Only show donation section if admin has published public campaigns
  const publicCampaigns = (settings?.campaigns || []).filter((c: any) => c.is_public === true && c.status === 'active');
  const showDonationsSection = settingsLoaded && settings?.is_visible === true && publicCampaigns.length > 0;

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
            <Link to="/account" className="block bg-rose-50 dark:bg-rose-900/20 rounded-[2rem] p-5 sm:p-6 shadow-md hover:-translate-y-1 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white dark:bg-rose-900/40 flex items-center justify-center shrink-0 shadow-sm border border-rose-100 dark:border-rose-800">
                  <CreditCard className="w-6 h-6 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-rose-900 dark:text-rose-100 text-sm sm:text-base mb-1">{isRTL ? 'دفع رسوم الانتساب الشهري' : 'Pay Monthly Subscription'}</h3>
                  <p className="text-[11px] sm:text-xs text-rose-700/70 dark:text-rose-300/70 font-medium leading-relaxed">
                    {isRTL ? 'ساهم بانتظام في سداد اشتراكك لدعم واستمرارية المشاريع الإنسانية للجمعية.' : 'Contribute regularly to your subscription to support our humanitarian projects.'}
                  </p>
                </div>
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  {isRTL ? <ChevronLeft className="w-5 h-5 text-rose-400" /> : <ChevronRight className="w-5 h-5 text-rose-400" />}
                </div>
              </div>
            </Link>
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

        {/* ═══ DONATION CAMPAIGNS (Preserved) ═══ */}
        <AnimatePresence>
          {showDonationsSection && (
            <motion.div
              key="donation-banner"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-12"
            >
              <DonationBanner
                campaigns={publicCampaigns}
                settings={settings}
                isRTL={isRTL}
                language={language}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ POLLS (Preserved) ═══ */}
        <div className="mt-8">
          <PollsSection />
        </div>

      </div>
    </div>
  );
};
