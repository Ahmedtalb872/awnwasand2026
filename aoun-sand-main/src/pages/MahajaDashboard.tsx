import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { BookOpen, Video, Download, Search, LogOut, Play } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface MahajaCourse {
  id: string;
  title: string;
  description: string;
  instructor: string;
  image_url: string;
  created_at: string;
  mahaja_lessons?: { id: string }[];
  progress_percentage?: number;
}

interface MahajaBook {
  id: string;
  title: string;
  description: string;
  download_link: string;
  cover_image_url: string;
  created_at: string;
}

const getYoutubeVideoId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export const MahajaDashboard = () => {
  const { language } = useLanguage();
  const { logout } = useAuth();
  const isRTL = language === 'ar';

  const [courses, setCourses] = useState<MahajaCourse[]>([]);
  const [books, setBooks] = useState<MahajaBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'courses' | 'books'>('courses');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [coursesRes, booksRes, progressRes] = await Promise.all([
          supabase.from('mahaja_courses').select('*, mahaja_lessons(id)').eq('is_published', true).order('created_at', { ascending: false }),
          supabase.from('mahaja_books').select('*').eq('is_published', true).order('created_at', { ascending: false }),
          supabase.from('mahaja_user_progress').select('course_id, progress_percentage')
        ]);
        
        if (coursesRes.data) {
          const coursesWithProgress = coursesRes.data.map((course: any) => {
            const progress = progressRes.data?.find(p => p.course_id === course.id);
            return {
              ...course,
              progress_percentage: progress ? progress.progress_percentage : 0
            };
          });
          setCourses(coursesWithProgress);
        }
        
        if (booksRes.data) setBooks(booksRes.data);
      } catch (err) {
        console.error('Error fetching mahaja content:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredCourses = courses.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  const filteredBooks = books.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.description && b.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'linear-gradient(135deg, #1a1838 0%, #221e50 50%, #1c1a44 100%)' }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Hero Header ───────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[10%] w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #c9a4b8 0%, transparent 70%)' }} />
          <div className="absolute bottom-0 right-[5%] w-80 h-80 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #6b5b95 0%, transparent 70%)' }} />
          {/* Subtle Arabic pattern overlay */}
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0 L60 30 L30 60 L0 30 Z' fill='none' stroke='%23c9b99a' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }} />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 text-center">
          {/* Logout Button */}
          <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'}`}>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{ background: 'rgba(201,164,184,0.12)', color: '#c9a4b8', border: '1px solid rgba(201,164,184,0.25)' }}
            >
              <LogOut className="w-4 h-4" />
              {isRTL ? 'تسجيل الخروج' : 'Logout'}
            </button>
          </div>

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="mb-6 flex justify-center"
          >
            <div className="relative">
              <div className="absolute inset-0 blur-3xl opacity-30" style={{ background: '#c9a4b8', transform: 'scale(1.05)' }} />
              <img
                src="/mahaja-logo.png"
                alt="شعار المحجة البيضاء"
                className="relative drop-shadow-2xl"
                style={{ width: '130px', height: '130px', objectFit: 'cover', borderRadius: '50%', border: '3px solid rgba(201,164,184,0.3)' }}
              />
            </div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black mb-3 tracking-tight"
            style={{ color: '#f0e8d8', fontFamily: '"Cairo", "Noto Sans Arabic", sans-serif', textShadow: '0 2px 20px rgba(201,185,154,0.3)' }}
          >
            المحجة البيضاء
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-base sm:text-lg max-w-xl mx-auto"
            style={{ color: 'rgba(201,185,154,0.75)', fontFamily: '"Cairo", "Noto Sans Arabic", sans-serif' }}
          >
            {isRTL ? 'منصة العلوم الشرعية — دروس وكتب منتقاة' : 'Islamic Sciences Platform — Curated Lessons & Books'}
          </motion.p>

          {/* Stats Pills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center gap-4 mt-6 flex-wrap"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
              style={{ background: 'rgba(201,185,154,0.1)', color: '#c9b99a', border: '1px solid rgba(201,185,154,0.2)' }}>
              <Video className="w-4 h-4" />
              <span>{courses.length} {isRTL ? 'درس' : 'Lessons'}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
              style={{ background: 'rgba(201,185,154,0.1)', color: '#c9b99a', border: '1px solid rgba(201,185,154,0.2)' }}>
              <BookOpen className="w-4 h-4" />
              <span>{books.length} {isRTL ? 'كتاب' : 'Books'}</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Navigation Tabs + Search ─────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4 relative z-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-3xl p-3 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(201,164,184,0.2)' }}
        >
          {/* Tabs */}
          <div className="flex gap-2 p-1 rounded-2xl flex-1 sm:flex-none" style={{ background: 'rgba(0,0,0,0.35)' }}>
            <button
              onClick={() => { setActiveTab('courses'); setSearchQuery(''); setExpandedVideo(null); }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300"
              style={activeTab === 'courses'
                ? { background: 'linear-gradient(135deg, #c9a4b8, #9b7ea8)', color: '#fff', boxShadow: '0 4px 20px rgba(201,164,184,0.5)' }
                : { color: 'rgba(201,164,184,0.6)' }
              }
            >
              <Video className="w-4 h-4" />
              {isRTL ? 'الدروس' : 'Lessons'}
            </button>
            <button
              onClick={() => { setActiveTab('books'); setSearchQuery(''); setExpandedVideo(null); }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-300"
              style={activeTab === 'books'
                ? { background: 'linear-gradient(135deg, #c9a4b8, #9b7ea8)', color: '#fff', boxShadow: '0 4px 20px rgba(201,164,184,0.5)' }
                : { color: 'rgba(201,164,184,0.6)' }
              }
            >
              <BookOpen className="w-4 h-4" />
              {isRTL ? 'الكتب' : 'Books'}
            </button>
          </div>

          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              placeholder={isRTL ? 'ابحث هنا...' : 'Search here...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-3 rounded-xl text-sm outline-none"
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(201,164,184,0.2)',
                color: '#f0e8d8',
                paddingLeft: isRTL ? '1rem' : '2.75rem',
                paddingRight: isRTL ? '2.75rem' : '1rem',
                fontFamily: '"Cairo", "Noto Sans Arabic", sans-serif'
              }}
            />
            <Search
              className="w-4 h-4 absolute top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'rgba(201,164,184,0.5)', right: isRTL ? '0.875rem' : 'auto', left: isRTL ? 'auto' : '0.875rem' }}
            />
          </div>
        </motion.div>
      </div>

      {/* ── Content ──────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse rounded-3xl h-64"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,164,184,0.12)' }} />
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ── COURSES TAB ── */}
            {activeTab === 'courses' && (
              <motion.div
                key="courses"
                initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
                transition={{ duration: 0.35 }}
              >
                {filteredCourses.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredCourses.map((course, idx) => {
                      const lessonCount = course.mahaja_lessons?.length || 0;
                      return (
                        <motion.div
                          key={course.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.06 }}
                          className="group rounded-3xl overflow-hidden flex flex-col transition-all duration-300"
                          style={{
                            background: 'linear-gradient(145deg, rgba(107,91,149,0.12) 0%, rgba(40,36,90,0.08) 100%)',
                            border: '1px solid rgba(201,164,184,0.2)',
                            backdropFilter: 'blur(12px)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.35)'
                          }}
                        >
                          <div className="relative overflow-hidden aspect-[4/3] w-full">
                            {course.image_url ? (
                              <img src={course.image_url} alt={course.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-black/40">
                                <Video className="w-12 h-12 text-white/20" />
                              </div>
                            )}
                            
                            <div className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 bg-black/50 backdrop-blur-md text-[#c9a4b8] border border-[#c9a4b8]/30">
                              <Video className="w-3 h-3" />
                              {lessonCount} {isRTL ? 'درس' : 'Lessons'}
                            </div>

                            {/* Progress overlay */}
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/50">
                              <div 
                                className="h-full bg-gradient-to-r from-[#9b7ea8] to-[#c9a4b8]" 
                                style={{ width: `${course.progress_percentage || 0}%` }}
                              />
                            </div>
                          </div>

                          <div className="p-5 flex flex-col flex-1">
                            <h3 className="font-black text-lg mb-1 line-clamp-2 leading-snug" style={{ color: '#f0e8d8', fontFamily: '"Cairo", sans-serif' }}>
                              {course.title}
                            </h3>
                            <p className="text-sm font-bold text-[#c9a4b8] mb-2">{course.instructor}</p>
                            
                            <div className="flex justify-between items-center text-xs mb-4 text-[#c9a4b8]/60">
                              <span>{isRTL ? 'نسبة الإنجاز:' : 'Progress:'}</span>
                              <span className="font-bold text-[#c9a4b8]">{Math.round(course.progress_percentage || 0)}%</span>
                            </div>

                            <a
                              href={`/mahaja/course/${course.id}`}
                              className="w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-300"
                              style={{
                                background: 'linear-gradient(135deg, rgba(201,164,184,0.18), rgba(155,126,168,0.12))',
                                color: '#c9a4b8',
                                border: '1px solid rgba(201,164,184,0.3)',
                                fontFamily: '"Cairo", sans-serif'
                              }}
                            >
                              <Play className="w-4 h-4" />
                              {isRTL ? 'دخول الدورة' : 'Enter Course'}
                            </a>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState icon={<Video className="w-14 h-14" />} message={isRTL ? 'لا توجد دروس متاحة حالياً' : 'No lessons available yet'} />
                )}
              </motion.div>
            )}

            {/* ── BOOKS TAB ── */}
            {activeTab === 'books' && (
              <motion.div
                key="books"
                initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
                transition={{ duration: 0.35 }}
              >
                {filteredBooks.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {filteredBooks.map((book, idx) => (
                      <motion.div
                        key={book.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        className="group rounded-3xl overflow-hidden flex flex-col"
                        style={{
                          background: 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
                          border: '1px solid rgba(201,185,154,0.18)',
                          backdropFilter: 'blur(12px)',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
                        }}
                      >
                        {/* Cover */}
                        <div className="aspect-[3/4] w-full relative overflow-hidden">
                          {book.cover_image_url ? (
                            <img
                              src={book.cover_image_url}
                              alt={book.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-3"
                              style={{ background: 'linear-gradient(135deg, rgba(201,185,154,0.1), rgba(160,128,96,0.05))' }}>
                              <BookOpen className="w-12 h-12" style={{ color: 'rgba(201,185,154,0.4)' }} />
                              <span className="text-xs font-bold text-center px-4 leading-snug" style={{ color: 'rgba(201,185,154,0.5)', fontFamily: '"Cairo", sans-serif' }}>
                                {isRTL ? 'لا توجد صورة للغلاف' : 'No cover image'}
                              </span>
                            </div>
                          )}
                          {/* Badge */}
                          <div
                            className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)', color: '#c9a4b8', border: '1px solid rgba(201,164,184,0.35)' }}
                          >
                            <BookOpen className="w-3 h-3" />
                            {isRTL ? 'كتاب' : 'Book'}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="font-black text-sm mb-1.5 line-clamp-2 leading-snug flex-1" style={{ color: '#f0e8d8', fontFamily: '"Cairo", sans-serif' }}>
                            {book.title}
                          </h3>
                          {book.description && (
                            <p className="text-xs line-clamp-2 mb-3" style={{ color: 'rgba(201,185,154,0.55)', fontFamily: '"Cairo", sans-serif' }}>
                              {book.description}
                            </p>
                          )}
                          <a
                            href={book.download_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-300"
                            style={{
                              background: 'linear-gradient(135deg, rgba(201,164,184,0.18), rgba(155,126,168,0.12))',
                              color: '#c9a4b8',
                              border: '1px solid rgba(201,164,184,0.3)',
                              fontFamily: '"Cairo", sans-serif'
                            }}
                          >
                            <Download className="w-3.5 h-3.5" />
                            {isRTL ? 'تحميل' : 'Download'}
                          </a>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={<BookOpen className="w-14 h-14" />} message={isRTL ? 'لا توجد كتب متاحة حالياً' : 'No books available yet'} />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* Footer strip */}
      <div className="mt-16 text-center pb-8">
        <p className="text-xs" style={{ color: 'rgba(201,185,154,0.35)', fontFamily: '"Cairo", sans-serif' }}>
          منصة المحجة البيضاء — العلوم الشرعية
        </p>
      </div>
    </div>
  );
};

// ── Empty State Component ────────────────────────────────
const EmptyState: React.FC<{ icon: React.ReactNode; message: string }> = ({ icon, message }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="py-24 flex flex-col items-center justify-center gap-4 rounded-3xl"
    style={{ border: '2px dashed rgba(201,185,154,0.15)' }}
  >
    <div style={{ color: 'rgba(201,185,154,0.25)' }}>{icon}</div>
    <p className="font-bold text-lg" style={{ color: 'rgba(201,185,154,0.4)', fontFamily: '"Cairo", sans-serif' }}>{message}</p>
  </motion.div>
);
