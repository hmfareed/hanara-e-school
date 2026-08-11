import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { saveUserSession, loadUserSession, clearUserSession } from '../services/db';

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
            // Persist session in IndexedDB for offline access
            await saveUserSession(res.data.data);
          } else {
            localStorage.removeItem('accessToken');
          }
        } catch (error) {
          // Fall back to cached session when:
          //  a) pure network error (no response at all) — navigator.onLine = false
          //  b) server returns 5xx — e.g. MongoDB Atlas DNS failure when offline
          const isOfflineError = !error.response || error.response.status >= 500;
          if (isOfflineError) {
            const cachedUser = await loadUserSession();
            if (cachedUser) {
              console.info('[Auth] Offline — restored session from IndexedDB cache');
              setUser(cachedUser);
              setLoading(false);
              return;
            }
          }
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
            await saveUserSession(res.data.data.user);
          }
        } catch (err) {
          // Silent refresh failed — check IndexedDB for cached session (offline mode)
          // Also catches 5xx errors (e.g. MongoDB Atlas unreachable when offline)
          const isOfflineError = !err.response || err.response.status >= 500;
          if (isOfflineError) {
            const cachedUser = await loadUserSession();
            if (cachedUser) {
              console.info('[Auth] Offline — using cached session (no refresh token needed)');
              setUser(cachedUser);
              setLoading(false);
              return;
            }
          }
          // No cached session / no cookie, ignore
        }
      }
      setLoading(false);
    };

    initAuth();

    const handleLogoutEvent = () => {
      setUser(null);
      localStorage.removeItem('accessToken');
      clearUserSession();
    };
    window.addEventListener('auth-logout', handleLogoutEvent);

    return () => {
      window.removeEventListener('auth-logout', handleLogoutEvent);
    };
  }, []);

  // Synchronize real-time socket connection with user session lifecycle
  useEffect(() => {
    if (user) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [user]);

  const login = async (emailOrPhone, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', {
        email: emailOrPhone,
        phone: emailOrPhone,
        identifier: emailOrPhone,
        password,
      });
      if (res.data?.success && res.data?.data?.accessToken) {
        localStorage.setItem('accessToken', res.data.data.accessToken);
        setUser(res.data.data.user);
        // Persist session in IndexedDB for offline access
        await saveUserSession(res.data.data.user);
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Login failed' };
    } catch (error) {
      // If server is unreachable (offline or 5xx), try cached session
      const isOfflineError = !error.response || error.response.status >= 500;
      if (isOfflineError) {
        const cachedUser = await loadUserSession();
        if (cachedUser) {
          setUser(cachedUser);
          return { success: true, _fromCache: true };
        }
        return {
          success: false,
          message: 'You\'re offline. Please connect to the internet to sign in for the first time.',
        };
      }
      return {
        success: false,
        message: error.response?.data?.message || 'Invalid login details or password',
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
      // Clear the IndexedDB session cache on logout
      await clearUserSession();
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

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.success) {
        setUser(res.data.data);
        await saveUserSession(res.data.data);
      }
    } catch (error) {
      console.error('Failed to refresh user profile:', error);
    }
  };

  const value = {
    user,
    loading,
    login,
    logout,
    hasRole,
    isFormTeacher,
    activeMode,
    toggleActiveMode,
    refreshUser,
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
