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
import MenuOpenIcon       from '@mui/icons-material/MenuOpen';
import PeopleIcon         from '@mui/icons-material/People';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import TableBarIcon       from '@mui/icons-material/TableBar';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import LocalShippingIcon  from '@mui/icons-material/LocalShipping';
import StorefrontIcon     from '@mui/icons-material/Storefront';
import ReceiptLongIcon    from '@mui/icons-material/ReceiptLong';
import LogoutIcon         from '@mui/icons-material/Logout';
import InventoryIcon      from '@mui/icons-material/Inventory';
import LocalDiningIcon    from '@mui/icons-material/LocalDining';
import AssignmentIndIcon  from '@mui/icons-material/AssignmentInd';
import PostAddIcon        from '@mui/icons-material/PostAdd';
import PointOfSaleIcon    from '@mui/icons-material/PointOfSale';
import RequestQuoteIcon   from '@mui/icons-material/RequestQuote';
import AttachMoneyIcon    from '@mui/icons-material/AttachMoney';
import AssessmentIcon     from '@mui/icons-material/Assessment';
import HistoryIcon        from '@mui/icons-material/History';
import CalendarMonthIcon  from '@mui/icons-material/CalendarMonth';
import { useAuth }        from '../context/AuthContext';
import { configuracionService } from '../services/api';

const DRAWER_WIDTH = 260;
const COLLAPSED_DRAWER_WIDTH = 72;

const navItems = [
  { key: 'mesas',        label: 'Mesas',        path: '/mesas',        icon: <TableBarIcon /> },
  { key: 'domicilios',   label: 'Domicilios',   path: '/domicilios',   icon: <LocalShippingIcon /> },
  { key: 'venta_directa', label: 'Venta Directa', path: '/venta-directa', icon: <StorefrontIcon />, requierePermiso: true },
  { key: 'usuarios',     label: 'Usuarios',     path: '/usuarios',     icon: <PeopleIcon /> },
  { key: 'clientes',     label: 'Clientes',     path: '/clientes',     icon: <AssignmentIndIcon /> },
  { key: 'productos',    label: 'Platos y Productos',    path: '/productos',    icon: <LocalDiningIcon /> },
  { key: 'tomar_pedido', label: 'Tomar Pedido', path: '/tomar-pedido', icon: <PostAddIcon /> },
  { key: 'comandas',     label: 'Comandas',     path: '/comandas',     icon: <ReceiptLongIcon /> },
  { key: 'reservas',     label: 'Reservas',     path: '/reservas',     icon: <EventAvailableIcon /> },
  { key: 'facturacion',  label: 'Facturación',  path: '/facturacion',  icon: <PointOfSaleIcon /> },
  { key: 'auditoria_facturacion', label: 'Auditoría de Facturas', path: '/auditoria-facturacion', icon: <HistoryIcon />, requiereAdmin: true },
  { key: 'turnos_trabajados', label: 'Turnos Trabajados', path: '/turnos-trabajados', icon: <CalendarMonthIcon />, requiereAdmin: true },
  { key: 'gastos',       label: 'Gastos',       path: '/gastos',       icon: <RequestQuoteIcon /> },
  { key: 'costos',       label: 'Costos',       path: '/costos',       icon: <AttachMoneyIcon /> },
  { key: 'inventario',   label: 'Inventario',   path: '/inventario',   icon: <InventoryIcon /> },
  { key: 'cierre_caja',  label: 'Cierre de Caja', path: '/cierre-caja', icon: <AssessmentIcon /> },
];

