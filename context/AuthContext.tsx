import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabase } from '../services/supabase';
import { ShieldAlert, Terminal, Cloud, CloudOff } from 'lucide-react';

interface AuthContextType {
  user: any | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  configError: boolean;
  isDemoMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const supabase = getSupabase();

  useEffect(() => {
    const checkSession = async () => {
      // 1. Check Local Mock Session first
      const savedMockUser = localStorage.getItem('zill_mock_user');
      if (savedMockUser) {
        setUser(JSON.parse(savedMockUser));
        setIsDemoMode(true);
        setLoading(false);
        return;
      }

      if (!supabase) {
        setLoading(false);
        return;
      }

      // 2. Check Supabase active session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          setIsDemoMode(false);
        }
      } catch (e) {
        console.error("Supabase session check failed", e);
      }
      setLoading(false);
    };

    checkSession();

    // Listen for auth changes
    let subscription: any;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser(session.user);
          setIsDemoMode(false);
        } else if (!localStorage.getItem('zill_mock_user')) {
          setUser(null);
        }
      });
      subscription = data.subscription;
    }

    return () => subscription?.unsubscribe();
  }, [supabase]);

  const login = async (username: string, password: string) => {
    const isDefaultAdmin = username === 'admin' && password === '1234';

    if (supabase) {
      const email = username.includes('@') ? username : `${username}@zill.com`;
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (!error) {
          setIsDemoMode(false);
          localStorage.removeItem('zill_mock_user');
          return { success: true };
        }
      } catch (e) {
        console.error("Login attempt failed", e);
      }

      // Bypass if default admin
      if (isDefaultAdmin) {
        const mockUser = { 
          id: 'mock-admin-id', 
          email: 'admin@zill.com', 
          user_metadata: { role: 'Admin', full_name: 'System Administrator' } 
        };
        setUser(mockUser);
        setIsDemoMode(true);
        localStorage.setItem('zill_mock_user', JSON.stringify(mockUser));
        return { success: true };
      }

      return { success: false, error: 'Invalid credentials. Use admin / 1234 for local access.' };
    } else {
      if (isDefaultAdmin) {
        const mockUser = { 
          id: 'mock-admin-id', 
          email: 'admin@zill.com',
          user_metadata: { role: 'Admin' }
        };
        setUser(mockUser);
        setIsDemoMode(true);
        localStorage.setItem('zill_mock_user', JSON.stringify(mockUser));
        return { success: true };
      }
      return { success: false, error: 'Database connection failed. Contact support.' };
    }
  };

  const logout = async () => {
    localStorage.removeItem('zill_mock_user');
    setIsDemoMode(false);
    setUser(null);
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      isAuthenticated: !!user,
      loading,
      configError,
      isDemoMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};