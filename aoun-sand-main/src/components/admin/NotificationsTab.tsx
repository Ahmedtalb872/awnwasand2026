import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  Bell, Send, Clock, Link as LinkIcon, Image as ImageIcon,
  Trash2, Calendar, Upload, X, Film, FileImage, Loader2
} from 'lucide-react';

/* ── Media Upload Component ── */
const MediaUploader = ({
  isRTL,
  onUpload,
  onClear,
  preview,
  uploading,
}: {
  isRTL: boolean;
  onUpload: (file: File) => void;
  onClear: () => void;
  preview: string | null;
  uploading: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  const isVideo = preview && /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(preview);

  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
        <Upload className="w-4 h-4 text-purple-500" />
        {isRTL ? 'وسائط مرفقة (صورة / فيديو) — اختياري' : 'Attached Media (Image / Video) — Optional'}
      </label>

      {!preview ? (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 scale-[1.01]'
              : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:border-purple-300 hover:bg-purple-50/50 dark:hover:bg-purple-900/10'
          }`}
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
              <Upload className="w-6 h-6 text-purple-500" />
            </div>
          )}
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {uploading
                ? (isRTL ? 'جاري الرفع...' : 'Uploading...')
                : (isRTL ? 'اسحب الملف أو اضغط للرفع' : 'Drag & drop or click to upload')}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {isRTL ? 'صور (JPG, PNG, WEBP) أو فيديو (MP4, WEBM)' : 'Images (JPG, PNG, WEBP) or Videos (MP4, WEBM)'}
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); }}
          />
        </div>
      ) : (
        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          {isVideo ? (
            <div className="aspect-video bg-black">
              <video src={preview} controls className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="relative">
              <img src={preview} alt="preview" className="w-full max-h-48 object-cover" />
            </div>
          )}
          <div className="absolute top-2 end-2 flex gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold bg-white/90 dark:bg-slate-800/90 backdrop-blur text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-xl shadow-sm">
              {isVideo ? <Film className="w-3.5 h-3.5 text-purple-500" /> : <FileImage className="w-3.5 h-3.5 text-blue-500" />}
              {isVideo ? (isRTL ? 'فيديو' : 'Video') : (isRTL ? 'صورة' : 'Image')}
            </div>
            <button
              onClick={onClear}
              className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-sm transition-colors"
              title="Remove media"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold px-4 py-2 flex items-center gap-1.5">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            {isRTL ? 'تم رفع الملف بنجاح ✓' : 'Media uploaded successfully ✓'}
          </p>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════
   Main NotificationsTab Component
   ══════════════════════════════════ */
export const NotificationsTab = ({
  notifications,
  fetchDashboardData,
}: {
  notifications: any[];
  fetchDashboardData: () => void;
}) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  /* ── Upload to Supabase Storage ── */
  const handleMediaUpload = async (file: File) => {
    const maxSize = 50 * 1024 * 1024; // 50 MB
    if (file.size > maxSize) {
      toast.error(isRTL ? 'حجم الملف يتجاوز 50 ميجابايت' : 'File exceeds 50 MB limit');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `notif_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

      const { data, error } = await supabase.storage
        .from('media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(data.path);
      const publicUrl = urlData.publicUrl;

      setMediaUrl(publicUrl);
      setMediaPreview(publicUrl);
      toast.success(isRTL ? '✓ تم رفع الوسيط' : '✓ Media uploaded');
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error(
        err.message?.includes('not found')
          ? (isRTL ? 'bucket "media" غير موجود في Supabase Storage' : 'bucket "media" not found in Supabase Storage')
          : (isRTL ? `خطأ في الرفع: ${err.message}` : `Upload failed: ${err.message}`)
      );
    } finally {
      setUploading(false);
    }
  };

  const clearMedia = () => {
    setMediaUrl('');
    setMediaPreview(null);
  };

  /* ── Send notification ── */
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error(isRTL ? 'العنوان والرسالة مطلوبان' : 'Title and message are required');
      return;
    }
    setIsLoading(true);
    try {
      const payload: any = { title: title.trim(), message: message.trim() };
      if (link.trim()) payload.link = link.trim();
      if (mediaUrl) payload.media_url = mediaUrl;
      if (isScheduled && scheduledAt) payload.scheduled_at = new Date(scheduledAt).toISOString();

      const { error } = await supabase.from('notifications').insert([payload]);
      if (error) throw error;

      toast.success(isRTL ? '✓ تم إرسال الإشعار بنجاح!' : '✓ Notification sent!');
      setTitle('');
      setMessage('');
      setLink('');
      setMediaUrl('');
      setMediaPreview(null);
      setIsScheduled(false);
      setScheduledAt('');
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(isRTL ? 'هل أنت متأكد من حذف هذا الإشعار؟' : 'Delete this notification?')) return;
    const { error } = await supabase.from('notifications').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isRTL ? 'تم الحذف' : 'Deleted');
      fetchDashboardData();
    }
  };

  const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);

  return (
    <motion.div
      key="notifications"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Send Form ── */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 sm:p-8">
        <h3 className="text-2xl font-black mb-6 text-slate-800 dark:text-white flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md">
            <Bell className="w-5 h-5 text-white" />
          </div>
          {isRTL ? 'إرسال إشعار جديد' : 'Send New Notification'}
        </h3>

        <form onSubmit={handleSendNotification} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {isRTL ? 'عنوان الإشعار *' : 'Notification Title *'}
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-800 dark:text-white font-medium"
              placeholder={isRTL ? 'عنوان واضح وجذاب...' : 'Clear and engaging title...'}
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {isRTL ? 'نص الإشعار *' : 'Message *'}
            </label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all text-slate-800 dark:text-white"
              placeholder={isRTL ? 'اكتب تفاصيل الإشعار هنا...' : 'Write notification details here...'}
            />
          </div>

          {/* Link (optional) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-blue-500" />
              {isRTL ? 'رابط مرفق (اختياري)' : 'Attached Link (Optional)'}
            </label>
            <input
              type="url"
              value={link}
              onChange={e => setLink(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="https://..."
              dir="ltr"
            />
          </div>

          {/* ── Media Upload ── */}
          <MediaUploader
            isRTL={isRTL}
            onUpload={handleMediaUpload}
            onClear={clearMedia}
            preview={mediaPreview}
            uploading={uploading}
          />

          {/* Schedule */}
          <div className="flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isScheduled}
                onChange={e => setIsScheduled(e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 bg-white border-slate-300"
              />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-500" />
                {isRTL ? 'جدولة الإشعار' : 'Schedule Notification'}
              </span>
            </label>
            <AnimatePresence>
              {isScheduled && (
                <motion.input
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  type="datetime-local"
                  required
                  value={scheduledAt}
                  onChange={e => setScheduledAt(e.target.value)}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              )}
            </AnimatePresence>
          </div>

          {/* Submit */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isLoading || uploading}
              className="py-3 px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 text-white rounded-2xl font-bold shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 active:scale-95"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {isRTL ? 'نشر الإشعار' : 'Publish Notification'}
            </button>
          </div>
        </form>
      </div>

      {/* ── History ── */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 sm:p-8">
        <h3 className="text-xl font-black mb-6 text-slate-800 dark:text-white flex items-center gap-3">
          <div className="w-9 h-9 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          {isRTL ? 'سجل الإشعارات' : 'Notifications History'}
          <span className="ms-auto text-sm font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-xl">
            {notifications.length}
          </span>
        </h3>

        <div className="space-y-4">
          <AnimatePresence>
            {notifications.map((notif: any, i: number) => (
              <motion.div
                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                key={notif.id}
                className="group relative p-5 border border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-900/60 hover:shadow-md transition-all"
              >
                <button
                  onClick={() => handleDelete(notif.id)}
                  className="absolute top-4 end-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex gap-4">
                  <div className="w-11 h-11 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-800 dark:text-white mb-1 truncate pe-8">{notif.title}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3 leading-relaxed line-clamp-2">{notif.message}</p>

                    {/* Media preview in history */}
                    {notif.media_url && (
                      <div className="mb-3 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 max-w-sm">
                        {isVideo(notif.media_url) ? (
                          <div className="bg-black aspect-video">
                            <video src={notif.media_url} controls className="w-full h-full object-contain" preload="metadata" />
                          </div>
                        ) : (
                          <img src={notif.media_url} alt="" className="w-full max-h-36 object-cover" />
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {notif.link && (
                        <a
                          href={notif.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg font-medium hover:bg-blue-100 transition-colors"
                        >
                          <LinkIcon className="w-3 h-3" />
                          {isRTL ? 'رابط' : 'Link'}
                        </a>
                      )}
                      {notif.media_url && (
                        <a
                          href={notif.media_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg font-medium hover:bg-purple-100 transition-colors"
                        >
                          {isVideo(notif.media_url)
                            ? <Film className="w-3 h-3" />
                            : <ImageIcon className="w-3 h-3" />}
                          {isVideo(notif.media_url)
                            ? (isRTL ? 'فيديو' : 'Video')
                            : (isRTL ? 'صورة' : 'Image')}
                        </a>
                      )}
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(notif.created_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                      </span>
                      {notif.scheduled_at && new Date(notif.scheduled_at) > new Date() && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-lg">
                          <Calendar className="w-3 h-3" />
                          {isRTL ? 'مجدول' : 'Scheduled'}: {new Date(notif.scheduled_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {notifications.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
              <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 font-semibold">
                {isRTL ? 'لا توجد إشعارات سابقة' : 'No notifications yet'}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
