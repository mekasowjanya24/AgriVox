import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';
import i18n from '../i18n/index.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('agrivox_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('agrivox_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (token && navigator.onLine) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data);
          localStorage.setItem('agrivox_user', JSON.stringify(res.data.data));
          if (res.data.data.language && res.data.data.language !== i18n.language) {
            i18n.changeLanguage(res.data.data.language);
          }
        } catch (err) {
          if (err.response?.status === 401) {
            logout();
          }
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, [token]);

  const login = async (phone, password) => {
    const res = await api.post('/auth/login', { phone, password });
    const { user: userData, accessToken, refreshToken } = res.data.data;
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('agrivox_user', JSON.stringify(userData));
    localStorage.setItem('agrivox_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('agrivox_refresh_token', refreshToken);
    }
    if (userData.language) {
      i18n.changeLanguage(userData.language);
      localStorage.setItem('agrivox_lang', userData.language);
    }
    return userData;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    const { user: newUser, accessToken, refreshToken } = res.data.data;
    setUser(newUser);
    setToken(accessToken);
    localStorage.setItem('agrivox_user', JSON.stringify(newUser));
    localStorage.setItem('agrivox_token', accessToken);
    if (refreshToken) {
      localStorage.setItem('agrivox_refresh_token', refreshToken);
    }
    if (newUser.language) {
      i18n.changeLanguage(newUser.language);
      localStorage.setItem('agrivox_lang', newUser.language);
    }
    return newUser;
  };

  const logout = async () => {
    try {
      if (navigator.onLine) {
        const savedRefreshToken = localStorage.getItem('agrivox_refresh_token');
        await api.post('/auth/logout', { refreshToken: savedRefreshToken });
      }
    } catch {
      // Ignore network errors on logout
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('agrivox_user');
    localStorage.removeItem('agrivox_token');
    localStorage.removeItem('agrivox_refresh_token');
  };

  const updateProfile = async (data) => {
    if (navigator.onLine) {
      const res = await api.patch('/auth/me', data);
      const updated = { ...user, ...res.data.data };
      setUser(updated);
      localStorage.setItem('agrivox_user', JSON.stringify(updated));
      return updated;
    } else {
      const updated = { ...user, ...data };
      setUser(updated);
      localStorage.setItem('agrivox_user', JSON.stringify(updated));
      return updated;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === 'admin',
        loading,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
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
