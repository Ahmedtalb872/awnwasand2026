import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Trophy, Plus, Trash2, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';

export const CompetitionsManagementTab = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  const fetchCompetitions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('competitions').select('*').order('created_at', { ascending: false });
    if (data) setCompetitions(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCompetitions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading(isRTL ? 'جاري الحفظ...' : 'Saving...');
    
    const payload = {
      title,
      description,
      start_date: startDate,
      end_date: endDate,
      is_active: isActive
    };

    try {
      if (editingId) {
        const { error } = await supabase.from('competitions').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('competitions').insert(payload);
        if (error) throw error;
      }
      
      toast.success(isRTL ? 'تم الحفظ بنجاح' : 'Saved successfully', { id: toastId });
      setShowForm(false);
      resetForm();
      fetchCompetitions();
    } catch (err: any) {
      toast.error(err.message || 'Error', { id: toastId });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(isRTL ? 'هل أنت متأكد من الحذف؟' : 'Are you sure you want to delete?')) return;
    
    const toastId = toast.loading(isRTL ? 'جاري الحذف...' : 'Deleting...');
    try {
      const { error } = await supabase.from('competitions').delete().eq('id', id);
      if (error) throw error;
      toast.success(isRTL ? 'تم الحذف' : 'Deleted', { id: toastId });
      fetchCompetitions();
    } catch (err: any) {
      toast.error(err.message || 'Error', { id: toastId });
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setIsActive(true);
  };

  const openEdit = (comp: any) => {
    setEditingId(comp.id);
    setTitle(comp.title);
    setDescription(comp.description || '');
    setStartDate(comp.start_date);
    setEndDate(comp.end_date);
    setIsActive(comp.is_active);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Trophy className="w-6 h-6 text-purple-500" />
          {isRTL ? 'إدارة المسابقات' : 'Competitions Management'}
        </h2>
        {!showForm && (
          <button 
            onClick={() => { resetForm(); setShowForm(true); }}
            className="btn-primary"
          >
            <Plus className="w-5 h-5" />
            {isRTL ? 'إضافة مسابقة' : 'Add Competition'}
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 max-w-2xl" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'العنوان' : 'Title'}</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'الوصف' : 'Description'}</label>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'تاريخ البدء' : 'Start Date'}</label>
                <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'تاريخ الانتهاء' : 'End Date'}</label>
                <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="input-field" />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary" />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">{isRTL ? 'نشط' : 'Active'}</label>
            </div>
          </div>
          <div className="flex gap-4 mt-8">
            <button type="button" onClick={() => setShowForm(false)} className="btn-outline flex-1">{isRTL ? 'إلغاء' : 'Cancel'}</button>
            <button type="submit" className="btn-primary flex-1">{isRTL ? 'حفظ' : 'Save'}</button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-full py-12 text-center text-slate-500">
              <span className="animate-spin border-2 border-purple-500 border-t-transparent rounded-full w-8 h-8 inline-block"></span>
            </div>
          ) : competitions.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">{isRTL ? 'لا توجد مسابقات' : 'No competitions found'}</p>
            </div>
          ) : (
            competitions.map(comp => (
              <div key={comp.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-col h-full" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">{comp.title}</h3>
                  <span className={`px-2 py-1 text-xs font-bold rounded-md ${comp.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                    {comp.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'مغلق' : 'Closed')}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 flex-1 line-clamp-3">{comp.description}</p>
                <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl mb-4">
                  <div className="flex justify-between mb-1">
                    <span>{isRTL ? 'البداية:' : 'Start:'}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{comp.start_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isRTL ? 'النهاية:' : 'End:'}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{comp.end_date}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button onClick={() => openEdit(comp)} className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center gap-1 font-bold text-sm transition-colors">
                    <Edit2 className="w-4 h-4" /> {isRTL ? 'تعديل' : 'Edit'}
                  </button>
                  <button onClick={() => handleDelete(comp.id)} className="flex-1 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl flex items-center justify-center gap-1 font-bold text-sm transition-colors">
                    <Trash2 className="w-4 h-4" /> {isRTL ? 'حذف' : 'Delete'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
