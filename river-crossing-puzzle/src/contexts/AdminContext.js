import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';

const AdminContext = createContext();

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within AdminProvider');
  }
  return context;
};

export const AdminProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());

  // セッションタイムアウト（30分）
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30分

  // ログアウト
  const logout = useCallback(() => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminLastActivity');
  }, []);

  // 認証チェック
  const checkAuth = useCallback(() => {
    const storedAuth = localStorage.getItem('adminAuth');
    const storedTime = localStorage.getItem('adminLastActivity');
    
    if (storedAuth === 'true' && storedTime) {
      const timeSinceLastActivity = Date.now() - parseInt(storedTime);
      if (timeSinceLastActivity < SESSION_TIMEOUT) {
        setIsAuthenticated(true);
        setLastActivity(Date.now());
        return true;
      }
    }
    
    // タイムアウトまたは未認証の場合
    logout();
    return false;
  }, [SESSION_TIMEOUT, logout]);

  // ログイン
  const login = (password) => {
    if (password === process.env.REACT_APP_ADMIN_PASSWORD || password === 'admin123456') {
      setIsAuthenticated(true);
      setLastActivity(Date.now());
      localStorage.setItem('adminAuth', 'true');
      localStorage.setItem('adminLastActivity', Date.now().toString());
      return true;
    }
    return false;
  };

  // 初回マウント時に認証状態をチェック
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // アクティビティ監視
  useEffect(() => {
    if (!isAuthenticated) return;

    // アクティビティを更新
    const updateActivity = () => {
      if (isAuthenticated) {
        const now = Date.now();
        setLastActivity(now);
        localStorage.setItem('adminLastActivity', now.toString());
      }
    };

    // マウスムーブやクリックでアクティビティを更新
    const handleActivity = () => updateActivity();
    
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('keypress', handleActivity);

    // タイムアウトチェック（1分ごと）
    const interval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - lastActivity;
      if (timeSinceLastActivity >= SESSION_TIMEOUT) {
        logout();
        alert('セッションがタイムアウトしました。再度ログインしてください。');
      }
    }, 60000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      clearInterval(interval);
    };
  }, [isAuthenticated, lastActivity, SESSION_TIMEOUT, logout]);

  const value = {
    isAuthenticated,
    login,
    logout,
    checkAuth
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};