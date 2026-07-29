import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Vote, Trash2, Calendar, Power, BarChart3, Users,
  PlusCircle, Edit2, X, Save, Eye, ChevronDown, ChevronUp, UserX
} from 'lucide-react';

export const PollsTab = ({ polls, fetchDashboardData }: { polls: any[], fetchDashboardData: () => void }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [pollTitle, setPollTitle] = useState('');
  const [pollDesc, setPollDesc] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [expiresAt, setExpiresAt] = useState('');
  const [allowMultiple, setAllowMultiple] = useState(false);

  // Edit state
  const [editingPoll, setEditingPoll] = useState<any>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Expanded voters view
  const [expandedVoters, setExpandedVoters] = useState<string | null>(null);
  const [voters, setVoters] = useState<Record<string, any[]>>({});

  const fetchVoters = async (pollId: string) => {
    const { data } = await supabase
      .from('poll_votes')
      .select('*, users(full_name, email), poll_options(option_text)')
      .eq('poll_id', pollId)
      .order('created_at', { ascending: false });
    if (data) setVoters(prev => ({ ...prev, [pollId]: data }));
  };

  const toggleVoters = async (pollId: string) => {
    if (expandedVoters === pollId) {
      setExpandedVoters(null);
    } else {
      setExpandedVoters(pollId);
      await fetchVoters(pollId);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = pollOptions.filter(o => o.trim() !== '');
    if (validOptions.length < 2) {
      toast.error(isRTL ? 'أضف خيارين على الأقل' : 'Add at least 2 options');
      return;
    }
    setIsLoading(true);
    const payload: any = { title: pollTitle, description: pollDesc, allow_multiple: allowMultiple };
    if (expiresAt) payload.expires_at = new Date(expiresAt).toISOString();

    const { data: newPoll, error: pollError } = await supabase
      .from('polls').insert([payload]).select().single();

    if (pollError) { toast.error(pollError.message); setIsLoading(false); return; }

    const { error: optErr } = await supabase.from('poll_options')
      .insert(validOptions.map(opt => ({ poll_id: newPoll.id, option_text: opt })));

    if (optErr) {
      toast.error(optErr.message);
    } else {
      toast.success(isRTL ? 'تم إنشاء التصويت بنجاح!' : 'Poll created successfully!');
      setPollTitle(''); setPollDesc(''); setPollOptions(['', '']); setExpiresAt(''); setAllowMultiple(false);
      setShowCreateForm(false);
      fetchDashboardData();
    }
    setIsLoading(false);
  };

  const handleDeletePoll = async (id: string) => {
    if (!window.confirm(isRTL ? 'تأكيد حذف التصويت وجميع الأصوات؟' : 'Delete poll and all votes?')) return;
    const { error } = await supabase.from('polls').delete().eq('id', id);
    if (!error) { toast.success(isRTL ? 'تم الحذف' : 'Deleted'); fetchDashboardData(); }
    else toast.error(error.message);
  };

  const handleDeleteVote = async (voteId: string, pollId: string) => {
    const { error } = await supabase.from('poll_votes').delete().eq('id', voteId);
    if (!error) {
      toast.success(isRTL ? 'تم حذف الصوت' : 'Vote deleted');
      await fetchVoters(pollId);
      fetchDashboardData();
    } else toast.error(error.message);
  };

  const handleToggleClose = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('polls').update({ is_closed: !currentStatus }).eq('id', id);
    if (!error) { toast.success(isRTL ? 'تم تحديث حالة التصويت' : 'Poll status updated'); fetchDashboardData(); }
    else toast.error(isRTL ? 'فشل التحديث. تأكد من وجود عمود is_closed في الجدول' : 'Update failed. Ensure is_closed column exists.');
  };

  const startEdit = (poll: any) => {
    setEditingPoll(poll.id);
    setEditTitle(poll.title);
    setEditDesc(poll.description || '');
  };

  const handleSaveEdit = async () => {
    const { error } = await supabase.from('polls')
      .update({ title: editTitle, description: editDesc })
      .eq('id', editingPoll);
    if (!error) {
      toast.success(isRTL ? 'تم التعديل بنجاح' : 'Updated successfully');
      setEditingPoll(null);
      fetchDashboardData();
    } else toast.error(error.message);
  };

  return (
    <motion.div key="voting" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Header with create button */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg">
        <div className="absolute -top-8 -end-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Vote className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black">{isRTL ? 'إدارة التصويتات' : 'Polls Management'}</h2>
              <p className="text-teal-100 text-sm mt-1 opacity-90">
                {isRTL ? `${polls.length} تصويت • إجمالي الأصوات: ${polls.reduce((a, p) => a + (p.poll_votes?.length || 0), 0)}` : `${polls.length} polls • Total votes: ${polls.reduce((a, p) => a + (p.poll_votes?.length || 0), 0)}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateForm(v => !v)}
            className="flex items-center gap-2 px-5 py-3 bg-white text-teal-700 hover:bg-teal-50 rounded-2xl font-bold transition-colors shadow-sm"
          >
            {showCreateForm ? <X className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
            {showCreateForm ? (isRTL ? 'إغلاق' : 'Cancel') : (isRTL ? 'تصويت جديد' : 'New Poll')}
          </button>
        </div>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm overflow-hidden"
          >
            <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-teal-500" />
              {isRTL ? 'إنشاء تصويت جديد' : 'Create New Poll'}
            </h3>
            <form onSubmit={handleCreatePoll} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'عنوان التصويت' : 'Poll Title'}</label>
                <input type="text" required value={pollTitle} onChange={e => setPollTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder={isRTL ? 'ما هو موضوع التصويت؟' : 'What is the poll about?'} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'الوصف (اختياري)' : 'Description (Optional)'}</label>
                <textarea rows={2} value={pollDesc} onChange={e => setPollDesc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                  placeholder={isRTL ? 'تفاصيل إضافية...' : 'Additional details...'} />
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="block text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4">{isRTL ? 'خيارات التصويت' : 'Poll Options'}</label>
                <div className="space-y-3">
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex gap-3 items-center">
                      <div className="w-8 h-8 shrink-0 bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 rounded-lg flex items-center justify-center font-black text-sm">{idx + 1}</div>
                      <input type="text" placeholder={`${isRTL ? 'خيار' : 'Option'} ${idx + 1}`} value={opt}
                        onChange={e => { const n = [...pollOptions]; n[idx] = e.target.value; setPollOptions(n); }}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none" />
                      {pollOptions.length > 2 && (
                        <button type="button" onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                          className="w-8 h-8 shrink-0 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setPollOptions([...pollOptions, ''])}
                  className="mt-4 flex items-center gap-2 text-teal-600 dark:text-teal-400 text-sm font-bold hover:text-teal-700 transition-colors">
                  <PlusCircle className="w-4 h-4" />{isRTL ? 'إضافة خيار' : 'Add option'}
                </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />{isRTL ? 'تاريخ الانتهاء (اختياري)' : 'Expiry Date (Optional)'}
                  </label>
                  <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)}
                    className="px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none w-full" />
                </div>
                <div className="flex-1 flex items-center h-full pt-6">
                  <label className="flex items-center gap-2 cursor-pointer p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 w-full hover:bg-slate-100 transition-colors">
                    <input type="checkbox" checked={allowMultiple} onChange={e => setAllowMultiple(e.target.checked)} className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500" />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {isRTL ? 'السماح باختيار أكثر من خيار' : 'Allow multiple choices'}
                    </span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateForm(false)}
                  className="px-6 py-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-colors">
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button type="submit" disabled={isLoading}
                  className="py-3 px-8 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-teal-500/30 transition-all flex items-center gap-2">
                  {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                  {isLoading ? (isRTL ? 'جاري النشر...' : 'Publishing...') : (isRTL ? 'نشر التصويت' : 'Publish Poll')}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Polls list */}
      <div className="space-y-5">
        {polls.map((poll: any) => {
          const totalVotes = poll.poll_votes?.length || 0;
          const isClosed = poll.is_closed || (poll.expires_at && new Date(poll.expires_at) < new Date());
          const isEditingThis = editingPoll === poll.id;
          const isShowingVoters = expandedVoters === poll.id;

          return (
            <div key={poll.id} className={`bg-white dark:bg-slate-900 rounded-3xl border shadow-sm overflow-hidden ${isClosed ? 'border-slate-200 dark:border-slate-700 opacity-75' : 'border-teal-100 dark:border-teal-900/30'}`}>
              {/* Poll header bar */}
              <div className={`px-6 py-4 flex items-center justify-between gap-3 border-b ${isClosed ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' : 'bg-teal-50/50 dark:bg-teal-900/10 border-teal-100 dark:border-teal-900/20'}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isClosed ? 'bg-slate-400' : 'bg-teal-500 animate-pulse'}`} />
                  {isEditingThis ? (
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      className="font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-800 border border-teal-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-teal-500 outline-none flex-1" />
                  ) : (
                    <h4 className="font-bold text-slate-800 dark:text-white truncate">{poll.title}</h4>
                  )}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${isClosed ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400' : 'bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-400'}`}>
                    {isClosed ? (isRTL ? 'مغلق' : 'Closed') : (isRTL ? 'نشط' : 'Active')}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isEditingThis ? (
                    <>
                      <button onClick={handleSaveEdit} className="p-2 bg-teal-100 text-teal-600 hover:bg-teal-200 rounded-xl transition-colors"><Save className="w-4 h-4" /></button>
                      <button onClick={() => setEditingPoll(null)} className="p-2 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-xl transition-colors"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(poll)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors" title={isRTL ? 'تعديل' : 'Edit'}><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleToggleClose(poll.id, poll.is_closed)} className={`p-2 rounded-xl transition-colors ${poll.is_closed ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400'}`} title={isRTL ? 'فتح/إغلاق' : 'Open/Close'}><Power className="w-4 h-4" /></button>
                      <button onClick={() => handleDeletePoll(poll.id)} className="p-2 bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-xl transition-colors" title={isRTL ? 'حذف' : 'Delete'}><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-6">
                {isEditingThis && (
                  <div className="mb-5">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{isRTL ? 'الوصف' : 'Description'}</label>
                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={2}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-teal-500 outline-none resize-none text-slate-800 dark:text-white" />
                  </div>
                )}

                {poll.description && !isEditingThis && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">{poll.description}</p>
                )}

                {/* Options with results */}
                <div className="space-y-3 mb-5">
                  {poll.poll_options?.map((opt: any) => {
                    const votesCount = poll.poll_votes?.filter((v: any) => v.option_id === opt.id).length || 0;
                    const pct = totalVotes > 0 ? Math.round((votesCount / totalVotes) * 100) : 0;
                    const isLeading = pct === Math.max(...(poll.poll_options?.map((o: any) => {
                      const c = poll.poll_votes?.filter((v: any) => v.option_id === o.id).length || 0;
                      return totalVotes > 0 ? Math.round((c / totalVotes) * 100) : 0;
                    }) || [0]));
                    return (
                      <div key={opt.id}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className={`text-sm font-medium ${isLeading && totalVotes > 0 ? 'text-teal-700 dark:text-teal-400 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>{opt.option_text}</span>
                          <span className="text-sm font-bold text-teal-600 dark:text-teal-400 tabular-nums">{pct}% <span className="text-xs text-slate-400">({votesCount})</span></span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: 'easeOut' }} className={`h-2 rounded-full ${isLeading && totalVotes > 0 ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer stats */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{totalVotes} {isRTL ? 'صوت' : 'votes'}</span>
                    {poll.expires_at && <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(poll.expires_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</span>}
                  </div>
                  <button
                    onClick={() => toggleVoters(poll.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    {isRTL ? 'عرض المصوتين' : 'View Voters'}
                    {isShowingVoters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Voters list */}
                <AnimatePresence>
                  {isShowingVoters && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 overflow-hidden"
                    >
                      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                          <h5 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                            <Users className="w-3.5 h-3.5" />
                            {isRTL ? `قائمة المصوتين (${voters[poll.id]?.length || 0})` : `Voters List (${voters[poll.id]?.length || 0})`}
                          </h5>
                        </div>
                        {voters[poll.id]?.length === 0 ? (
                          <div className="p-6 text-center text-sm text-slate-400">{isRTL ? 'لا توجد أصوات بعد' : 'No votes yet'}</div>
                        ) : (
                          <div className="divide-y divide-slate-200 dark:divide-slate-700 max-h-64 overflow-y-auto">
                            {voters[poll.id]?.map((vote: any) => (
                              <div key={vote.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-100/50 dark:hover:bg-slate-700/30 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {(vote.users?.full_name || 'U').charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{vote.users?.full_name || (isRTL ? 'مجهول' : 'Unknown')}</p>
                                    <p className="text-xs text-slate-400 truncate">{vote.poll_options?.option_text}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => handleDeleteVote(vote.id, poll.id)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors shrink-0"
                                  title={isRTL ? 'حذف الصوت' : 'Delete vote'}
                                >
                                  <UserX className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}

        {polls.length === 0 && (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <Vote className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">{isRTL ? 'لا توجد تصويتات بعد' : 'No polls yet'}</p>
            <button onClick={() => setShowCreateForm(true)} className="mt-4 text-teal-600 dark:text-teal-400 font-bold text-sm hover:underline">
              {isRTL ? 'أنشئ أول تصويت' : 'Create your first poll'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
