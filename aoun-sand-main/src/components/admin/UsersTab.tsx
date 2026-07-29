import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../contexts/LanguageContext';
import { Users, Search, Shield, Activity, MapPin, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

export const UsersTab = ({ users, usersCount }: { users: any[], usersCount: number }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.includes(searchTerm) ||
    u.unique_short_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  return (
    <motion.div key="users" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-500/20">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-4xl font-black">{usersCount}</h3>
              <p className="text-indigo-100 font-medium">{isRTL ? 'إجمالي المستخدمين' : 'Total Users'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-indigo-500" />
          {isRTL ? 'إدارة المستخدمين' : 'Users Management'}
        </h3>
        
        <div className="relative w-full md:w-96">
          <input 
            type="text" 
            placeholder={isRTL ? 'بحث بالاسم، البريد أو الهاتف...' : 'Search name, email or phone...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 px-12 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all ${isRTL ? 'pl-4 pr-12' : 'pl-12 pr-4'}`}
          />
          <Search className={`absolute top-3.5 w-5 h-5 text-slate-400 ${isRTL ? 'right-4' : 'left-4'}`} />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <th className="p-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{isRTL ? 'المستخدم' : 'User'}</th>
                <th className="p-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{isRTL ? 'معلومات الاتصال' : 'Contact Info'}</th>
                <th className="p-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{isRTL ? 'العضوية' : 'Membership'}</th>
                <th className="p-5 text-sm font-semibold text-slate-500 dark:text-slate-400">{isRTL ? 'تاريخ التسجيل' : 'Joined Date'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedUsers.map((u, i) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={u.id || i} 
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt={u.full_name} className="w-10 h-10 rounded-full object-cover border border-indigo-200 dark:border-indigo-800 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold uppercase border border-indigo-200 dark:border-indigo-800 shrink-0">
                          {u.full_name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white">{u.full_name}</div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{u.unique_short_id || u.national_id || 'ID'}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {u.location || (isRTL ? 'غير محدد' : 'Not specified')}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{u.email}</div>
                    <div className="text-xs text-slate-500 mt-1">{u.phone}</div>
                  </td>
                  <td className="p-5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {u.membership_type || (isRTL ? 'عضو' : 'Member')}
                    </div>
                  </td>
                  <td className="p-5 text-sm text-slate-500">
                    {new Date(u.created_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                  </td>
                </motion.tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Search className="w-12 h-12 mb-4 opacity-50" />
                      <p className="text-lg font-medium">{isRTL ? 'لم يتم العثور على نتائج' : 'No results found'}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {isRTL 
                ? `عرض ${startIndex + 1} إلى ${Math.min(startIndex + itemsPerPage, filteredUsers.length)} من أصل ${filteredUsers.length} مستخدم` 
                : `Showing ${startIndex + 1} to ${Math.min(startIndex + itemsPerPage, filteredUsers.length)} of ${filteredUsers.length} users`}
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 disabled:opacity-50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-600"
              >
                {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = currentPage;
                  if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  
                  if (pageNum > 0 && pageNum <= totalPages) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-bold transition-colors ${
                          currentPage === pageNum 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 disabled:opacity-50 transition-colors hover:bg-slate-50 dark:hover:bg-slate-600"
              >
                {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
