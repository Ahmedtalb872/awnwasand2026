import { MapPin, Phone, Mail, Facebook, Youtube } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const Contact = () => {
  const { t, language } = useLanguage();

  const contactInfo = [
    { icon: MapPin, text: t.contact.address },
    { icon: Phone, text: t.contact.phone },
    { icon: Mail, text: t.contact.email },
  ];

  const socialLinks = [
    {
      name: 'Facebook',
      icon: Facebook,
      url: 'https://www.facebook.com/share/1AxfWAYLhF/',
      color: 'from-blue-600 to-blue-700',
    },
    {
      name: 'YouTube',
      icon: Youtube,
      url: 'https://youtube.com/@associationaidesoutien?si=elgJjASNN8qbD80E',
      color: 'from-red-600 to-red-700',
    },
    {
      name: 'TikTok',
      icon: () => (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
        </svg>
      ),
      url: 'https://www.tiktok.com/@association645?_t=ZM-8yMLLxhDYBh&_r=1',
      color: 'from-gray-800 to-black',
    },
    {
      name: 'Snapchat',
      icon: () => (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.389.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.149-.052-.227.015-.195.181-.465.437-.509 3.304-.54 4.79-3.879 4.836-3.984l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.347-.81-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.287.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/>
        </svg>
      ),
      url: 'https://www.snapchat.com/add/jmywnwsnd?share_id=e5wqH4uz-YU&locale=ar-MR',
      color: 'from-yellow-400 to-yellow-500',
    },
  ];

  return (
    <section id="contact" className="py-20 bg-gray-50 dark:bg-slate-800 transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className={`section-title ${language === 'ar' ? 'font-arabic' : ''}`}>
            {t.contact.title}
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {contactInfo.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={index}
                  className="flex items-center gap-4 p-6 bg-white dark:bg-slate-900 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 animate-fadeIn"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <p className={`text-gray-700 dark:text-gray-300 font-medium ${language === 'ar' ? 'font-arabic text-right flex-1' : ''}`}>
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="text-center mb-8 animate-fadeIn">
            <h3 className={`text-3xl font-bold text-gray-800 dark:text-white mb-8 ${language === 'ar' ? 'font-arabic' : ''}`}>
              {t.contact.follow}
            </h3>
          </div>

          <div className="flex flex-wrap justify-center gap-4 animate-slideUp">
            {socialLinks.map((social, index) => {
              const Icon = social.icon;
              return (
                <a
                  key={index}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group flex items-center gap-3 px-6 py-4 bg-gradient-to-r ${social.color} text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <Icon className="w-6 h-6" />
                  <span className="font-bold">{social.name}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
