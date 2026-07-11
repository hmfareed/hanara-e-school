import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState(() => {
    return localStorage.getItem('activeMode') || 'admin';
  });

  const toggleActiveMode = () => {
    setActiveMode((prev) => {
      const next = prev === 'admin' ? 'teacher' : 'admin';
      localStorage.setItem('activeMode', next);
      return next;
    });
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          if (res.data?.success) {
            setUser(res.data.data);
          } else {
            localStorage.removeItem('accessToken');
          }
        } catch (error) {
          console.error('Initial authentication check failed:', error);
          localStorage.removeItem('accessToken');
        }
      } else {
        // Try silent refresh on mount
        try {
          const res = await api.post('/auth/refresh', {});
          if (res.data?.success && res.data?.data?.accessToken) {
            localStorage.setItem('accessToken', res.data.data.accessToken);
            setUser(res.data.data.user);
          }
        } catch {
          // Silent refresh failed / no active cookie, ignore
        }
      }
      setLoading(false);
    };

    initAuth();

    const handleLogoutEvent = () => {
      setUser(null);
      localStorage.removeItem('accessToken');
    };
    window.addEventListener('auth-logout', handleLogoutEvent);

    return () => {
      window.removeEventListener('auth-logout', handleLogoutEvent);
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.success && res.data?.data?.accessToken) {
        localStorage.setItem('accessToken', res.data.data.accessToken);
        setUser(res.data.data.user);
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Login failed' };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Invalid email or password',
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('accessToken');
    }
  };

  const hasRole = (roles) => {
    if (!user) return false;
    if (typeof roles === 'string') {
      return user.role === roles;
    }
    return roles.includes(user.role);
  };

  // True when the logged-in teacher is also a form teacher / class teacher of at least one class.
  // Subject-only teachers will have this as false.
  const isFormTeacher = user?.isFormTeacher === true;

  const value = {
    user,
    loading,
    login,
    logout,
    hasRole,
    isFormTeacher,
    activeMode,
    toggleActiveMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
