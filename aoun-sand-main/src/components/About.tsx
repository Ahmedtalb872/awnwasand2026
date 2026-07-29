import { Target, Users } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useEffect, useState, useRef } from 'react';

export const About = () => {
  const { t, language } = useLanguage();
  const [sectionVisible, setSectionVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.8) {
        setSectionVisible(true);
      }
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section
      id="about"
      className="py-20 bg-white dark:bg-slate-900 transition-colors duration-300"
      ref={sectionRef}
    >
      <div className="container-custom">
        <div className="max-w-6xl mx-auto">

          {/* Title */}
          <div className={`text-center mb-16 transition-all duration-700 ${sectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <h2 className="section-title">
              {t.about.title || "عن جمعية عون وسند"}
            </h2>
            <div className="w-24 h-1 bg-teal-500 mx-auto rounded-full mt-4"></div>
          </div>

          {/* Description & Video */}
          <div className={`grid lg:grid-cols-2 gap-12 items-center transition-all duration-700 ${sectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <div className="space-y-6">
              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                جمعية <strong>عون وسند</strong> هي منظمة خيرية تهدف لدعم المجتمعات المحتاجة، وتعزيز روح التعاون والمبادرة الإنسانية. نحن نؤمن بأن التغيير يبدأ بالمشاركة والعطاء، ونعمل على تقديم مساعدات متنوعة تشمل الغذاء، التعليم، والصحة، لنصنع فرقاً حقيقياً في حياة الناس.
              </p>
              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                على مر السنوات، نفذنا مشاريع هادفة بالتعاون مع المتطوعين المحليين، مما جعلنا نقطة مرجعية لكل من يبحث عن المشاركة الفعالة في العمل الخيري داخل موريتانيا.
              </p>

              <div className="relative rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] border-4 border-slate-100 dark:border-slate-800">
                <iframe
                  className="w-full h-64 md:h-80"
                  src="https://www.youtube.com/embed/Q0jCQP8YveY"
                  title="About Video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            </div>

            {/* Goals */}
            <div>
              <h3 className="text-2xl font-bold mb-8 text-teal-600 dark:text-teal-400 flex items-center gap-3">
                <Target className="w-8 h-8" />
                أهداف الجمعية
              </h3>
              <div className="space-y-4">
                {t.about.goals.map((goal, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all duration-300 transform hover:translate-x-2 border border-slate-100 dark:border-slate-700"
                  >
                    <div className="flex-shrink-0 w-8 h-8 bg-teal-500 text-white rounded-full flex items-center justify-center font-bold shadow-md">
                      {index + 1}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 pt-1">
                      {goal}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Team Section */}
          <div className={`bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-slate-800 dark:to-slate-800/50 rounded-3xl p-8 md:p-12 shadow-lg mt-20 border border-teal-100 dark:border-slate-700 transition-all duration-700 ${sectionVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-shrink-0 bg-white dark:bg-slate-700 p-4 rounded-full shadow-lg">
                <Users className="w-12 h-12 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">
                  فريق الجمعية
                </h3>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  يتكون فريق <strong>جمعية عون وسند</strong> من مجموعة من المتطوعين المخلصين الذين يعملون بشغف لخدمة المجتمع. نحن نركز على الكفاءة، التعاون، والابتكار لضمان وصول المساعدات لمن يحتاجها بشكل فعال ومستدام.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