const rolColor = { admin: 'error', mesero: 'primary', cocina: 'warning', cajero: 'success' };
const rolLabel = { admin: 'Admin', mesero: 'Mesero', cocina: 'Cocina', cajero: 'Cajero' };

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });
  const navigate  = useNavigate();
  const location  = useLocation();
  const { usuario, logout, permisos, loadingPermisos } = useAuth();

  const handleLogout = () => { logout(); navigate('/login'); };

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const newVal = !prev;
      localStorage.setItem('sidebar-collapsed', String(newVal));
      return newVal;
    });
  };

  const currentDrawerWidth = isCollapsed ? COLLAPSED_DRAWER_WIDTH : DRAWER_WIDTH;

  // Filtrar ítems permitidos - Memoizado para evitar bucles de renderizado
  const itemsPermitidos = useMemo(() => {
    return navItems.filter(item => {
      // Si requiere admin, solo mostrar a admins
      if (item.requiereAdmin && usuario?.rol !== 'admin') return false;

      // Reservas debe mostrarse por defecto si no existe una negación explícita
      if (item.key === 'reservas') return permisos?.[item.key] !== false;
      
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
      const hasPermission = usuario?.rol === 'admin' || (
        currentItem && (
          currentItem.key === 'reservas'
            ? permisos?.[currentItem.key] !== false
            : permisos[currentItem.key] === true
        )
      );

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

  const renderDrawerContent = (forceExpanded = false) => {
    const collapsed = !forceExpanded && isCollapsed;
    return (
      <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
        <Box sx={{ 
          p: collapsed ? 1.5 : { xs: 1.5, sm: 2 }, 
          pb: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          textAlign: 'center', 
          gap: 1, 
          mb: 1,
          position: 'relative',
          transition: 'all 0.2s ease'
        }}>
          <Box 
            component="img" 
            src="/images/logo_la_perla.png" 
            alt="Logo La Perla" 
            sx={{ 
              width: collapsed ? 40 : { xs: 104, sm: 132 }, 
              height: collapsed ? 40 : { xs: 104, sm: 132 }, 
              borderRadius: collapsed ? '8px' : '18px', 
              objectFit: 'cover', 
              border: collapsed ? '2px solid #fff' : '4px solid #fff', 
              mt: 0.5,
              transition: 'all 0.2s ease'
            }} 
          />
          {!collapsed && (
            <Box>
              <Typography variant="body1" sx={{ color: '#fff', fontWeight: 700, lineHeight: 1.2, fontSize: '1.1rem' }}>
                RestaurantPro
              </Typography>
            </Box>
          )}
          {!forceExpanded && (
            <IconButton 
              onClick={toggleCollapse} 
              sx={{ 
                color: 'rgba(255,255,255,0.5)', 
                '&:hover': { color: '#fff', bgcolor: 'rgba(255,255,255,0.08)' },
                ...(collapsed ? {
                  mt: 1,
                } : {
                  position: 'absolute', 
                  bottom: 0, 
                  right: 0, 
                })
              }}
              title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {isCollapsed ? <MenuIcon sx={{ fontSize: 22 }} /> : <MenuOpenIcon sx={{ fontSize: 22 }} />}
            </IconButton>
          )}
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.25)' }} />

        {loadingPermisos ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress size={24} sx={{ color: '#e94560' }} />
          </Box>
        ) : (
          <List sx={{ flex: 1, minHeight: 0, px: 1, py: 1, overflowY: 'auto' }}>
            {itemsPermitidos.map(({ label, path, icon }) => {
              const isActive = location.pathname.startsWith(path);
              const buttonContent = (
                <ListItemButton
                  onClick={() => { navigate(path); setMobileOpen(false); }}
                  sx={{
                    borderRadius: 2,
                    minHeight: 44,
                    justifyContent: collapsed ? 'center' : 'initial',
                    px: collapsed ? 1.5 : 2.5,
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                    background: isActive ? 'linear-gradient(135deg, #e94560, #c62a47)' : 'transparent',
                    '&:hover': { background: isActive ? 'linear-gradient(135deg, #e94560, #c62a47)' : 'rgba(255,255,255,0.07)', color: '#fff' },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ListItemIcon sx={{ color: 'inherit', minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>{icon}</ListItemIcon>
                  {!collapsed && (
                    <ListItemText primary={label} primaryTypographyProps={{ fontWeight: isActive ? 700 : 400, fontSize: '0.9rem' }} />
                  )}
                </ListItemButton>
              );

              return (
                <ListItem key={path} disablePadding sx={{ mb: 0.5 }}>
                  {collapsed ? (
                    <Tooltip title={label} placement="right" arrow>
                      {buttonContent}
                    </Tooltip>
                  ) : (
                    buttonContent
                  )}
                </ListItem>
              );
            })}
          </List>
        )}

        <Box sx={{ p: collapsed ? 1 : { xs: 1.5, sm: 2 } }}>
          {collapsed ? (
            <Tooltip title="Cerrar Sesión" placement="right" arrow>
              <ListItemButton
                onClick={handleLogout}
                sx={{ 
                  borderRadius: 2, 
                  color: 'rgba(255,255,255,0.5)', 
                  '&:hover': { color: '#e94560', background: 'rgba(233,69,96,0.1)' }, 
                  transition: 'all 0.2s ease',
                  justifyContent: 'center',
                  px: 1.5
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 0, justifyContent: 'center' }}><LogoutIcon /></ListItemIcon>
              </ListItemButton>
            </Tooltip>
          ) : (
            <ListItemButton
              onClick={handleLogout}
              sx={{ borderRadius: 2, color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#e94560', background: 'rgba(233,69,96,0.1)' }, transition: 'all 0.2s ease' }}
            >
              <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><LogoutIcon /></ListItemIcon>
              <ListItemText primary="Cerrar Sesión" primaryTypographyProps={{ fontSize: '0.85rem' }} />
            </ListItemButton>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%', minWidth: 0, background: '#f0f2f5' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${currentDrawerWidth}px)` },
          ml:    { sm: `${currentDrawerWidth}px` },
          background: 'rgba(255,255,255,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          transition: 'width 0.2s ease, margin-left 0.2s ease',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 56, sm: 64 }, px: { xs: 1.5, sm: 3 }, gap: { xs: 1, sm: 2 } }}>
          <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ display: { sm: 'none' }, color: '#1a1a2e' }}>
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap sx={{ color: '#1a1a2e', fontWeight: 700, flex: 1, minWidth: 0, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
            {navItems.find(n => location.pathname.startsWith(n.path))?.label || 'RestaurantPro'}
          </Typography>
          
          {usuario && (
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 2, mr: 1 }}>
              <Box sx={{ textAlign: 'right', maxWidth: 220 }}>
                <Typography variant="body1" noWrap sx={{ color: '#1a1a2e', fontWeight: 700 }}>
                  {usuario.nombre}
                </Typography>
                <Chip
                  label={rolLabel[usuario.rol] || usuario.rol}
                  size="small"
                  color={rolColor[usuario.rol] || 'default'}
                  sx={{ height: 20, fontSize: '0.75rem', mt: 0.5 }}
                />
              </Box>
            </Box>
          )}
          
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
        {renderDrawerContent(true)}
      </Drawer>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          width: currentDrawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { 
            width: currentDrawerWidth, 
            boxSizing: 'border-box', 
            border: 'none',
            boxShadow: '4px 0 24px rgba(0,0,0,0.05)',
            transition: 'width 0.2s ease',
            overflowX: 'hidden'
          },
          transition: 'width 0.2s ease',
        }}
        open
      >
        {renderDrawerContent(false)}
      </Drawer>

      <Box
        component="main"
        className="app-main-content"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { xs: '100%', sm: `calc(100% - ${currentDrawerWidth}px)` },
          p: { xs: 1.5, sm: 2, md: 3 },
          mt: { xs: '56px', sm: '64px' },
          transition: 'width 0.2s ease, margin-left 0.2s ease',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
