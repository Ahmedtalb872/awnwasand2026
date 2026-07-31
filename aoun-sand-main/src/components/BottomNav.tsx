import { Home, FolderHeart, HeartHandshake, CreditCard, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';

export const BottomNav = () => {
  const location = useLocation();
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const navItems = [
    { path: '/',           label: isRTL ? 'الرئيسية' : (language === 'fr' ? 'Accueil'  : 'Home'),       icon: Home          },
    { path: '/projects',   label: isRTL ? 'المشاريع' : (language === 'fr' ? 'Projets'  : 'Projects'),   icon: FolderHeart   },
    { path: '/donate',     label: isRTL ? 'التبرع'   : (language === 'fr' ? 'Don'      : 'Donate'),     icon: HeartHandshake},
    { path: '/account',    label: isRTL ? 'الحساب'   : (language === 'fr' ? 'Compte'   : 'Account'),    icon: User          },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="px-4 pb-4 sm:pb-6 pointer-events-auto">
        <nav
          className="flex justify-around items-center h-16 sm:h-20 max-w-lg mx-auto px-2 sm:px-4 rounded-[2rem] bg-[#1a1c4b] shadow-2xl shadow-indigo-900/20"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              id={`bottom-nav-${item.path.replace('/', '') || 'home'}`}
              className="relative flex items-center justify-center h-full"
            >
              <div
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl transition-all duration-300 ${
                  isActive
                    ? 'bg-indigo-50/10 text-indigo-50'
                    : 'text-indigo-200/60 hover:text-indigo-100 hover:bg-white/5'
                }`}
              >
                <item.icon
                  className={`w-5 h-5 sm:w-6 sm:h-6 transition-all ${
                    isActive ? 'stroke-[2.2]' : 'stroke-[1.6]'
                  }`}
                />
                {isActive && (
                  <motion.span 
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 'auto', opacity: 1 }}
                    className="text-xs sm:text-sm font-bold whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>
      </div>
    </div>
  );
};
