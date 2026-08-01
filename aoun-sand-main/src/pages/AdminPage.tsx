import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, Bell, Vote, Upload, LogOut, ShieldAlert, LayoutDashboard, ShieldCheck, DollarSign, HeartPulse, BookOpen, UserCog, FileText, CreditCard, Heart, MessageSquare, Contact2 } from 'lucide-react';

import { UsersTab } from '../components/admin/UsersTab';
import { NotificationsTab } from '../components/admin/NotificationsTab';
import { PollsTab } from '../components/admin/PollsTab';
import { MediaTab } from '../components/admin/MediaTab';
import { ApprovalsTab } from '../components/admin/ApprovalsTab';
import { FinanceTab } from '../components/admin/FinanceTab';
import { PatientsTab } from '../components/admin/PatientsTab';
import { MahajaTab } from '../components/admin/MahajaTab';
import { AdminsTab } from '../components/admin/AdminsTab';
import { RequestsManagementTab } from '../components/admin/RequestsManagementTab';
import { CompetitionsManagementTab } from '../components/admin/CompetitionsManagementTab';
import { MembershipsTab } from '../components/admin/MembershipsTab';
import { UserDonationsTab } from '../components/admin/UserDonationsTab';
import { SmsTab } from '../components/admin/SmsTab';
import { MembershipRosterTab } from '../components/admin/MembershipRosterTab';
import { useAuth } from '../contexts/AuthContext';

