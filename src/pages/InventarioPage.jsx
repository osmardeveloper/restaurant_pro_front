// ============================================================
// src/pages/InventarioPage.jsx — Gestión de Entradas y Salidas
// ============================================================
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button, Tabs, Tab,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, 
  DialogActions, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Snackbar, Alert, Autocomplete, InputAdornment, 
  Chip, Divider, CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { movimientoService, productoService } from '../services/api';

const InventarioPage = () => {
  const [tab, setTab] = useState(0); // 0: Ingresos, 1: Salidas
  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  // Fecha local para filtros iniciales (Evitar desfase UTC)
  const hoy = new Date();
  const hoyLocal = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  // Filtros
  const [fechaDesde, setFechaDesde] = useState(hoyLocal);
  const [fechaHasta, setFechaHasta] = useState(hoyLocal);

  // Modales
  const [openModal, setOpenModal] = useState(false);
  const [tipoMov, setTipoMov] = useState('ingreso'); // 'ingreso' o 'salida'
  const [form, setForm] = useState({ responsable: '', motivo: '', productos: [] });
  
  // Selección temporal de producto en modal
  const [prodTemp, setProdTemp] = useState(null);
  const [cantTemp, setCantTemp] = useState(1);

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  const fetchDatos = useCallback(async () => {
    setLoading(true);
    try {
      const tipo = tab === 0 ? 'ingreso' : 'salida';
      const [resM, resP] = await Promise.all([
        movimientoService.getAll({ tipo, desde: fechaDesde, hasta: fechaHasta }),
        productoService.getAll()
      ]);
      setMovimientos(resM.data);
      setProductos(resP.data);
    } catch (error) {
      showSnack('Error al cargar datos del inventario.', 'error');
    } finally {
      setLoading(false);
    }
  }, [tab, fechaDesde, fechaHasta]);

  useEffect(() => { fetchDatos(); }, [fetchDatos]);

  const abrirModal = (tipo) => {
    setTipoMov(tipo);
    setForm({ responsable: '', motivo: '', productos: [] });
    setOpenModal(true);
  };

  const agregarProductoAlDetalle = () => {
    if (!prodTemp) return showSnack('Selecciona un producto.', 'warning');
    if (cantTemp <= 0) return showSnack('Cantidad no válida.', 'warning');

    const existe = form.productos.find(p => p.id_producto === prodTemp._id);
    if (existe) {
      setForm(prev => ({
        ...prev,
        productos: prev.productos.map(p => p.id_producto === prodTemp._id 
          ? { ...p, cantidad: p.cantidad + Number(cantTemp) } 
          : p)
      }));
    } else {
      setForm(prev => ({
        ...prev,
        productos: [...prev.productos, { 
          id_producto: prodTemp._id, 
          nombre: prodTemp.nombre, 
          cantidad: Number(cantTemp) 
        }]
      }));
    }
    setProdTemp(null);
    setCantTemp(1);
  };

  const quitarProductoDelDetalle = (id) => {
    setForm(prev => ({ ...prev, productos: prev.productos.filter(p => p.id_producto !== id) }));
  };

  const guardarMovimiento = async () => {
    if (!form.responsable) return showSnack('El responsable es obligatorio.', 'warning');
    if (form.productos.length === 0) return showSnack('Debes agregar al menos un producto.', 'warning');

    try {
      await movimientoService.create({ ...form, tipo: tipoMov });
      showSnack(`${tipoMov === 'ingreso' ? 'Ingreso' : 'Salida'} registrado correctamente.`);
      setOpenModal(false);
      
      // Cambiar a la pestaña correspondiente para ver el nuevo registro
      if (tipoMov === 'ingreso') setTab(0);
      else setTab(1);

      fetchDatos();
    } catch (error) {
      showSnack('Error al guardar el movimiento.', 'error');
    }
  };

  return (
    <Box>
      {/* CABECERA */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1.5, borderRadius: 3, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}>
            <InventoryIcon sx={{ color: '#fff', fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h4" fontWeight={900} color="#1a1a2e">Gestión de Inventario</Typography>
            <Typography variant="body2" color="text.secondary">Control de entrada y salida de mercancía</Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => abrirModal('ingreso')}
            sx={{ bgcolor: '#4caf50', borderRadius: 2, fontWeight: 700, px: 3, '&:hover': { bgcolor: '#43a047' } }}
          >
            Nuevo Ingreso
          </Button>
          <Button 
            variant="contained" 
            startIcon={<ArrowDownwardIcon />} 
            onClick={() => abrirModal('salida')}
            sx={{ bgcolor: '#e94560', borderRadius: 2, fontWeight: 700, px: 3, '&:hover': { bgcolor: '#c62a47' } }}
          >
            Nueva Salida
          </Button>
        </Box>
      </Box>

      {/* FILTROS Y TABS */}
      <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden', mb: 4 }}>
        <Tabs 
          value={tab} 
          onChange={(e, val) => setTab(val)}
          sx={{ borderBottom: '1px solid rgba(0,0,0,0.05)', bgcolor: '#fff' }}
          TabIndicatorProps={{ sx: { height: 4, borderRadius: '4px 4px 0 0' } }}
        >
          <Tab icon={<ArrowUpwardIcon />} label="Ingresos" iconPosition="start" sx={{ px: 4, py: 2, fontWeight: 700 }} />
          <Tab icon={<ArrowDownwardIcon />} label="Salidas" iconPosition="start" sx={{ px: 4, py: 2, fontWeight: 700 }} />
        </Tabs>
        
        <Box sx={{ p: 3, display: 'flex', gap: 3, alignItems: 'center', bgcolor: '#fff' }}>
          <TextField
            label="FECHA INICIO" type="date" size="small" InputLabelProps={{ shrink: true }}
            value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
            sx={{ width: 250 }}
          />
          <TextField
            label="FECHA FIN" type="date" size="small" InputLabelProps={{ shrink: true }}
            value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
            sx={{ width: 250 }}
          />
          <Button variant="text" size="small" color="inherit" onClick={() => { setFechaDesde(''); setFechaHasta(''); }}>Limpiar Filtros</Button>
        </Box>
      </Paper>

      {/* TABLA DE MOVIMIENTOS */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 4, border: '1px solid rgba(0,0,0,0.08)' }}>
        <Table sx={{ minWidth: 650 }} size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.02)' }}>
              <TableCell sx={{ fontWeight: 800 }}>FECHA</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>RESPONSABLE</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>PRODUCTOS</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>MOTIVO</TableCell>
              <TableCell sx={{ fontWeight: 800 }} align="center">ESTADO</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><CircularProgress size={24} /></TableCell></TableRow>
            ) : movimientos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                  <Typography variant="body2" color="text.secondary">No hay movimientos registrados para las fechas seleccionadas</Typography>
                </TableCell>
              </TableRow>
            ) : (
              movimientos.map((m) => (
                <TableRow key={m._id} hover>
                  <TableCell>{new Date(m.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</TableCell>
                  <TableCell fontWeight={600}>{m.responsable}</TableCell>
                  <TableCell>
                    {m.productos.map((p, i) => (
                      <Chip key={i} label={`${p.nombre} x${p.cantidad}`} size="small" sx={{ m: 0.5, borderRadius: 1 }} />
                    ))}
                  </TableCell>
                  <TableCell>{m.motivo || '-'}</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={m.tipo.toUpperCase()} 
                      size="small" 
                      sx={{ fontWeight: 800, bgcolor: m.tipo === 'ingreso' ? '#e8f5e9' : '#ffebee', color: m.tipo === 'ingreso' ? '#2e7d32' : '#c62828' }} 
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* MODAL NUEVO MOVIMIENTO */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ bgcolor: tipoMov === 'ingreso' ? '#4caf50' : '#e94560', color: '#fff', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {tipoMov === 'ingreso' ? 'Cargar Ingreso de Mercancía' : 'Registrar Salida de Mercancía'}
          <IconButton size="small" onClick={() => setOpenModal(false)} sx={{ color: '#fff' }}>×</IconButton>
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Responsable de la Tienda</Typography>
              <TextField
                fullWidth placeholder="Nombre de quien entrega/recibe" size="small"
                value={form.responsable} onChange={e => setForm(p => ({ ...p, responsable: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>Motivo o Concepto (Opcional)</Typography>
              <TextField
                fullWidth placeholder="Ej: Compra a proveedor, Ajuste stock, etc." size="small"
                value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, mt: 1 }}>Agregar Productos</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Autocomplete
                  fullWidth size="small"
                  options={productos}
                  getOptionLabel={(o) => o ? `${o.nombre} (Stock: ${o.cantidad})` : ''}
                  value={prodTemp}
                  onChange={(_, val) => setProdTemp(val)}
                  renderInput={(params) => <TextField {...params} label="Buscar Producto" placeholder="Nombre del producto..." />}
                />
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <TextField
                    label="Cantidad" type="number" size="small" sx={{ width: 130 }}
                    value={cantTemp} onChange={e => setCantTemp(e.target.value)}
                  />
                  <Button 
                    variant="contained" fullWidth startIcon={<AddIcon />} onClick={agregarProductoAlDetalle}
                    sx={{ height: 40, borderRadius: 2, fontWeight: 700 }}
                  >
                    Agregar al Listado
                  </Button>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#fafafa' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Producto</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Cantidad</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Acción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {form.productos.length === 0 ? (
                      <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3, color: 'text.secondary' }}>No hay productos añadidos aún</TableCell></TableRow>
                    ) : (
                      form.productos.map((p) => (
                        <TableRow key={p.id_producto}>
                          <TableCell>{p.nombre}</TableCell>
                          <TableCell align="center"><Typography fontWeight={700}>{p.cantidad}</Typography></TableCell>
                          <TableCell align="center">
                            <IconButton size="small" color="error" onClick={() => quitarProductoDelDetalle(p.id_producto)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 4, bgcolor: '#f9f9f9' }}>
          <Button variant="outlined" color="inherit" onClick={() => setOpenModal(false)} sx={{ borderRadius: 2, px: 3 }}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={guardarMovimiento}
            sx={{ borderRadius: 2, px: 4, bgcolor: tipoMov === 'ingreso' ? '#4caf50' : '#e94560', '&:hover': { bgcolor: tipoMov === 'ingreso' ? '#43a047' : '#c62a47' } }}
          >
            {tipoMov === 'ingreso' ? 'Procesar Ingreso' : 'Procesar Salida'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default InventarioPage;
