// ============================================================
// src/components/ProtectedRoute.jsx
// ============================================================
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute = ({ children, modulo }) => {
  const { isAuthenticated, usuario, permisos, loadingPermisos } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si estamos cargando los permisos, mostramos un spinner
  if (loadingPermisos) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', bgcolor: '#f0f2f5' }}>
        <CircularProgress sx={{ color: '#e94560' }} />
      </Box>
    );
  }

  // Verificación de permisos por módulo
  if (modulo && usuario?.rol !== 'admin') {
    if (permisos && permisos[modulo] === false) {
      // Si el usuario no tiene permiso para este módulo, lo mandamos a una ruta segura (puedes crear una página de 403)
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
