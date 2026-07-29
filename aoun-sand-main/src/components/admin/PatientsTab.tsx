import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Search, Plus, Trash2, Edit, Eye, User, Users, FileText, Phone, MapPin,
  Activity, Stethoscope, AlertCircle, CheckCircle, PauseCircle, Clock,
  Save, X, Filter, RefreshCw, ShieldCheck, Upload, ImageIcon, XCircle
} from 'lucide-react';

type PatientStatus = 'قيد المتابعة' | 'مكتمل' | 'موقوف';
type ServiceType = 'فحص' | 'عملية' | 'تأمين صحي' | 'أخرى';

interface Patient {
  id: string;
  full_name: string;
  phone: string;
  age: number;
  address: string;
  health_condition: string;
  notes: string;
  status: PatientStatus;
  unique_id: string;
  national_id: string;
  photo_url: string | null;
  medical_report_urls: string[];
  created_at: string;
}

interface PatientService {
  id: string;
  patient_id: string;
  service_type: ServiceType;
  service_date: string;
  description: string;
  cost: number;
  notes: string;
  created_at: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_REPORT_SIZE = 20 * 1024 * 1024; // 20MB

const uploadFile = async (
  file: File,
  bucket: string,
  folder: string
): Promise<string | null> => {
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
};

export function PatientsTab() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [services, setServices] = useState<PatientService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'الكل' | PatientStatus>('الكل');

  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<PatientService | null>(null);
  const [isSavingService, setIsSavingService] = useState(false);

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Image state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [reportFiles, setReportFiles] = useState<File[]>([]);
  const [reportPreviews, setReportPreviews] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState('');

