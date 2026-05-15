/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import { type User } from '../data/mockData';
import { apiLogin, apiRegister } from '../utils/api';

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: { firstname: string; lastname: string; email: string; password: string; role: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('auth_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const data = await apiLogin(email, password);
      // Store JWT token first so apiMe() can use it
      localStorage.setItem('auth_token', data.access_token);

      // Fetch real MongoDB _id from /auth/me; fall back to email if it fails
      let id = data.user.email;
      let firstname = data.user.firstname;
      let lastname  = data.user.lastname;
      try {
        const me = await apiMe() as { _id: string; email: string; role: string; firstname: string; lastname: string };
        id        = me._id;
        firstname = me.firstname;
        lastname  = me.lastname;
      } catch { /* use login-response data */ }

      const mappedUser: User = {
        _id:           id,
        username:      data.user.email,
        password_hash: '',
        role:          data.user.role as 'manager' | 'worker',
        full_name:     `${firstname} ${lastname}`,
      };
      setUser(mappedUser);
      localStorage.setItem('auth_user', JSON.stringify(mappedUser));
      return true;
    } catch {
      return false;
    }
  };

  const register = async (userData: { firstname: string; lastname: string; email: string; password: string; role: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiRegister(userData);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Registration failed' };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
