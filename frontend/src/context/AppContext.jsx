import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUnreadCount } from '../api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sh_user')) || null; }
    catch { return null; }
  });
  const [toast, setToast] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll unread DM count every 8 seconds when logged in
  const refreshUnread = useCallback(async () => {
    if (!user) return;
    try {
      const res = await getUnreadCount(user.id);
      setUnreadCount(res.data.unread || 0);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    refreshUnread();
    const interval = setInterval(refreshUnread, 8000);
    return () => clearInterval(interval);
  }, [refreshUnread]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loginUser = (userData) => {
    setUser(userData);
    localStorage.setItem('sh_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setUnreadCount(0);
    localStorage.removeItem('sh_user');
  };

  return (
    <AppContext.Provider value={{ user, login: loginUser, logout, showToast, unreadCount, refreshUnread }}>
      {children}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
