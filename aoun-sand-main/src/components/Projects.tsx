import { Droplets, BookOpen, Play, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useState } from 'react';

export const Projects = () => {
  const { t, language } = useLanguage();
  const [lightboxVideo, setLightboxVideo] = useState<string | null>(null);

  const projects = [
    {
      icon: Droplets,
      title: 'سقيا الجمعية في غزة العزة',
      description: 'مشروع سقيا الجمعية في غزة لتوفير المياه.',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      video: 'https://www.youtube.com/embed/nDQYphxF6UU',
    },
    {
      icon: Droplets,
      title: 'السقاية رقم 11',
      description: 'مشروع السقاية رقم 11 لتوزيع المياه.',
      color: 'from-teal-500 to-green-500',
      bgColor: 'bg-teal-50 dark:bg-teal-900/20',
      video: 'https://www.youtube.com/embed/86LU416opIc',
    },
    {
      icon: Droplets,
      title: 'سقاية رقم 4',
      description: 'مشروع السقاية رقم 4 لتوفير المياه للمحتاجين.',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      video: 'https://www.youtube.com/embed/ZLop_RsrDBw',
    },
    {
      icon: BookOpen,
      title: 'شرح كتاب الأخضري',
      description: 'شرح مبسط لكتاب الأخضري.',
      color: 'from-orange-500 to-yellow-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      video: 'https://www.youtube.com/embed/fQgr-BUSW1c',
    },
  ];

  return (
    <section id="projects" className="py-20 bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="container-custom">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="section-title">
              {t.projects.title}
            </h2>
            <div className="w-24 h-1 bg-secondary-dark mx-auto rounded-full mt-4"></div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {projects.map((project, index) => {
              const Icon = project.icon;
              return (
                <div
                  key={index}
                  className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:-translate-y-2 animate-fadeIn border border-slate-100 dark:border-slate-700"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className={`h-2 bg-gradient-to-r ${project.color}`}></div>
                  <div className="p-8">
                    <div className={`inline-flex p-4 rounded-2xl ${project.bgColor} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-8 h-8 text-primary dark:text-secondary" />
                    </div>
                    <h3 className="text-2xl font-bold mb-4 text-slate-800 dark:text-white">
                      {project.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                      {project.description}
                    </p>

                    {/* Video Thumbnail */}
                    <div
                      className="cursor-pointer relative aspect-video overflow-hidden rounded-xl shadow-md group-hover:shadow-lg transition-all"
                      onClick={() => setLightboxVideo(project.video)}
                    >
                      <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/20 transition-colors z-10"></div>
                      <iframe
                        className="absolute top-0 left-0 w-full h-full pointer-events-none"
                        src={`${project.video}?controls=0&showinfo=0&rel=0`}
                        title={project.title}
                        frameBorder="0"
                        tabIndex={-1}
                      ></iframe>
                      <div className="absolute inset-0 flex items-center justify-center z-20">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-110 transition-all duration-300">
                          <Play className="w-5 h-5 text-primary fill-current ml-1" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxVideo && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 animate-fadeIn backdrop-blur-sm"
          onClick={() => setLightboxVideo(null)}
        >
          <div className="relative w-full max-w-4xl animate-scaleIn">
            <div className="aspect-video w-full bg-black rounded-2xl overflow-hidden shadow-2xl">
              <iframe
                className="w-full h-full"
                src={`${lightboxVideo}?autoplay=1`}
                title="Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
            <button
              onClick={() => setLightboxVideo(null)}
              className="absolute -top-12 right-0 text-white hover:text-secondary transition-colors p-2"
            >
              <X className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
