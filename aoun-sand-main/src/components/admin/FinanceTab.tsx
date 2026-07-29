import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  LayoutDashboard, Users, Heart, Receipt, HandHeart, FileText, BarChart3
} from 'lucide-react';

import { FinancialDashboard } from './finance/FinancialDashboard';
import { MembershipRevenuesTab } from './finance/MembershipRevenuesTab';
import { DonationRevenuesTab } from './finance/DonationRevenuesTab';
import { MembershipExpensesTab } from './finance/MembershipExpensesTab';
import { DonationExpensesTab } from './finance/DonationExpensesTab';
import { MonthlyReportsTab } from './finance/MonthlyReportsTab';
import { DailyStatsTab } from './finance/DailyStatsTab';

type FinanceSubTab =
  | 'dashboard'
  | 'membership-revenues'
  | 'donation-revenues'
  | 'membership-expenses'
  | 'donation-expenses'
  | 'monthly-reports'
  | 'daily-stats';

export const FinanceTab = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [activeSubTab, setActiveSubTab] = useState<FinanceSubTab>('dashboard');

  const subTabs: {
    id: FinanceSubTab;
    icon: any;
    label: string;
    color: string;
    bg: string;
    gradient: string;
  }[] = [
    {
      id: 'dashboard',
      icon: LayoutDashboard,
      label: isRTL ? 'لوحة المالية' : 'Dashboard',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      gradient: 'from-emerald-500 to-teal-500',
    },
    {
      id: 'membership-revenues',
      icon: Users,
      label: isRTL ? 'مداخيل الانتساب' : 'Membership Rev.',
      color: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-900/20',
      gradient: 'from-indigo-500 to-purple-500',
    },
    {
      id: 'donation-revenues',
      icon: Heart,
      label: isRTL ? 'مداخيل التبرعات' : 'Donation Rev.',
      color: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      id: 'membership-expenses',
      icon: Receipt,
      label: isRTL ? 'مصاريف الانتساب' : 'Membership Exp.',
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      gradient: 'from-orange-500 to-amber-500',
    },
    {
      id: 'donation-expenses',
      icon: HandHeart,
      label: isRTL ? 'مصاريف التبرعات' : 'Donation Exp.',
      color: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-900/20',
      gradient: 'from-rose-500 to-pink-600',
    },
    {
      id: 'monthly-reports',
      icon: FileText,
      label: isRTL ? 'التقارير الشهرية' : 'Monthly Reports',
      color: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-900/20',
      gradient: 'from-teal-500 to-cyan-500',
    },
    {
      id: 'daily-stats',
      icon: BarChart3,
      label: isRTL ? 'الإحصائيات اليومية' : 'Daily Stats',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      gradient: 'from-blue-500 to-indigo-500',
    },
  ];

  const activeTab = subTabs.find(t => t.id === activeSubTab)!;

  return (
    <motion.div
      key="finance"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-5"
    >
      {/* Sub-tabs navigation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Mobile: horizontal scrollable */}
        <div className="flex gap-1 p-2 overflow-x-auto scrollbar-hide">
          {subTabs.map(tab => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`relative flex items-center gap-2 px-3.5 py-2.5 rounded-xl transition-all duration-200 whitespace-nowrap font-bold text-sm flex-shrink-0 ${
                  isActive
                    ? 'text-white shadow-lg'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="financeActiveTabBg"
                    className={`absolute inset-0 rounded-xl bg-gradient-to-r ${tab.gradient}`}
                    style={{ zIndex: 0 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active sub-tab label (mobile) */}
      <div className="sm:hidden flex items-center gap-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeTab.bg}`}>
          <activeTab.icon className={`w-4 h-4 ${activeTab.color}`} />
        </div>
        <span className="font-black text-slate-800 dark:text-white text-base">{activeTab.label}</span>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeSubTab === 'dashboard' && <FinancialDashboard key="fin-dash" />}
        {activeSubTab === 'membership-revenues' && <MembershipRevenuesTab key="mem-rev" />}
        {activeSubTab === 'donation-revenues' && <DonationRevenuesTab key="don-rev" />}
        {activeSubTab === 'membership-expenses' && <MembershipExpensesTab key="mem-exp" />}
        {activeSubTab === 'donation-expenses' && <DonationExpensesTab key="don-exp" />}
        {activeSubTab === 'monthly-reports' && <MonthlyReportsTab key="monthly" />}
        {activeSubTab === 'daily-stats' && <DailyStatsTab key="daily-stats" />}
      </AnimatePresence>
    </motion.div>
  );
};
