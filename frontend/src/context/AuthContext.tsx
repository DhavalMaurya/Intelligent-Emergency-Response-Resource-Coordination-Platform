import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { User, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: UserRole) => Promise<void>;
  demoAccounts: Array<{ email: string; name: string; role: UserRole; department?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('ps9_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [demoAccounts, setDemoAccounts] = useState<any[]>([]);

  // Default demo password loaded from environment/demo conventions
  const DEMO_PASSWORD = 'demo_password_123';

  useEffect(() => {
    // Configure default Axios authorization header
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Fetch demo accounts for development / presentation switcher
        const demoRes = await axios.get('/api/v1/auth/demo-accounts').catch(() => null);
        if (demoRes?.data?.data?.accounts) {
          setDemoAccounts(demoRes.data.data.accounts);
        }

        if (token) {
          const meRes = await axios.get('/api/v1/auth/me');
          if (meRes.data?.data?.user) {
            setUser(meRes.data.data.user);
          }
        }
      } catch (err) {
        console.warn('[Auth] Token invalid or expired, resetting session.');
        localStorage.removeItem('ps9_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [token]);

  const login = async (email: string, password: string = DEMO_PASSWORD) => {
    const res = await axios.post('/api/v1/auth/login', { email, password });
    const { token: receivedToken, user: receivedUser } = res.data.data;
    localStorage.setItem('ps9_token', receivedToken);
    setToken(receivedToken);
    setUser(receivedUser);
    axios.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;
  };

  const logout = () => {
    localStorage.removeItem('ps9_token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  const switchRole = async (role: UserRole) => {
    const target = demoAccounts.find((a) => a.role === role);
    if (target) {
      await login(target.email, DEMO_PASSWORD);
    } else {
      // Fallback default demo emails
      const roleEmailMap: Record<UserRole, string> = {
        OPERATOR: 'operator@ps9.demo',
        CONTROL_ROOM: 'supervisor@ps9.demo',
        FIELD_TEAM: 'field@ps9.demo',
        ADMIN: 'admin@ps9.demo',
        HOSPITAL: 'operator@ps9.demo',
      };
      await login(roleEmailMap[role] || 'operator@ps9.demo', DEMO_PASSWORD);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, switchRole, demoAccounts }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
