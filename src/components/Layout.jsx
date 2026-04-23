// ============================================================
// src/components/Layout.jsx — Shell principal con AppBar y Drawer
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  AppBar, Box, CssBaseline, Divider, Drawer, IconButton,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Toolbar, Typography, Avatar, Chip, Tooltip, CircularProgress
} from '@mui/material';
import MenuIcon           from '@mui/icons-material/Menu';
import PeopleIcon         from '@mui/icons-material/People';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import TableBarIcon       from '@mui/icons-material/TableBar';
import LocalShippingIcon  from '@mui/icons-material/LocalShipping';
import StorefrontIcon     from '@mui/icons-material/Storefront';
import ReceiptLongIcon    from '@mui/icons-material/ReceiptLong';
import LogoutIcon         from '@mui/icons-material/Logout';
import InventoryIcon      from '@mui/icons-material/Inventory';
import LocalDiningIcon    from '@mui/icons-material/LocalDining';
import DashboardIcon      from '@mui/icons-material/Dashboard';
import AssignmentIndIcon  from '@mui/icons-material/AssignmentInd';
import PostAddIcon        from '@mui/icons-material/PostAdd';
import PointOfSaleIcon    from '@mui/icons-material/PointOfSale';
import RequestQuoteIcon   from '@mui/icons-material/RequestQuote';
import AttachMoneyIcon    from '@mui/icons-material/AttachMoney';
import AssessmentIcon     from '@mui/icons-material/Assessment';
import HistoryIcon        from '@mui/icons-material/History';
import { useAuth }        from '../context/AuthContext';
import { configuracionService } from '../services/api';

const DRAWER_WIDTH = 260;

const navItems = [
  { key: 'mesas',        label: 'Mesas',        path: '/mesas',        icon: <TableBarIcon /> },
  { key: 'domicilios',   label: 'Domicilios',   path: '/domicilios',   icon: <LocalShippingIcon /> },
  { key: 'venta_directa', label: 'Venta Directa', path: '/venta-directa', icon: <StorefrontIcon />, requierePermiso: true },
  { key: 'usuarios',     label: 'Usuarios',     path: '/usuarios',     icon: <PeopleIcon /> },
  { key: 'clientes',     label: 'Clientes',     path: '/clientes',     icon: <AssignmentIndIcon /> },
  { key: 'productos',    label: 'Platos y Productos',    path: '/productos',    icon: <LocalDiningIcon /> },
  { key: 'tomar_pedido', label: 'Tomar Pedido', path: '/tomar-pedido', icon: <PostAddIcon /> },
  { key: 'comandas',     label: 'Comandas',     path: '/comandas',     icon: <ReceiptLongIcon /> },
  { key: 'facturacion',  label: 'Facturación',  path: '/facturacion',  icon: <PointOfSaleIcon /> },
  { key: 'auditoria_facturacion', label: 'Auditoría de Facturas', path: '/auditoria-facturacion', icon: <HistoryIcon />, requiereAdmin: true },
  { key: 'gastos',       label: 'Gastos',       path: '/gastos',       icon: <RequestQuoteIcon /> },
  { key: 'costos',       label: 'Costos',       path: '/costos',       icon: <AttachMoneyIcon /> },
  { key: 'inventario',   label: 'Inventario',   path: '/inventario',   icon: <InventoryIcon /> },
  { key: 'cierre_caja',  label: 'Cierre de Caja', path: '/cierre-caja', icon: <AssessmentIcon /> },
];

