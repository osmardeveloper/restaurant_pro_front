// ============================================================
// src/pages/MesasPage.jsx — CRUD de Mesas con Cards y estados
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Typography, IconButton, Snackbar, Alert,
  Grid, Card, CardContent, CardActions, Chip, Tooltip, Divider,
  Select, MenuItem, FormControl, InputLabel, Autocomplete
} from '@mui/material';
import AddIcon      from '@mui/icons-material/Add';
import EditIcon     from '@mui/icons-material/Edit';
import DeleteIcon   from '@mui/icons-material/Delete';
import TableBarIcon from '@mui/icons-material/TableBar';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PrintIcon from '@mui/icons-material/Print';
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
  const [productosOriginalesIds, setProductosOriginalesIds] = useState([]); // IDs de productos que existían al abrir
  
  // Modal Crear Cliente Rápido
  const [openModalCliente, setOpenModalCliente] = useState(false);
  const [formCliente, setFormCliente]           = useState({ nombre: '', apellido: '', numero_documento: '', tipo_documento: '', telefono: '', direccion: '' });

  // Modal Propina Sugerida para Imprimir Cuenta
  const [openPropina, setOpenPropina] = useState(false);
  const [mesaPropina, setMesaPropina] = useState(null);
  const [tipoPropina, setTipoPropina] = useState('porcentaje'); // 'porcentaje' o 'monto'
  const [valorPropina, setValorPropina] = useState('');
  const [reciboDatos, setReciboDatos] = useState(null); // Estado para los datos del recibo

  // Estado para impresión de comanda
  const [comandaParaImprimir, setComandaParaImprimir] = useState(null);

  // Modal Eliminar Comanda
  const [openEliminar, setOpenEliminar] = useState(false);
  const [comandaAEliminar, setComandaAEliminar] = useState(null);
  const [claveEliminar, setClaveEliminar] = useState('');
  const CLAVE_MAESTRA = 'res2026';

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
    
    // Guardar IDs de productos originales
    setProductosOriginalesIds(productos.map(p => p._id));
    
    // Carga de cliente si existe
    let currentClient = null;
    if (mesa.pedido_actual?.id_cliente) {
       currentClient = clientes.find(c => c._id === mesa.pedido_actual.id_cliente._id || c._id === mesa.pedido_actual.id_cliente);
    }

    setSelectedCliente(currentClient || null);
    setForm({ 
      numero_mesa: mesa.numero_mesa, 
      estado: mesa.estado, 
      pedido_actual: productos.map(p => ({ ...p, uid: Math.random().toString(36).substr(2, 9), esOriginal: true })),
      comanda_id: mesa.pedido_actual?._id || null,
      observaciones: mesa.pedido_actual?.observaciones || ''
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
        comandaId: mesa.pedido_actual?._id || null,
        mesaId: mesa._id,
        tab: 3
      }
    });
  };

  const agregarProducto = (prod) => {
    setForm(p => ({ ...p, pedido_actual: [...p.pedido_actual, { ...prod, uid: Math.random().toString(36).substr(2, 9), esOriginal: false }] }));
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
            id_cliente: selectedCliente ? selectedCliente._id : null,
            observaciones: form.observaciones || ''
          });
        } else if (form.pedido_actual.length > 0) {
          // Si NO existe comanda pero se agregaron productos, CREARLA
          await comandaService.create({
            id_mesa: editId,
            ids_productos: form.pedido_actual.map(p => p._id),
            id_cliente: selectedCliente ? selectedCliente._id : null,
            estado: 'abierta',
            observaciones: form.observaciones || ''
          });
        }
        
        showSnack('Mesa y pedido actualizados correctamente.');
      } 
      setDialogOpen(false);
      setProductosOriginalesIds([]);
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
      setFormCliente({ nombre: '', apellido: '', numero_documento: '', tipo_documento: '', telefono: '', direccion: '' });
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

  const abrirModalPropina = (mesa) => {
    setMesaPropina(mesa);
    setTipoPropina('porcentaje');
    setValorPropina('');
    setOpenPropina(true);
  };

  const abrirModalEliminar = (mesa) => {
    setComandaAEliminar(mesa.pedido_actual);
    setClaveEliminar('');
    setOpenEliminar(true);
  };

  const confirmarEliminarComanda = async () => {
    if (!claveEliminar) {
      showSnack('Ingresa la clave maestra.', 'warning');
      return;
    }
    if (claveEliminar !== CLAVE_MAESTRA) {
      showSnack('Clave maestra incorrecta.', 'error');
      return;
    }
    try {
      await comandaService.remove(comandaAEliminar._id, claveEliminar);
      showSnack('Comanda de mesa eliminada correctamente.', 'success');
      setOpenEliminar(false);
      setClaveEliminar('');
      fetchData();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al eliminar la comanda.', 'error');
    }
  };

  const imprimirCuentaConPropina = () => {
    if (!valorPropina || isNaN(Number(valorPropina))) {
      showSnack('Ingresa un valor válido de propina.', 'warning');
      return;
    }

    const totalPedido = mesaPropina.pedido_actual.ids_productos.reduce((acc, p) => acc + (p.precio || 0), 0);
    const montoPropina = tipoPropina === 'porcentaje' 
      ? (totalPedido * Number(valorPropina)) / 100 
      : Number(valorPropina);

    // Actualizar estado con los datos del recibo (React renderiza)
    setReciboDatos({
      numero_mesa: mesaPropina.numero_mesa,
      productos: mesaPropina.pedido_actual.ids_productos,
      totalPedido,
      montoPropina,
      tipoPropina,
      valorPropina,
      fecha: new Date().toLocaleString('es-CO')
    });

    setOpenPropina(false);
    setValorPropina('');
    
    // Dar tiempo a React de renderizar antes de imprimir
    setTimeout(() => {
      window.print();
      // Limpiar datos después de imprimir
      setTimeout(() => {
        setReciboDatos(null);
      }, 1000);
    }, 300);
  };

  const imprimirComanda = (mesa) => {
    if (!mesa.pedido_actual?.ids_productos) return;
    
    const mesaInfo = mesa.a_domicilio ? 'Domicilio' : mesa.numero_mesa;
    const clienteInfo = mesa.pedido_actual.id_cliente 
      ? `${mesa.pedido_actual.id_cliente.nombre} ${mesa.pedido_actual.id_cliente.apellido}` 
      : 'Consumidor Final';

    setComandaParaImprimir({
      mesa: mesaInfo,
      cliente: clienteInfo,
      productos: mesa.pedido_actual.ids_productos || [],
      fecha: new Date().toLocaleString('es-MX'),
      a_domicilio: mesa.a_domicilio || false,
      observaciones: mesa.pedido_actual.observaciones || ''
    });

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setComandaParaImprimir(null);
      }, 1000);
    }, 300);
  };

  const totalEdicion = form.pedido_actual.reduce((acc, curr) => acc + (curr.precio || 0), 0);
  const prodFiltrados = platos.filter(p => (p.nombre || '').toLowerCase().includes(busquedaProd.toLowerCase()));
  const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

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
            const productosPedido = hasPedido ? mesa.pedido_actual.ids_productos : [];
            const productosLength = productosPedido.length;
            const totalPedido = productosPedido.reduce((acc, producto) => acc + (producto.precio || 0), 0);
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
                  {productosLength > 0 && (
                    <Box sx={{ mb: 1.25, px: 1.5, py: 1, borderRadius: 2, bgcolor: '#edfaf0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" fontWeight={800} color="success.dark">Total pedido</Typography>
                      <Typography variant="body2" fontWeight={900} color="success.dark">
                        {formatoCOP.format(totalPedido)}
                      </Typography>
                    </Box>
                  )}
                  {hasPedido && productosPedido.slice(0, 3).map((plato, idx) => (
                    <Chip key={plato._id ? `${plato._id}-${idx}` : idx} label={plato.nombre || 'Plato'} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }} />
                  ))}
                  {productosLength > 3 && <Chip label={`+${productosLength - 3} más`} size="small" sx={{ fontSize: '0.7rem' }} />}
                </CardContent>
                <CardActions sx={{ flexDirection: 'column', gap: 1, pt: 0, px: 2, pb: 1.5 }}>
                  <Box sx={{ width: '100%', display: 'flex', gap: 1 }}>
                    {hasPedido && (
                      <>
                        <Button size="small" variant="outlined" onClick={() => imprimirComanda(mesa)} startIcon={<PrintIcon />} sx={{ borderRadius: 2, flex: 1 }} title="Imprimir Comanda de Cocina">
                          Comanda
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => abrirModalPropina(mesa)} startIcon={<PrintIcon />} sx={{ borderRadius: 2, flex: 1 }}>
                          Cuenta
                        </Button>
                        <Button size="small" variant="contained" color="success" onClick={() => irAFacturar(mesa)} startIcon={<PointOfSaleIcon />} sx={{ borderRadius: 2, flex: 1 }}>
                          Facturar
                        </Button>
                      </>
                    )}
                  </Box>
                  <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start', gap: 0.5 }}>
                    <Tooltip title="Editar Estado y Comanda"><IconButton id={`edit-mesa-${mesa._id}`} size="small" onClick={() => abrirEditar(mesa)} sx={{ color: '#0f3460' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    {usuario?.rol === 'admin' && (
                      <Tooltip title="Eliminar Comanda"><IconButton size="small" onClick={() => abrirModalEliminar(mesa)} sx={{ color: '#e74c3c' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    )}
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          )})}
        </Grid>
      )}

      {/* Modal Crear/Editar Mesa */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setProductosOriginalesIds([]); }} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3, minHeight: '80vh' } }}>
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
              <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Observaciones"
                  placeholder='Ej: "el menú ejecutivo va sin arroz"'
                  value={form.observaciones || ''}
                  onChange={(e) => setForm(p => ({ ...p, observaciones: e.target.value }))}
                />
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
                      <Tooltip title={item.esOriginal && usuario?.rol !== 'admin' ? 'No puedes eliminar productos existentes' : ''}>
                        <span>
                          <IconButton size="small" color="error" onClick={() => quitarProducto(item.uid)} disabled={item.esOriginal && usuario?.rol !== 'admin'}>
                            <DeleteIcon fontSize="inherit" />
                          </IconButton>
                        </span>
                      </Tooltip>
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
          <TextField 
            fullWidth 
            label="Dirección"
            value={formCliente.direccion} 
            onChange={e => setFormCliente(p => ({ ...p, direccion: e.target.value }))} 
            margin="normal" 
            size="small"
            placeholder="Calle, número, apartamento..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenModalCliente(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={guardarCliente} variant="contained" sx={{ borderRadius: 2, background: '#1a1a2e' }}>Guardar y Seleccionar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Eliminar Comanda */}
      <Dialog open={openEliminar} onClose={() => setOpenEliminar(false)} sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: '#e74c3c' }}>Eliminar Comanda</DialogTitle>
        <DialogContent sx={{ minWidth: 400, py: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>Ingresa la clave maestra para eliminar esta comanda.</Typography>
          <TextField 
            fullWidth 
            type="password" 
            label="Clave Maestra" 
            value={claveEliminar}
            onChange={e => setClaveEliminar(e.target.value)}
            placeholder="Ingresa la clave"
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEliminar(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={confirmarEliminarComanda} variant="contained" color="error" sx={{ borderRadius: 2 }}>Eliminar</Button>
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

      {/* Propina Sugerida para Imprimir Cuenta */}
      <Dialog open={openPropina} onClose={() => { setOpenPropina(false); setValorPropina(''); }} PaperProps={{ sx: { borderRadius: 3, minWidth: 400 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Propina</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <FormControl fullWidth size="small" sx={{ mb: 2, mt: 2 }}>
            <InputLabel>Tipo de Propina</InputLabel>
            <Select value={tipoPropina} label="Tipo de Propina" onChange={e => setTipoPropina(e.target.value)}>
              <MenuItem value="porcentaje">Porcentaje (%)</MenuItem>
              <MenuItem value="monto">Monto Fijo ($)</MenuItem>
            </Select>
          </FormControl>
          <TextField 
            fullWidth
            label={tipoPropina === 'porcentaje' ? 'Porcentaje (%)' : 'Monto ($)'}
            type="number"
            size="small"
            value={valorPropina}
            onChange={e => setValorPropina(e.target.value)}
            placeholder={tipoPropina === 'porcentaje' ? '10' : '5000'}
            autoFocus
            onKeyPress={(e) => e.key === 'Enter' && imprimirCuentaConPropina()}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => { setOpenPropina(false); setValorPropina(''); }} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={() => { imprimirCuentaConPropina(); setOpenPropina(false); setValorPropina(''); }} variant="contained" sx={{ borderRadius: 2, background: '#1a1a2e' }}>Imprimir</Button>
        </DialogActions>
      </Dialog>

      {/* Contenedor de Impresión - Recibo de Cuenta */}
      {reciboDatos && (
        <Box className="print-only">
          <style>
            {`
              .print-only { display: none; }
              @media print {
                html, body, #root { 
                  height: auto !important; 
                  min-height: 0 !important; 
                  margin: 0 !important; 
                  padding: 0 !important; 
                  overflow: hidden !important; 
                  background: white !important;
                }
                body * { visibility: hidden !important; }
                .print-only, .print-only * { visibility: visible !important; }
                .print-only { 
                   display: block !important; 
                   position: absolute !important; 
                   left: 0 !important; 
                   top: 0 !important; 
                   width: 80mm !important; 
                   padding: 3mm !important;
                   font-family: 'Courier New', monospace !important; 
                   font-size: 11px !important; 
                   color: #000 !important; 
                   box-sizing: border-box !important; 
                }
                @page { size: 80mm auto; margin: 0; }
              }
            `}
          </style>

          {/* ENCABEZADO */}
          <Box sx={{ textAlign: 'center', marginBottom: '2mm', fontWeight: 'bold' }}>
            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'center' }}>
              <img src="/images/logo_factura.png" alt="Logo" style={{ maxWidth: '50mm', height: 'auto' }} />
            </Box>
            <Typography fontWeight="bold" fontSize="14px">LA PERLA RESTAURANTE BQ</Typography>
            <Typography fontSize="10px">Dir.: cra 62 # 72-28</Typography>
            <Typography fontSize="10px">Telf.: 315 075 2214</Typography>
            <Typography fontSize="10px">{reciboDatos.fecha}</Typography>
            <Typography fontSize="10px" fontWeight="bold">Recibo de Cuenta - Mesa #{reciboDatos.numero_mesa}</Typography>
          </Box>

          <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: '#000' }} />

          {/* PRODUCTOS */}
          <Box sx={{ margin: '1.5mm 0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px solid #000', padding: '0.5mm 0', marginBottom: '1mm', fontWeight: 'bold' }}>
              <span>DESCRIPCIÓN</span>
              <span>TOTAL</span>
            </Box>
            {(reciboDatos.productos || []).map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', margin: '0.3mm 0', fontSize: '11px' }}>
                <span style={{ flex: 1 }}>1x {(item.nombre || 'Producto').substring(0, 35)}</span>
                <span style={{ flexGrow: 1, borderBottom: '1px dotted #000', margin: '0 1mm' }}></span>
                <span style={{ textAlign: 'right', whiteSpace: 'nowrap', fontSize: '11px', marginLeft: '2mm' }}>${(item.precio || 0).toLocaleString('es-CO')}</span>
              </Box>
            ))}
          </Box>

          <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: '#000' }} />

          {/* SUBTOTAL */}
          <Box sx={{ margin: '1.5mm 0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '12px' }}>
              <span>SUBTOTAL</span>
              <span>${reciboDatos.totalPedido.toLocaleString('es-CO')}</span>
            </Box>
          </Box>

          {/* PROPINA */}
          <Box sx={{ margin: '0.8mm 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontSize="11px">Propina</Typography>
            <Typography fontSize="11px">${reciboDatos.montoPropina.toLocaleString('es-CO')}</Typography>
          </Box>

          <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: '#000' }} />

          {/* FOOTER */}
          <Typography sx={{ textAlign: 'center', fontWeight: 'bold', marginTop: '2mm', fontSize: '11px' }}>
            ¡GRACIAS POR SU VISITA!
          </Typography>
        </Box>
      )}

      {/* COMPONENTE DE IMPRESIÓN DE COMANDA (OCULTO) */}
      {comandaParaImprimir && (
        <Box className="print-only">
          <style>
            {`
              .print-only { display: none; }
              @media print {
                html, body, #root { height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
                body * { visibility: hidden !important; }
                .print-only, .print-only * { visibility: visible !important; }
                .print-only { 
                   display: block !important; 
                   position: absolute !important; 
                   left: 0 !important; top: 0 !important; 
                   width: 78mm !important; 
                   padding: 5mm !important;
                   font-family: 'Courier New', Courier, monospace !important; 
                   font-size: 14px !important; 
                   color: #000 !important; 
                   box-sizing: border-box !important; 
                }
                @page { size: auto; margin: 0; }
              }
            `}
          </style>
          <Box textAlign="center" mb={1}>
            <Typography variant="h6" fontWeight="bold" sx={{ fontSize: '20px' }}>COMANDA DE COCINA</Typography>
            <Typography fontSize="14px">--------------------------------</Typography>
            <Typography fontSize="16px" fontWeight="bold">
              {comandaParaImprimir.a_domicilio ? 'PEDIDO A DOMICILIO' : `MESA #${comandaParaImprimir.mesa}`}
            </Typography>
            <Typography fontSize="14px">--------------------------------</Typography>
          </Box>

          <Box mb={2}>
            <Typography fontSize="13px"><strong>Cliente:</strong> {comandaParaImprimir.cliente}</Typography>
            <Typography fontSize="13px"><strong>Fecha:</strong> {comandaParaImprimir.fecha}</Typography>
          </Box>

          <Box sx={{ borderBottom: '1px solid #000', mb: 1, pb: 0.5 }}>
            <Typography fontSize="14px" fontWeight="bold">PRODUCTOS</Typography>
          </Box>

          <Box mb={2}>
            {comandaParaImprimir.productos.map((item, i) => (
              <Box key={i} sx={{ display: 'flex', mb: 0.5 }}>
                <Typography fontSize="14px" sx={{ fontWeight: 'bold', mr: 1 }}>1x</Typography>
                <Typography fontSize="14px" sx={{ textTransform: 'uppercase' }}>{item.nombre}</Typography>
              </Box>
            ))}
          </Box>

          {comandaParaImprimir.observaciones ? (
            <Box sx={{ mt: 1, p: 1, border: '1px dashed #000', borderRadius: 1 }}>
              <Typography fontSize="13px"><strong>Observaciones:</strong> {comandaParaImprimir.observaciones}</Typography>
            </Box>
          ) : null}

          <Box mt={3} textAlign="center">
            <Typography fontSize="14px">--------------------------------</Typography>
            <Typography fontSize="12px" sx={{ fontStyle: 'italic' }}>Sistema de Gestión de Restaurante</Typography>
          </Box>
        </Box>
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default MesasPage;
