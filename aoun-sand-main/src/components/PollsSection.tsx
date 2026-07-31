import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';
import {
  BarChart2, CheckCircle2, Users, Lock, Clock,
  ChevronRight, Send, Trophy, Flame
} from 'lucide-react';

/* ── Progress Bar ── */
const PollBar = ({
  pct,
  isChosen,
  isLeading,
  delay,
}: {
  pct: number;
  isChosen: boolean;
  isLeading: boolean;
  delay: number;
}) => (
  <motion.div
    initial={{ width: 0 }}
    animate={{ width: `${Math.min(100, pct)}%` }}
    transition={{ duration: 0.9, ease: 'easeOut', delay }}
    className={`absolute inset-y-0 start-0 rounded-2xl ${
      isChosen
        ? 'bg-gradient-to-r from-secondary/30 to-secondary/20 dark:from-secondary/20 dark:to-secondary/10'
        : isLeading
        ? 'bg-indigo-50 dark:bg-indigo-900/30'
        : 'bg-slate-100 dark:bg-slate-800/60'
    }`}
  />
);

/* ══════════════════════════════
   Main PollsSection Component
   ══════════════════════════════ */
export const PollsSection = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';

  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [voted, setVoted] = useState<Record<string, boolean>>({}); // optimistic UI

  /* ── Fetch polls ── */
  const fetchActivePolls = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('polls')
        .select('*, poll_options(*), poll_votes(*)')
        .order('created_at', { ascending: false });

      if (data) {
        setPolls(
          data.filter(p => !p.is_closed && !(p.expires_at && new Date(p.expires_at) < new Date()))
        );
      }
    } catch (e) {
      console.error('fetchActivePolls error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivePolls();

    const ch = supabase.channel('polls:home:v4')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, fetchActivePolls)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, fetchActivePolls)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [fetchActivePolls]);

  /* ── Single vote (radio) ── */
  const handleSingleVote = async (pollId: string, optionId: string) => {
    if (!user) {
      toast.error(isRTL ? 'يجب تسجيل الدخول للتصويت' : 'Login to vote');
      return;
    }
    setSubmitting(pollId);
    try {
      const { error } = await supabase
        .from('poll_votes')
        .insert([{ poll_id: pollId, option_id: optionId, user_id: user.id }]);

      if (error) {
        if (error.code === '23505') {
          toast.error(isRTL ? 'صوّتَّ مسبقاً في هذا الاستطلاع' : 'Already voted');
        } else {
          throw error;
        }
      } else {
        toast.success(isRTL ? '✓ تم تسجيل صوتك!' : '✓ Vote recorded!', {
          style: { fontWeight: 'bold' },
          icon: '🗳️',
        });
        setVoted(prev => ({ ...prev, [pollId]: true }));
        fetchActivePolls();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(null);
    }
  };

  /* ── Toggle checkbox for multiple ── */
  const toggleOption = (pollId: string, optionId: string) => {
    setSelectedOptions(prev => {
      const current = prev[pollId] || [];
      if (current.includes(optionId)) {
        return { ...prev, [pollId]: current.filter(id => id !== optionId) };
      }
      return { ...prev, [pollId]: [...current, optionId] };
    });
  };

  /* ── Multiple vote submit ── */
  const handleMultipleSubmit = async (pollId: string) => {
    if (!user) {
      toast.error(isRTL ? 'يجب تسجيل الدخول للتصويت' : 'Login to vote');
      return;
    }
    const opts = selectedOptions[pollId] || [];
    if (opts.length === 0) {
      toast.error(isRTL ? 'اختر خياراً على الأقل' : 'Select at least one option');
      return;
    }

    setSubmitting(pollId);
    try {
      const inserts = opts.map(oId => ({ poll_id: pollId, option_id: oId, user_id: user.id }));
      const { error } = await supabase.from('poll_votes').insert(inserts);
      if (error) {
        if (error.code === '23505') {
          toast.error(isRTL ? 'صوّتَّ مسبقاً في هذا الاستطلاع' : 'Already voted');
        } else {
          throw error;
        }
      } else {
        toast.success(isRTL ? '✓ تم تسجيل أصواتك!' : '✓ Votes recorded!', { icon: '🗳️' });
        setSelectedOptions(prev => ({ ...prev, [pollId]: [] }));
        setVoted(prev => ({ ...prev, [pollId]: true }));
        fetchActivePolls();
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(null);
    }
  };

  if (loading || polls.length === 0) return null;

  return (
    <section className="mb-14" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-secondary-dark flex items-center justify-center shadow-lg shadow-primary/30">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <span className="absolute -top-1 -end-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-950 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white">
              {isRTL ? 'استطلاعات الرأي' : 'Live Polls'}
            </h2>
            <p className="text-xs font-medium text-slate-400">
              {isRTL
                ? `${polls.length} استطلاع نشط`
                : `${polls.length} active poll${polls.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Poll Cards ── */}
      <div className="space-y-5">
        {polls.map((poll, i) => {
          const totalVotes = poll.poll_votes?.length || 0;
          const userVotes = user
            ? poll.poll_votes?.filter((v: any) => v.user_id === user.id)
            : [];
          const hasVoted = (userVotes && userVotes.length > 0) || voted[poll.id];
          const isSubmittingThis = submitting === poll.id;
          const allowMultiple = poll.allow_multiple === true;
          const selectedForThis = selectedOptions[poll.id] || [];
          const uniqueVoters = new Set(poll.poll_votes?.map((v: any) => v.user_id)).size;

          /* Compute options with vote counts & percentages */
          const optionsWithVotes = (poll.poll_options || []).map((opt: any) => {
            const votesForOpt =
              poll.poll_votes?.filter((v: any) => v.option_id === opt.id).length || 0;
            const divisor = allowMultiple
              ? Math.max(uniqueVoters, 1)
              : Math.max(totalVotes, 1);
            return {
              ...opt,
              votes: votesForOpt,
              pct: totalVotes > 0 ? Math.round((votesForOpt / divisor) * 100) : 0,
            };
          });
          const maxPct = Math.max(...optionsWithVotes.map((o: any) => o.pct), 0);
          const winnerOpt = optionsWithVotes.find((o: any) => o.pct === maxPct && o.pct > 0);

          return (
            <motion.div
              key={poll.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300"
            >
              {/* Poll Header */}
              <div className="px-5 pt-5 pb-4">
                {/* Poll title row */}
                <div className="flex items-start gap-3 mb-5">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-primary to-secondary-dark flex items-center justify-center shrink-0 shadow-sm shadow-primary/25 mt-0.5">
                    <BarChart2 className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-base sm:text-lg text-slate-800 dark:text-white leading-snug">
                      {poll.title}
                    </h3>
                    {poll.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {poll.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-2.5">
                  {optionsWithVotes.map((opt: any, idx: number) => {
                    const isChosen = userVotes?.some((v: any) => v.option_id === opt.id);
                    const isLeading = hasVoted && opt.pct === maxPct && opt.pct > 0;
                    const isSelected = selectedForThis.includes(opt.id);

                    return (
                      <div key={opt.id}>
                        {!hasVoted ? (
                          /* ── Unvoted: interactive option ── */
                          <motion.button
                            whileTap={{ scale: 0.975 }}
                            onClick={() =>
                              allowMultiple
                                ? toggleOption(poll.id, opt.id)
                                : handleSingleVote(poll.id, opt.id)
                            }
                            disabled={isSubmittingThis}
                            id={`poll-${poll.id}-opt-${opt.id}`}
                            className={`w-full text-start flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all duration-150 disabled:opacity-60 group
                              ${isSelected
                                ? 'border-secondary-dark dark:border-secondary bg-secondary/10 dark:bg-secondary/10'
                                : 'border-slate-200 dark:border-slate-700 bg-transparent hover:border-secondary dark:hover:border-secondary-dark hover:bg-secondary/5 dark:hover:bg-secondary/10'
                              }`}
                          >
                            {/* Indicator */}
                            <div
                              className={`w-5 h-5 flex items-center justify-center shrink-0 transition-all border-2 ${
                                allowMultiple ? 'rounded-md' : 'rounded-full'
                              } ${
                                isSelected
                                  ? 'border-secondary-dark bg-secondary-dark'
                                  : 'border-slate-300 dark:border-slate-600 group-hover:border-secondary dark:group-hover:border-secondary-dark'
                              }`}
                            >
                              {allowMultiple ? (
                                isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <div
                                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                                    isSelected ? 'bg-white' : 'bg-transparent group-hover:bg-secondary/50'
                                  }`}
                                />
                              )}
                            </div>

                            <span
                              className={`text-sm sm:text-base font-semibold flex-1 transition-colors ${
                                isSelected
                                  ? 'text-primary dark:text-secondary'
                                  : 'text-slate-700 dark:text-slate-200 group-hover:text-primary dark:group-hover:text-secondary'
                              }`}
                            >
                              {opt.option_text}
                            </span>

                            {/* Arrow for single-choice */}
                            {!allowMultiple && (
                              <ChevronRight
                                className={`w-4 h-4 shrink-0 transition-all ${
                                  isSelected
                                    ? 'text-secondary-dark translate-x-0.5'
                                    : 'text-slate-300 dark:text-slate-600 group-hover:text-secondary group-hover:translate-x-0.5'
                                } ${isRTL ? 'rotate-180' : ''}`}
                              />
                            )}

                            {/* Spinner for submitting single */}
                            {!allowMultiple && isSubmittingThis && idx === 0 && (
                              <div className="ms-auto w-4 h-4 border-2 border-secondary/40 border-t-secondary-dark rounded-full animate-spin shrink-0" />
                            )}
                          </motion.button>
                        ) : (
                          /* ── Voted: result bar ── */
                          <div
                            className={`relative overflow-hidden rounded-2xl border-2 px-4 py-3.5 transition-all ${
                              isChosen
                                ? 'border-secondary dark:border-secondary-dark'
                                : isLeading
                                ? 'border-indigo-200 dark:border-indigo-800'
                                : 'border-slate-100 dark:border-slate-800'
                            }`}
                          >
                            <PollBar
                              pct={opt.pct}
                              isChosen={!!isChosen}
                              isLeading={isLeading}
                              delay={idx * 0.06}
                            />
                            <div className="relative z-10 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                {/* Check / Radio indicator */}
                                <div
                                  className={`w-5 h-5 flex items-center justify-center shrink-0 border-2 ${
                                    allowMultiple ? 'rounded-md' : 'rounded-full'
                                  } ${
                                    isChosen
                                      ? 'border-secondary-dark bg-secondary-dark'
                                      : 'border-slate-300 dark:border-slate-600'
                                  }`}
                                >
                                  {isChosen && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                </div>

                                <span
                                  className={`text-sm sm:text-base font-semibold truncate ${
                                    isChosen
                                      ? 'text-primary dark:text-secondary'
                                      : 'text-slate-600 dark:text-slate-300'
                                  }`}
                                >
                                  {opt.option_text}
                                </span>

                                {/* Badges */}
                                {isLeading && (
                                  <span className="hidden sm:flex items-center gap-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded-lg shrink-0">
                                    <Trophy className="w-3 h-3" />
                                    {isRTL ? 'الأعلى' : 'Leading'}
                                  </span>
                                )}
                              </div>

                              {/* Stats */}
                              <div className="flex items-center gap-2 shrink-0">
                                <span
                                  className={`text-sm font-black tabular-nums ${
                                    isChosen
                                      ? 'text-secondary-dark dark:text-secondary'
                                      : isLeading
                                      ? 'text-indigo-600 dark:text-indigo-400'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`}
                                >
                                  {opt.pct}%
                                </span>
                                <span className="text-xs text-slate-400 font-medium">
                                  ({opt.votes})
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Poll Footer ── */}
              <div className="px-5 py-3.5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                {/* Participants */}
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {uniqueVoters} {isRTL ? 'مشارك' : 'participant' + (uniqueVoters !== 1 ? 's' : '')}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Multiple choice submit */}
                  {!hasVoted && allowMultiple && selectedForThis.length > 0 && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleMultipleSubmit(poll.id)}
                      disabled={isSubmittingThis}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-primary to-secondary-dark hover:from-primary-dark hover:to-secondary text-white text-xs font-black rounded-xl transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                    >
                      {isSubmittingThis ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send className="w-3.5 h-3.5" />
                      )}
                      {isRTL ? `تصويت (${selectedForThis.length})` : `Submit (${selectedForThis.length})`}
                    </motion.button>
                  )}

                  {/* Expiry */}
                  {poll.expires_at && (
                    <div className="flex items-center gap-1 text-xs text-amber-500 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(poll.expires_at).toLocaleDateString(
                          isRTL ? 'ar-SA' : 'en-US',
                          { month: 'short', day: 'numeric' }
                        )}
                      </span>
                    </div>
                  )}

                  {/* Status indicator */}
                  {!user ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-800/40">
                      <Lock className="w-3 h-3" />
                      {isRTL ? 'سجّل للتصويت' : 'Login to vote'}
                    </div>
                  ) : hasVoted ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold text-secondary-dark dark:text-secondary">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {isRTL ? 'تم التصويت ✓' : 'Voted ✓'}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">
                      {isRTL
                        ? allowMultiple ? 'اختر خياراً أو أكثر' : 'اختر خياراً'
                        : allowMultiple ? 'Select one or more' : 'Select an option'}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
