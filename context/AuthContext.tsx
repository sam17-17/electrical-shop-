import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSupabase } from '../services/supabase';
import { ShieldAlert, Terminal, Info } from 'lucide-react';

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
        // We don't trigger configError if fallbacks are available in services/supabase.ts
        // But if even fallbacks are missing:
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
    // Standard credential check
    const isDefaultAdmin = username === 'admin' && password === '1234';

    if (supabase) {
      const email = username.includes('@') ? username : `${username}@zill.com`;
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error) {
        setIsDemoMode(false);
        localStorage.removeItem('zill_mock_user');
        return { success: true };
      }

      // If Supabase fails but they used the default admin credentials, allow bypass
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

      return { success: false, error: error.message };
    } else {
      // Offline / Config Error Fallback
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
      return { success: false, error: 'Database not connected' };
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
      {isDemoMode && (
        <div className="fixed bottom-4 left-4 z-[60] bg-amber-500 text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg flex items-center animate-pulse">
          <Info className="w-3 h-3 mr-1.5" />
          OFFLINE ADMIN MODE
        </div>
      )}
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