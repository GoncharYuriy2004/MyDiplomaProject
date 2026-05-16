/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import { type User } from '../data/mockData';
import { apiLogin, apiRegister, apiMe } from '../utils/api';

type AuthContextType = {
  user: User | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (userData: { full_name: string; pass_number: number; login: string; password: string; role_in_system: string; position?: string; phone?: string; email?: string; workshop_number?: number; floor_number?: number; office_number?: number }) => Promise<{ success: boolean; error?: string }>;
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

  const _roleToShort = (r: string): 'manager' | 'worker' =>
    r === 'WAREHOUSE_MANAGER' ? 'manager' : 'worker';

  const login = async (loginVal: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await apiLogin(loginVal, password);
      localStorage.setItem('auth_token', data.access_token);

      let id        = data.user.login;
      let full_name = data.user.full_name;
      try {
        const me = await apiMe() as { _id: string; login: string; full_name: string; role_in_system: string; account_status: string };
        id        = me._id;
        full_name = me.full_name;
      } catch { /* use login-response data */ }

      const mappedUser: User = {
        _id:            id,
        login:          data.user.login,
        full_name,
        role:           _roleToShort(data.user.role),
        role_in_system: data.user.role,
        account_status: data.user.account_status,
      };
      setUser(mappedUser);
      localStorage.setItem('auth_user', JSON.stringify(mappedUser));
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      return { success: false, error: message };
    }
  };

  const register = async (userData: { full_name: string; pass_number: number; login: string; password: string; role_in_system: string; position?: string; phone?: string; email?: string; workshop_number?: number; floor_number?: number; office_number?: number }): Promise<{ success: boolean; error?: string }> => {
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
