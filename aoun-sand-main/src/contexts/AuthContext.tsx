import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  membership_type: string;
  current_status: string;
  location: string;
  national_id: string;
  approval_status: string;
  avatar_url?: string;
  unique_short_id?: string;
  is_mahaja?: boolean;
  date_of_birth?: string;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  userProfile: null, 
  loading: true, 
  isAdmin: false,
  logout: async () => {} 
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const fetchPromise = supabase.from('users').select('*').eq('id', userId).single();
      const timeoutPromise = new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('Timeout fetching profile')), 5000)
      );
      
      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (error) {
        console.error("Error fetching user profile:", error);
      }
      if (data) {
        setUserProfile(data);
        // Query database admins table
        const adminFetch = supabase.from('admins').select('id').eq('id', userId).single();
        const { data: adminData, error: adminError } = await Promise.race([adminFetch, timeoutPromise]);
        
        if (adminError && adminError.code !== 'PGRST116') {
          console.error("Error checking admin status:", adminError);
        }
        if (adminData) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
      }
    } catch (e) {
      console.error("Exception during fetchProfile:", e);
      setUserProfile(null);
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    // Safety fallback: if loading doesn't resolve in 4 seconds, force resolve it.
    const timer = setTimeout(() => {
      setLoading(currentLoading => {
        if (currentLoading) {
          console.warn("Auth initialization timed out. Forcing loading state to false.");
          return false;
        }
        return currentLoading;
      });
    }, 4000);

    const initializeAuth = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setUserProfile(null);
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("Error in initializeAuth:", err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    let profileChannel: any = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setLoading(true);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchProfile(session.user.id);

          // Subscribe to real-time profile changes (e.g. approval_status updated by admin)
          if (profileChannel) supabase.removeChannel(profileChannel);
          profileChannel = supabase
            .channel(`profile-${session.user.id}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'users',
                filter: `id=eq.${session.user.id}`,
              },
              (payload) => {
                setUserProfile(payload.new as UserProfile);
              }
            )
            .subscribe();
        } else {
          if (profileChannel) {
            supabase.removeChannel(profileChannel);
            profileChannel = null;
          }
          setUserProfile(null);
          setIsAdmin(false);
        }
      } catch (err) {
        console.error("Error in onAuthStateChange callback:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
      if (profileChannel) supabase.removeChannel(profileChannel);
    };
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out:", err);
    }
    localStorage.removeItem('supabase.auth.token');
    setUser(null);
    setUserProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, isAdmin, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
