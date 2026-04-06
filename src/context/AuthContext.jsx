// ============================================================
// src/context/AuthContext.jsx — Estado global del JWT
// ============================================================
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { configuracionService } from '../services/api';

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
  const [permisos, setPermisos] = useState(null);
  const [loadingPermisos, setLoadingPermisos] = useState(true);

  const fetchPermisos = useCallback(async (userId) => {
    setLoadingPermisos(true);
    try {
      const res = await configuracionService.getByUser(userId);
      if (res.data && res.data.detalles) {
        setPermisos(res.data.detalles);
      } else {
        setPermisos({});
      }
    } catch (error) {
      console.error('Error cargando permisos:', error);
      setPermisos({});
    } finally {
      setLoadingPermisos(false);
    }
  }, []);

  useEffect(() => {
    const userId = usuario?._id || usuario?.id;
    if (userId) {
      fetchPermisos(userId);
    } else {
      setLoadingPermisos(false);
    }
  }, [usuario, fetchPermisos]);

  const login = useCallback((tokenRecibido, datosUsuario) => {
    localStorage.setItem('token', tokenRecibido);
    localStorage.setItem('usuario', JSON.stringify(datosUsuario));
    setToken(tokenRecibido);
    setUsuario(datosUsuario);
    // Los permisos se cargarán vía useEffect al cambiar 'usuario'
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    setToken(null);
    setUsuario(null);
    setPermisos(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, usuario, permisos, loadingPermisos, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
};
