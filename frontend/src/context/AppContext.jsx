import { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sh_user')) || null; } catch { return null; }
  });
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('sh_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('sh_user');
  };

  return (
    <AppContext.Provider value={{ user, login, logout, showToast }}>
      {children}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.message}</div>
      )}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
