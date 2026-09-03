import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);
const SESSION_DURATION_MS = 10 * 60 * 1000; // 10 minutes session timeout

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedLoginTime = localStorage.getItem('master_admin_login_time');
      const token = localStorage.getItem('master_admin_token');
      if (!token || !savedLoginTime || Date.now() - Number(savedLoginTime) > SESSION_DURATION_MS) {
        localStorage.removeItem('master_admin_token');
        localStorage.removeItem('master_admin_user');
        localStorage.removeItem('master_admin_login_time');
        return null;
      }
      const savedUser = localStorage.getItem('master_admin_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('master_admin_token');
    localStorage.removeItem('master_admin_user');
    localStorage.removeItem('master_admin_login_time');
    setUser(null);
  }, []);

  useEffect(() => {
    const checkSession = () => {
      const savedLoginTime = localStorage.getItem('master_admin_login_time');
      const token = localStorage.getItem('master_admin_token');

      if (!token || !savedLoginTime || Date.now() - Number(savedLoginTime) > SESSION_DURATION_MS) {
        logout();
        setLoading(false);
        return;
      }

      if (token && !user) {
        api.get('/admin/profile')
          .then((res) => {
            const userData = res.data.user || res.data;
            setUser(userData);
            localStorage.setItem('master_admin_user', JSON.stringify(userData));
          })
          .catch(() => {
            logout();
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    };

    checkSession();
    const interval = setInterval(checkSession, 10000); // Check expiry every 10 seconds
    return () => clearInterval(interval);
  }, [logout, user]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', {
      email,
      phone: email.includes('@') ? '7373144198' : email,
      password,
    });

    const { token, user: userData } = res.data;
    localStorage.setItem('master_admin_token', token);
    localStorage.setItem('master_admin_user', JSON.stringify(userData));
    localStorage.setItem('master_admin_login_time', String(Date.now()));
    setUser(userData);
    return userData;
  };

  const loginWithAuthenticator = (token, userData) => {
    localStorage.setItem('master_admin_token', token);
    localStorage.setItem('master_admin_user', JSON.stringify(userData));
    localStorage.setItem('master_admin_login_time', String(Date.now()));
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithAuthenticator, logout, loading }}>
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
