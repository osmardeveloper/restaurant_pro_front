// ============================================================
// src/pages/VentaDirectaPage.jsx — Vista de Ventas Directas
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Typography, IconButton, Snackbar, Alert,
  Grid, Card, CardContent, CardActions, Chip, Tooltip, Divider,
  Select, MenuItem, FormControl, InputLabel, Autocomplete
} from '@mui/material';
import AddIcon          from '@mui/icons-material/Add';
import EditIcon         from '@mui/icons-material/Edit';
import DeleteIcon       from '@mui/icons-material/Delete';
import StorefrontIcon   from '@mui/icons-material/Storefront';
import PointOfSaleIcon  from '@mui/icons-material/PointOfSale';
import PersonAddIcon    from '@mui/icons-material/PersonAdd';
import PrintIcon        from '@mui/icons-material/Print';
import { productoService, comandaService, clienteService, facturacionService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TIPOS_DOCUMENTO = [
  { value: 'cedula_identidad', label: 'Cédula de Identidad' },
  { value: 'cedula_extranjeria', label: 'Cédula de Extranjería' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'documento_extranjero', label: 'Documento Extranjero' },
];

const FORM_INICIAL = { estado: 'disponible', pedido_actual: [], comanda_id: null };

const VentaDirectaPage = () => {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [comandas, setComandas]         = useState([]);
  const [platos, setPlatos]             = useState([]);
  const [clientes, setClientes]         = useState([]);
  
  const [loading, setLoading]           = useState(false);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editId, setEditId]             = useState(null);
  
  const [form, setForm]                 = useState(FORM_INICIAL);
  const [selectedCliente, setSelectedCliente] = useState(null);
  
  // Modal Crear Cliente Rápido
  const [openModalCliente, setOpenModalCliente] = useState(false);
  const [formCliente, setFormCliente]           = useState({ nombre: '', apellido: '', numero_documento: '', tipo_documento: '', telefono: '', direccion: '' });

  // Modal Propina Sugerida para Imprimir Cuenta
  const [openPropina, setOpenPropina] = useState(false);
  const [comandaPropina, setComandaPropina] = useState(null);
  const [tipoPropina, setTipoPropina] = useState('porcentaje');
  const [valorPropina, setValorPropina] = useState('');
  const [reciboDatos, setReciboDatos] = useState(null);

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
      const [comandasRes, productosRes, cliRes] = await Promise.all([
        comandaService.getAll(), 
        productoService.getAll(),
        clienteService.getAll()
      ]);
      // Filtrar: solo comandas venta_directa y NO facturadas
      const ventasDirectas = comandasRes.data.filter(c => c.venta_directa === true && c.facturada === false);
      setComandas(ventasDirectas);
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
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const abrirEditar = (comanda) => {
    setEditId(comanda._id);
    const productos = comanda.ids_productos || [];
    
    let currentClient = null;
    if (comanda.id_cliente) {
       currentClient = clientes.find(c => c._id === comanda.id_cliente._id || c._id === comanda.id_cliente);
    }

    setSelectedCliente(currentClient || null);
    setForm({ 
      estado: 'pedido tomado',
      pedido_actual: productos.map(p => ({ ...p, uid: Math.random().toString(36).substr(2, 9) })),
      comanda_id: comanda._id || null
    });
    setBusquedaProd('');
    setFormErrors({});
    setDialogOpen(true);
  };

  const irAFacturar = (comanda) => {
    navigate('/facturacion', {
      state: {
        productos: comanda.ids_productos || [],
        cliente: comanda.id_cliente || null,
        comandaId: comanda._id,
        venta_directa: true,
        tab: 3
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
        await comandaService.update(editId, { 
          ids_productos: form.pedido_actual.map(p => p._id),
          id_cliente: selectedCliente ? selectedCliente._id : null
        });
        showSnack('Venta Directa y pedido actualizados correctamente.');
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
      setFormCliente({ nombre: '', apellido: '', numero_documento: '', tipo_documento: '', telefono: '', direccion: '' });
    } catch {
      showSnack('Error al crear el cliente.', 'error');
    }
  };

  const abrirModalPropina = (comanda) => {
    setComandaPropina(comanda);
    setTipoPropina('porcentaje');
    setValorPropina('');
    setOpenPropina(true);
  };

  const imprimirCuentaConPropina = () => {
    if (!valorPropina || isNaN(Number(valorPropina))) {
      showSnack('Ingresa un valor válido de propina.', 'warning');
      return;
    }

    const totalPedido = comandaPropina.ids_productos.reduce((acc, p) => acc + (p.precio || 0), 0);
    const montoPropina = tipoPropina === 'porcentaje' 
      ? (totalPedido * Number(valorPropina)) / 100 
      : Number(valorPropina);

    // Preparar datos para imprimir recibo (sin crear factura)
    setReciboDatos({
      productos: comandaPropina.ids_productos,
      totalPedido,
      montoPropina,
      tipoPropina,
      valorPropina,
      fecha: new Date().toLocaleString('es-CO')
    });

    setOpenPropina(false);
    setValorPropina('');
    
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setReciboDatos(null);
      }, 1000);
    }, 300);
  };

  const imprimirComanda = (comanda) => {
    if (!comanda.ids_productos) return;
    
    const clienteInfo = comanda.id_cliente 
      ? `${comanda.id_cliente.nombre} ${comanda.id_cliente.apellido}` 
      : 'Consumidor Final';

    setComandaParaImprimir({
      cliente: clienteInfo,
      productos: comanda.ids_productos || [],
      fecha: new Date().toLocaleString('es-MX'),
      venta_directa: true,
      mesa: 'Venta Directa'
    });

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setComandaParaImprimir(null);
      }, 1000);
    }, 300);
  };

  const abrirModalEliminar = (comanda) => {
    setComandaAEliminar(comanda);
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
      showSnack('Comanda eliminada correctamente.', 'success');
      setOpenEliminar(false);
      setClaveEliminar('');
      fetchData();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al eliminar la comanda.', 'error');
    }
  };

  const totalEdicion = form.pedido_actual.reduce((acc, curr) => acc + (curr.precio || 0), 0);
  const prodFiltrados = platos.filter(p => (p.nombre || '').toLowerCase().includes(busquedaProd.toLowerCase()));
  const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #4caf50, #388e3c)' }}>
            <StorefrontIcon sx={{ color: '#fff', display: 'block' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a1a2e">Ventas Directas</Typography>
            <Typography variant="body2" color="text.secondary">{comandas.length} venta(s) activa(s)</Typography>
          </Box>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>Cargando ventas directas...</Box>
      ) : comandas.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
          <StorefrontIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
          <Typography>No hay ventas directas activas.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {comandas.map((comanda) => {
            const hasPedido = !!comanda.ids_productos;
            const productosPedido = hasPedido ? comanda.ids_productos : [];
            const productosLength = productosPedido.length;
            const totalPedido = productosPedido.reduce((acc, producto) => acc + (producto.precio || 0), 0);
            return (
            <Grid item xs={12} sm={6} md={4} lg={3} key={comanda._id}>
              <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', transition: 'all 0.2s ease', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }, borderTop: '4px solid #4caf50' }}>
                <CardContent sx={{ pb: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" fontWeight={800} color="#1a1a2e">Venta Directa</Typography>
                    <Chip label="ACTIVO" color="success" size="small" />
                  </Box>
                  {comanda.id_cliente && (
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                      👤 {comanda.id_cliente.nombre} {comanda.id_cliente.apellido}
                    </Typography>
                  )}
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {productosLength > 0 ? `${productosLength} producto(s) en pedido` : 'Sin productos'}
                  </Typography>
                  {productosLength > 0 && (
                    <Box sx={{ mb: 1.25, px: 1.5, py: 1, borderRadius: 2, bgcolor: '#e8f5e9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                      <Typography variant="caption" fontWeight={800} color="#2e7d32">Total pedido</Typography>
                      <Typography variant="body2" fontWeight={900} color="#2e7d32">
                        {formatoCOP.format(totalPedido)}
                      </Typography>
                    </Box>
                  )}
                  {hasPedido && productosPedido.slice(0, 3).map((plato, idx) => (
                    <Chip key={plato._id ? `${plato._id}-${idx}` : idx} label={plato.nombre || 'Producto'} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }} />
                  ))}
                  {productosLength > 3 && <Chip label={`+${productosLength - 3} más`} size="small" sx={{ fontSize: '0.7rem' }} />}
                </CardContent>
                <CardActions sx={{ flexDirection: 'column', gap: 1, pt: 0, px: 2, pb: 1.5 }}>
                  <Box sx={{ width: '100%', display: 'flex', gap: 1 }}>
                    {hasPedido && (
                      <>
                        <Button size="small" variant="outlined" onClick={() => imprimirComanda(comanda)} startIcon={<PrintIcon />} sx={{ borderRadius: 2, flex: 1 }} title="Imprimir Comanda de Cocina">
                          Comanda
                        </Button>
                        <Button size="small" variant="outlined" onClick={() => abrirModalPropina(comanda)} startIcon={<PrintIcon />} sx={{ borderRadius: 2, flex: 1 }}>
                          Cuenta
                        </Button>
                        <Button size="small" variant="contained" color="success" onClick={() => irAFacturar(comanda)} startIcon={<PointOfSaleIcon />} sx={{ borderRadius: 2, flex: 1 }}>
                          Facturar
                        </Button>
                      </>
                    )}
                  </Box>
                  <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start', gap: 0.5 }}>
                    {usuario?.rol === 'admin' && (
                      <>
                        <Tooltip title="Editar Venta Directa"><IconButton size="small" onClick={() => abrirEditar(comanda)} sx={{ color: '#4caf50' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Eliminar Comanda"><IconButton size="small" onClick={() => abrirModalEliminar(comanda)} sx={{ color: '#e74c3c' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                      </>
                    )}
                  </Box>
                </CardActions>
              </Card>
            </Grid>
          )})}
        </Grid>
      )}

      {/* Modal Editar Venta Directa */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3, minHeight: '80vh' } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #4caf50, #388e3c)', color: '#fff', fontWeight: 700 }}>
          Editar Venta Directa
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <Box sx={{ p: 3, borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <Grid container spacing={2}>
              {/* Selector de Cliente */}
              <Grid item xs={12} sm={7} md={9}>
                <Autocomplete
                  options={clientes}
                  getOptionLabel={(o) => o ? `${o.nombre || ''} ${o.apellido || ''} ${o.numero_documento ? `(${o.numero_documento})` : ''}`.trim() : ''}
                  value={selectedCliente}
                  onChange={(_, val) => setSelectedCliente(val)}
                  renderInput={(params) => <TextField {...params} fullWidth label="Vincular Cliente (Opcional)" size="small" />}
                  noOptionsText="Cliente no encontrado"
                />
              </Grid>
              <Grid item xs={12} sm={5} md={3} sx={{ display: 'flex', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
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
                      sx={{ p: 1.5, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: '#4caf50', bgcolor: 'rgba(76,175,80,0.04)' } }}
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
            
            {/* Carrito de la Venta Directa (Der) */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#fafafa' }}>
              <Box sx={{ p: 2, bgcolor: '#f0f0f0', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <Typography variant="subtitle2" fontWeight={700}>Productos del Pedido</Typography>
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto' }}>
                {form.pedido_actual.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" mt={4}>
                    Esta venta no tiene productos.
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
              <Box sx={{ p: 2, bgcolor: '#4caf50', color: '#fff' }}>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Total Venta</Typography>
                <Typography variant="h6" fontWeight={700}>
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalEdicion)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={guardar} variant="contained" sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #4caf50, #388e3c)' }}>Actualizar Venta</Button>
        </DialogActions>
      </Dialog>

      {/* Modal Crear Cliente Rápido */}
      <Dialog open={openModalCliente} onClose={() => setOpenModalCliente(false)} sx={{ '& .MuiDialog-paper': { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Nuevo Cliente</DialogTitle>
        <DialogContent sx={{ minWidth: 350, my: 2 }}>
          <TextField 
            fullWidth label="Nombre" size="small" 
            value={formCliente.nombre} onChange={e => setFormCliente({...formCliente, nombre: e.target.value})}
            sx={{ mb: 1.5 }}
          />
          <TextField 
            fullWidth label="Apellido" size="small" 
            value={formCliente.apellido} onChange={e => setFormCliente({...formCliente, apellido: e.target.value})}
            sx={{ mb: 1.5 }}
          />
          <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
            <InputLabel>Tipo Documento</InputLabel>
            <Select value={formCliente.tipo_documento} onChange={e => setFormCliente({...formCliente, tipo_documento: e.target.value})} label="Tipo Documento">
              {TIPOS_DOCUMENTO.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField 
            fullWidth label="Número Documento" size="small" 
            value={formCliente.numero_documento} onChange={e => setFormCliente({...formCliente, numero_documento: e.target.value})}
            sx={{ mb: 1.5 }}
          />
          <TextField 
            fullWidth label="Teléfono" size="small" 
            value={formCliente.telefono} onChange={e => setFormCliente({...formCliente, telefono: e.target.value})}
          />
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenModalCliente(false)}>Cancelar</Button><Button onClick={guardarCliente} variant="contained">Guardar</Button></DialogActions>
      </Dialog>

      {/* Modal Propina */}
      <Dialog open={openPropina} onClose={() => setOpenPropina(false)}>
        <DialogTitle fontWeight={700}>Propina</DialogTitle>
        <DialogContent sx={{ minWidth: 350, py: 2 }}>
          <FormControl fullWidth size="small" sx={{ mb: 2, mt: 2 }}>
            <InputLabel>Tipo</InputLabel>
            <Select value={tipoPropina} onChange={e => setTipoPropina(e.target.value)} label="Tipo">
              <MenuItem value="porcentaje">Porcentaje (%)</MenuItem>
              <MenuItem value="monto">Monto ($)</MenuItem>
            </Select>
          </FormControl>
          <TextField 
            fullWidth label={tipoPropina === 'porcentaje' ? 'Porcentaje' : 'Monto'} type="number" 
            value={valorPropina} onChange={e => setValorPropina(e.target.value)}
          />
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenPropina(false)}>Cancelar</Button><Button onClick={imprimirCuentaConPropina} variant="contained">Imprimir Cuenta</Button></DialogActions>
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

      {/* Impresión Recibo Venta Directa */}
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
            <Typography fontSize="10px" fontWeight="bold">Recibo de Cuenta - VENTA DIRECTA</Typography>
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

          {/* PROPINA */}
          <Box sx={{ margin: '0.8mm 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontSize="11px">Propina</Typography>
            <Typography fontSize="11px">${reciboDatos.montoPropina.toLocaleString('es-CO')}</Typography>
          </Box>

          <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: '#000' }} />

          {/* TOTAL */}
          <Box sx={{ margin: '1.5mm 0' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px' }}>
              <span>TOTAL</span>
              <span>${(reciboDatos.totalPedido + reciboDatos.montoPropina).toLocaleString('es-CO')}</span>
            </Box>
          </Box>

          <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: '#000' }} />

          {/* FOOTER */}
          <Typography sx={{ textAlign: 'center', fontWeight: 'bold', marginTop: '2mm', fontSize: '11px' }}>
            ¡GRACIAS POR SU COMPRA!
          </Typography>
        </Box>
      )}

      {/* Impresión Comanda de Cocina - Venta Directa */}
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
              VENTA DIRECTA
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

          <Box mt={3} textAlign="center">
            <Typography fontSize="14px">--------------------------------</Typography>
            <Typography fontSize="12px" sx={{ fontStyle: 'italic' }}>Sistema de Gestión de Restaurante</Typography>
          </Box>
        </Box>
      )}

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack({ ...snack, open: false })}>
        <Alert severity={snack.severity} sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default VentaDirectaPage;
