import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, X, ChevronLeft, ChevronRight,
  ExternalLink, Image as ImageIcon, Video as VideoIcon,
  Sparkles, Clock, CheckCheck
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

interface Notification {
  id: string;
  title: string;
  message: string;
  link?: string;
  media_url?: string;
  created_at: string;
  scheduled_at?: string;
}

/* ── Media Preview ── */
const MediaPreview = ({ url }: { url: string }) => {
  const isVideo = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
  if (isVideo) {
    return (
      <div className="w-full rounded-2xl overflow-hidden bg-black aspect-video mt-3">
        <video src={url} controls preload="metadata" className="w-full h-full object-contain" playsInline />
      </div>
    );
  }
  return (
    <div className="w-full rounded-2xl overflow-hidden mt-3 bg-slate-100 dark:bg-slate-700">
      <img
        src={url} alt="media"
        className="w-full object-cover max-h-48"
        loading="lazy"
        onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
      />
    </div>
  );
};

/* ── Notification Card Content ── */
const NotifCard = ({
  notif, index, total, isRTL, language,
}: {
  notif: Notification; index: number; total: number; isRTL: boolean; language: string;
}) => {
  const isVideo = notif.media_url && /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(notif.media_url);

  return (
    <div>
      {/* Label row */}
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800/50">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
            {isRTL ? 'إشعار رسمي' : 'Official Notice'}
          </span>
        </div>
        {total > 1 && (
          <span className="text-xs font-bold text-slate-400 tabular-nums bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
            {index + 1} / {total}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-white mb-2 leading-snug break-words">
        {notif.title}
      </h3>

      {/* Message */}
      <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
        {notif.message}
      </p>

      {/* Media */}
      {notif.media_url && <MediaPreview url={notif.media_url} />}

      {/* Links + Date */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Clock className="w-3 h-3" />
          <span>
            {new Date(notif.created_at).toLocaleDateString(
              isRTL ? 'ar-SA' : language === 'fr' ? 'fr-FR' : 'en-US',
              { year: 'numeric', month: 'short', day: 'numeric' }
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {notif.media_url && (
            <a href={notif.media_url} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 hover:bg-purple-100 transition-colors">
              {isVideo ? <VideoIcon className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
              {isRTL ? 'الوسيط' : 'Media'}
            </a>
          )}
          {notif.link && (
            <a href={notif.link} target="_blank" rel="noreferrer"
               className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors">
              <ExternalLink className="w-3 h-3" />
              {isRTL ? 'المزيد' : 'More'}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   Main Notifications Modal
   ══════════════════════════════════════════════════════ */
export const NotificationsModal = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';

  const [isOpen, setIsOpen]           = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentIndex, setCurrentIndex]   = useState(0);
  const [seenIds, setSeenIds]             = useState<Set<string>>(new Set());
  const [direction, setDirection]         = useState(0);

  const storageKey = `notif_seen_${user?.id || 'guest'}`;

  /* Load seen IDs */
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setSeenIds(new Set(stored));
    } catch {
      setSeenIds(new Set());
    }
  }, [user?.id]);

  /* Fetch */
  const fetchNotifications = useCallback(async () => {
    const now = new Date().toISOString();
    const { data: instant } = await supabase
      .from('notifications').select('*')
      .is('scheduled_at', null)
      .order('created_at', { ascending: false }).limit(20);

    const { data: scheduled } = await supabase
      .from('notifications').select('*')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now)
      .order('created_at', { ascending: false }).limit(10);

    const all = [...(instant || []), ...(scheduled || [])];
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return all as Notification[];
  }, []);

  /* Init + Realtime */
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const notifs = await fetchNotifications();
      setNotifications(notifs);
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]') as string[];
      const unseen = notifs.filter(n => !stored.includes(n.id));
      if (unseen.length > 0) setTimeout(() => setIsOpen(true), 1200);
    };
    load();

    const ch = supabase.channel('notif-modal:v4')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
        async (payload) => {
          const n = payload.new as Notification;
          if (n.scheduled_at && new Date(n.scheduled_at) > new Date()) return;
          setNotifications(prev => [n, ...prev]);
          setCurrentIndex(0);
          setIsOpen(true);
        })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications' },
        (payload) => setNotifications(prev => prev.filter(n => n.id !== (payload.old as any).id)))
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user, fetchNotifications, storageKey]);

  /* Close + mark all seen */
  const handleClose = useCallback(() => {
    setIsOpen(false);
    const allIds = notifications.map(n => n.id);
    localStorage.setItem(storageKey, JSON.stringify(allIds));
    setSeenIds(new Set(allIds));
  }, [notifications, storageKey]);

  /* Navigation */
  const goNext = useCallback(() => {
    if (currentIndex < notifications.length - 1) {
      setDirection(1); setCurrentIndex(i => i + 1);
    } else {
      handleClose();
    }
  }, [currentIndex, notifications.length, handleClose]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) { setDirection(-1); setCurrentIndex(i => i - 1); }
  }, [currentIndex]);

  /* Keyboard */
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight') {
        if (isRTL) goPrev(); else goNext();
      }
      if (e.key === 'ArrowLeft') {
        if (isRTL) goNext(); else goPrev();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, handleClose, goNext, goPrev, isRTL]);

  if (!user || notifications.length === 0) return null;

  const current    = notifications[currentIndex];
  const isLast     = currentIndex === notifications.length - 1;
  const unseenCount = notifications.filter(n => !seenIds.has(n.id)).length;

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? (isRTL ? -50 : 50) : (isRTL ? 50 : -50), opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:  (d: number) => ({ x: d > 0 ? (isRTL ? 50 : -50) : (isRTL ? -50 : 50), opacity: 0 }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-[2px]"
            onClick={handleClose}
          />

          {/* Modal container — bottom sheet on mobile, centered on sm+ */}
          <div
            className="fixed inset-0 z-[201] flex flex-col justify-end sm:justify-center sm:items-center sm:p-4"
            dir={isRTL ? 'rtl' : 'ltr'}
            role="dialog" aria-modal aria-label={isRTL ? 'الإشعارات' : 'Notifications'}
          >
            <motion.div
              key="modal"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 32, stiffness: 360 }}
              /* On sm+, reset transform for centered modal */
              style={{ y: undefined }}
              className={[
                // Base
                'relative w-full bg-white dark:bg-slate-900',
                'border border-slate-200/80 dark:border-slate-700/60',
                'flex flex-col overflow-hidden',
                // Mobile: bottom sheet, max 90% viewport height
                'rounded-t-[32px] max-h-[90svh]',
                // Desktop: centered card, max width + full rounded corners
                'sm:rounded-[32px] sm:max-w-lg sm:max-h-[90vh]',
                'shadow-[0_-8px_60px_rgba(0,0,0,0.18)] sm:shadow-[0_24px_80px_rgba(0,0,0,0.22)]',
              ].join(' ')}
              onClick={e => e.stopPropagation()}
            >
              {/* Gradient top bar */}
              <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-400 rounded-t-[28px]" />

              {/* ── Drag handle (mobile only) ── */}
              <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
              </div>

              {/* ── Header (sticky) ── */}
              <div className="shrink-0 flex items-center justify-between px-5 pt-2 sm:pt-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
                      <Bell className="w-4 h-4 text-white" />
                    </div>
                    {unseenCount > 0 && (
                      <span className="absolute -top-1 -end-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                        {unseenCount > 9 ? '9+' : unseenCount}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="font-black text-slate-800 dark:text-white text-sm leading-tight">
                      {isRTL ? 'الإشعارات' : 'Notifications'}
                    </h2>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {isRTL ? `${notifications.length} إشعار` : `${notifications.length} notice${notifications.length !== 1 ? 's' : ''}`}
                    </p>
                  </div>
                </div>
                <button
                  id="notif-close-btn"
                  onClick={handleClose}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* ── Scrollable Content ── */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-4 overscroll-contain">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={current.id}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                  >
                    <NotifCard
                      notif={current}
                      index={currentIndex}
                      total={notifications.length}
                      isRTL={isRTL}
                      language={language}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* ── Dot indicators ── */}
              {notifications.length > 1 && (
                <div className="shrink-0 flex justify-center gap-1.5 py-2 px-5">
                  {notifications.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); }}
                      className={`transition-all duration-300 rounded-full ${
                        i === currentIndex
                          ? 'w-5 h-1.5 bg-indigo-500'
                          : 'w-1.5 h-1.5 bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* ── Footer (sticky) ── */}
              <div className="shrink-0 flex items-center justify-between gap-2 px-5 pb-5 pt-2 border-t border-slate-100 dark:border-slate-800"
                   style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))' }}>
                {/* Prev */}
                {notifications.length > 1 ? (
                  <button
                    onClick={goPrev} disabled={currentIndex === 0}
                    className="flex items-center gap-1 text-sm font-bold px-3 py-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                  >
                    {isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    {isRTL ? 'السابق' : 'Prev'}
                  </button>
                ) : <div />}

                {/* Next / Done */}
                <button
                  onClick={goNext}
                  className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                    isLast || notifications.length === 1
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/25'
                      : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  }`}
                >
                  {isLast || notifications.length === 1 ? (
                    <>
                      <CheckCheck className="w-4 h-4" />
                      {isRTL ? 'حسناً ✓' : 'Done ✓'}
                    </>
                  ) : (
                    <>
                      {isRTL ? 'التالي' : 'Next'}
                      {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
