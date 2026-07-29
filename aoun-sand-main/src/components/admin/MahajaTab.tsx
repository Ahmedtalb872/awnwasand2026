import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { BookOpen, Video, Plus, Trash2, Edit2, Save, X, Image as ImageIcon, Link as LinkIcon, FileText, LayoutList, List, PlayCircle, Headphones } from 'lucide-react';

export const MahajaTab = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [activeTab, setActiveTab] = useState<'courses' | 'lessons'>('courses');
  const [courses, setCourses] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [coursesRes, lessonsRes] = await Promise.all([
        supabase.from('mahaja_courses').select('*').order('created_at', { ascending: false }),
        supabase.from('mahaja_lessons').select('*, mahaja_courses(title)').order('lesson_number', { ascending: true })
      ]);
      if (coursesRes.data) setCourses(coursesRes.data);
      if (lessonsRes.data) setLessons(lessonsRes.data);
    } catch (err) {
      toast.error(isRTL ? 'خطأ في جلب البيانات' : 'Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddNew = () => {
    let newItem: any = { id: 'new', title: '', is_published: true };
    if (activeTab === 'courses') {
      newItem = { ...newItem, description: '', instructor: '', image_url: '' };
      setCourses([newItem, ...courses]);
    } else {
      newItem = { ...newItem, course_id: '', content_type: 'video', content_url: '', lesson_number: lessons.length > 0 ? Math.max(...lessons.map(l => l.lesson_number || 0)) + 1 : 1 };
      setLessons([newItem, ...lessons]);
    }
    setIsEditing('new');
    setEditForm(newItem);
  };

  const handleSave = async (id: string) => {
    if (isSaving) return;
    setIsSaving(true);
    
    const table = activeTab === 'courses' ? 'mahaja_courses' : 'mahaja_lessons';
    const isNew = id === 'new';

    if (!editForm.title?.trim()) {
      toast.error(isRTL ? 'العنوان مطلوب' : 'Title is required');
      setIsSaving(false); return;
    }
    
    if (activeTab === 'lessons') {
      if (!editForm.course_id) { toast.error(isRTL ? 'اختر الدورة' : 'Select a course'); setIsSaving(false); return; }
      if (!editForm.content_url?.trim()) { toast.error(isRTL ? 'رابط المحتوى مطلوب' : 'Content URL is required'); setIsSaving(false); return; }
    }

    const { id: _, created_at, updated_at, mahaja_courses, ...saveData } = editForm;

    try {
      if (isNew) {
        const { error } = await supabase.from(table).insert([saveData]);
        if (error) throw error;
        toast.success(isRTL ? 'تمت الإضافة بنجاح' : 'Added successfully');
      } else {
        const { error } = await supabase.from(table).update(saveData).eq('id', id);
        if (error) throw error;
        toast.success(isRTL ? 'تم التحديث بنجاح' : 'Updated successfully');
      }
      setIsEditing(null);
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === 'new') {
      if (activeTab === 'courses') setCourses(courses.filter(i => i.id !== 'new'));
      else setLessons(lessons.filter(i => i.id !== 'new'));
      setIsEditing(null);
      return;
    }
    if (!window.confirm(isRTL ? 'هل أنت متأكد من الحذف؟' : 'Are you sure?')) return;
    
    const table = activeTab === 'courses' ? 'mahaja_courses' : 'mahaja_lessons';
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) toast.error(error.message);
    else { toast.success(isRTL ? 'تم الحذف' : 'Deleted'); fetchData(); }
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>, field: string, type: 'image' | 'video' | 'pdf' | 'audio') => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    const fileExt = file.name.split('.').pop();
    const safeName = file.name.replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `mahaja-${type}-${Date.now()}.${fileExt}`;

    try {
      toast.loading(isRTL ? 'جاري الرفع...' : 'Uploading...', { id: 'upload' });
      const { error } = await supabase.storage.from('mahaja_content').upload(fileName, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('mahaja_content').getPublicUrl(fileName);
      setEditForm({ ...editForm, [field]: urlData.publicUrl });
      toast.success(isRTL ? 'تم الرفع' : 'Uploaded', { id: 'upload' });
    } catch (err: any) {
      toast.error(err.message || 'Upload failed', { id: 'upload' });
    }
  };

  const filteredCourses = courses.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()) || (c.instructor && c.instructor.toLowerCase().includes(searchQuery.toLowerCase())));
  const filteredLessons = lessons.filter(l => 
    l.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (selectedCourseFilter === 'all' || l.course_id === selectedCourseFilter)
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-teal-500" />
            {isRTL ? 'إدارة المحجة البيضاء' : 'Mahaja Management'}
          </h2>
        </div>
        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          <button onClick={() => { setActiveTab('courses'); setIsEditing(null); }} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'courses' ? 'bg-white text-teal-600 shadow-sm' : 'text-slate-500'}`}>
            <LayoutList className="w-4 h-4" /> {isRTL ? 'الدورات' : 'Courses'}
          </button>
          <button onClick={() => { setActiveTab('lessons'); setIsEditing(null); }} className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 ${activeTab === 'lessons' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>
            <List className="w-4 h-4" /> {isRTL ? 'الدروس' : 'Lessons'}
          </button>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <input 
          type="text" 
          placeholder={isRTL ? 'بحث...' : 'Search...'} 
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)} 
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" 
        />
        {activeTab === 'lessons' && (
          <select value={selectedCourseFilter} onChange={e => setSelectedCourseFilter(e.target.value)} className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <option value="all">{isRTL ? 'جميع الدورات' : 'All Courses'}</option>
            {courses.filter(c => c.id !== 'new').map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        )}
        <button onClick={handleAddNew} disabled={isEditing === 'new'} className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50">
          <Plus className="w-5 h-5" /> {isRTL ? 'إضافة' : 'Add New'}
        </button>
      </div>

      {loading && !isEditing ? (
        <div className="flex justify-center py-12"><div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin"></div></div>
      ) : (
        <div className="space-y-4">
          {(activeTab === 'courses' ? filteredCourses : filteredLessons).map(item => {
            const isEditingThis = isEditing === item.id;
            
            if (isEditingThis) {
              return (
                <div key={item.id} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-teal-200 dark:border-teal-800 space-y-4">
                  {activeTab === 'courses' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-bold mb-1">{isRTL ? 'العنوان' : 'Title'}</label><input type="text" value={editForm.title || ''} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full px-4 py-2 rounded-xl border" /></div>
                      <div><label className="block text-sm font-bold mb-1">{isRTL ? 'المدرس' : 'Instructor'}</label><input type="text" value={editForm.instructor || ''} onChange={e => setEditForm({...editForm, instructor: e.target.value})} className="w-full px-4 py-2 rounded-xl border" /></div>
                      <div className="md:col-span-2"><label className="block text-sm font-bold mb-1">{isRTL ? 'الوصف' : 'Description'}</label><textarea value={editForm.description || ''} onChange={e => setEditForm({...editForm, description: e.target.value})} className="w-full px-4 py-2 rounded-xl border h-24" /></div>
                      <div className="md:col-span-2 flex gap-4 items-center">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={editForm.is_published} onChange={e => setEditForm({...editForm, is_published: e.target.checked})} /> {isRTL ? 'منشور' : 'Published'}</label>
                        <div className="flex-1 flex gap-2"><input type="text" placeholder="Image URL" value={editForm.image_url || ''} onChange={e => setEditForm({...editForm, image_url: e.target.value})} className="flex-1 px-4 py-2 rounded-xl border" dir="ltr"/><label className="cursor-pointer bg-slate-200 px-4 py-2 rounded-xl"><ImageIcon className="w-5 h-5" /><input type="file" accept="image/*" className="hidden" onChange={e => uploadFile(e, 'image_url', 'image')} /></label></div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-bold mb-1">{isRTL ? 'الدورة' : 'Course'}</label><select value={editForm.course_id || ''} onChange={e => setEditForm({...editForm, course_id: e.target.value})} className="w-full px-4 py-2 rounded-xl border"><option value="">{isRTL ? 'اختر دورة' : 'Select course'}</option>{courses.filter(c=>c.id!=='new').map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></div>
                      <div><label className="block text-sm font-bold mb-1">{isRTL ? 'العنوان' : 'Title'}</label><input type="text" value={editForm.title || ''} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full px-4 py-2 rounded-xl border" /></div>
                      <div><label className="block text-sm font-bold mb-1">{isRTL ? 'الترتيب (رقم الدرس)' : 'Lesson Number'}</label><input type="number" value={editForm.lesson_number || ''} onChange={e => setEditForm({...editForm, lesson_number: parseInt(e.target.value)})} className="w-full px-4 py-2 rounded-xl border" /></div>
                      <div><label className="block text-sm font-bold mb-1">{isRTL ? 'نوع المحتوى' : 'Type'}</label><select value={editForm.content_type || 'video'} onChange={e => setEditForm({...editForm, content_type: e.target.value})} className="w-full px-4 py-2 rounded-xl border"><option value="video">Video</option><option value="audio">Audio</option><option value="pdf">PDF</option></select></div>
                      <div className="md:col-span-2 flex gap-4 items-center">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={editForm.is_published} onChange={e => setEditForm({...editForm, is_published: e.target.checked})} /> {isRTL ? 'منشور' : 'Published'}</label>
                        <div className="flex-1 flex gap-2"><input type="text" placeholder="Content URL (YouTube or Direct Link)" value={editForm.content_url || ''} onChange={e => setEditForm({...editForm, content_url: e.target.value})} className="flex-1 px-4 py-2 rounded-xl border" dir="ltr"/><label className="cursor-pointer bg-slate-200 px-4 py-2 rounded-xl"><LinkIcon className="w-5 h-5" /><input type="file" className="hidden" onChange={e => uploadFile(e, 'content_url', editForm.content_type)} /></label></div>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button disabled={isSaving} onClick={() => { setIsEditing(null); if (item.id === 'new') fetchData(); }} className="px-5 py-2.5 rounded-xl font-bold bg-slate-200">إلغاء</button>
                    <button disabled={isSaving} onClick={() => handleSave(item.id)} className="px-5 py-2.5 rounded-xl font-bold text-white bg-teal-600 flex items-center gap-2"><Save className="w-4 h-4" /> حفظ</button>
                  </div>
                </div>
              );
            }

            return (
              <div key={item.id} className="flex items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
                  {activeTab === 'courses' ? (item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover"/> : <ImageIcon className="w-6 h-6 text-slate-300"/>) : (item.content_type === 'video' ? <PlayCircle className="w-6 h-6 text-red-500" /> : item.content_type === 'audio' ? <Headphones className="w-6 h-6 text-purple-500"/> : <FileText className="w-6 h-6 text-blue-500"/>)}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    {activeTab === 'lessons' && <span className="text-teal-600">{item.lesson_number}.</span>} {item.title}
                    <span className={`text-xs px-2 py-1 rounded-full ${item.is_published ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{item.is_published ? 'منشور' : 'مخفي'}</span>
                  </h3>
                  <p className="text-sm text-slate-500">{activeTab === 'courses' ? item.instructor : item.mahaja_courses?.title}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setIsEditing(item.id); setEditForm(item); }} className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Edit2 className="w-5 h-5" /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-3 bg-red-50 text-red-600 rounded-xl"><Trash2 className="w-5 h-5" /></button>
                </div>
              </div>
            );
          })}
          {((activeTab === 'courses' ? filteredCourses : filteredLessons).length === 0) && <div className="text-center py-8 text-slate-500">لا يوجد بيانات</div>}
        </div>
      )}
    </motion.div>
  );
};
