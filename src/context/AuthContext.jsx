// ============================================================
// src/context/AuthContext.jsx — Estado global del JWT
// ============================================================
import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken]     = useState(() => localStorage.getItem('token') || null);
  const [usuario, setUsuario] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('usuario')) || null;
    } catch {
      return null;
    }
  });

  const login = useCallback((tokenRecibido, datosUsuario) => {
    localStorage.setItem('token', tokenRecibido);
    localStorage.setItem('usuario', JSON.stringify(datosUsuario));
    setToken(tokenRecibido);
    setUsuario(datosUsuario);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, usuario, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
