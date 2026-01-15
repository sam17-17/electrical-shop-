import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabase } from '../services/supabase';

interface AuthContextType {
  user: any | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  configError: boolean;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Valid UUID constant strings for bootstrap accounts
const BOOTSTRAP_SUPER_ADMIN_ID = '00000000-0000-4000-a000-000000000001';
const BOOTSTRAP_DEMO_ADMIN_ID = '00000000-0000-4000-a000-000000000002';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const supabase = getSupabase();

  useEffect(() => {
    const checkSession = async () => {
      const savedUser = localStorage.getItem('zill_active_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          setUser(parsed);
          setIsDemoMode(parsed.isDemo || false);
          setLoading(false);
          return;
        } catch (e) {
          localStorage.removeItem('zill_active_user');
        }
      }

      if (!supabase) {
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const u = { 
            id: session.user.id, 
            email: session.user.email, 
            username: session.user.user_metadata?.full_name || session.user.email,
            role: session.user.user_metadata?.role || 'Admin',
            isDemo: false
          };
          setUser(u);
          setIsDemoMode(false);
        }
      } catch (e) {
        console.error("Supabase session check failed", e);
      }
      setLoading(false);
    };

    checkSession();
  }, [supabase]);

  const signUp = async (email: string, password: string, fullName: string) => {
    if (!supabase) return { success: false, error: 'Cloud service unavailable' };
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role: 'Admin' } }
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const login = async (username: string, password: string) => {
    // 1. Check Local Demo Admin
    if (username === 'admin' && password === '1234') {
      const mockUser = { id: BOOTSTRAP_DEMO_ADMIN_ID, email: 'admin@zilltech.com', username: 'Local Admin', role: 'Admin', isDemo: true };
      setUser(mockUser);
      setIsDemoMode(true);
      localStorage.setItem('zill_active_user', JSON.stringify(mockUser));
      return { success: true };
    }

    // 2. CHECK FOR SUPER ADMIN BOOTSTRAP (Allows setup when DB table is missing)
    const isBootstrap = (username === 'superadmin' || username === 'superadmin@zilltech.com') && password === 'admin2025';

    if (!supabase) {
        if (isBootstrap) {
            const superUser = { id: BOOTSTRAP_SUPER_ADMIN_ID, email: 'superadmin@zilltech.com', username: 'Super Admin', role: 'Admin', isDemo: true };
            setUser(superUser);
            setIsDemoMode(true);
            localStorage.setItem('zill_active_user', JSON.stringify(superUser));
            return { success: true };
        }
        return { success: false, error: 'Cloud database not connected' };
    }

    try {
      const { data: virtualUsers, error: vError } = await supabase
        .from('crm_entities')
        .select('*')
        .eq('type', 'system-users');

      // 3. ALLOW BOOTSTRAP IF ERROR (TABLE NOT FOUND) OR EMPTY
      if (isBootstrap && (vError || !virtualUsers || virtualUsers.length === 0)) {
          const cloudAdmin = { 
            id: BOOTSTRAP_SUPER_ADMIN_ID, 
            email: 'superadmin@zilltech.com', 
            username: 'Super Admin', 
            role: 'Admin', 
            isVirtual: true, 
            isDemo: false 
          };
          
          if (!vError) {
             try {
                await supabase.from('crm_entities').insert([{
                   id: BOOTSTRAP_SUPER_ADMIN_ID,
                   type: 'system-users',
                   content: { name: 'Super Admin', email: 'superadmin@zilltech.com', pin: 'admin2025', role: 'Admin', status: 'Active' }
                }]);
             } catch(e) {}
          }

          setUser(cloudAdmin);
          localStorage.setItem('zill_active_user', JSON.stringify(cloudAdmin));
          return { success: true };
      }

      // 4. Standard User Check
      if (!vError && virtualUsers) {
        const match = virtualUsers.find(v => 
          (v.content.email?.toLowerCase() === username.toLowerCase() || v.content.name?.toLowerCase() === username.toLowerCase()) && 
          String(v.content.pin) === String(password)
        );

        if (match) {
          if (match.content.status === 'Suspended') return { success: false, error: 'Account suspended.' };
          const virtualUser = {
            id: match.id,
            email: match.content.email,
            username: match.content.name,
            role: match.content.role || 'Viewer',
            isVirtual: true,
            isDemo: false
          };
          setUser(virtualUser);
          localStorage.setItem('zill_active_user', JSON.stringify(virtualUser));
          return { success: true };
        }
      }

      // 5. Supabase Auth Fallback
      const email = username.includes('@') ? username : `${username}@zill.com`;
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (!authError && authData.user) {
        const u = { 
          id: authData.user.id, 
          email: authData.user.email, 
          username: authData.user.user_metadata?.full_name || authData.user.email,
          role: authData.user.user_metadata?.role || 'Admin',
          isDemo: false
        };
        setUser(u);
        localStorage.setItem('zill_active_user', JSON.stringify(u));
        return { success: true };
      }
    } catch (e) {
      console.error("Cloud login error", e);
    }

    return { success: false, error: 'Authentication failed.' };
  };

  const logout = async () => {
    localStorage.removeItem('zill_active_user');
    setIsDemoMode(false);
    setUser(null);
    if (supabase) await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, login, signUp, logout, isAuthenticated: !!user, loading, configError, isDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};