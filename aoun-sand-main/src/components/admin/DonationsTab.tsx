import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import toast from 'react-hot-toast';
import { HandHeart, Save, Eye, EyeOff, RefreshCw, Plus, Edit2, Trash2, Activity, CheckCircle2, PauseCircle, Users, X } from 'lucide-react';

interface DonationsTabProps {
  fetchDashboardData: () => void;
}

export interface DonationCampaign {
  id: string;
  title: string;
  description: string;
  target_amount: number;
  current_amount: number;
  donors_count: number;
  status: 'active' | 'completed' | 'stopped';
  is_public: boolean;
  created_at: string;
}

export const DonationsTab = ({ fetchDashboardData }: DonationsTabProps) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Global Section Settings
  const [isVisible, setIsVisible] = useState(true);
  
  // Campaigns
  const [campaigns, setCampaigns] = useState<DonationCampaign[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Partial<DonationCampaign> | null>(null);

  useEffect(() => {
    fetchSettings();

    const ch = supabase.channel('admin:site_settings_donations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings', filter: 'id=eq.donation_section' },
        () => fetchSettings())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', 'donation_section')
      .single();

    if (data && data.value) {
      const v = data.value;
      setIsVisible(v.is_visible ?? true);
      setCampaigns(v.campaigns || []);
    } else if (error?.code === 'PGRST116') {
      toast(isRTL ? 'يجب أولاً تشغيل ملف site_settings_schema.sql في Supabase' : 'Please run site_settings_schema.sql in Supabase first', { icon: 'ℹ️' });
    }
    setLoading(false);
  };

  const saveToSupabase = async (newCampaigns: DonationCampaign[], newVisibility: boolean) => {
    setSaving(true);
    const newValue = {
      is_visible: newVisibility,
      campaigns: newCampaigns,
    };

    // First try UPDATE, if row doesn't exist fall back to INSERT
    const { error: updateError } = await supabase
      .from('site_settings')
      .upsert(
        { id: 'donation_section', value: newValue, updated_at: new Date().toISOString() },
        { onConflict: 'id' }
      );

    if (updateError) {
      console.error('saveToSupabase error:', updateError);
      if (updateError.code === '42501') {
        toast.error(
          isRTL
            ? '⚠️ خطأ في الصلاحيات. يرجى تشغيل ملف site_settings_schema.sql في Supabase SQL Editor لإصلاح السياسات.'
            : '⚠️ Permission denied. Please run site_settings_schema.sql in Supabase SQL Editor to fix policies.'
        );
      } else if (updateError.code === 'PGRST116') {
        toast.error(
          isRTL
            ? '⚠️ جدول site_settings غير موجود. يرجى تشغيل site_settings_schema.sql أولاً.'
            : '⚠️ Table site_settings not found. Please run site_settings_schema.sql first.'
        );
      } else {
        toast.error(isRTL ? `خطأ: ${updateError.message}` : `Error: ${updateError.message}`);
      }
    } else {
      toast.success(isRTL ? '✓ تم حفظ التبرعات في Supabase' : '✓ Saved to Supabase successfully');
      fetchDashboardData();
    }
    setSaving(false);
  };

  const handleToggleVisibility = async () => {
    const newVis = !isVisible;
    setIsVisible(newVis);
    await saveToSupabase(campaigns, newVis);
  };

  const handleSaveCampaign = async () => {
    if (!editCampaign?.title) {
      toast.error(isRTL ? 'يرجى إدخال عنوان الحملة' : 'Please enter campaign title');
      return;
    }
    
    let newCampaigns;
    const isNew = !editCampaign.id;
    if (editCampaign.id) {
      newCampaigns = campaigns.map(c => c.id === editCampaign.id ? { ...c, ...editCampaign } as DonationCampaign : c);
    } else {
      const newCamp: DonationCampaign = {
        ...(editCampaign as DonationCampaign),
        id: Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        target_amount: editCampaign.target_amount || 0,
        current_amount: editCampaign.current_amount || 0,
        donors_count: editCampaign.donors_count || 0,
        status: editCampaign.status || 'active',
        is_public: editCampaign.is_public ?? true,
      };
      newCampaigns = [newCamp, ...campaigns];
    }

    setCampaigns(newCampaigns);
    setIsEditing(false);
    setEditCampaign(null);
    await saveToSupabase(newCampaigns, isVisible);

  };

  const handleDeleteCampaign = async (id: string) => {
    if (confirm(isRTL ? 'هل أنت متأكد من حذف هذه الحملة؟' : 'Are you sure you want to delete this campaign?')) {
      const newCampaigns = campaigns.filter(c => c.id !== id);
      setCampaigns(newCampaigns);
      await saveToSupabase(newCampaigns, isVisible);
    }
  };

  const toggleCampaignPublic = async (id: string) => {
    const newCampaigns = campaigns.map(c => c.id === id ? { ...c, is_public: !c.is_public } : c);
    setCampaigns(newCampaigns);
    await saveToSupabase(newCampaigns, isVisible);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
    </div>
  );

  const totalCollected = campaigns.reduce((sum, c) => sum + (c.current_amount || 0), 0);
  const totalDonors = campaigns.reduce((sum, c) => sum + (c.donors_count || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="space-y-6"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-lg">
        <div className="absolute -top-8 -end-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <HandHeart className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-2xl font-black">{isRTL ? 'إدارة التبرعات' : 'Donations Management'}</h2>
              <p className="text-indigo-100 text-sm mt-1 opacity-90">{isRTL ? 'تحكم في حملات التبرع وإحصائياتها' : 'Manage donation campaigns and stats'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSettings}
              className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-md"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleToggleVisibility}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-colors backdrop-blur-md ${
                isVisible ? 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-sm' : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {isVisible
                ? (isRTL ? 'القسم ظاهر' : 'Section Visible')
                : (isRTL ? 'القسم مخفي' : 'Section Hidden')}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isRTL ? 'إجمالي التبرعات' : 'Total Donations'}</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalCollected.toLocaleString()} MRU</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600">
            <HandHeart className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isRTL ? 'عدد المتبرعين' : 'Total Donors'}</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalDonors.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600">
            <Users className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isRTL ? 'الحملات النشطة' : 'Active Campaigns'}</p>
            <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {campaigns.filter(c => c.status === 'active').length}
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-8 mb-4">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
          {isRTL ? 'حملات التبرع' : 'Donation Campaigns'}
        </h3>
        <button
          onClick={() => {
            setEditCampaign({ title: '', description: '', target_amount: 0, current_amount: 0, donors_count: 0, status: 'active', is_public: true });
            setIsEditing(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-5 h-5" />
          {isRTL ? 'حملة جديدة' : 'New Campaign'}
        </button>
      </div>

      {isEditing && editCampaign ? (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl mb-6 relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <HandHeart className="w-6 h-6 text-indigo-500" />
              {editCampaign.id ? (isRTL ? 'تعديل الحملة' : 'Edit Campaign') : (isRTL ? 'إضافة حملة جديدة' : 'Add New Campaign')}
            </h3>
            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 p-2 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'عنوان الحملة' : 'Campaign Title'}</label>
              <input
                type="text"
                value={editCampaign.title || ''}
                onChange={e => setEditCampaign({ ...editCampaign, title: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white font-medium"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'الوصف' : 'Description'}</label>
              <textarea
                value={editCampaign.description || ''}
                onChange={e => setEditCampaign({ ...editCampaign, description: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white min-h-[100px] resize-none font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'المبلغ المستهدف' : 'Target Amount'}</label>
              <input
                type="number"
                value={editCampaign.target_amount || 0}
                onChange={e => setEditCampaign({ ...editCampaign, target_amount: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white font-bold"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'المبلغ المجموع (تحديث يدوي)' : 'Collected Amount'}</label>
              <input
                type="number"
                value={editCampaign.current_amount || 0}
                onChange={e => setEditCampaign({ ...editCampaign, current_amount: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white font-bold"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'عدد المتبرعين' : 'Donors Count'}</label>
              <input
                type="number"
                value={editCampaign.donors_count || 0}
                onChange={e => setEditCampaign({ ...editCampaign, donors_count: Number(e.target.value) })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white font-bold"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{isRTL ? 'الحالة' : 'Status'}</label>
              <select
                value={editCampaign.status || 'active'}
                onChange={e => setEditCampaign({ ...editCampaign, status: e.target.value as any })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none text-slate-800 dark:text-white font-bold cursor-pointer"
              >
                <option value="active">{isRTL ? 'نشطة' : 'Active'}</option>
                <option value="completed">{isRTL ? 'مكتملة' : 'Completed'}</option>
                <option value="stopped">{isRTL ? 'متوقفة' : 'Stopped'}</option>
              </select>
            </div>
          </div>
          <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-6">
            <button
              onClick={() => setIsEditing(false)}
              className="px-6 py-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-bold"
            >
              {isRTL ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              onClick={handleSaveCampaign}
              disabled={saving}
              className="px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-2 font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50"
            >
              {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
              {isRTL ? 'حفظ الحملة' : 'Save Campaign'}
            </button>
          </div>
        </div>
      ) : null}

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">{isRTL ? 'الحملة' : 'Campaign'}</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">{isRTL ? 'التقدم' : 'Progress'}</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">{isRTL ? 'الحالة' : 'Status'}</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider">{isRTL ? 'الظهور' : 'Visibility'}</th>
                <th className="px-6 py-4 font-bold text-xs uppercase tracking-wider text-end">{isRTL ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-5">
                    <p className="font-bold text-slate-800 dark:text-white">{campaign.title}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 max-w-xs">{campaign.description}</p>
                  </td>
                  <td className="px-6 py-5 min-w-[200px]">
                    <div className="flex justify-between text-xs font-bold mb-1.5" dir="ltr">
                      <span className="text-slate-800 dark:text-slate-200">{campaign.current_amount}</span>
                      <span className="text-slate-400">{campaign.target_amount}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${campaign.current_amount >= campaign.target_amount ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                        style={{ width: `${Math.min(100, (campaign.current_amount / Math.max(campaign.target_amount, 1)) * 100)}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {campaign.status === 'active' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"><Activity className="w-3.5 h-3.5" /> {isRTL ? 'نشطة' : 'Active'}</span>}
                    {campaign.status === 'completed' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> {isRTL ? 'مكتملة' : 'Completed'}</span>}
                    {campaign.status === 'stopped' && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400"><PauseCircle className="w-3.5 h-3.5" /> {isRTL ? 'متوقفة' : 'Stopped'}</span>}
                  </td>
                  <td className="px-6 py-5">
                    <button
                      onClick={() => toggleCampaignPublic(campaign.id)}
                      disabled={saving}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                        campaign.is_public 
                          ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-500/20 dark:text-blue-400 dark:hover:bg-blue-500/30' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                      }`}
                    >
                      {campaign.is_public ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      {campaign.is_public ? (isRTL ? 'مرئي' : 'Visible') : (isRTL ? 'مخفي' : 'Hidden')}
                    </button>
                  </td>
                  <td className="px-6 py-5 text-end">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => { setEditCampaign(campaign); setIsEditing(true); }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 rounded-xl transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteCampaign(campaign.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {campaigns.length === 0 && (
            <div className="p-12 text-center flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <HandHeart className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-bold">
                {isRTL ? 'لا توجد حملات تبرع حالياً' : 'No donation campaigns yet'}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
