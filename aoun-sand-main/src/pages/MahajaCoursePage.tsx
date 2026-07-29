import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, ArrowLeft, Play, CheckCircle, Circle, FileText, Headphones } from 'lucide-react';
import toast from 'react-hot-toast';

interface Course {
  id: string;
  title: string;
  instructor: string;
  description: string;
  image_url: string;
}

interface Lesson {
  id: string;
  title: string;
  content_type: 'video' | 'audio' | 'pdf';
  content_url: string;
  lesson_number: number;
}

export const MahajaCoursePage = () => {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Progress state
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !user) return;
    
    const fetchCourseData = async () => {
      try {
        // Fetch course
        const { data: courseData, error: courseError } = await supabase
          .from('mahaja_courses')
          .select('*')
          .eq('id', id)
          .single();
          
        if (courseError) throw courseError;
        setCourse(courseData);

        // Fetch lessons
        const { data: lessonsData, error: lessonsError } = await supabase
          .from('mahaja_lessons')
          .select('*')
          .eq('course_id', id)
          .eq('is_published', true)
          .order('lesson_number', { ascending: true });
          
        if (lessonsError) throw lessonsError;
        setLessons(lessonsData || []);

        // Fetch user progress
        const { data: progressData } = await supabase
          .from('mahaja_user_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', id)
          .single();

        if (progressData) {
          setCompletedLessons(progressData.completed_lessons || []);
          if (progressData.last_lesson_id) {
            setCurrentLessonId(progressData.last_lesson_id);
          } else if (lessonsData && lessonsData.length > 0) {
            setCurrentLessonId(lessonsData[0].id);
          }
        } else if (lessonsData && lessonsData.length > 0) {
          setCurrentLessonId(lessonsData[0].id);
        }

      } catch (err) {
        console.error('Error fetching course details:', err);
        toast.error(isRTL ? 'خطأ في جلب بيانات الدورة' : 'Error fetching course data');
      } finally {
        setLoading(false);
      }
    };

    fetchCourseData();
  }, [id, user]);

  const updateProgress = async (newCompleted: string[], newCurrentId: string) => {
    if (!id || !user) return;
    
    const percentage = lessons.length > 0 ? (newCompleted.length / lessons.length) * 100 : 0;
    
    try {
      await supabase.rpc('update_user_mahaja_progress', {
        p_user_id: user.id,
        p_course_id: id,
        p_lesson_id: newCurrentId,
        p_completed_lessons: newCompleted,
        p_percentage: percentage
      });
    } catch (err) {
      console.error('Failed to update progress', err);
    }
  };

  const handleLessonSelect = (lessonId: string) => {
    setCurrentLessonId(lessonId);
    updateProgress(completedLessons, lessonId);
  };

  const toggleLessonCompletion = (lessonId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let newCompleted;
    if (completedLessons.includes(lessonId)) {
      newCompleted = completedLessons.filter(id => id !== lessonId);
    } else {
      newCompleted = [...completedLessons, lessonId];
    }
    setCompletedLessons(newCompleted);
    updateProgress(newCompleted, currentLessonId || lessonId);
  };

  const currentLesson = lessons.find(l => l.id === currentLessonId) || lessons[0];

  const getYoutubeVideoId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin w-12 h-12 border-4 border-[#c9a4b8] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!course) {
    return <div className="p-8 text-center text-white">Course not found.</div>;
  }

  const progressPercentage = lessons.length > 0 ? Math.round((completedLessons.length / lessons.length) * 100) : 0;

  return (
    <div className="min-h-screen pb-24" style={{ background: '#1c1a44' }} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate('/mahaja')}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors"
          >
            {isRTL ? <ArrowRight className="w-6 h-6" /> : <ArrowLeft className="w-6 h-6" />}
          </button>
          <div>
            <h1 className="text-2xl font-black text-white" style={{ fontFamily: '"Cairo", sans-serif' }}>
              {course.title}
            </h1>
            <p className="text-[#c9a4b8] text-sm">{course.instructor}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* Main Content Area (Video/PDF) */}
          <div className="flex-1">
            {currentLesson ? (
              <div className="bg-black/40 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
                {currentLesson.content_type === 'video' ? (
                  getYoutubeVideoId(currentLesson.content_url) ? (
                    <div className="aspect-video w-full">
                      <iframe
                        src={`https://www.youtube.com/embed/${getYoutubeVideoId(currentLesson.content_url)}?rel=0`}
                        title={currentLesson.title}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="aspect-video w-full bg-black">
                      <video 
                        src={currentLesson.content_url} 
                        controls 
                        className="w-full h-full"
                        onEnded={(e) => {
                          if (!completedLessons.includes(currentLesson.id)) {
                            toggleLessonCompletion(currentLesson.id, e as any);
                          }
                        }}
                      />
                    </div>
                  )
                ) : currentLesson.content_type === 'pdf' ? (
                  <div className="aspect-[4/3] w-full bg-slate-800 flex flex-col items-center justify-center gap-4">
                    <FileText className="w-16 h-16 text-[#c9a4b8]" />
                    <a href={currentLesson.content_url} target="_blank" rel="noopener noreferrer" className="px-6 py-3 bg-[#c9a4b8] text-[#1c1a44] font-bold rounded-xl">
                      {isRTL ? 'فتح ملف PDF' : 'Open PDF File'}
                    </a>
                  </div>
                ) : (
                  <div className="aspect-[4/3] w-full bg-slate-800 flex flex-col items-center justify-center p-8">
                    <Headphones className="w-16 h-16 text-[#c9a4b8] mb-6" />
                    <audio src={currentLesson.content_url} controls className="w-full max-w-md" />
                  </div>
                )}
                
                <div className="p-6">
                  <h2 className="text-xl font-bold text-white mb-2">{currentLesson.title}</h2>
                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <span className="bg-white/10 px-3 py-1 rounded-full">
                      {isRTL ? 'الدرس' : 'Lesson'} {currentLesson.lesson_number}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-black/20 rounded-3xl border border-white/10 aspect-video flex items-center justify-center text-[#c9a4b8]">
                {isRTL ? 'لا توجد دروس متاحة' : 'No lessons available'}
              </div>
            )}
          </div>

          {/* Sidebar / Playlist */}
          <div className="w-full lg:w-96 flex-shrink-0">
            <div className="bg-white/5 rounded-3xl border border-white/10 p-5 sticky top-24">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-2">{isRTL ? 'محتوى الدورة' : 'Course Content'}</h3>
                
                {/* Progress Bar */}
                <div className="flex items-center justify-between text-sm text-[#c9a4b8] mb-2">
                  <span>{completedLessons.length} / {lessons.length} {isRTL ? 'مكتمل' : 'Completed'}</span>
                  <span className="font-bold">{progressPercentage}%</span>
                </div>
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    className="h-full bg-gradient-to-r from-[#9b7ea8] to-[#c9a4b8]"
                  />
                </div>
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {lessons.map(lesson => {
                  const isCurrent = lesson.id === currentLessonId;
                  const isCompleted = completedLessons.includes(lesson.id);
                  
                  return (
                    <div 
                      key={lesson.id}
                      onClick={() => handleLessonSelect(lesson.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        isCurrent ? 'bg-white/10 border border-[#c9a4b8]/30' : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <button 
                        onClick={(e) => toggleLessonCompletion(lesson.id, e)}
                        className={`flex-shrink-0 transition-colors ${isCompleted ? 'text-green-400' : 'text-slate-500 hover:text-white'}`}
                      >
                        {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                      </button>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm truncate ${isCurrent ? 'text-white' : 'text-slate-300'}`}>
                          {lesson.lesson_number}. {lesson.title}
                        </p>
                        <span className="text-xs text-slate-500 uppercase">{lesson.content_type}</span>
                      </div>
                      
                      {isCurrent && <Play className="w-4 h-4 text-[#c9a4b8]" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};
