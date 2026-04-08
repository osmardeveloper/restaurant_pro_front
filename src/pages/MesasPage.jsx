// ============================================================
// src/pages/MesasPage.jsx — CRUD de Mesas con Cards y estados
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Typography, IconButton, Snackbar, Alert,
  Grid, Card, CardContent, CardActions, Chip, Tooltip,
  Select, MenuItem, FormControl, InputLabel, Autocomplete
} from '@mui/material';
import AddIcon      from '@mui/icons-material/Add';
import EditIcon     from '@mui/icons-material/Edit';
import DeleteIcon   from '@mui/icons-material/Delete';
import TableBarIcon from '@mui/icons-material/TableBar';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { mesaService, productoService, comandaService, clienteService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const estadoConfig = {
  'disponible':    { label: 'Disponible',    color: 'success' },
  'pedido tomado': { label: 'Pedido Tomado', color: 'warning' },
};

const TIPOS_DOCUMENTO = [
  { value: 'cedula_identidad', label: 'Cédula de Identidad' },
  { value: 'cedula_extranjeria', label: 'Cédula de Extranjería' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'documento_extranjero', label: 'Documento Extranjero' },
];

const FORM_INICIAL = { numero_mesa: '', estado: 'disponible', pedido_actual: [], comanda_id: null };

const MesasPage = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [mesas, setMesas]               = useState([]);
  const [platos, setPlatos]             = useState([]);
  const [clientes, setClientes]         = useState([]);
  
  const [loading, setLoading]           = useState(false);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, numero: '', masterKey: '' });
  const [editId, setEditId]             = useState(null);
  
  const [form, setForm]                 = useState(FORM_INICIAL);
  const [selectedCliente, setSelectedCliente] = useState(null);
  
  // Modal Crear Cliente Rápido
  const [openModalCliente, setOpenModalCliente] = useState(false);
  const [formCliente, setFormCliente]           = useState({ nombre: '', apellido: '', numero_documento: '', tipo_documento: '', telefono: '' });

  const [formErrors, setFormErrors]     = useState({});
  const [snack, setSnack]               = useState({ open: false, msg: '', severity: 'success' });
  const [busquedaProd, setBusquedaProd] = useState('');

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [mesasRes, productosRes, cliRes] = await Promise.all([
        mesaService.getAll(), 
        productoService.getAll(),
        clienteService.getAll()
      ]);
      setMesas(mesasRes.data);
      setPlatos(productosRes.data); 
      setClientes(cliRes.data);
    } catch {
      showSnack('Error al cargar los datos.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const validar = () => {
    const errors = {};
    if (editId) {
      if (!form.numero_mesa) errors.numero_mesa = 'El número de mesa es requerido.';
      else if (isNaN(Number(form.numero_mesa)) || Number(form.numero_mesa) < 1) errors.numero_mesa = 'Número válido requerido.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const abrirCrear = async () => {
    try {
      setLoading(true);
      await mesaService.create({});
      showSnack('Mesa creada automáticamente.');
      fetchData();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al crear la mesa.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirEditar = (mesa) => {
    setEditId(mesa._id);
    const productos = mesa.pedido_actual?.ids_productos || [];
    
    // Carga de cliente si existe
    let currentClient = null;
    if (mesa.pedido_actual?.id_cliente) {
       currentClient = clientes.find(c => c._id === mesa.pedido_actual.id_cliente._id || c._id === mesa.pedido_actual.id_cliente);
    }

    setSelectedCliente(currentClient || null);
    setForm({ 
      numero_mesa: mesa.numero_mesa, 
      estado: mesa.estado, 
      pedido_actual: productos.map(p => ({ ...p, uid: Math.random().toString(36).substr(2, 9) })),
      comanda_id: mesa.pedido_actual?._id || null
    });
    setBusquedaProd('');
    setFormErrors({});
    setDialogOpen(true);
  };

  const irAFacturar = (mesa) => {
    navigate('/facturacion', {
      state: {
        productos: mesa.pedido_actual?.ids_productos || [],
        cliente: mesa.pedido_actual?.id_cliente || null,
        comandaId: mesa.pedido_actual?._id || null
      }
    });
  };

  const agregarProducto = (prod) => {
    setForm(p => ({ ...p, pedido_actual: [...p.pedido_actual, { ...prod, uid: Math.random().toString(36).substr(2, 9) }] }));
  };

  const quitarProducto = (uid) => {
    setForm(p => ({ ...p, pedido_actual: p.pedido_actual.filter(item => item.uid !== uid) }));
  };

  const guardar = async () => {
    if (!validar()) return;
    try {
      if (editId) {
        // 1. Actualizar datos básicos de la mesa (Núm/Estado)
        const datosMesa = { numero_mesa: Number(form.numero_mesa), estado: form.estado };
        await mesaService.update(editId, datosMesa);
        
        // 2. Gestionar la Comanda (Pedido)
        if (form.comanda_id) {
          // Si ya existe comanda, actualizar productos y cliente
          await comandaService.update(form.comanda_id, { 
            ids_productos: form.pedido_actual.map(p => p._id),
            id_cliente: selectedCliente ? selectedCliente._id : null
          });
        } else if (form.pedido_actual.length > 0) {
          // Si NO existe comanda pero se agregaron productos, CREARLA
          await comandaService.create({
            id_mesa: editId,
            ids_productos: form.pedido_actual.map(p => p._id),
            id_cliente: selectedCliente ? selectedCliente._id : null,
            estado: 'abierta'
          });
        }
        
        showSnack('Mesa y pedido actualizados correctamente.');
      } 
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al guardar la edición.', 'error');
    }
  };

  const guardarCliente = async () => {
    try {
      const res = await clienteService.create(formCliente);
      setClientes(prev => [res.data, ...prev]);
      setSelectedCliente(res.data);
      setOpenModalCliente(false);
      showSnack('Cliente creado y vinculado.');
      setFormCliente({ nombre: '', apellido: '', numero_documento: '', tipo_documento: '', telefono: '' });
    } catch {
      showSnack('Error al crear el cliente.', 'error');
    }
  };

  const confirmarEliminar = async () => {
    if (!deleteDialog.masterKey) {
      showSnack('Ingresa la clave maestra.', 'warning');
      return;
    }
    try {
      await mesaService.remove(deleteDialog.id, deleteDialog.masterKey);
      showSnack('Mesa eliminada correctamente.');
      setDeleteDialog({ open: false, id: null, numero: '', masterKey: '' });
      fetchData();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Clave incorrecta o error al eliminar la mesa.', 'error');
    }
  };

  const totalEdicion = form.pedido_actual.reduce((acc, curr) => acc + (curr.precio || 0), 0);
  const prodFiltrados = platos.filter(p => (p.nombre || '').toLowerCase().includes(busquedaProd.toLowerCase()));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)' }}>
            <TableBarIcon sx={{ color: '#fff', display: 'block' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a1a2e">Mesas</Typography>
            <Typography variant="body2" color="text.secondary">
              {mesas.filter(m => m.estado === 'disponible').length} disponibles / {mesas.length} total
            </Typography>
          </Box>
        </Box>
        {usuario?.rol === 'admin' && (
          <Button id="crear-mesa-btn" variant="contained" startIcon={<AddIcon />} onClick={abrirCrear} sx={{ background: 'linear-gradient(135deg, #e94560, #c62a47)', borderRadius: 2, px: 3, boxShadow: '0 4px 14px rgba(233,69,96,0.35)' }}>
            Nueva Mesa
          </Button>
        )}
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>Cargando mesas...</Box>
      ) : mesas.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <TableBarIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
          <Typography>No hay mesas registradas aún.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {mesas.map((mesa) => {
            const hasPedido = !!mesa.pedido_actual?.ids_productos;
            const productosLength = hasPedido ? mesa.pedido_actual.ids_productos.length : 0;
            return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={mesa._id}>
              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }, borderTop: `4px solid ${mesa.estado === 'disponible' ? '#4caf50' : '#ff9800'}` }}>
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h4" fontWeight={800} color="#1a1a2e">#{mesa.numero_mesa}</Typography>
                    <Chip label={estadoConfig[mesa.estado]?.label || mesa.estado} color={estadoConfig[mesa.estado]?.color || 'default'} size="small" />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {productosLength > 0 ? `${productosLength} producto(s) en pedido` : 'Sin pedido activo'}
                  </Typography>
                  {hasPedido && (mesa.pedido_actual.ids_productos || []).slice(0, 3).map((plato, idx) => (
                    <Chip key={plato._id ? `${plato._id}-${idx}` : idx} label={plato.nombre || 'Plato'} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }} />
                  ))}
                  {productosLength > 3 && <Chip label={`+${productosLength - 3} más`} size="small" sx={{ fontSize: '0.7rem' }} />}
                </CardContent>
                <CardActions sx={{ justifyContent: 'space-between', pt: 0, px: 2, pb: 1.5 }}>
                  <Box>
                    {hasPedido && (
                      <Button size="small" variant="contained" color="success" onClick={() => irAFacturar(mesa)} startIcon={<PointOfSaleIcon />} sx={{ borderRadius: 2 }}>
                        Facturar
                      </Button>
                    )}
                  </Box>
                  <Box>
                    <Tooltip title="Editar Estado y Comanda"><IconButton id={`edit-mesa-${mesa._id}`} size="small" onClick={() => abrirEditar(mesa)} sx={{ color: '#0f3460' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    {usuario?.rol === 'admin' && (
                      <Tooltip title="Eliminar"><IconButton id={`delete-mesa-${mesa._id}`} size="small" onClick={() => setDeleteDialog({ open: true, id: mesa._id, numero: mesa.numero_mesa })} sx={{ color: '#e94560' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    )}
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          )})}
        </Grid>
      )}

      {/* Modal Crear/Editar Mesa */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3, minHeight: '80vh' } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontWeight: 700 }}>
          {editId ? `Editar Mesa #${form.numero_mesa}` : 'Nueva Mesa'}
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ p: 3, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth label="Número de mesa" value={form.numero_mesa} disabled size="small" />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small" disabled>
                  <InputLabel>Estado Físico</InputLabel>
                  <Select value={form.estado} label="Estado Físico" onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}>
                    <MenuItem value="disponible">Disponible</MenuItem>
                    <MenuItem value="pedido tomado">Pedido Tomado</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              {/* Nuevo: Selector de Cliente al Editar Comanda */}
              <Grid item xs={12} sm={7} md={8}>
                <Autocomplete
                  options={clientes}
                  style={{width: "30vw"}}
                  getOptionLabel={(o) => o ? `${o.nombre || ''} ${o.apellido || ''} ${o.numero_documento ? `(${o.numero_documento})` : ''}`.trim() : ''}
                  value={selectedCliente}
                  onChange={(_, val) => setSelectedCliente(val)}
                  renderInput={(params) => <TextField {...params} fullWidth label="Vincular Cliente (Opcional)" size="small" />}
                  noOptionsText="Cliente no encontrado"
                />
              </Grid>
              <Grid item xs={12} sm={5} md={4} lg={1} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                <Tooltip title="Nuevo Cliente">
                  <Button variant="outlined" sx={{ minWidth: 0, height: 40, borderRadius: 2 }} onClick={() => setOpenModalCliente(true)}>
                    <PersonAddIcon />
                  </Button>
                </Tooltip>
              </Grid>

            </Grid>
          </Box>
          <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Buscador de Productos (Izq) */}
            <Box sx={{ flex: 2, p: 3, borderRight: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <TextField 
                 fullWidth size="small" placeholder="Buscar producto para agregar..." 
                 value={busquedaProd} onChange={e => setBusquedaProd(e.target.value)}
                 sx={{ mb: 2 }}
              />
              <Grid container spacing={1} sx={{ overflowY: 'auto', p: 1, alignContent: 'flex-start' }}>
                {prodFiltrados.map(prod => (
                  <Grid item xs={12} sm={6} md={4} key={prod._id}>
                    <Box 
                      onClick={() => agregarProducto(prod)}
                      sx={{ p: 1.5, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: '#e94560', bgcolor: 'rgba(233,69,96,0.04)' } }}
                    >
                      <Typography variant="body2" fontWeight={700} noWrap>{prod.nombre}</Typography>
                      <Typography variant="caption" color="text.secondary" display="block">{prod.tipo}</Typography>
                      <Typography variant="body2" color="#4caf50" fontWeight={600} mt={0.5}>
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(prod.precio)}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
            
            {/* Carrito de la Mesa (Der) */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
              <Box sx={{ p: 2, bgcolor: '#f0f0f0', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <Typography variant="subtitle2" fontWeight={700}>Productos en la Mesa</Typography>
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto' }}>
                {form.pedido_actual.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" mt={4}>
                    No hay productos asignados.
                  </Typography>
                ) : (
                  form.pedido_actual.map((item, index) => (
                    <Box key={item.uid || index} sx={{ display: 'flex', alignItems: 'center', p: 1.5, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      <Box sx={{ flex: 1, overflow: 'hidden' }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{item.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(item.precio)}
                        </Typography>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => quitarProducto(item.uid)}>
                        <DeleteIcon fontSize="inherit" />
                      </IconButton>
                    </Box>
                  ))
                )}
              </Box>
              <Box sx={{ p: 2, bgcolor: '#1a1a2e', color: '#fff' }}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Gran Total</Typography>
                <Typography variant="h6" fontWeight={700}>
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalEdicion)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <Button id="cancel-mesa-btn" onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button id="save-mesa-btn" onClick={guardar} variant="contained" sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #e94560, #c62a47)' }}>{editId ? 'Actualizar' : 'Crear'}</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Crear Cliente */}
      <Dialog open={openModalCliente} onClose={() => setOpenModalCliente(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3, zIndex: 9999 } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontWeight: 700 }}>
          Crear Cliente Rápido
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth label="Nombre" value={formCliente.nombre} onChange={e => setFormCliente(p => ({ ...p, nombre: e.target.value }))} margin="normal" size="small"/>
            <TextField fullWidth label="Apellido" value={formCliente.apellido} onChange={e => setFormCliente(p => ({ ...p, apellido: e.target.value }))} margin="normal" size="small"/>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select fullWidth label="Documento" value={formCliente.tipo_documento}
              onChange={e => setFormCliente(p => ({ ...p, tipo_documento: e.target.value }))} margin="normal" size="small" SelectProps={{ native: true }}
            >
              <option value=""></option>
              {TIPOS_DOCUMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </TextField>
            <TextField fullWidth label="Número" value={formCliente.numero_documento} onChange={e => setFormCliente(p => ({ ...p, numero_documento: e.target.value }))} margin="normal" size="small"/>
          </Box>
          <TextField fullWidth label="Teléfono" value={formCliente.telefono} onChange={e => setFormCliente(p => ({ ...p, telefono: e.target.value }))} margin="normal" size="small"/>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenModalCliente(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={guardarCliente} variant="contained" sx={{ borderRadius: 2, background: '#1a1a2e' }}>Guardar y Seleccionar</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar Eliminar Mesa */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, numero: '', masterKey: '' })} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Eliminar Mesa</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            ¿Estás seguro de eliminar la <strong>Mesa #{deleteDialog.numero}</strong>? Esta acción es irreversible.
            Ingresa la <strong>Clave Maestra</strong> para confirmar:
          </Typography>
          <TextField 
            fullWidth label="Clave Maestra" type="password" size="small" autoComplete="off"
            value={deleteDialog.masterKey} onChange={e => setDeleteDialog(p => ({ ...p, masterKey: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && confirmarEliminar()}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, numero: '', masterKey: '' })} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button id="confirm-delete-mesa-btn" onClick={confirmarEliminar} variant="contained" color="error" sx={{ borderRadius: 2 }}>Confirmar Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default MesasPage;
