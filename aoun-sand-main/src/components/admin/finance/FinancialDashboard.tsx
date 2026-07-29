import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../../lib/supabase';
import { useLanguage } from '../../../contexts/LanguageContext';
import {
  TrendingUp, TrendingDown, Wallet, Users, Heart, Activity,
  ArrowUpRight, ArrowDownRight, RefreshCw, Clock
} from 'lucide-react';

interface FinancialSummary {
  totalMembershipRevenue: number;
  totalDonationRevenue: number;
  totalMembershipExpenses: number;
  totalDonationExpenses: number;
  totalRevenues: number;
  totalExpenses: number;
  netBalance: number;
  operationsCount: number;
}

interface RecentTransaction {
  id: string;
  type: 'membership_revenue' | 'donation_revenue' | 'membership_expense' | 'donation_expense';
  description: string;
  amount: number;
  date: string;
}

const StatCard = ({
  title, value, icon: Icon, color, bgColor, trend, trendLabel
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
  bgColor: string;
  trend?: 'up' | 'down';
  trendLabel?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5"
  >
    <div className="flex items-start justify-between">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${bgColor}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
          trend === 'up'
            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
            : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
        }`}>
          {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trendLabel}
        </div>
      )}
    </div>
    <div className="mt-4">
      <p className="text-2xl font-black text-slate-800 dark:text-white">{value}</p>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">{title}</p>
    </div>
  </motion.div>
);

export const FinancialDashboard = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [summary, setSummary] = useState<FinancialSummary>({
    totalMembershipRevenue: 0,
    totalDonationRevenue: 0,
    totalMembershipExpenses: 0,
    totalDonationExpenses: 0,
    totalRevenues: 0,
    totalExpenses: 0,
    netBalance: 0,
    operationsCount: 0,
  });

  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyData, setMonthlyData] = useState<{ month: string; revenues: number; expenses: number }[]>([]);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const [mrRes, drRes, meRes, deRes] = await Promise.all([
        supabase.from('membership_revenues').select('amount, payment_date, member_name, id, created_at'),
        supabase.from('donation_revenues').select('amount, donation_date, donor_name, id, created_at'),
        supabase.from('membership_expenses').select('amount, expense_date, description, id, created_at'),
        supabase.from('donation_expenses').select('amount, expense_date, description, id, created_at'),
      ]);

      const mrData = mrRes.data || [];
      const drData = drRes.data || [];
      const meData = meRes.data || [];
      const deData = deRes.data || [];

      const totalMR = mrData.reduce((s, r) => s + Number(r.amount), 0);
      const totalDR = drData.reduce((s, r) => s + Number(r.amount), 0);
      const totalME = meData.reduce((s, r) => s + Number(r.amount), 0);
      const totalDE = deData.reduce((s, r) => s + Number(r.amount), 0);

      const totalRevenues = totalMR + totalDR;
      const totalExpenses = totalME + totalDE;

      setSummary({
        totalMembershipRevenue: totalMR,
        totalDonationRevenue: totalDR,
        totalMembershipExpenses: totalME,
        totalDonationExpenses: totalDE,
        totalRevenues,
        totalExpenses,
        netBalance: totalRevenues - totalExpenses,
        operationsCount: mrData.length + drData.length + meData.length + deData.length,
      });

      // Recent transactions (last 8)
      const allTransactions: RecentTransaction[] = [
        ...mrData.map(r => ({
          id: r.id,
          type: 'membership_revenue' as const,
          description: r.member_name,
          amount: Number(r.amount),
          date: r.payment_date || r.created_at,
        })),
        ...drData.map(r => ({
          id: r.id,
          type: 'donation_revenue' as const,
          description: r.donor_name,
          amount: Number(r.amount),
          date: r.donation_date || r.created_at,
        })),
        ...meData.map(r => ({
          id: r.id,
          type: 'membership_expense' as const,
          description: r.description,
          amount: Number(r.amount),
          date: r.expense_date || r.created_at,
        })),
        ...deData.map(r => ({
          id: r.id,
          type: 'donation_expense' as const,
          description: r.description,
          amount: Number(r.amount),
          date: r.expense_date || r.created_at,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

      setRecentTransactions(allTransactions);

      // Monthly data for chart (last 6 months)
      const monthsMap: Record<string, { revenues: number; expenses: number }> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthsMap[key] = { revenues: 0, expenses: 0 };
      }

      [...mrData, ...drData].forEach(r => {
        const row = r as any;
        const d = new Date(row.payment_date || row.donation_date || row.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthsMap[key]) monthsMap[key].revenues += Number(r.amount);
      });
      [...meData, ...deData].forEach(r => {
        const d = new Date(r.expense_date || r.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthsMap[key]) monthsMap[key].expenses += Number(r.amount);
      });

      const arabicMonths = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
      const englishMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

      const chartData = Object.entries(monthsMap).map(([key, val]) => {
        const [y, m] = key.split('-');
        const monthIdx = parseInt(m) - 1;
        return {
          month: isRTL ? arabicMonths[monthIdx] : englishMonths[monthIdx],
          ...val,
        };
      });
      setMonthlyData(chartData);

    } catch (err) {
      console.error('Error fetching financial summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString('ar-MA', { maximumFractionDigits: 0 }) + ' MRU';

  const typeConfig: Record<RecentTransaction['type'], { label: string; color: string; bg: string; sign: string }> = {
    membership_revenue: {
      label: isRTL ? 'مداخيل انتساب' : 'Membership Revenue',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      sign: '+',
    },
    donation_revenue: {
      label: isRTL ? 'مداخيل تبرع' : 'Donation Revenue',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      sign: '+',
    },
    membership_expense: {
      label: isRTL ? 'مصاريف انتساب' : 'Membership Expense',
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      sign: '-',
    },
    donation_expense: {
      label: isRTL ? 'مصاريف تبرع' : 'Donation Expense',
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      sign: '-',
    },
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-10 h-10 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  const maxVal = Math.max(...monthlyData.map(m => Math.max(m.revenues, m.expenses)), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-6"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg">
        <div className="absolute -top-8 -end-8 w-48 h-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-6 -start-6 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black">{isRTL ? 'لوحة التحكم المالية' : 'Financial Dashboard'}</h2>
            <p className="text-emerald-100 text-sm mt-1 opacity-90">
              {isRTL ? 'نظرة شاملة على الوضع المالي للمنظمة' : 'Complete financial overview of the organization'}
            </p>
          </div>
          <button
            onClick={fetchSummary}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold backdrop-blur-md transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            {isRTL ? 'تحديث' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title={isRTL ? 'إجمالي المداخيل' : 'Total Revenues'}
          value={fmt(summary.totalRevenues)}
          icon={TrendingUp}
          color="text-emerald-600 dark:text-emerald-400"
          bgColor="bg-emerald-50 dark:bg-emerald-900/20"
          trend="up"
          trendLabel={isRTL ? 'مداخيل' : 'Income'}
        />
        <StatCard
          title={isRTL ? 'إجمالي المصاريف' : 'Total Expenses'}
          value={fmt(summary.totalExpenses)}
          icon={TrendingDown}
          color="text-rose-600 dark:text-rose-400"
          bgColor="bg-rose-50 dark:bg-rose-900/20"
          trend="down"
          trendLabel={isRTL ? 'مصاريف' : 'Expenses'}
        />
        <StatCard
          title={isRTL ? 'الرصيد الحالي' : 'Net Balance'}
          value={fmt(summary.netBalance)}
          icon={Wallet}
          color={summary.netBalance >= 0 ? 'text-teal-600 dark:text-teal-400' : 'text-rose-600 dark:text-rose-400'}
          bgColor={summary.netBalance >= 0 ? 'bg-teal-50 dark:bg-teal-900/20' : 'bg-rose-50 dark:bg-rose-900/20'}
        />
        <StatCard
          title={isRTL ? 'رسوم الانتساب' : 'Membership Fees'}
          value={fmt(summary.totalMembershipRevenue)}
          icon={Users}
          color="text-indigo-600 dark:text-indigo-400"
          bgColor="bg-indigo-50 dark:bg-indigo-900/20"
        />
        <StatCard
          title={isRTL ? 'إجمالي التبرعات' : 'Total Donations'}
          value={fmt(summary.totalDonationRevenue)}
          icon={Heart}
          color="text-purple-600 dark:text-purple-400"
          bgColor="bg-purple-50 dark:bg-purple-900/20"
        />
        <StatCard
          title={isRTL ? 'عدد العمليات' : 'Total Operations'}
          value={summary.operationsCount.toString()}
          icon={Activity}
          color="text-amber-600 dark:text-amber-400"
          bgColor="bg-amber-50 dark:bg-amber-900/20"
        />
      </div>

      {/* Chart + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-base font-black text-slate-800 dark:text-white mb-6">
            {isRTL ? 'المداخيل والمصاريف الشهرية (آخر 6 أشهر)' : 'Monthly Revenue vs Expenses (Last 6 months)'}
          </h3>
          <div className="flex items-end gap-3 h-44">
            {monthlyData.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex gap-0.5 items-end" style={{ height: '140px' }}>
                  <div
                    className="flex-1 bg-emerald-400/80 rounded-t-lg transition-all duration-500"
                    style={{ height: `${Math.max(4, (m.revenues / maxVal) * 140)}px` }}
                    title={`${isRTL ? 'مداخيل' : 'Revenue'}: ${fmt(m.revenues)}`}
                  />
                  <div
                    className="flex-1 bg-rose-400/80 rounded-t-lg transition-all duration-500"
                    style={{ height: `${Math.max(4, (m.expenses / maxVal) * 140)}px` }}
                    title={`${isRTL ? 'مصاريف' : 'Expenses'}: ${fmt(m.expenses)}`}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-medium">{m.month}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-400/80" />
              <span className="text-xs text-slate-500 font-medium">{isRTL ? 'مداخيل' : 'Revenue'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-rose-400/80" />
              <span className="text-xs text-slate-500 font-medium">{isRTL ? 'مصاريف' : 'Expenses'}</span>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
          <h3 className="text-base font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            {isRTL ? 'آخر العمليات المالية' : 'Recent Financial Operations'}
          </h3>
          {recentTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Activity className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">{isRTL ? 'لا توجد عمليات بعد' : 'No operations yet'}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((tx) => {
                const cfg = typeConfig[tx.type];
                const isExpense = tx.type.includes('expense');
                return (
                  <div key={tx.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      {isExpense
                        ? <TrendingDown className={`w-4 h-4 ${cfg.color}`} />
                        : <TrendingUp className={`w-4 h-4 ${cfg.color}`} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{tx.description}</p>
                      <p className="text-xs text-slate-400">{cfg.label}</p>
                    </div>
                    <div className={`text-sm font-black ${cfg.color}`}>
                      {cfg.sign}{tx.amount.toLocaleString()} MRU
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Balance Summary Card */}
      <div className={`rounded-2xl p-6 border ${
        summary.netBalance >= 0
          ? 'bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 border-emerald-200 dark:border-emerald-800'
          : 'bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/10 dark:to-pink-900/10 border-rose-200 dark:border-rose-800'
      }`}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {isRTL ? 'الرصيد الإجمالي الصافي' : 'Overall Net Balance'}
            </p>
            <p className={`text-4xl font-black mt-1 ${
              summary.netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {summary.netBalance >= 0 ? '+' : ''}{fmt(summary.netBalance)}
            </p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {isRTL ? 'مداخيل انتساب' : 'Membership Rev.'}
              </p>
              <p className="text-lg font-black text-emerald-600">{fmt(summary.totalMembershipRevenue)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {isRTL ? 'مداخيل تبرعات' : 'Donation Rev.'}
              </p>
              <p className="text-lg font-black text-blue-600">{fmt(summary.totalDonationRevenue)}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                {isRTL ? 'إجمالي مصاريف' : 'Total Expenses'}
              </p>
              <p className="text-lg font-black text-rose-600">{fmt(summary.totalExpenses)}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
