import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { rawApi } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';
import { saveUserSession, loadUserSession, clearUserSession } from '../services/db';
import { generateNewLoginGreeting, clearSessionGreeting } from '../utils/greetingUtils';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Synchronously initialize with cached session user to prevent any role flickering or offline downgrades
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem('hanara_session_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [activeMode, setActiveMode] = useState(() => {
    return localStorage.getItem('activeMode') || 'admin';
  });

  const toggleActiveMode = () => {
    setActiveMode((prev) => {
      const next = prev === 'admin' ? 'teacher' : 'admin';
      localStorage.setItem('activeMode', next);
      if (typeof window !== 'undefined' && window.__REACT_QUERY_CLIENT__) {
        window.__REACT_QUERY_CLIENT__.clear();
      }
      return next;
    });
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');

      // ── Step 1: Synchronously restore from cache so UI appears instantly ──
      // The useState initializer already reads localStorage synchronously.
      // Also ensure IndexedDB cache is loaded for offline consistency.
      try {
        const cachedUser = await loadUserSession();
        if (cachedUser && cachedUser.role) {
          setUser(cachedUser);
          localStorage.setItem('hanara_session_user', JSON.stringify(cachedUser));
        }
      } catch (e) {
        console.warn('[Auth] Error reading IndexedDB session cache:', e);
      }

      // ── Step 2: Mark loading done immediately so the app renders ──
      // The live verification runs in the background without blocking.
      setLoading(false);

      // ── Step 3: Non-blocking background verification ──
      if (navigator.onLine) {
        if (token) {
          rawApi.get('/auth/me', { timeout: 15000 })
            .then(res => {
              if (res.data?.success && res.data?.data && typeof res.data.data === 'object' && !Array.isArray(res.data.data)) {
                const liveUser = res.data.data;
                setUser(liveUser);
                localStorage.setItem('hanara_session_user', JSON.stringify(liveUser));
                saveUserSession(liveUser);
              }
            })
            .catch(error => {
              const isUnauthorized = error.response?.status === 401 || error.response?.status === 403;
              if (isUnauthorized) {
                const hasCachedUser = !!localStorage.getItem('hanara_session_user');
                if (!hasCachedUser) {
                  localStorage.removeItem('accessToken');
                  localStorage.removeItem('hanara_session_user');
                  setUser(null);
                }
              }
              // All other errors (timeout, 5xx, offline): silently keep cached session
            });
        } else {
          // Try silent refresh in background
          rawApi.post('/auth/refresh', {}, { timeout: 15000 })
            .then(res => {
              if (res.data?.success && res.data?.data?.accessToken && res.data?.data?.user) {
                const refreshedUser = res.data.data.user;
                localStorage.setItem('accessToken', res.data.data.accessToken);
                localStorage.setItem('hanara_session_user', JSON.stringify(refreshedUser));
                setUser(refreshedUser);
                saveUserSession(refreshedUser);
              }
            })
            .catch(() => {
              // Refresh failed silently — cached session already restored above
            });
        }
      }
    }; // end initAuth

    initAuth();

    const handleLogoutEvent = () => {
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('hanara_session_user');
      clearUserSession();
      clearSessionGreeting();
    };
    window.addEventListener('auth-logout', handleLogoutEvent);

    return () => {
      window.removeEventListener('auth-logout', handleLogoutEvent);
    };
  }, []);

  // Synchronize real-time socket connection with user session lifecycle
  useEffect(() => {
    if (user && navigator.onLine) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [user]);

  const login = async (emailOrPhone, password) => {
    setLoading(true);
    try {
      const res = await rawApi.post(
        '/auth/login',
        {
          email: emailOrPhone,
          phone: emailOrPhone,
          identifier: emailOrPhone,
          password,
        },
        { timeout: 25000 }
      );

      if (res.data?.success && res.data?.data?.accessToken) {
        const loggedUser = res.data.data.user;
        localStorage.setItem('accessToken', res.data.data.accessToken);
        localStorage.setItem('hanara_session_user', JSON.stringify(loggedUser));
        if (typeof window !== 'undefined' && window.__REACT_QUERY_CLIENT__) {
          window.__REACT_QUERY_CLIENT__.clear();
        }
        setUser(loggedUser);
        await saveUserSession(loggedUser);
        generateNewLoginGreeting(loggedUser);
        return { success: true };
      }
      return { success: false, message: res.data?.message || 'Login failed' };
    } catch (error) {
      // 1. Genuinely offline on this device
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const cachedUser = await loadUserSession();
        if (cachedUser) {
          setUser(cachedUser);
          localStorage.setItem('hanara_session_user', JSON.stringify(cachedUser));
          generateNewLoginGreeting(cachedUser);
          return { success: true, _fromCache: true };
        }
        return {
          success: false,
          message: 'You are currently offline. Connect to the internet to sign in on this device for the first time.',
        };
      }

      // 2. Specific API error from server (e.g. invalid credentials, pending approval, inactive)
      if (error.response?.data?.message) {
        return {
          success: false,
          message: error.response.data.message,
        };
      }

      // 3. Timeout error
      if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
        return {
          success: false,
          message: 'Connection timed out. The server or database took too long to respond. Please try again.',
        };
      }

      // 4. Server 503 error
      if (error.response?.status === 503) {
        return {
          success: false,
          message: 'The server database is currently reconnecting. Please wait a few seconds and try again.',
        };
      }

      // 5. Unreachable server host
      if (!error.response || error.code === 'ERR_NETWORK') {
        return {
          success: false,
          message: 'Cannot connect to backend server. Please make sure the backend service is running.',
        };
      }

      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Invalid login credentials',
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (navigator.onLine) {
        await rawApi.post('/auth/logout', {}, { timeout: 2000 });
      }
    } catch (error) {
      console.warn('Logout notification error:', error);
    } finally {
      setUser(null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('hanara_session_user');
      localStorage.removeItem('activeMode');
      if (typeof window !== 'undefined' && window.__REACT_QUERY_CLIENT__) {
        window.__REACT_QUERY_CLIENT__.clear();
      }
      await clearUserSession();
      clearSessionGreeting();
    }
  };

  const hasRole = (roles) => {
    if (!user) return false;
    if (typeof roles === 'string') {
      return user.role === roles;
    }
    return Array.isArray(roles) ? roles.includes(user.role) : false;
  };

  const isFormTeacher = user?.isFormTeacher === true;
  const isJHS3Teacher = user?.isJHS3Teacher === true;

  const refreshUser = async () => {
    try {
      if (navigator.onLine) {
        const res = await rawApi.get('/auth/me');
        if (res.data?.success && res.data?.data) {
          setUser(res.data.data);
          localStorage.setItem('hanara_session_user', JSON.stringify(res.data.data));
          await saveUserSession(res.data.data);
        }
      }
    } catch (error) {
      console.warn('Failed to refresh user profile:', error);
    }
  };

  const value = {
    user,
    setUser,
    loading,
    login,
    logout,
    hasRole,
    isFormTeacher,
    isJHS3Teacher,
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
