import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import toast from 'react-hot-toast';
import { Vote, CheckCircle2, AlertCircle, BarChart2, Users } from 'lucide-react';

export const ActivePollsWidget = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';

  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    fetchActivePolls();

    const channel = supabase.channel('polls:widget')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, () => fetchActivePolls())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => fetchActivePolls())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const fetchActivePolls = async () => {
    try {
      const { data } = await supabase
        .from('polls')
        .select('*, poll_options(*), poll_votes(*)')
        .order('created_at', { ascending: false });

      if (data) {
        const active = data.filter(poll => {
          if (poll.is_closed) return false;
          if (poll.expires_at && new Date(poll.expires_at) < new Date()) return false;
          return true;
        });
        setPolls(active);
      }
    } catch (error) {
      console.error('Error fetching polls', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!user) {
      toast.error(isRTL ? 'يجب تسجيل الدخول للتصويت' : 'You must log in to vote');
      return;
    }
    setVotingId(pollId);
    try {
      const { error } = await supabase
        .from('poll_votes')
        .insert([{ poll_id: pollId, option_id: optionId, user_id: user.id }]);

      if (error) {
        if (error.code === '23505') {
          toast.error(isRTL ? 'لقد قمت بالتصويت مسبقاً' : 'You have already voted');
        } else throw error;
      } else {
        toast.success(isRTL ? 'تم تسجيل تصويتك بنجاح! ✓' : 'Your vote has been recorded! ✓');
        fetchActivePolls();
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setVotingId(null);
    }
  };

  if (loading || polls.length === 0) return null;

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Section header */}
      <div className="flex items-center gap-2 px-1">
        <div className="w-7 h-7 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center">
          <BarChart2 className="w-4 h-4 text-indigo-500" />
        </div>
        <span className="text-sm font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
          {isRTL ? 'استطلاعات نشطة' : 'Active Polls'}
        </span>
      </div>

      {polls.map((poll) => {
        const totalVotes  = poll.poll_votes?.length || 0;
        const userHasVoted = user ? poll.poll_votes?.some((v: any) => v.user_id === user.id) : false;
        const userVote     = user ? poll.poll_votes?.find((v: any) => v.user_id === user.id) : null;
        const isVoting     = votingId === poll.id;

        return (
          <motion.div
            key={poll.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl
              bg-[#1a1f2e] dark:bg-[#1a1f2e]
              border border-white/5 dark:border-white/5
              shadow-xl shadow-black/30"
          >
            {/* Subtle top gradient */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

            <div className="p-5">
              {/* Poll header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  {/* Badge */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                    bg-indigo-500/15 border border-indigo-500/20 mb-3">
                    <Vote className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      {isRTL ? 'تصويت' : 'Poll'}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white leading-tight mb-1">
                    {poll.title}
                  </h3>
                  {poll.description && (
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {poll.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                <AnimatePresence>
                  {poll.poll_options?.map((opt: any, idx: number) => {
                    const votes      = poll.poll_votes?.filter((v: any) => v.option_id === opt.id).length || 0;
                    const pct        = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                    const isChosen   = userVote?.option_id === opt.id;
                    const isWinner   = userHasVoted && pct === Math.max(...(poll.poll_options?.map((o: any) => {
                      const c = poll.poll_votes?.filter((v: any) => v.option_id === o.id).length || 0;
                      return totalVotes > 0 ? Math.round((c / totalVotes) * 100) : 0;
                    }) || [0]));

                    // Emoji prefix for options
                    const emojis = ['🏆', '👍', '⚖️', '❌', '⭐', '💡'];
                    const emoji = emojis[idx] || '•';

                    return (
                      <motion.div key={opt.id} layout className="relative">
                        {!userHasVoted ? (
                          /* ─ VOTE BUTTON ─ */
                          <button
                            onClick={() => handleVote(poll.id, opt.id)}
                            disabled={isVoting}
                            className="w-full text-start rounded-2xl border border-white/10
                              bg-white/5 hover:bg-white/10 hover:border-indigo-500/40
                              transition-all duration-200 disabled:opacity-50 group
                              px-4 py-3.5 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-lg shrink-0">{emoji}</span>
                              <span className="text-sm sm:text-base font-medium text-slate-200 group-hover:text-white transition-colors truncate">
                                {opt.option_text}
                              </span>
                            </div>
                            <div className="w-5 h-5 rounded-full border-2 border-white/20
                              group-hover:border-indigo-400 flex items-center justify-center
                              transition-colors shrink-0">
                              <div className="w-2 h-2 rounded-full bg-transparent group-hover:bg-indigo-400 transition-colors" />
                            </div>
                          </button>
                        ) : (
                          /* ─ RESULT ROW ─ */
                          <div className={`relative overflow-hidden rounded-2xl border px-4 py-3.5
                            ${isChosen
                              ? 'border-indigo-500/50 bg-indigo-500/10'
                              : 'border-white/8 bg-white/4'
                            }`}>
                            {/* Progress fill */}
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 1, ease: 'easeOut' }}
                              className={`absolute top-0 bottom-0 start-0 z-0 rounded-2xl ${
                                isChosen
                                  ? 'bg-indigo-600/30'
                                  : 'bg-white/5'
                              }`}
                            />

                            <div className="relative z-10 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-lg shrink-0">{emoji}</span>
                                <span className={`text-sm sm:text-base font-medium truncate ${
                                  isChosen ? 'text-indigo-300' : 'text-slate-300'
                                }`}>
                                  {opt.option_text}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`text-sm font-black tabular-nums ${
                                  isChosen ? 'text-indigo-300' : 'text-slate-400'
                                }`}>
                                  {pct}%
                                </span>
                                {isChosen && (
                                  <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Users className="w-3.5 h-3.5" />
                  <span>
                    {isRTL
                      ? `إجمالي الأصوات: ${totalVotes}`
                      : `Total votes: ${totalVotes}`}
                  </span>
                </div>
                {!user && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-500/80">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{isRTL ? 'سجّل الدخول للتصويت' : 'Login to vote'}</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
