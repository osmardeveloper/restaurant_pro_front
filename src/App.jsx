// ============================================================
// src/App.jsx — Configuración de rutas con React Router
// ============================================================
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute   from './components/ProtectedRoute';
import Layout           from './components/Layout';
import LoginPage        from './pages/LoginPage';
import UsuariosPage     from './pages/UsuariosPage';
import PlatosPage       from './pages/PlatosPage';
import MesasPage        from './pages/MesasPage';
import ProductosPage    from './pages/ProductosPage';
import ComandasPage     from './pages/ComandasPage';
import ClientesPage     from './pages/ClientesPage';
import TomarPedidoPage  from './pages/TomarPedidoPage';
import FacturacionPage  from './pages/FacturacionPage';
import GastosPage       from './pages/GastosPage';
import CierreCajaPage  from './pages/CierreCajaPage';
import InventarioPage  from './pages/InventarioPage';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Ruta pública */}
          <Route path="/login" element={<LoginPage />} />

          {/* Rutas protegidas dentro del Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Redirección por defecto al módulo de Usuarios */}
            <Route index element={<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress sx={{ color: '#e94560' }} /></Box>} />
            <Route path="usuarios"     element={<ProtectedRoute modulo="usuarios"><UsuariosPage /></ProtectedRoute>} />
            <Route path="clientes"     element={<ProtectedRoute modulo="clientes"><ClientesPage /></ProtectedRoute>} />
            <Route path="productos"    element={<ProtectedRoute modulo="productos"><ProductosPage /></ProtectedRoute>} />
            <Route path="platos"       element={<ProtectedRoute modulo="platos"><PlatosPage /></ProtectedRoute>} />
            <Route path="mesas"        element={<ProtectedRoute modulo="mesas"><MesasPage /></ProtectedRoute>} />
            <Route path="tomar-pedido" element={<ProtectedRoute modulo="tomar_pedido"><TomarPedidoPage /></ProtectedRoute>} />
            <Route path="comandas"     element={<ProtectedRoute modulo="comandas"><ComandasPage /></ProtectedRoute>} />
            <Route path="facturacion"  element={<ProtectedRoute modulo="facturacion"><FacturacionPage /></ProtectedRoute>} />
            <Route path="gastos"       element={<ProtectedRoute modulo="gastos"><GastosPage /></ProtectedRoute>} />
            <Route path="inventario"   element={<ProtectedRoute modulo="inventario"><InventarioPage /></ProtectedRoute>} />
            <Route path="cierre-caja"  element={<ProtectedRoute modulo="cierre_caja"><CierreCajaPage /></ProtectedRoute>} />
          </Route>

          {/* Fallback: redirige al login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
