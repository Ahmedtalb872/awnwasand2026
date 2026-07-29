import { Heart, Users, Video, Calendar, Wallet, Info, ArrowRight, BookOpen, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useState } from 'react';

import { HistorySection } from './HistorySection';

export const Hero = () => {
  const { t, language } = useLanguage();
  const [showVideo, setShowVideo] = useState(false);

  return (
    <section
      id="home"
      className="relative pt-32 pb-20 bg-slate-50 dark:bg-slate-900 transition-colors duration-300 overflow-hidden"
    >
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-teal-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float animation-delay-500"></div>
      </div>

      <div className="container-custom relative z-10">
        <div className="max-w-5xl mx-auto text-center">
          {/* Title & Subtitle */}
          <div className="mb-12 animate-fadeIn">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 dark:from-teal-400 dark:via-cyan-400 dark:to-blue-400 bg-clip-text text-transparent leading-tight">
              {t.hero.title}
            </h1>

            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed max-w-3xl mx-auto">
              {t.hero.subtitle}
            </p>

            {/* License & Date */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-10 bg-white/50 dark:bg-slate-800/50 inline-flex px-6 py-2 rounded-full backdrop-blur-sm border border-slate-200 dark:border-slate-700">
              <span className="font-semibold">{t.hero.license}</span>
              <span className="hidden sm:inline">•</span>
              <span>{t.hero.date}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16 animate-slideUp animation-delay-200">
            <Link to="/donate" className="btn-primary group">
              <Heart className="w-5 h-5 group-hover:animate-pulse" />
              <span>{language === 'ar' ? 'تبرع الآن' : 'Donate Now'}</span>
            </Link>

            <Link to="/about" className="btn-outline group">
              <Info className="w-5 h-5" />
              <span>{language === 'ar' ? 'تعرف علينا' : 'About Us'}</span>
            </Link>
          </div>

          {/* Video Section */}
          <div className="max-w-3xl mx-auto relative mb-20 animate-slideUp animation-delay-300">
            {!showVideo ? (
              <div
                className="relative rounded-2xl overflow-hidden shadow-2xl cursor-pointer group aspect-video border-4 border-white dark:border-slate-800"
                onClick={() => setShowVideo(true)}
              >
                <img
                  src="https://img.youtube.com/vi/Q0jCQP8YveY/maxresdefault.jpg"
                  alt="Intro Video"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="w-20 h-20 bg-white/90 text-teal-600 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-300">
                    <Video className="w-8 h-8 fill-current ml-1" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video border-4 border-white dark:border-slate-800">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/Q0jCQP8YveY?autoplay=1&rel=0"
                  title="Intro Video"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
                <button
                  onClick={() => setShowVideo(false)}
                  className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                >
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* History Record Section */}
          <div className="mb-20">
            <HistorySection />
          </div>



          {/* Quick Links Section */}
          <section className="animate-slideUp animation-delay-500">
            <h2 className="text-2xl font-bold mb-6 text-slate-800 dark:text-white flex items-center justify-center gap-2">
              <BookOpen className="w-6 h-6 text-teal-500" />
              {language === 'ar' ? 'روابط سريعة' : 'Quick Links'}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { path: '/about', label: language === 'ar' ? 'من نحن' : 'About Us', icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { path: '/donation-expenses', label: language === 'ar' ? 'مصاريف التبرعات' : 'Donation Expenses', icon: Receipt, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
                { path: '/contact', label: language === 'ar' ? 'اتصل بنا' : 'Contact Us', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' }
              ].map((link, i) => (
                <Link
                  key={i}
                  to={link.path}
                  className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-md hover:-translate-y-1 transition-all group"
                >
                  <div className={`w-14 h-14 rounded-full ${link.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <link.icon className={`w-7 h-7 ${link.color}`} />
                  </div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
};