export const AdminPage = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { isAdmin, logout } = useAuth();
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminRole, setAdminRole] = useState<string>('Super Admin');
  
  const [activeTab, setActiveTab] = useState<'users' | 'approvals' | 'notifications' | 'voting' | 'media' | 'finance' | 'patients' | 'mahaja' | 'admins' | 'requests' | 'competitions' | 'memberships' | 'user_donations' | 'sms' | 'membership_roster'>('users');
  
  // Dashboard state
  const [usersCount, setUsersCount] = useState(0);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [polls, setPolls] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [mediaFiles, setMediaFiles] = useState<any[]>([]);

  useEffect(() => {
    // Basic session check or dynamic database admin role check
    if (sessionStorage.getItem('admin_auth') === 'true' || localStorage.getItem('admin_auth') === 'true' || isAdmin) {
      const role = sessionStorage.getItem('admin_role') || localStorage.getItem('admin_role') || 'Super Admin';
      setAdminRole(role);
      setIsAuthenticated(true);
      fetchDashboardData();
      setupRealtimeSubscriptions();
    }
  }, [isAdmin]);

  const setupRealtimeSubscriptions = () => {
    supabase.channel('admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'polls' }, () => fetchPolls())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, () => fetchPolls())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchNotifications())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchUsers())
      .subscribe();
  };

  const fetchUsers = async () => {
    let allUsers: any[] = [];
    let from = 0;
    const step = 1000;
    let fetchMore = true;

    while (fetchMore) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + step - 1);

      if (error) {
        console.error("Error fetching users:", error);
        break;
      }

      if (data && data.length > 0) {
        allUsers = [...allUsers, ...data];
        from += step;
        if (data.length < step) {
          fetchMore = false;
        }
      } else {
        fetchMore = false;
      }
    }
    
    setUsers(allUsers);
    setUsersCount(allUsers.length);
  };

  const fetchPolls = async () => {
    const { data: pollsData } = await supabase
      .from('polls')
      .select('*, poll_options(*), poll_votes(*)');
    if (pollsData) setPolls(pollsData);
  };

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setNotifications(data);
  };

  const fetchMedia = async () => {
    const { data } = await supabase.storage.from('media').list();
    if (data) {
      const filtered = data.filter(f => f.name !== '.emptyFolderPlaceholder');
      setMediaFiles(filtered);
    }
  };

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const fetchPromise = Promise.all([
        fetchUsers().catch(err => console.error("Error fetching users:", err)),
        fetchPolls().catch(err => console.error("Error fetching polls:", err)),
        fetchNotifications().catch(err => console.error("Error fetching notifications:", err)),
        fetchMedia().catch(err => console.error("Error fetching media:", err))
      ]);
      
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 5000));
      
      await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err) {
      console.error("Error in fetchDashboardData:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const envUsername = import.meta.env.VITE_ADMIN_USERNAME;
    const envPassword = import.meta.env.VITE_ADMIN_PASSWORD;

    if (username === envUsername && password === envPassword) {
      // Use sessionStorage for better security (expires when tab closes)
      sessionStorage.setItem('admin_auth', 'true');
      sessionStorage.setItem('admin_role', 'Super Admin');
      setAdminRole('Super Admin');
      setIsAuthenticated(true);
      fetchDashboardData();
      toast.success(isRTL ? 'تم تسجيل الدخول بنجاح' : 'Logged in successfully');
    } else {
      // Try DB authentication
      try {
        const { data, error } = await supabase.rpc('verify_admin_login', {
          p_username: username,
          p_password: password
        });

        if (error) throw error;

        if (data && data.success) {
          sessionStorage.setItem('admin_auth', 'true');
          sessionStorage.setItem('admin_role', data.admin.role);
          sessionStorage.setItem('admin_id', data.admin.id);
          setAdminRole(data.admin.role);
          setIsAuthenticated(true);
          fetchDashboardData();
          toast.success(isRTL ? 'تم تسجيل الدخول بنجاح' : 'Logged in successfully');
        } else {
          toast.error(isRTL ? 'بيانات الدخول خاطئة أو الحساب معطل' : data?.message || 'Invalid credentials');
        }
      } catch (err: any) {
        console.error("Login error:", err);
        // If the RPC fails (e.g. table not created yet), fallback to generic error without breaking app
        toast.error(isRTL ? 'بيانات الدخول خاطئة' : 'Invalid credentials');
      }
    }
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('admin_auth');
    sessionStorage.removeItem('admin_role');
    localStorage.removeItem('admin_auth');
    localStorage.removeItem('admin_role');
    await logout();
    setIsAuthenticated(false);
    toast.success(isRTL ? 'تم تسجيل الخروج' : 'Logged out');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 pt-24" dir={isRTL ? 'rtl' : 'ltr'}>
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-800"
        >
          <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-indigo-500/30"
            >
              <ShieldAlert className="w-10 h-10" />
            </motion.div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">
              {isRTL ? 'بوابة الإدارة' : 'Admin Portal'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
              {isRTL ? 'الوصول مصرح للمسؤولين فقط' : 'Authorized personnel only'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                {isRTL ? 'اسم المستخدم' : 'Username'}
              </label>
              <input 
                type="text" 
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                {isRTL ? 'كلمة المرور' : 'Password'}
              </label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium tracking-widest text-center"
                dir="ltr"
              />
            </div>
            <button 
              type="submit" 
              className="w-full py-4 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isRTL ? 'تسجيل الدخول' : 'Sign In'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  let tabs = [
    { id: 'users',         icon: Users,     label: isRTL ? 'المستخدمين' : 'Users',         color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { id: 'approvals',     icon: ShieldCheck, label: isRTL ? 'طلبات الموافقة' : 'User Approvals', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { id: 'notifications', icon: Bell,      label: isRTL ? 'الإشعارات'  : 'Notifications',  color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20'  },
    { id: 'voting',        icon: Vote,      label: isRTL ? 'التصويت'    : 'Voting',         color: 'text-teal-500',   bg: 'bg-teal-50 dark:bg-teal-900/20'   },
    { id: 'patients',      icon: HeartPulse, label: isRTL ? 'إدارة المرضى' : 'Patients',    color: 'text-rose-500',   bg: 'bg-rose-50 dark:bg-rose-900/20'   },
    { id: 'media',         icon: Upload,    label: isRTL ? 'الوسائط'    : 'Media',          color: 'text-pink-500',   bg: 'bg-pink-50 dark:bg-pink-900/20'   },
    { id: 'finance',       icon: DollarSign, label: isRTL ? 'المالية'    : 'Finance',        color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    { id: 'requests',      icon: FileText,   label: isRTL ? 'الطلبات'    : 'Requests',       color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'competitions',  icon: Vote,       label: isRTL ? 'المسابقات'  : 'Competitions',   color: 'text-purple-500',  bg: 'bg-purple-50 dark:bg-purple-900/20' },
    { id: 'mahaja',        icon: BookOpen,   label: isRTL ? 'المحجة البيضاء' : 'Al-Mahaja',    color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
    { id: 'memberships',   icon: CreditCard,  label: isRTL ? 'رسوم الانتساب' : 'Memberships',   color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { id: 'user_donations',icon: Heart,       label: isRTL ? 'التبرعات الواردة' : 'User Donations', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-900/20' },
    { id: 'sms',            icon: MessageSquare, label: isRTL ? 'رسائل SMS' : 'SMS',            color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { id: 'membership_roster', icon: Contact2,    label: isRTL ? 'انتساب أعضاء الجمعية' : 'Membership Roster', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
  ];

  if (adminRole === 'Super Admin') {
    tabs.push({ id: 'admins', icon: UserCog, label: isRTL ? 'المشرفين' : 'Admins', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-24 pb-12" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="container-custom max-w-7xl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <LayoutDashboard className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 dark:text-white">
                {isRTL ? 'لوحة تحكم النظام' : 'System Dashboard'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                {isRTL ? 'إدارة شاملة للمحتوى والمستخدمين' : 'Comprehensive content and user management'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-5 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-bold transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>{isRTL ? 'تسجيل الخروج' : 'Logout'}</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full lg:w-72 flex-shrink-0">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 p-3 flex lg:flex-col gap-2 overflow-x-auto sticky top-24">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-3 px-5 py-4 rounded-2xl transition-all whitespace-nowrap font-bold text-lg relative ${
                      isActive 
                        ? 'text-slate-800 dark:text-white bg-slate-50 dark:bg-slate-800' 
                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    {isActive && (
                      <motion.div 
                        layoutId="activeTabIndicator"
                        className="absolute inset-0 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700"
                        style={{ zIndex: 0 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-4 w-full">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? tab.bg : 'bg-transparent'} transition-colors`}>
                        <tab.icon className={`w-5 h-5 ${isActive ? tab.color : 'text-slate-400'}`} />
                      </div>
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 relative">
            {isLoading && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm rounded-3xl">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin" />
              </div>
            )}
            
            <AnimatePresence mode="wait">
              {activeTab === 'users'         && <UsersTab users={users} usersCount={usersCount} />}
              {activeTab === 'approvals'     && <ApprovalsTab users={users} onRefresh={fetchUsers} />}
              {activeTab === 'notifications' && <NotificationsTab notifications={notifications} fetchDashboardData={fetchDashboardData} />}
              {activeTab === 'voting'        && <PollsTab polls={polls} fetchDashboardData={fetchDashboardData} />}
              {activeTab === 'patients'      && <PatientsTab />}
              {activeTab === 'media'         && <MediaTab mediaFiles={mediaFiles} fetchMedia={fetchMedia} />}
              {activeTab === 'finance'       && <FinanceTab />}
              {activeTab === 'requests'      && <RequestsManagementTab />}
              {activeTab === 'competitions'  && <CompetitionsManagementTab />}
              {activeTab === 'mahaja'        && <MahajaTab />}
              {activeTab === 'admins'        && <AdminsTab />}
              {activeTab === 'memberships'   && <MembershipsTab users={users} />}
              {activeTab === 'user_donations'&& <UserDonationsTab users={users} />}
              {activeTab === 'sms'           && <SmsTab users={users} />}
              {activeTab === 'membership_roster' && <MembershipRosterTab />}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
