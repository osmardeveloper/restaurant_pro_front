// ============================================================
// src/App.jsx — Configuración de rutas con React Router
// ============================================================
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
            <Route index element={<Navigate to="/usuarios" replace />} />
            <Route path="usuarios"     element={<UsuariosPage />} />
            <Route path="clientes"     element={<ClientesPage />} />
            <Route path="productos"    element={<ProductosPage />} />
            <Route path="platos"       element={<PlatosPage />} />
            <Route path="mesas"        element={<MesasPage />} />
            <Route path="tomar-pedido" element={<TomarPedidoPage />} />
            <Route path="comandas"     element={<ComandasPage />} />
            <Route path="facturacion"  element={<FacturacionPage />} />
            <Route path="gastos"       element={<GastosPage />} />
            <Route path="cierre-caja"  element={<CierreCajaPage />} />
          </Route>

          {/* Fallback: redirige al login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
