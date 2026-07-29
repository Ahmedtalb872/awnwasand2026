import { Heart, TrendingUp, Handshake, MessageCircle } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Volunteer = () => {
  const { t, language } = useLanguage();

  const options = [
    { icon: Heart, text: t.volunteer.options[0] },
    { icon: TrendingUp, text: t.volunteer.options[1] },
    { icon: Handshake, text: t.volunteer.options[2] },
  ];

  return (
    <section id="volunteer" className="py-20 bg-white dark:bg-slate-900 transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className={`section-title ${language === 'ar' ? 'font-arabic' : ''}`}>
            {t.volunteer.title}
          </h2>

          <p className={`text-xl text-center text-gray-600 dark:text-gray-300 mb-12 ${language === 'ar' ? 'font-arabic' : ''}`}>
            {t.volunteer.subtitle}
          </p>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="space-y-6 animate-slideLeft">
              {options.map((option, index) => {
                const Icon = option.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-6 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-slate-800 dark:to-slate-700 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <p className={`text-lg font-semibold text-gray-800 dark:text-white ${language === 'ar' ? 'font-arabic text-right flex-1' : ''}`}>
                      {option.text}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center animate-slideRight">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105">
                <img
                  src="/YAHYA.jpg"
                  alt="Volunteer activities"
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
              </div>
            </div>
          </div>

          <div className="text-center animate-fadeIn">
            <a
              href="https://wa.me/32203250"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <MessageCircle className="w-6 h-6" />
              {t.volunteer.contact}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};
