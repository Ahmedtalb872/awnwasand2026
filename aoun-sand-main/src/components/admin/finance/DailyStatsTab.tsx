import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import { useLanguage } from '../../../contexts/LanguageContext';
import toast from 'react-hot-toast';
import {
  BarChart3, Calendar, X, TrendingUp, Building2, Wallet,
  RefreshCw, TrendingDown, ArrowDownCircle, ArrowUpCircle, Scale
} from 'lucide-react';

interface DailyStat {
  stat_date: string;
  bankily_total: number;
  masrvi_total: number;
  sedad_total: number;
  bim_bank_total: number;
  click_total: number;
  ghaza_abi_total: number;
  other_banks_total: number;
  total_donations: number;
  updated_at: string;
}

interface DailyExpense {
  expense_date: string;
  membership_expenses: number;
  donation_expenses: number;
  total_expenses: number;
}

export const DailyStatsTab = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [stats, setStats] = useState<DailyStat[]>([]);
  const [expenses, setExpenses] = useState<DailyExpense[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Fetch donation stats from daily_donation_stats
  const fetchStats = useCallback(async () => {
    try {
      let query = supabase
        .from('daily_donation_stats')
        .select('*')
        .order('stat_date', { ascending: false });

      if (filterDateFrom) query = query.gte('stat_date', filterDateFrom);
      if (filterDateTo) query = query.lte('stat_date', filterDateTo);

      const { data, error } = await query;
      if (error) throw error;
      setStats(data || []);
    } catch (err: any) {
      console.error(err);
    }
  }, [filterDateFrom, filterDateTo]);

  // Fetch expenses grouped by date directly from tables
  const fetchExpenses = useCallback(async () => {
    try {
      // Fetch membership_expenses grouped by date
      let meQuery = supabase
        .from('membership_expenses')
        .select('expense_date, amount');

      if (filterDateFrom) meQuery = meQuery.gte('expense_date', filterDateFrom);
      if (filterDateTo) meQuery = meQuery.lte('expense_date', filterDateTo);

      // Fetch donation_expenses grouped by date
      let deQuery = supabase
        .from('donation_expenses')
        .select('expense_date, amount');

      if (filterDateFrom) deQuery = deQuery.gte('expense_date', filterDateFrom);
      if (filterDateTo) deQuery = deQuery.lte('expense_date', filterDateTo);

      const [meResult, deResult] = await Promise.all([meQuery, deQuery]);

      if (meResult.error) throw meResult.error;
      if (deResult.error) throw deResult.error;

      // Group by date
      const byDate = new Map<string, { membership: number; donation: number }>();

      (meResult.data || []).forEach(row => {
        const d = byDate.get(row.expense_date) || { membership: 0, donation: 0 };
        d.membership += Number(row.amount);
        byDate.set(row.expense_date, d);
      });

      (deResult.data || []).forEach(row => {
        const d = byDate.get(row.expense_date) || { membership: 0, donation: 0 };
        d.donation += Number(row.amount);
        byDate.set(row.expense_date, d);
      });

      const result: DailyExpense[] = Array.from(byDate.entries())
        .map(([date, vals]) => ({
          expense_date: date,
          membership_expenses: vals.membership,
          donation_expenses: vals.donation,
          total_expenses: vals.membership + vals.donation,
        }))
        .sort((a, b) => b.expense_date.localeCompare(a.expense_date));

      setExpenses(result);
    } catch (err: any) {
      console.error(err);
      toast.error(isRTL ? 'خطأ في تحميل المصاريف' : 'Error loading expenses');
    }
  }, [filterDateFrom, filterDateTo, isRTL]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchStats(), fetchExpenses()]);
    setLoading(false);
  }, [fetchStats, fetchExpenses]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime subscriptions for auto-update
  useEffect(() => {
    const channel = supabase
      .channel('daily-stats-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'daily_donation_stats' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'membership_expenses' }, fetchExpenses)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'donation_expenses' }, fetchExpenses)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchStats, fetchExpenses]);

  const fmt = (n: number) => Number(n).toLocaleString() + ' MRU';

  // Summary totals
  const totalAllDonations  = stats.reduce((a, s) => a + Number(s.total_donations), 0);
  const totalBankily        = stats.reduce((a, s) => a + Number(s.bankily_total), 0);
  const totalOtherBanks    = stats.reduce((a, s) => a + Number(s.other_banks_total), 0);
  const totalMembershipExp = expenses.reduce((a, e) => a + e.membership_expenses, 0);
  const totalDonationExp   = expenses.reduce((a, e) => a + e.donation_expenses, 0);
  const totalExpenses      = expenses.reduce((a, e) => a + e.total_expenses, 0);
  const netBalance         = totalAllDonations - totalExpenses;

  // Merge donations & expenses by date for combined view
  const allDates = new Set([
    ...stats.map(s => s.stat_date),
    ...expenses.map(e => e.expense_date),
  ]);
  const expenseByDate = new Map(expenses.map(e => [e.expense_date, e]));
  const statByDate    = new Map(stats.map(s => [s.stat_date, s]));

  const mergedDates = Array.from(allDates).sort((a, b) => b.localeCompare(a));

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-5"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute -top-6 -end-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-black">{isRTL ? 'الإحصائيات المالية اليومية' : 'Daily Financial Stats'}</h3>
              <p className="text-blue-100 text-xs opacity-90">
                {isRTL ? 'مداخيل ومصاريف يومية - تحديث فوري' : 'Daily revenues & expenses - live updates'}
              </p>
            </div>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Summary Cards - 6 cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-center shadow-sm">
          <ArrowUpCircle className="w-6 h-6 text-indigo-500 mx-auto mb-1.5" />
          <p className="text-lg font-black text-slate-800 dark:text-white leading-tight">{Number(totalAllDonations).toLocaleString()}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{isRTL ? 'إجمالي مداخيل التبرعات' : 'Total Donations'}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-center shadow-sm">
          <Building2 className="w-6 h-6 text-teal-500 mx-auto mb-1.5" />
          <p className="text-lg font-black text-slate-800 dark:text-white leading-tight">{Number(totalBankily).toLocaleString()}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{isRTL ? 'إجمالي بنكيلي' : 'Bankily Total'}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-center shadow-sm">
          <ArrowDownCircle className="w-6 h-6 text-orange-500 mx-auto mb-1.5" />
          <p className="text-lg font-black text-slate-800 dark:text-white leading-tight">{Number(totalMembershipExp).toLocaleString()}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{isRTL ? 'مصاريف الانتساب' : 'Membership Exp.'}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-center shadow-sm">
          <TrendingDown className="w-6 h-6 text-rose-500 mx-auto mb-1.5" />
          <p className="text-lg font-black text-slate-800 dark:text-white leading-tight">{Number(totalDonationExp).toLocaleString()}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{isRTL ? 'مصاريف التبرعات' : 'Donation Exp.'}</p>
        </div>
        <div className={`border rounded-2xl p-4 text-center shadow-sm ${netBalance >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
          <Scale className={`w-6 h-6 mx-auto mb-1.5 ${netBalance >= 0 ? 'text-emerald-600' : 'text-red-500'}`} />
          <p className={`text-lg font-black leading-tight ${netBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {netBalance >= 0 ? '+' : ''}{Number(netBalance).toLocaleString()}
          </p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">{isRTL ? 'الرصيد الصافي' : 'Net Balance'}</p>
        </div>
      </div>

      {/* Date Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{isRTL ? 'تصفية بالتاريخ:' : 'Filter by Date:'}</span>
          </div>
          <input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            title={isRTL ? 'من تاريخ' : 'From date'}
          />
          <input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            title={isRTL ? 'إلى تاريخ' : 'To date'}
          />
          {(filterDateFrom || filterDateTo) && (
            <button
              onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}
              className="flex items-center gap-1 px-3 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              {isRTL ? 'مسح' : 'Clear'}
            </button>
          )}
        </div>
      </div>

      {/* ── Section 1: Donation Stats Table ── */}
      <div>
        <h4 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ArrowUpCircle className="w-4 h-4 text-indigo-500" />
          {isRTL ? 'مداخيل التبرعات اليومية (حسب البنك)' : 'Daily Donation Revenues (by Bank)'}
        </h4>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{isRTL ? 'التاريخ' : 'Date'}</th>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{isRTL ? 'بنكيلي' : 'Bankily'}</th>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{isRTL ? 'مصرفي' : 'Masrvi'}</th>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{isRTL ? 'سداد' : 'Sedad'}</th>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{isRTL ? 'بيم بنك' : 'BIM Bank'}</th>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{isRTL ? 'أكليك' : 'Click'}</th>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{isRTL ? 'غزة أبي' : 'Ghaza Abi'}</th>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider whitespace-nowrap bg-indigo-50 dark:bg-indigo-900/20">{isRTL ? 'إجمالي التبرعات' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {stats.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center">
                        <div className="flex flex-col items-center text-slate-400">
                          <BarChart3 className="w-10 h-10 mb-3 opacity-30" />
                          <p className="font-medium text-sm">{isRTL ? 'لا توجد بيانات تبرعات' : 'No donation data'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : stats.map((stat) => (
                    <tr key={stat.stat_date} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5 text-sm font-bold text-slate-800 dark:text-white whitespace-nowrap">
                        {new Date(stat.stat_date + 'T00:00:00').toLocaleDateString(isRTL ? 'ar-MA' : 'en-GB')}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-200">{Number(stat.bankily_total).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{Number(stat.masrvi_total).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{Number(stat.sedad_total).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{Number(stat.bim_bank_total).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{Number(stat.click_total).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{Number(stat.ghaza_abi_total).toLocaleString()}</td>
                      <td className="px-4 py-3.5 text-sm font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/10">
                        {Number(stat.total_donations).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Daily Expenses Table ── */}
      <div>
        <h4 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ArrowDownCircle className="w-4 h-4 text-rose-500" />
          {isRTL ? 'المصاريف اليومية (انتساب + تبرعات)' : 'Daily Expenses (Membership + Donations)'}
        </h4>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{isRTL ? 'التاريخ' : 'Date'}</th>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-orange-500 uppercase tracking-wider whitespace-nowrap bg-orange-50/50 dark:bg-orange-900/10">{isRTL ? 'مصاريف الانتساب' : 'Membership Exp.'}</th>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-rose-500 uppercase tracking-wider whitespace-nowrap bg-rose-50/50 dark:bg-rose-900/10">{isRTL ? 'مصاريف التبرعات' : 'Donation Exp.'}</th>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-red-600 uppercase tracking-wider whitespace-nowrap bg-red-50 dark:bg-red-900/20">{isRTL ? 'إجمالي المصاريف' : 'Total Expenses'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center">
                        <div className="flex flex-col items-center text-slate-400">
                          <TrendingDown className="w-10 h-10 mb-3 opacity-30" />
                          <p className="font-medium text-sm">{isRTL ? 'لا توجد مصاريف مسجلة' : 'No expenses recorded'}</p>
                        </div>
                      </td>
                    </tr>
                  ) : expenses.map((exp) => (
                    <tr key={exp.expense_date} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3.5 text-sm font-bold text-slate-800 dark:text-white whitespace-nowrap">
                        {new Date(exp.expense_date + 'T00:00:00').toLocaleDateString(isRTL ? 'ar-MA' : 'en-GB')}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-medium text-orange-600 dark:text-orange-400 bg-orange-50/30 dark:bg-orange-900/5">
                        {exp.membership_expenses > 0 ? exp.membership_expenses.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-900/5">
                        {exp.donation_expenses > 0 ? exp.donation_expenses.toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-sm font-black text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10">
                        {exp.total_expenses.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {expenses.length > 0 && (
                  <tfoot className="bg-slate-100 dark:bg-slate-800 border-t-2 border-slate-200 dark:border-slate-700">
                    <tr>
                      <td className="px-4 py-3 text-xs font-black text-slate-500 uppercase">{isRTL ? 'المجموع' : 'Total'}</td>
                      <td className="px-4 py-3 text-sm font-black text-orange-600 dark:text-orange-400">{totalMembershipExp.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm font-black text-rose-600 dark:text-rose-400">{totalDonationExp.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm font-black text-red-600 dark:text-red-400">{totalExpenses.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 3: Net Balance per Day ── */}
      {mergedDates.length > 0 && (
        <div>
          <h4 className="text-sm font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-500" />
            {isRTL ? 'الرصيد اليومي (مداخيل - مصاريف)' : 'Daily Net Balance (Revenues – Expenses)'}
          </h4>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">{isRTL ? 'التاريخ' : 'Date'}</th>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-indigo-500 uppercase tracking-wider whitespace-nowrap">{isRTL ? 'المداخيل' : 'Revenues'}</th>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-red-500 uppercase tracking-wider whitespace-nowrap">{isRTL ? 'المصاريف' : 'Expenses'}</th>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-emerald-600 uppercase tracking-wider whitespace-nowrap bg-emerald-50 dark:bg-emerald-900/20">{isRTL ? 'الرصيد' : 'Balance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {mergedDates.map(date => {
                    const stat = statByDate.get(date);
                    const exp  = expenseByDate.get(date);
                    const rev  = stat ? Number(stat.total_donations) : 0;
                    const exps = exp  ? exp.total_expenses : 0;
                    const net  = rev - exps;
                    return (
                      <tr key={date} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3.5 text-sm font-bold text-slate-800 dark:text-white whitespace-nowrap">
                          {new Date(date + 'T00:00:00').toLocaleDateString(isRTL ? 'ar-MA' : 'en-GB')}
                        </td>
                        <td className="px-4 py-3.5 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                          {rev > 0 ? rev.toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-sm font-medium text-red-500">
                          {exps > 0 ? exps.toLocaleString() : '—'}
                        </td>
                        <td className={`px-4 py-3.5 text-sm font-black ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10' : 'text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10'}`}>
                          {net >= 0 ? '+' : ''}{net.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