const rolColor = { admin: 'error', mesero: 'primary', cocina: 'warning', cajero: 'success' };
const rolLabel = { admin: 'Admin', mesero: 'Mesero', cocina: 'Cocina', cajero: 'Cajero' };

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();
  const { usuario, logout, permisos, loadingPermisos } = useAuth();

  const handleLogout = () => { logout(); navigate('/login'); };

  // Filtrar ítems permitidos - Memoizado para evitar bucles de renderizado
  const itemsPermitidos = useMemo(() => {
    return navItems.filter(item => {
      // Si requiere admin, solo mostrar a admins
      if (item.requiereAdmin && usuario?.rol !== 'admin') return false;
      
      // Si es admin, mostrar todo
      if (usuario?.rol === 'admin') return true; 
      
      // Si no es admin, verificar permisos
      return permisos && permisos[item.key] === true;
    });
  }, [usuario?.rol, permisos]);

  // Redirección dinámica al primer módulo disponible si estamos en la raíz o ruta bloqueada
  useEffect(() => {
    if (!loadingPermisos && permisos) {
      const isRoot = location.pathname === '/' || location.pathname === '';
      
      // Encontrar el item actual basado en el path de la URL
      const currentItem = navItems.find(n => location.pathname.startsWith(n.path));
      const hasPermission = usuario?.rol === 'admin' || (currentItem && permisos[currentItem.key]);

      if (isRoot || !hasPermission) {
        if (itemsPermitidos.length > 0) {
          const target = itemsPermitidos[0].path;
          // Evitar navegar si ya estamos en el destino para prevenir bucles
          if (location.pathname !== target) {
            navigate(target, { replace: true });
          }
        }
      }
    }
  }, [loadingPermisos, permisos, location.pathname, itemsPermitidos, navigate, usuario?.rol]);

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <DashboardIcon sx={{ color: '#e94560', fontSize: 32 }} />
        <Box>
          <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2 }}>
            RestaurantPro
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
            Sistema de Gestión
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      {usuario && (
        <Box sx={{ p: 2, mx: 1, my: 1.5, borderRadius: 2, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar sx={{ bgcolor: '#e94560', width: 36, height: 36, fontSize: 14 }}>
              {usuario.nombre?.[0]?.toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                {usuario.nombre}
              </Typography>
              <Chip
                label={rolLabel[usuario.rol] || usuario.rol}
                size="small"
                color={rolColor[usuario.rol] || 'default'}
                sx={{ height: 18, fontSize: '0.65rem', mt: 0.3 }}
              />
            </Box>
          </Box>
        </Box>
      )}

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 1 }} />

      {loadingPermisos ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress size={24} sx={{ color: '#e94560' }} />
        </Box>
      ) : (
        <List sx={{ flex: 1, px: 1, overflowY: 'auto' }}>
          {itemsPermitidos.map(({ label, path, icon }) => {
            const isActive = location.pathname.startsWith(path);
            return (
              <ListItem key={path} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => navigate(path)}
                  sx={{
                    borderRadius: 2,
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                    background: isActive ? 'linear-gradient(135deg, #e94560, #c62a47)' : 'transparent',
                    '&:hover': { background: isActive ? 'linear-gradient(135deg, #e94560, #c62a47)' : 'rgba(255,255,255,0.07)', color: '#fff' },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{icon}</ListItemIcon>
                  <ListItemText primary={label} primaryTypographyProps={{ fontWeight: isActive ? 700 : 400, fontSize: '0.9rem' }} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      )}

      <Box sx={{ p: 2 }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{ borderRadius: 2, color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#e94560', background: 'rgba(233,69,96,0.1)' }, transition: 'all 0.2s ease' }}
        >
          <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Cerrar Sesión" primaryTypographyProps={{ fontSize: '0.85rem' }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#f0f2f5' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml:    { sm: `${DRAWER_WIDTH}px` },
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <Toolbar>
          <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2, display: { sm: 'none' }, color: '#1a1a2e' }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ color: '#1a1a2e', fontWeight: 600, flex: 1 }}>
            {navItems.find(n => location.pathname.startsWith(n.path))?.label || 'RestaurantPro'}
          </Typography>
          <Tooltip title="Cerrar sesión">
            <IconButton onClick={handleLogout} sx={{ color: '#e94560' }}>
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', border: 'none' } }}
      >
        {drawerContent}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { 
            width: DRAWER_WIDTH, 
            boxSizing: 'border-box', 
            border: 'none',
            boxShadow: '4px 0 24px rgba(0,0,0,0.05)'
          }
        }}
        open
      >
        {drawerContent}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: '64px' }}>
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
