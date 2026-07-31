import { useState, useEffect } from 'react';
import { Sun, Moon, Globe, Bell, X } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { MembershipCardModal } from './MembershipCardModal';
import { CreditCard } from 'lucide-react';

export const Header = () => {
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen]       = useState(false);
  const [scrolled, setScrolled]             = useState(false);
  const [hasUnread, setHasUnread]           = useState(false);
  const [notifications, setNotifications]   = useState<any[]>([]);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isRTL = language === 'ar';
  const isHomePage = location.pathname === '/';

  /* ── Scroll shadow ── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Notifications ── */
  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15);

    if (data) {
      setNotifications(data);
      const lastSeen = localStorage.getItem('last_notification_seen');
      if (data.length > 0 && (!lastSeen || new Date(data[0].created_at) > new Date(lastSeen))) {
        setHasUnread(true);
      }
    }
  };

  useEffect(() => {
    fetchNotifications();

    const sub = supabase.channel('header:notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications(prev => [payload.new, ...prev].slice(0, 15));
        setHasUnread(true);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(payload.new.title, { body: payload.new.message });
        }
      })
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, []);

  const openNotifications = () => {
    setHasUnread(false);
    setIsNotifOpen(v => !v);
    if (notifications.length > 0) {
      localStorage.setItem('last_notification_seen', new Date().toISOString());
    }
  };

  const languages = [
    { code: 'ar' as const, label: 'العربية',  flag: '🇲🇷' },
    { code: 'fr' as const, label: 'Français',  flag: '🇫🇷' },
    { code: 'en' as const, label: 'English',   flag: '🇬🇧' },
  ];

  const brandName =
    language === 'ar' ? 'عون وسند' :
    language === 'fr' ? 'Aide & Soutien' :
                        'Awn & Sanad';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isHomePage 
          ? 'bg-transparent border-transparent' 
          : scrolled
            ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.1)] dark:shadow-[0_2px_20px_-4px_rgba(0,0,0,0.4)] border-b border-slate-200/50 dark:border-slate-800/50'
            : 'bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50'
      }`}
    >
      <nav
        className="px-4 sm:px-6 py-3 max-w-5xl mx-auto flex items-center justify-between"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* ── Group 1: Logo/Avatar (RTL Start, LTR Left) ── */}
        <div className="flex items-center gap-3">
          {!isHomePage && (
            <Link
              to="/"
              id="header-logo"
              className="flex items-center gap-2.5 group shrink-0"
            >
              <div className="relative overflow-hidden rounded-full shadow-md ring-2 ring-indigo-500/20 group-hover:ring-indigo-500/50 transition-all">
                <img
                  src="/ABC.jpg"
                  alt="Logo"
                  className="h-9 w-9 object-cover transform group-hover:scale-110 transition-transform duration-500"
                />
              </div>
              <span className="text-base font-black bg-gradient-to-r from-indigo-600 to-teal-600 dark:from-indigo-400 dark:to-teal-400 bg-clip-text text-transparent hidden sm:block">
                {brandName}
              </span>
            </Link>
          )}

          {/* User greeting (sm+) for non-home, Avatar only for home */}
          {userProfile?.full_name && (
            <button
              onClick={() => navigate('/account')}
              className={isHomePage 
                ? "flex items-center justify-center w-10 h-10 rounded-full bg-slate-100/20 hover:bg-slate-100/30 border border-white/20 transition-colors shadow-sm shrink-0"
                : "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-600 dark:text-slate-300 text-sm font-medium transition-colors"
              }
            >
              <div className={isHomePage ? "w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-white text-sm font-bold" : "w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500 flex items-center justify-center text-white text-xs font-bold shrink-0"}>
                {userProfile.full_name.charAt(0)}
              </div>
              {!isHomePage && <span className="max-w-[120px] truncate">{userProfile.full_name}</span>}
            </button>
          )}
          
          {/* My Card Button - Show next to avatar on home page, otherwise handle in right group */}
          {isHomePage && userProfile && (
            <button
              onClick={() => setIsCardModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-rose-100 to-rose-50 hover:from-rose-200 hover:to-rose-100 dark:from-rose-900/30 dark:to-rose-800/30 text-rose-700 dark:text-rose-300 font-bold text-sm transition-all shadow-sm border border-rose-200 dark:border-rose-800/50"
            >
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{isRTL ? 'بطاقتي' : 'My Card'}</span>
            </button>
          )}
        </div>

        {/* ── Group 2: Actions (RTL End, LTR Right) ── */}
        <div className="flex items-center gap-1 sm:gap-2">

          {/* My Card Button (Mobile Only for non-homepage) */}
          {!isHomePage && userProfile && (
            <button
              onClick={() => setIsCardModalOpen(true)}
              className="flex sm:hidden items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-100 to-rose-50 hover:from-rose-200 hover:to-rose-100 dark:from-rose-900/30 dark:to-rose-800/30 text-rose-700 dark:text-rose-300 font-bold text-sm transition-all shadow-sm border border-rose-200 dark:border-rose-800/50"
            >
              <CreditCard className="w-4 h-4" />
              <span>{isRTL ? 'بطاقتي' : 'My Card'}</span>
            </button>
          )}

          {/* Notifications bell */}
          <div className="relative">
            <button
              id="header-bell"
              onClick={openNotifications}
              className={`relative p-2.5 rounded-full transition-colors ${
                isHomePage
                  ? 'hover:bg-white/10 text-white'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              <AnimatePresence>
                {hasUnread && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-1.5 end-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"
                  />
                )}
              </AnimatePresence>
            </button>

            {/* ── Notification panel ── */}
            <AnimatePresence>
              {isNotifOpen && (
                <div
                  className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
                  onClick={() => setIsNotifOpen(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 20 }}
                    transition={{ type: 'spring', damping: 26, stiffness: 340 }}
                    onClick={e => e.stopPropagation()}
                    className="w-full max-w-md flex flex-col max-h-[85vh] overflow-hidden rounded-3xl shadow-2xl"
                    style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #1e3a5f 100%)' }}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    {/* Decorative blobs */}
                    <div className="absolute top-0 start-0 w-48 h-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute bottom-0 end-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Panel header */}
                    <div className="relative z-10 px-6 pt-6 pb-5 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                          <Bell className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white">
                            {isRTL ? 'الإشعارات' : 'Notifications'}
                          </h3>
                          <p className="text-xs text-indigo-200/70 font-medium">
                            {isRTL ? `${notifications.length} إشعار` : `${notifications.length} notifications`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setIsNotifOpen(false)}
                        className="w-9 h-9 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Scrollable content */}
                    <div className="relative z-10 overflow-y-auto flex-1 p-5 space-y-3">
                      {notifications.length === 0 ? (
                        <div className="py-12 text-center flex flex-col items-center gap-4">
                          <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center border border-white/20">
                            <Bell className="w-8 h-8 text-white/50" />
                          </div>
                          <div>
                            <p className="text-white/70 font-bold text-base">
                              {isRTL ? 'لا توجد إشعارات' : 'No notifications yet'}
                            </p>
                            <p className="text-white/40 text-xs mt-1">
                              {isRTL ? 'ستظهر الإشعارات هنا فور نشرها' : 'Notifications will appear here when published'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        notifications.map((notif, idx) => (
                          <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, x: isRTL ? 16 : -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/15 p-4 hover:bg-white/15 transition-all"
                          >
                            <div className="flex gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shrink-0 shadow-lg">
                                <Bell className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-white text-sm leading-snug mb-1">{notif.title}</h4>
                                <p className="text-sm text-white/60 leading-relaxed">{notif.message}</p>
                                {notif.link && (
                                  <a href={notif.link} target="_blank" rel="noopener noreferrer"
                                    className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-300 hover:text-indigo-200 transition-colors">
                                    {isRTL ? 'عرض الرابط ↗' : 'View Link ↗'}
                                  </a>
                                )}
                                {notif.media_url && (
                                  <div className="mt-2 rounded-xl overflow-hidden border border-white/20">
                                    {notif.media_type === 'video'
                                      ? <video src={notif.media_url} controls className="w-full max-h-32 object-cover" />
                                      : <img src={notif.media_url} alt="media" className="w-full max-h-32 object-cover" />}
                                  </div>
                                )}
                                <span className="text-[11px] text-white/35 mt-2 block font-medium">
                                  {new Date(notif.created_at).toLocaleDateString(
                                    isRTL ? 'ar-SA' : 'en-US',
                                    { weekday: 'long', month: 'short', day: 'numeric' }
                                  )}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>

                    {/* Footer */}
                    <div className="relative z-10 px-5 py-4 border-t border-white/10 shrink-0">
                      <button
                        onClick={() => setIsNotifOpen(false)}
                        className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold transition-all border border-white/15"
                      >
                        {isRTL ? 'إغلاق' : 'Close'}
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme toggle */}
          <button
            id="header-theme-toggle"
            onClick={toggleTheme}
            className={`p-2.5 rounded-full transition-colors ${
              isHomePage
                ? 'hover:bg-white/10 text-white'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>


        </div>
      </nav>
      
      {userProfile && (
        <MembershipCardModal 
          isOpen={isCardModalOpen} 
          onClose={() => setIsCardModalOpen(false)} 
        />
      )}
    </header>
  );
};