  const photoInputRef = useRef<HTMLInputElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    age: '',
    address: '',
    health_condition: '',
    notes: '',
    status: 'قيد المتابعة' as PatientStatus,
    national_id: '',
  });

  const [serviceFormData, setServiceFormData] = useState({
    service_type: 'فحص' as ServiceType,
    service_date: new Date().toISOString().split('T')[0],
    description: '',
    cost: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
    const channel = supabase.channel('patients-channel-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patient_services' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [patientsRes, servicesRes] = await Promise.all([
        supabase.from('patients').select('*').order('created_at', { ascending: false }),
        supabase.from('patient_services').select('*').order('service_date', { ascending: false })
      ]);

      if (patientsRes.error) {
        console.error('Patients fetch error:', patientsRes.error);
        toast.error(`خطأ في جلب بيانات المرضى: ${patientsRes.error.message}`);
      } else {
        setPatients(patientsRes.data || []);
      }

      if (servicesRes.error) {
        console.error('Services fetch error:', servicesRes.error);
      } else {
        setServices(servicesRes.data || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch =
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.phone?.includes(searchTerm) ||
      p.unique_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.national_id?.includes(searchTerm);
    const matchesStatus = statusFilter === 'الكل' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: patients.length,
    active: patients.filter(p => p.status === 'قيد المتابعة').length,
    completed: patients.filter(p => p.status === 'مكتمل').length,
    suspended: patients.filter(p => p.status === 'موقوف').length,
    totalCheckups: services.filter(s => s.service_type === 'فحص').length,
    totalSurgeries: services.filter(s => s.service_type === 'عملية').length,
  };

  // --- Photo handlers ---
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error(isRTL ? 'نوع الملف غير مسموح. يُسمح بـ JPG, PNG, WEBP فقط.' : 'Invalid file type. Only JPG, PNG, WEBP allowed.');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      toast.error(isRTL ? 'حجم الصورة كبير جداً. الحد الأقصى 10MB.' : 'File too large. Max 10MB.');
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleReportFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    for (const file of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`${file.name}: ${isRTL ? 'نوع غير مسموح' : 'Invalid type'}`);
        continue;
      }
      if (file.size > MAX_REPORT_SIZE) {
        toast.error(`${file.name}: ${isRTL ? 'حجم كبير جداً (الحد 20MB)' : 'Too large (max 20MB)'}`);
        continue;
      }
      validFiles.push(file);
      validPreviews.push(URL.createObjectURL(file));
    }

    setReportFiles(prev => [...prev, ...validFiles]);
    setReportPreviews(prev => [...prev, ...validPreviews]);
  };

  const removeReportPreview = (index: number) => {
    setReportFiles(prev => prev.filter((_, i) => i !== index));
    setReportPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // --- Patient CRUD ---
  const handleOpenPatientModal = (patient?: Patient) => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setReportFiles([]);
    setReportPreviews([]);
    setUploadProgress('');

    if (patient) {
      setEditingPatient(patient);
      setFormData({
        full_name: patient.full_name || '',
        phone: patient.phone || '',
        age: patient.age?.toString() || '',
        address: patient.address || '',
        health_condition: patient.health_condition || '',
        notes: patient.notes || '',
        status: patient.status || 'قيد المتابعة',
        national_id: patient.national_id || '',
      });
      setPhotoPreview(patient.photo_url || null);
    } else {
      setEditingPatient(null);
      setFormData({
        full_name: '',
        phone: '',
        age: '',
        address: '',
        health_condition: '',
        notes: '',
        status: 'قيد المتابعة',
        national_id: '',
      });
    }
    setIsPatientModalOpen(true);
  };

  const handleSavePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const loadingToast = toast.loading(isRTL ? 'جاري الحفظ...' : 'Saving...');

    try {
      let photoUrl = editingPatient?.photo_url || null;
      let reportUrls: string[] = editingPatient?.medical_report_urls || [];

      // Upload profile photo
      if (photoFile) {
        setUploadProgress(isRTL ? 'جاري رفع الصورة الشخصية...' : 'Uploading profile photo...');
        photoUrl = await uploadFile(photoFile, 'patient-photos', 'profiles');
      }

      // Upload medical reports
      if (reportFiles.length > 0) {
        setUploadProgress(isRTL ? 'جاري رفع صور التقارير الطبية...' : 'Uploading medical reports...');
        const uploadedUrls = await Promise.all(
          reportFiles.map(f => uploadFile(f, 'medical-reports', 'reports'))
        );
        reportUrls = [...reportUrls, ...uploadedUrls.filter(Boolean) as string[]];
      }

      setUploadProgress(isRTL ? 'جاري حفظ البيانات...' : 'Saving data...');

      const payload = {
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
        age: formData.age ? parseInt(formData.age) : null,
        address: formData.address.trim() || null,
        health_condition: formData.health_condition.trim() || null,
        notes: formData.notes.trim() || null,
        status: formData.status,
        national_id: formData.national_id.trim() || null,
        photo_url: photoUrl,
        medical_report_urls: reportUrls,
      };

      if (editingPatient) {
        const { error } = await supabase
          .from('patients')
          .update(payload)
          .eq('id', editingPatient.id);

        if (error) {
          console.error('Update error:', error);
          throw new Error(error.message);
        }
        toast.success(isRTL ? '✅ تم تحديث بيانات المريض بنجاح' : '✅ Patient updated', { id: loadingToast });
      } else {
        const { data, error } = await supabase
          .from('patients')
          .insert([payload])
          .select()
          .single();

        if (error) {
          console.error('Insert error:', error);
          throw new Error(error.message);
        }
        toast.success(isRTL ? `✅ تم إضافة المريض بنجاح - المعرف: ${data?.unique_id}` : `✅ Patient added - ID: ${data?.unique_id}`, { id: loadingToast });
      }

      setIsPatientModalOpen(false);
      await fetchData();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(`❌ ${error.message || (isRTL ? 'حدث خطأ أثناء الحفظ' : 'Save failed')}`, { id: loadingToast });
    } finally {
      setIsSaving(false);
      setUploadProgress('');
    }
  };

  const handleDeletePatient = async (id: string) => {
    if (!window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا المريض وكل بياناته؟' : 'Delete this patient and all their data?')) return;
    setIsDeleting(id);
    try {
      const { error } = await supabase.from('patients').delete().eq('id', id);
      if (error) throw new Error(error.message);
      toast.success(isRTL ? 'تم الحذف بنجاح' : 'Deleted');
      if (selectedPatient?.id === id) setIsDetailsModalOpen(false);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleOpenDetails = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsDetailsModalOpen(true);
  };

  // --- Service CRUD ---
  const handleOpenServiceModal = (service?: PatientService) => {
    if (service) {
      setEditingService(service);
      setServiceFormData({
        service_type: service.service_type,
        service_date: service.service_date,
        description: service.description || '',
        cost: service.cost?.toString() || '',
        notes: service.notes || ''
      });
    } else {
      setEditingService(null);
      setServiceFormData({
        service_type: 'فحص',
        service_date: new Date().toISOString().split('T')[0],
        description: '',
        cost: '',
        notes: ''
      });
    }
    setIsServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    setIsSavingService(true);
    const loadingToast = toast.loading(isRTL ? 'جاري الحفظ...' : 'Saving...');
    try {
      const payload = {
        ...serviceFormData,
        patient_id: selectedPatient.id,
        cost: serviceFormData.cost ? parseFloat(serviceFormData.cost) : 0,
      };

      if (editingService) {
        const { error } = await supabase.from('patient_services').update(payload).eq('id', editingService.id);
        if (error) throw new Error(error.message);
        toast.success(isRTL ? 'تم تحديث الخدمة' : 'Service updated', { id: loadingToast });
      } else {
        const { error } = await supabase.from('patient_services').insert([payload]);
        if (error) throw new Error(error.message);
        toast.success(isRTL ? 'تمت إضافة الخدمة' : 'Service added', { id: loadingToast });
      }
      setIsServiceModalOpen(false);
      await fetchData();
    } catch (error: any) {
      console.error(error);
      toast.error(`❌ ${error.message}`, { id: loadingToast });
    } finally {
      setIsSavingService(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!window.confirm(isRTL ? 'حذف هذه الخدمة؟' : 'Delete this service?')) return;
    try {
      const { error } = await supabase.from('patient_services').delete().eq('id', id);
      if (error) throw new Error(error.message);
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
      await fetchData();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  // Helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'مكتمل': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'موقوف': return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
      default: return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
    }
  };

  const getServiceIcon = (type: string) => {
    switch (type) {
      case 'فحص': return <Stethoscope className="w-5 h-5 text-indigo-500" />;
      case 'عملية': return <Activity className="w-5 h-5 text-rose-500" />;
      case 'تأمين صحي': return <ShieldCheck className="w-5 h-5 text-emerald-500" />;
      default: return <FileText className="w-5 h-5 text-slate-500" />;
    }
  };

  const patientServices = selectedPatient
    ? services.filter(s => s.patient_id === selectedPatient.id)
    : [];

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: isRTL ? 'إجمالي المرضى' : 'Total', value: stats.total, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
          { label: isRTL ? 'قيد المتابعة' : 'Active', value: stats.active, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: isRTL ? 'مكتمل' : 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: isRTL ? 'موقوف' : 'Suspended', value: stats.suspended, icon: PauseCircle, color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
          { label: isRTL ? 'الفحوصات' : 'Checkups', value: stats.totalCheckups, icon: Stethoscope, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
          { label: isRTL ? 'العمليات' : 'Surgeries', value: stats.totalSurgeries, icon: Activity, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/20' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center gap-2 shadow-sm">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}><stat.icon className="w-6 h-6" /></div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex flex-1 w-full gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={isRTL ? 'بحث بالاسم، الهاتف، الرقم الوطني...' : 'Search by name, phone, ID...'}
              className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm`}
            />
          </div>
          <div className="relative flex-shrink-0">
            <Filter className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className={`appearance-none ${isRTL ? 'pr-9 pl-8' : 'pl-9 pr-8'} py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer text-sm font-medium`}
            >
              <option value="الكل">{isRTL ? 'جميع الحالات' : 'All Status'}</option>
              <option value="قيد المتابعة">{isRTL ? 'قيد المتابعة' : 'Active'}</option>
              <option value="مكتمل">{isRTL ? 'مكتمل' : 'Completed'}</option>
              <option value="موقوف">{isRTL ? 'موقوف' : 'Suspended'}</option>
            </select>
          </div>
        </div>
        <button
          onClick={() => handleOpenPatientModal()}
          className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30 text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>{isRTL ? 'إضافة مريض جديد' : 'Add Patient'}</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" dir={isRTL ? 'rtl' : 'ltr'}>
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-sm font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="px-4 py-4 text-start">{isRTL ? 'المعرف' : 'ID'}</th>
                <th className="px-4 py-4 text-start">{isRTL ? 'المريض' : 'Patient'}</th>
                <th className="px-4 py-4 text-start">{isRTL ? 'الهاتف' : 'Phone'}</th>
                <th className="px-4 py-4 text-start">{isRTL ? 'الرقم الوطني' : 'National ID'}</th>
                <th className="px-4 py-4 text-start">{isRTL ? 'الحالة الصحية' : 'Condition'}</th>
                <th className="px-4 py-4 text-start">{isRTL ? 'الحالة' : 'Status'}</th>
                <th className="px-4 py-4 text-center">{isRTL ? 'الإجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-slate-500">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
                    <p className="font-medium">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <User className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="text-slate-500 font-medium">{isRTL ? 'لا يوجد مرضى بعد' : 'No patients found'}</p>
                    <p className="text-slate-400 text-sm mt-1">{isRTL ? 'اضغط "إضافة مريض جديد" للبدء' : 'Click "Add Patient" to get started'}</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600 dark:text-indigo-400 font-bold">{p.unique_id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {p.photo_url ? (
                          <img src={p.photo_url} alt={p.full_name} className="w-10 h-10 rounded-full object-cover border-2 border-indigo-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center font-bold text-sm">
                            {p.full_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">{p.full_name}</p>
                          <p className="text-xs text-slate-500">{p.age ? `${p.age} ${isRTL ? 'سنة' : 'yr'}` : '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-sm" dir="ltr">{p.phone || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-sm font-mono">{p.national_id || '-'}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-sm max-w-[200px] truncate">{p.health_condition || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-bold rounded-lg border ${getStatusBadge(p.status)}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleOpenDetails(p)} className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors" title={isRTL ? 'عرض' : 'View'}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenPatientModal(p)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title={isRTL ? 'تعديل' : 'Edit'}>
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeletePatient(p.id)} disabled={isDeleting === p.id} className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg transition-colors disabled:opacity-50" title={isRTL ? 'حذف' : 'Delete'}>
                          {isDeleting === p.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── PATIENT ADD/EDIT MODAL ── */}
      <AnimatePresence>
        {isPatientModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {/* Header */}
              <div className="flex-shrink-0 p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  {editingPatient ? (isRTL ? 'تعديل بيانات المريض' : 'Edit Patient') : (isRTL ? 'إضافة مريض جديد' : 'Add New Patient')}
                </h3>
                <button onClick={() => setIsPatientModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSavePatient} className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Profile Photo */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                    {isRTL ? 'الصورة الشخصية (اختياري)' : 'Profile Photo (Optional)'}
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-400 transition-colors"
                      onClick={() => photoInputRef.current?.click()}>
                      {photoPreview ? (
                        <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div>
                      <button type="button" onClick={() => photoInputRef.current?.click()}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-colors flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        {isRTL ? 'رفع صورة' : 'Upload Photo'}
                      </button>
                      <p className="text-xs text-slate-400 mt-1">{isRTL ? 'JPG, PNG, WEBP — الحد الأقصى 10MB' : 'JPG, PNG, WEBP — max 10MB'}</p>
                      {photoPreview && !editingPatient?.photo_url && (
                        <button type="button" onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                          className="text-xs text-rose-500 mt-1 hover:underline">
                          {isRTL ? 'إزالة' : 'Remove'}
                        </button>
                      )}
                    </div>
                    <input ref={photoInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handlePhotoChange} />
                  </div>
                </div>

                {/* Basic info grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'الاسم الكامل *' : 'Full Name *'}</label>
                    <input type="text" required value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'الرقم الوطني *' : 'National ID *'}</label>
                    <input type="text" required value={formData.national_id} onChange={e => setFormData({ ...formData, national_id: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-mono" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'رقم الهاتف' : 'Phone'}</label>
                    <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" dir="ltr" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'العمر' : 'Age'}</label>
                    <input type="number" min="0" max="150" value={formData.age} onChange={e => setFormData({ ...formData, age: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'الحالة' : 'Status'}</label>
                    <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as PatientStatus })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-bold">
                      <option value="قيد المتابعة">{isRTL ? 'قيد المتابعة' : 'Under Follow-up'}</option>
                      <option value="مكتمل">{isRTL ? 'مكتمل' : 'Completed'}</option>
                      <option value="موقوف">{isRTL ? 'موقوف' : 'Suspended'}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'العنوان' : 'Address'}</label>
                  <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'الحالة الصحية / نوع المرض *' : 'Health Condition *'}</label>
                  <input type="text" required value={formData.health_condition} onChange={e => setFormData({ ...formData, health_condition: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'ملاحظات إضافية' : 'Additional Notes'}</label>
                  <textarea rows={3} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none text-sm" />
                </div>

                {/* Medical Reports Upload */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                    {isRTL ? 'صور الفحوصات والتقارير الطبية (اختياري)' : 'Medical Report Images (Optional)'}
                  </label>
                  <div
                    onClick={() => reportInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 transition-all"
                  >
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-500">{isRTL ? 'اضغط لرفع صور التقارير' : 'Click to upload report images'}</p>
                    <p className="text-xs text-slate-400 mt-1">{isRTL ? 'JPG, PNG, WEBP — الحد الأقصى 20MB لكل صورة' : 'JPG, PNG, WEBP — max 20MB each'}</p>
                    <input ref={reportInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple className="hidden" onChange={handleReportFilesChange} />
                  </div>

                  {/* New report previews */}
                  {reportPreviews.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {reportPreviews.map((preview, i) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square">
                          <img src={preview} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => removeReportPreview(i)}
                            className="absolute top-1 right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Existing reports (when editing) */}
                  {(editingPatient?.medical_report_urls?.length ?? 0) > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-bold text-slate-500 mb-2">{isRTL ? 'التقارير الموجودة:' : 'Existing Reports:'}</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {editingPatient?.medical_report_urls?.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                            className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square block">
                            <img src={url} alt="" className="w-full h-full object-cover hover:opacity-80 transition-opacity" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Upload progress */}
                {uploadProgress && (
                  <div className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 rounded-xl">
                    <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
                    <span>{uploadProgress}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={isSaving}
                    className="flex-1 flex justify-center items-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30">
                    {isSaving ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>{isSaving ? (isRTL ? 'جاري الحفظ...' : 'Saving...') : (isRTL ? 'حفظ البيانات' : 'Save')}</span>
                  </button>
                  <button type="button" onClick={() => setIsPatientModalOpen(false)} disabled={isSaving}
                    className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors disabled:opacity-50">
                    {isRTL ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PATIENT DETAILS MODAL ── */}
      <AnimatePresence>
        {isDetailsModalOpen && selectedPatient && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200 dark:border-slate-800 shadow-2xl"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              {/* Header gradient */}
              <div className="flex-shrink-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-6 flex justify-between items-start rounded-t-3xl text-white">
                <div className="flex items-center gap-4">
                  {selectedPatient.photo_url ? (
                    <img src={selectedPatient.photo_url} alt={selectedPatient.full_name} className="w-16 h-16 rounded-2xl object-cover border-4 border-white/30" />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm text-white flex items-center justify-center font-black text-2xl">
                      {selectedPatient.full_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 bg-white/20 rounded-lg text-xs font-bold">{selectedPatient.unique_id}</span>
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${selectedPatient.status === 'مكتمل' ? 'bg-emerald-500/30' : selectedPatient.status === 'موقوف' ? 'bg-rose-500/30' : 'bg-amber-500/30'}`}>{selectedPatient.status}</span>
                    </div>
                    <h2 className="text-2xl font-black">{selectedPatient.full_name}</h2>
                    <p className="text-indigo-100 text-sm flex items-center gap-1 mt-0.5">
                      <Stethoscope className="w-4 h-4" /> {selectedPatient.health_condition}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setIsDetailsModalOpen(false); handleOpenPatientModal(selectedPatient); }}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                    <Edit className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsDetailsModalOpen(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-950">
                {/* Info cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { icon: Phone, label: isRTL ? 'الهاتف' : 'Phone', value: selectedPatient.phone, dir: 'ltr' },
                    { icon: User, label: isRTL ? 'العمر' : 'Age', value: selectedPatient.age ? `${selectedPatient.age} ${isRTL ? 'سنة' : 'yrs'}` : '-' },
                    { icon: MapPin, label: isRTL ? 'العنوان' : 'Address', value: selectedPatient.address },
                    { icon: FileText, label: isRTL ? 'الرقم الوطني' : 'National ID', value: selectedPatient.national_id, dir: 'ltr' },
                  ].map((item, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex-shrink-0">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500 font-bold uppercase">{item.label}</p>
                        <p className="font-bold text-slate-800 dark:text-white text-sm truncate" dir={(item as any).dir}>{item.value || '-'}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedPatient.notes && (
                  <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/30">
                    <h4 className="font-bold text-amber-800 dark:text-amber-500 flex items-center gap-2 mb-2 text-sm">
                      <AlertCircle className="w-4 h-4" /> {isRTL ? 'ملاحظات:' : 'Notes:'}
                    </h4>
                    <p className="text-amber-700 dark:text-amber-300/80 text-sm whitespace-pre-wrap">{selectedPatient.notes}</p>
                  </div>
                )}

                {/* Medical Reports Images */}
                {selectedPatient.medical_report_urls?.length > 0 && (
                  <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-indigo-500" />
                      {isRTL ? 'صور التقارير الطبية' : 'Medical Report Images'}
                      <span className="text-sm font-medium text-slate-400">({selectedPatient.medical_report_urls.length})</span>
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {selectedPatient.medical_report_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                          className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-square block hover:opacity-90 transition-opacity shadow-sm">
                          <img src={url} alt={`تقرير ${i + 1}`} className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Services Timeline */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-500" />
                      {isRTL ? 'سجل الخدمات' : 'Services Timeline'}
                      <span className="text-sm font-medium text-slate-400">({patientServices.length})</span>
                    </h3>
                    <button onClick={() => handleOpenServiceModal()}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-md">
                      <Plus className="w-4 h-4" />
                      <span>{isRTL ? 'إضافة خدمة' : 'Add Service'}</span>
                    </button>
                  </div>

                  {patientServices.length === 0 ? (
                    <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium text-sm">{isRTL ? 'لا توجد خدمات مسجلة بعد' : 'No services recorded yet'}</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {patientServices.map(service => (
                        <div key={service.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm group hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 mt-0.5 flex-shrink-0">
                                {getServiceIcon(service.service_type)}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${service.service_type === 'عملية' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : service.service_type === 'تأمين صحي' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400'}`}>
                                    {service.service_type}
                                  </span>
                                  <span className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" />{service.service_date}</span>
                                </div>
                                <h4 className="font-bold text-slate-800 dark:text-white">{service.description || (isRTL ? 'بدون وصف' : 'No description')}</h4>
                                {service.notes && <p className="text-sm text-slate-500 mt-1 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-xl">{service.notes}</p>}
                                {service.cost > 0 && (
                                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                                    {isRTL ? `التكلفة: ${service.cost} MRU` : `Cost: ${service.cost} MRU`}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button onClick={() => handleOpenServiceModal(service)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDeleteService(service.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SERVICE ADD/EDIT MODAL ── */}
      <AnimatePresence>
        {isServiceModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl"
              dir={isRTL ? 'rtl' : 'ltr'}
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  {editingService ? (isRTL ? 'تعديل الخدمة' : 'Edit Service') : (isRTL ? 'إضافة خدمة جديدة' : 'Add New Service')}
                </h3>
                <button onClick={() => setIsServiceModalOpen(false)} className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveService} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'نوع الخدمة *' : 'Type *'}</label>
                    <select required value={serviceFormData.service_type} onChange={e => setServiceFormData({ ...serviceFormData, service_type: e.target.value as ServiceType })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-bold">
                      <option value="فحص">{isRTL ? 'فحص طبي' : 'Checkup'}</option>
                      <option value="عملية">{isRTL ? 'عملية جراحية' : 'Surgery'}</option>
                      <option value="تأمين صحي">{isRTL ? 'تأمين صحي' : 'Insurance'}</option>
                      <option value="أخرى">{isRTL ? 'خدمة أخرى' : 'Other'}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'التاريخ *' : 'Date *'}</label>
                    <input type="date" required value={serviceFormData.service_date} onChange={e => setServiceFormData({ ...serviceFormData, service_date: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-mono" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'وصف الخدمة *' : 'Description *'}</label>
                  <input type="text" required value={serviceFormData.description} onChange={e => setServiceFormData({ ...serviceFormData, description: e.target.value })}
                    placeholder={isRTL ? 'مثال: فحص دم شامل...' : 'e.g., Full blood test...'}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'التكلفة (اختياري)' : 'Cost (Optional)'}</label>
                  <div className="relative">
                    <input type="number" step="0.01" min="0" value={serviceFormData.cost} onChange={e => setServiceFormData({ ...serviceFormData, cost: e.target.value })}
                      className={`w-full ${isRTL ? 'pl-16 pr-4' : 'pr-16 pl-4'} py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm`} dir="ltr" />
                    <span className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm`}>MRU</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">{isRTL ? 'ملاحظات' : 'Notes'}</label>
                  <textarea rows={2} value={serviceFormData.notes} onChange={e => setServiceFormData({ ...serviceFormData, notes: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none text-sm" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={isSavingService}
                    className="flex-1 flex justify-center items-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/30">
                    {isSavingService ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    <span>{isRTL ? 'حفظ' : 'Save'}</span>
                  </button>
                  <button type="button" onClick={() => setIsServiceModalOpen(false)} disabled={isSavingService}
                    className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors disabled:opacity-50">
                    {isRTL ? 'إلغاء' : 'Cancel'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
