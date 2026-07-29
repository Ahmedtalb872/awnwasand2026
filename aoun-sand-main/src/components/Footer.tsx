import { Heart, Mail, Phone, MapPin, Facebook, Youtube } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { Link } from 'react-router-dom';

export const Footer = () => {
  const { t, language } = useLanguage();

  const socialLinks = [
    {
      name: 'Facebook',
      icon: Facebook,
      url: 'https://www.facebook.com/share/1AxfWAYLhF/',
      color: 'hover:text-blue-500',
    },
    {
      name: 'YouTube',
      icon: Youtube,
      url: 'https://youtube.com/@associationaidesoutien?si=elgJjASNN8qbD80E',
      color: 'hover:text-red-500',
    },
    {
      name: 'TikTok',
      icon: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      ),
      url: 'https://www.tiktok.com/@association645?_t=ZM-8yMLLxhDYBh&_r=1',
      color: 'hover:text-white',
    },
    {
      name: 'Snapchat',
      icon: () => (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.389.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.149-.052-.227.015-.195.181-.465.437-.509 3.304-.54 4.79-3.879 4.836-3.984l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.347-.81-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.287.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z" />
        </svg>
      ),
      url: 'https://www.snapchat.com/add/jmywnwsnd?share_id=e5wqH4uz-YU&locale=ar-MR',
      color: 'hover:text-yellow-400',
    },
  ];

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8 border-t border-slate-800">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Section */}
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <img
                src="/ABC.jpg"
                alt="Logo"
                className="h-16 w-16 object-cover rounded-full shadow-xl border-2 border-slate-700"
              />
              <div>
                <h3 className="text-2xl font-bold text-white">
                  {language === 'ar' ? 'عون وسند' : language === 'fr' ? 'Aide et Soutien' : 'Aid & Support'}
                </h3>
                <p className="text-teal-500 text-sm font-medium">
                  {language === 'ar' ? 'معاً نصنع الأمل' : 'Together Creating Hope'}
                </p>
              </div>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {t.footer.description}
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social, index) => {
                const Icon = social.icon;
                return (
                  <a
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-2 bg-slate-800 rounded-full transition-all duration-300 ${social.color}`}
                    aria-label={social.name}
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6 relative inline-block after:content-[''] after:absolute after:w-1/2 after:h-1 after:bg-teal-500 after:-bottom-2 after:left-0">
              {language === 'ar' ? 'روابط سريعة' : 'Quick Links'}
            </h4>
            <ul className="space-y-3">
              <li><Link to="/about" className="hover:text-teal-400 transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>{t.nav.about}</Link></li>
              <li><Link to="/projects" className="hover:text-teal-400 transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>{t.nav.projects}</Link></li>
              <li><Link to="/volunteer" className="hover:text-teal-400 transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>{t.nav.volunteer}</Link></li>
              <li><Link to="/membership" className="hover:text-teal-400 transition-colors flex items-center gap-2"><span className="w-1.5 h-1.5 bg-teal-500 rounded-full"></span>{t.nav.membership}</Link></li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6 relative inline-block after:content-[''] after:absolute after:w-1/2 after:h-1 after:bg-teal-500 after:-bottom-2 after:left-0">
              {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
            </h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-teal-500 mt-1 shrink-0" />
                <span>Nouakchott, Mauritania</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-teal-500 shrink-0" />
                <a href="tel:32203250" className="hover:text-teal-400 transition-colors" dir="ltr">32203250</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-teal-500 shrink-0" />
                <a href="mailto:associationaidesoutien@gmail.com" className="hover:text-teal-400 transition-colors break-all">associationaidesoutien@gmail.com</a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6 relative inline-block after:content-[''] after:absolute after:w-1/2 after:h-1 after:bg-teal-500 after:-bottom-2 after:left-0">
              {language === 'ar' ? 'النشرة البريدية' : 'Newsletter'}
            </h4>
            <p className="text-slate-400 mb-4 text-sm">
              {language === 'ar' ? 'اشترك ليصلك كل جديد عن نشاطاتنا' : 'Subscribe to get latest updates'}
            </p>
            <form className="space-y-3">
              <input
                type="email"
                placeholder={language === 'ar' ? 'بريدك الإلكتروني' : 'Your email'}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-teal-500 text-white placeholder-slate-500"
              />
              <button className="w-full px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-medium transition-colors">
                {language === 'ar' ? 'اشترك' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 mt-8 text-center">
          <p className="flex items-center justify-center gap-2 text-slate-500 text-sm">
            {t.footer.rights} © {new Date().getFullYear()}
            <span className="mx-2">|</span>
            {language === 'ar' ? 'صُنع بكل' : 'Made with'}
            <Heart className="w-4 h-4 text-rose-500 animate-pulse fill-rose-500" />
          </p>
        </div>
      </div>
    </footer>
  );
};
