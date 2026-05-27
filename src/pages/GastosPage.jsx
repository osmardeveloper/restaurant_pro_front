// ============================================================
// src/pages/GastosPage.jsx — Gestión de Egresos
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
import { gastoService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'bancolombia', label: 'Bancolombia' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'datafono', label: 'Datáfono (Tarjeta)' }
];

const GastosPage = () => {
  const { usuario } = useAuth();
  const [tab, setTab] = useState(0);
  const [gastos, setGastos] = useState([]);
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
  const [nombreBusqueda, setNombreBusqueda] = useState('');

  const fetchGastos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await gastoService.getAll();
      setGastos(res.data);
    } catch {
      setSnack({ open: true, msg: 'Error al cargar gastos.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGastos(); }, [fetchGastos]);

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
        await gastoService.update(editId, { 
          ...form, 
          monto: Number(form.monto) 
        });
        setSnack({ open: true, msg: 'Gasto actualizado correctamente.', severity: 'success' });
      } else {
        await gastoService.create({ 
          ...form, 
          monto: Number(form.monto),
          id_usuario: usuario?.id || usuario?._id 
        });
        setSnack({ open: true, msg: 'Gasto registrado correctamente.', severity: 'success' });
      }
      setModalOpen(false);
      setForm({ nombre: '', descripcion: '', metodo_pago: 'efectivo', monto: '' });
      setTab(0); // Asegurar que vemos el gasto en la pestaña de "Hoy"
      fetchGastos();
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
      await gastoService.remove(deleteId, masterKey);
      setSnack({ open: true, msg: 'Gasto eliminado correctamente.', severity: 'success' });
      setDeleteDialogOpen(false);
      fetchGastos();
    } catch (err) {
      setSnack({ open: true, msg: err.response?.data?.message || 'Clave incorrecta o error al eliminar.', severity: 'error' });
    }
  };

  const renderMetodoCelda = (g, metodo) => {
    if (g.metodo_pago === metodo) {
      return (
        <Typography variant="body2" fontWeight={600} color="error.main">
          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(g.monto)}
        </Typography>
      );
    }
    return <Typography variant="body2" color="text.secondary">—</Typography>;
  };

  // ── FILTRADO DINÁMICO ──
  const gastosFiltrados = useMemo(() => {
    return gastos.filter(g => {
      if (tab === 0) {
        // Tab Hoy
        const hoy = new Date().toLocaleDateString();
        return new Date(g.createdAt).toLocaleDateString() === hoy;
      } else {
        // Tab Periodo
        let match = true;
        if (fechaDesde) match = match && new Date(g.createdAt) >= new Date(fechaDesde + 'T00:00:00');
        if (fechaHasta) match = match && new Date(g.createdAt) <= new Date(fechaHasta + 'T23:59:59');
        if (nombreBusqueda) {
          match = match && g.nombre.toLowerCase().includes(nombreBusqueda.toLowerCase());
        }
        return match;
      }
    });
  }, [gastos, tab, fechaDesde, fechaHasta, nombreBusqueda]);

  const totalGastado = gastosFiltrados.reduce((acc, curr) => acc + (curr.monto || 0), 0);

  const totalesPorMetodo = useMemo(() => {
    const init = { efectivo: 0, bancolombia: 0, nequi: 0, daviplata: 0, datafono: 0 };
    return gastosFiltrados.reduce((acc, curr) => {
      if (acc[curr.metodo_pago] !== undefined) {
        acc[curr.metodo_pago] += curr.monto || 0;
      }
      return acc;
    }, init);
  }, [gastosFiltrados]);

  return (
    <Box>
      {/* ── HEADER ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)' }}>
            <RequestQuoteIcon sx={{ color: '#fff', display: 'block' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a1a2e">Gestión de Gastos</Typography>
            <Typography variant="body2" color="text.secondary">Control de egresos y salidas de caja</Typography>
          </Box>
        </Box>
        <Button 
          variant="contained" startIcon={<AddCircleIcon />} 
          onClick={abrirNuevo}
          sx={{ background: 'linear-gradient(135deg, #2196f3, #1976d2)', fontWeight: 700, borderRadius: 2, px: 3, alignSelf: { xs: 'stretch', sm: 'center' } }}
        >
          Nuevo Gasto
        </Button>
      </Box>

      {/* ── TABS ── */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#fafafa' }}>
          <Tabs value={tab} onChange={(e, val) => setTab(val)} textColor="primary" indicatorColor="primary" variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
            <Tab icon={<TodayIcon />} label="Gastos de hoy" iconPosition="start" sx={{ fontWeight: 600 }} />
            <Tab icon={<ViewListIcon />} label="Gastos por periodo" iconPosition="start" sx={{ fontWeight: 600 }} />
          </Tabs>
        </Box>

        <Box sx={{ p: 3 }}>
          {tab === 1 && (
            <Grid container spacing={2} sx={{ mb: 3 }} alignItems="center">
               <Grid item xs={6} md={2.5}>
                 <TextField 
                   fullWidth size="small" label="Desde" type="date" InputLabelProps={{ shrink: true }}
                   value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} 
                 />
               </Grid>
               <Grid item xs={6} md={2.5}>
                 <TextField 
                   fullWidth size="small" label="Hasta" type="date" InputLabelProps={{ shrink: true }}
                   value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} 
                 />
               </Grid>
               <Grid item xs={12} md={5}>
                 <DebouncedSearchInput 
                   fullWidth size="small" label="Buscar por nombre (ej. compra)" 
                   value={nombreBusqueda} onChange={setNombreBusqueda} 
                   delay={2000}
                 />
               </Grid>
               <Grid item xs={12} md={2}>
                 <Button fullWidth variant="outlined" color="error" onClick={() => { setFechaDesde(''); setFechaHasta(''); setNombreBusqueda(''); }}>
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
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>EGRESO NO.</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>FECHA</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>NOMBRE</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>DESCRIPCIÓN</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>REGISTRADO POR</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>EFECTIVO</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>BANCOLOMBIA</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>NEQUI</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>DAVIPLATA</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>DATÁFONO</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textAlign: 'center' }}>ACCIONES</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gastosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                        No hay gastos registrados en este periodo
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {gastosFiltrados.map(g => (
                        <TableRow key={g._id} hover>
                          <TableCell><Typography fontWeight="bold">#{g.numero_gasto}</Typography></TableCell>
                          <TableCell>{new Date(g.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                          <TableCell><Typography variant="body2" fontWeight={600}>{g.nombre}</Typography></TableCell>
                          <TableCell><Typography variant="body2" color="text.secondary">{g.descripcion || '—'}</Typography></TableCell>
                          <TableCell>
                             {g.id_usuario ? g.id_usuario.nombre : 'Sistema'}
                          </TableCell>
                          <TableCell>{renderMetodoCelda(g, 'efectivo')}</TableCell>
                          <TableCell>{renderMetodoCelda(g, 'bancolombia')}</TableCell>
                          <TableCell>{renderMetodoCelda(g, 'nequi')}</TableCell>
                          <TableCell>{renderMetodoCelda(g, 'daviplata')}</TableCell>
                          <TableCell>{renderMetodoCelda(g, 'datafono')}</TableCell>
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
                      ))}
                      <TableRow sx={{ background: 'rgba(0,0,0,0.04)', '& td': { py: 1.5 } }}>
                        <TableCell colSpan={2}></TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem' }}>TOTALES</TableCell>
                        <TableCell colSpan={2} sx={{ pr: 2 }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ fontSize: '0.65rem', lineHeight: 1 }}>
                              TOTAL GENERAL
                            </Typography>
                            <Typography variant="body2" fontWeight={800} color="error.main" sx={{ fontSize: '0.95rem', mt: 0.5 }}>
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalGastado)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'error.main' }}>
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalesPorMetodo.efectivo)}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'error.main' }}>
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalesPorMetodo.bancolombia)}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'error.main' }}>
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalesPorMetodo.nequi)}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'error.main' }}>
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalesPorMetodo.daviplata)}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, color: 'error.main' }}>
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalesPorMetodo.datafono)}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </Paper>

      {/* ── MODAL NUEVO GASTO ── */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontWeight: 700 }}>
            {editId ? 'Editar Egreso' : 'Registrar Nuevo Egreso'}
          </DialogTitle>
          <DialogContent sx={{ p: 3, mt: 2 }}>
            <TextField 
              fullWidth label="Nombre del Gasto" size="small" sx={{ mb: 2, mt: 1 }} required
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
            <Button type="submit" variant="contained" sx={{ borderRadius: 2 }}>Guardar Gasto</Button>
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

// ── COMPONENTE OPTIMIZADO PARA BÚSQUEDA FLUIDA (EVITA RE-RENDERS LENTOS EN CADA TECLA) ──
const DebouncedSearchInput = ({ value, onChange, delay = 2000, ...props }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      onChange(localValue);
    }, delay);
    return () => clearTimeout(handler);
  }, [localValue, onChange, delay]);

  return (
    <TextField
      {...props}
      value={localValue}
      onChange={e => setLocalValue(e.target.value)}
    />
  );
};

export default GastosPage;
