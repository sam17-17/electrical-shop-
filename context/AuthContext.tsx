import React, { createContext, useContext, useState, useEffect } from 'react';
import { useData } from './DataContext';
import { EntityType, GenericEntity } from '../types';

interface AuthContextType {
  user: GenericEntity | null;
  login: (username: string, pin: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data } = useData();
  const [user, setUser] = useState<GenericEntity | null>(null);
  // Simple session persistence using localStorage
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('zill_auth_status') === 'true';
  });

  useEffect(() => {
    if (isAuthenticated) {
      const savedUser = localStorage.getItem('zill_auth_user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    }
  }, [isAuthenticated]);

  const login = async (username: string, pin: string): Promise<boolean> => {
    const users = data[EntityType.SYSTEM_USERS] || [];
    
    // Find matching user
    const foundUser = users.find(
      (u) => u.name.toLowerCase() === username.toLowerCase() && u.pin === pin && u.status === 'Active'
    );

    if (foundUser) {
      setUser(foundUser);
      setIsAuthenticated(true);
      localStorage.setItem('zill_auth_status', 'true');
      localStorage.setItem('zill_auth_user', JSON.stringify(foundUser));
      return true;
    }
    
    return false;
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('zill_auth_status');
    localStorage.removeItem('zill_auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
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
