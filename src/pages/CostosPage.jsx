// ============================================================
// src/pages/CostosPage.jsx — Gestión de Costos
// ============================================================
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button,
  MenuItem, Select, FormControl, InputLabel, IconButton,
  Divider, Snackbar, Alert, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ViewListIcon from '@mui/icons-material/ViewList';
import TodayIcon from '@mui/icons-material/Today';
import AddCircleIcon from '@mui/icons-material/AddCircle';
// Importamos el hook de sesion y el api core
import { costoService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'bancolombia', label: 'Bancolombia' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'datafono', label: 'Datáfono (Tarjeta)' }
];

const CostosPage = () => {
  const { usuario } = useAuth();
  const [tab, setTab] = useState(0);
  const [costos, setCostos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', metodo_pago: 'efectivo', monto: '' });

  // Delete State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [masterKey, setMasterKey] = useState('');

  // Filtros Periodo
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const fetchCostos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await costoService.getAll();
      setCostos(res.data);
    } catch {
      setSnack({ open: true, msg: 'Error al cargar costos.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCostos(); }, [fetchCostos]);

  const abrirNuevo = () => {
    setEditId(null);
    setForm({ nombre: '', descripcion: '', metodo_pago: 'efectivo', monto: '' });
    setModalOpen(true);
  };

  const abrirEditar = (g) => {
    setEditId(g._id);
    setForm({ nombre: g.nombre, descripcion: g.descripcion || '', metodo_pago: g.metodo_pago, monto: g.monto });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.monto) {
      setSnack({ open: true, msg: 'Completa los campos obligatorios.', severity: 'warning' });
      return;
    }
    
    try {
      if (editId) {
        await costoService.update(editId, { 
          ...form, 
          monto: Number(form.monto) 
        });
        setSnack({ open: true, msg: 'Costo actualizado correctamente.', severity: 'success' });
      } else {
        await costoService.create({ 
          ...form, 
          monto: Number(form.monto),
          id_usuario: usuario?.id || usuario?._id 
        });
        setSnack({ open: true, msg: 'Costo registrado correctamente.', severity: 'success' });
      }
      setModalOpen(false);
      setForm({ nombre: '', descripcion: '', metodo_pago: 'efectivo', monto: '' });
      setTab(0); // Asegurar que vemos el costo en la pestaña de "Hoy"
      fetchCostos();
    } catch (err) {
      setSnack({ open: true, msg: err.response?.data?.message || 'Error al guardar.', severity: 'error' });
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setMasterKey('');
    setDeleteDialogOpen(true);
  };

  const confirmarEliminar = async () => {
    if (!masterKey) {
      setSnack({ open: true, msg: 'Ingresa la clave maestra.', severity: 'warning' });
      return;
    }
    try {
      await costoService.remove(deleteId, masterKey);
      setSnack({ open: true, msg: 'Costo eliminado correctamente.', severity: 'success' });
      setDeleteDialogOpen(false);
      fetchCostos();
    } catch (err) {
      setSnack({ open: true, msg: err.response?.data?.message || 'Clave incorrecta o error al eliminar.', severity: 'error' });
    }
  };

  // ── FILTRADO DINÁMICO ──
  const costosFiltrados = useMemo(() => {
    return costos.filter(g => {
      if (tab === 0) {
        // Tab Hoy
        const hoy = new Date().toLocaleDateString();
        return new Date(g.createdAt).toLocaleDateString() === hoy;
      } else {
        // Tab Periodo
        let match = true;
        if (fechaDesde) match = match && new Date(g.createdAt) >= new Date(fechaDesde + 'T00:00:00');
        if (fechaHasta) match = match && new Date(g.createdAt) <= new Date(fechaHasta + 'T23:59:59');
        return match;
      }
    });
  }, [costos, tab, fechaDesde, fechaHasta]);

  const totalGastado = costosFiltrados.reduce((acc, curr) => acc + (curr.monto || 0), 0);

  return (
    <Box>
      {/* ── HEADER ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)' }}>
            <RequestQuoteIcon sx={{ color: '#fff', display: 'block' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a1a2e">Gestión de Costos</Typography>
            <Typography variant="body2" color="text.secondary">Control de costos relacionados</Typography>
          </Box>
        </Box>
        <Button 
          variant="contained" startIcon={<AddCircleIcon />} 
          onClick={abrirNuevo}
          sx={{ background: 'linear-gradient(135deg, #2196f3, #1976d2)', fontWeight: 700, borderRadius: 2, px: 3 }}
        >
          Nuevo Costo
        </Button>
      </Box>

      {/* ── TABS ── */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fafafa' }}>
          <Tabs value={tab} onChange={(e, val) => setTab(val)} textColor="primary" indicatorColor="primary">
            <Tab icon={<TodayIcon />} label="Costos de hoy" iconPosition="start" sx={{ fontWeight: 600 }} />
            <Tab icon={<ViewListIcon />} label="Costos por periodo" iconPosition="start" sx={{ fontWeight: 600 }} />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {tab === 1 && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
               <Grid item xs={6} md={3}>
                 <TextField 
                   fullWidth size="small" label="Desde" type="date" InputLabelProps={{ shrink: true }}
                   value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} 
                 />
               </Grid>
               <Grid item xs={6} md={3}>
                 <TextField 
                   fullWidth size="small" label="Hasta" type="date" InputLabelProps={{ shrink: true }}
                   value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} 
                 />
               </Grid>
               <Grid item xs={12} md={2}>
                 <Button fullWidth variant="outlined" color="error" onClick={() => { setFechaDesde(''); setFechaHasta(''); }}>
                   Limpiar
                 </Button>
               </Grid>
            </Grid>
          )}

          {loading ? (
             <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
               <CircularProgress sx={{ color: '#1976d2' }} />
             </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ background: 'rgba(0,0,0,0.02)' }}>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>COSTO NO.</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>FECHA</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>NOMBRE</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>DESCRIPCIÓN</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>REGISTRADO POR</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>MÉTODO/MONTO</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textAlign: 'center' }}>ACCIONES</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {costosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No hay costos registrados en este periodo
                      </TableCell>
                    </TableRow>
                  ) : (
                    costosFiltrados.map(g => (
                      <TableRow key={g._id} hover>
                        <TableCell><Typography fontWeight="bold">#{g.numero_costo}</Typography></TableCell>
                        <TableCell>{new Date(g.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                        <TableCell><Typography variant="body2" fontWeight={600}>{g.nombre}</Typography></TableCell>
                        <TableCell><Typography variant="body2" color="text.secondary">{g.descripcion || '—'}</Typography></TableCell>
                        <TableCell>
                           {g.id_usuario ? g.id_usuario.nombre : 'Sistema'}
                        </TableCell>
                        <TableCell>
                           <Typography variant="body2" fontWeight={600} color="error.main">
                             {g.metodo_pago} - {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(g.monto)}
                           </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {usuario?.rol === 'admin' && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                              <IconButton size="small" color="primary" onClick={() => abrirEditar(g)}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error" onClick={() => handleDelete(g._id)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        <Box sx={{ p: 3, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eee' }}>
           <Paper elevation={0} sx={{ border: '1px solid #e0e0e0', borderRadius: 2, p: 2, bgcolor: '#fafafa', display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="body1" fontWeight={700} color="text.secondary">TOTAL COSTOS:</Typography>
              <Typography variant="h5" fontWeight={800} color="error.main">
                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalGastado)}
              </Typography>
           </Paper>
        </Box>
      </Paper>

      {/* ── MODAL NUEVO GASTO ── */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontWeight: 700 }}>
            {editId ? 'Editar Costo' : 'Registrar Nuevo Costo'}
          </DialogTitle>
          <DialogContent sx={{ p: 3, mt: 2 }}>
            <TextField 
              fullWidth label="Nombre del Costo" size="small" sx={{ mb: 2, mt: 1 }} required
              value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })}
            />
            <TextField 
              fullWidth label="Monto" type="number" size="small" sx={{ mb: 2 }} required
              value={form.monto} onChange={e => setForm({ ...form, monto: e.target.value })}
            />
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Método de Pago</InputLabel>
              <Select label="Método de Pago" value={form.metodo_pago} onChange={e => setForm({ ...form, metodo_pago: e.target.value })}>
                {METODOS_PAGO.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField 
              fullWidth label="Descripción (Opcional)" size="small" multiline rows={3}
              value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button onClick={() => setModalOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
            <Button type="submit" variant="contained" sx={{ borderRadius: 2 }}>Guardar Costo</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* ── MODAL ELIMINAR CON CLAVE MAESTRA ── */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            Esta acción es irreversible. Para continuar, por favor ingresa la <strong>Clave Maestra</strong> de seguridad.
          </Typography>
          <TextField 
            fullWidth label="Clave Maestra" type="password" size="small" autoComplete="off"
            value={masterKey} onChange={e => setMasterKey(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && confirmarEliminar()}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={confirmarEliminar} variant="contained" color="error" sx={{ borderRadius: 2 }}>Confirmar Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CostosPage;
