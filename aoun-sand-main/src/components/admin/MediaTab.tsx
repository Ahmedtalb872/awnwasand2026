import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../../contexts/LanguageContext';
import { Upload, Trash2, Image as ImageIcon, FileAudio, ExternalLink, Copy } from 'lucide-react';

export const MediaTab = ({ mediaFiles, fetchMedia }: { mediaFiles: any[], fetchMedia: () => void }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [isLoading, setIsLoading] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaFile) return;

    // Optional: Validate size (e.g. max 5MB)
    if (mediaFile.size > 5 * 1024 * 1024) {
      toast.error(isRTL ? 'حجم الملف يجب أن لا يتجاوز 5 ميجابايت' : 'File size must not exceed 5MB');
      return;
    }

    const fileExt = mediaFile.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    setIsLoading(true);
    const { error } = await supabase.storage
      .from('media')
      .upload(filePath, mediaFile);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isRTL ? 'تم رفع الملف بنجاح' : 'File uploaded successfully');
      setMediaFile(null);
      fetchMedia();
    }
    setIsLoading(false);
  };

  const handleDeleteMedia = async (fileName: string) => {
    if (!window.confirm(isRTL ? 'تأكيد الحذف؟' : 'Confirm delete?')) return;
    const { error } = await supabase.storage.from('media').remove([`uploads/${fileName}`]);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(isRTL ? 'تم حذف الملف' : 'File deleted');
      fetchMedia();
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success(isRTL ? 'تم نسخ الرابط' : 'Link copied to clipboard');
  };

  return (
    <motion.div key="media" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
      
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8">
        <h3 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white flex items-center gap-2">
          <Upload className="w-6 h-6 text-pink-500" />
          {isRTL ? 'رفع الوسائط (صور / صوتيات)' : 'Upload Media (Images / Audio)'}
        </h3>
        
        <form onSubmit={handleFileUpload} className="max-w-2xl">
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-pink-500 dark:hover:border-pink-500 rounded-2xl p-10 text-center bg-slate-50 dark:bg-slate-900/50 mb-6 transition-colors group">
            <input 
              type="file" 
              id="file-upload" 
              className="hidden"
              accept="image/*,audio/*,video/*"
              onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
              <div className="w-20 h-20 bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-sm">
                <Upload className="w-10 h-10" />
              </div>
              <span className="text-slate-800 dark:text-white font-bold text-xl mb-2">
                {mediaFile ? mediaFile.name : (isRTL ? 'اضغط لاختيار ملف أو قم بالسحب والإفلات' : 'Click to select a file or drag and drop')}
              </span>
              <span className="text-slate-500 text-sm">
                {isRTL ? 'يدعم الصور، الفيديو، والملفات الصوتية (الحد الأقصى 5MB)' : 'Supports images, video, and audio files (Max 5MB)'}
              </span>
            </label>
          </div>
          
          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={!mediaFile || isLoading}
              className="py-3 px-8 bg-pink-600 hover:bg-pink-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-pink-500/30 transition-all flex items-center gap-2"
            >
              {isLoading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {isLoading ? (isRTL ? 'جاري الرفع...' : 'Uploading...') : (isRTL ? 'رفع الملف' : 'Upload File')}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 md:p-8">
        <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-pink-500" />
          {isRTL ? 'الوسائط المرفوعة' : 'Uploaded Media'}
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {mediaFiles.map((file: any, i) => {
              const fileUrl = supabase.storage.from('media').getPublicUrl(`uploads/${file.name}`).data.publicUrl;
              const isImage = file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i);
              const isVideo = file.name.match(/\.(mp4|webm|ogg)$/i);
              
              return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: i * 0.05 }}
                  key={file.id || file.name} 
                  className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow group"
                >
                  <div className="aspect-square bg-slate-100 dark:bg-slate-800 relative flex items-center justify-center">
                    {isImage ? (
                      <img 
                        src={fileUrl} 
                        alt={file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : isVideo ? (
                      <video src={fileUrl} className="w-full h-full object-cover" muted />
                    ) : (
                      <FileAudio className="w-12 h-12 text-slate-400" />
                    )}
                    
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                      <button 
                        onClick={() => copyToClipboard(fileUrl)}
                        className="w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
                        title={isRTL ? 'نسخ الرابط' : 'Copy Link'}
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                      <a 
                        href={fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-10 h-10 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
                        title={isRTL ? 'فتح في نافذة جديدة' : 'Open in new tab'}
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                      <button 
                        onClick={() => handleDeleteMedia(file.name)}
                        className="w-10 h-10 bg-red-500/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-colors backdrop-blur-md"
                        title={isRTL ? 'حذف' : 'Delete'}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(file.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {mediaFiles.length === 0 && (
            <div className="col-span-full text-center py-12">
              <ImageIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">{isRTL ? 'لا توجد وسائط مرفوعة' : 'No media uploaded'}</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
