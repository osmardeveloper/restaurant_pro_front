// ============================================================
// src/pages/TomarPedidoPage.jsx — Módulo interactivo de Pedidos
// ============================================================
import { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Paper, Grid, Divider, Autocomplete, TextField,
  IconButton, List, ListItem, ListItemText, ListItemSecondaryAction,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Chip,
  InputAdornment, Card, CardContent, CardActionArea, Tooltip
} from '@mui/material';
import DeleteIcon       from '@mui/icons-material/Delete';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import PostAddIcon      from '@mui/icons-material/PostAdd';
import PersonAddIcon    from '@mui/icons-material/PersonAdd';
import SearchIcon       from '@mui/icons-material/Search';
import { clienteService, mesaService, productoService, comandaService } from '../services/api';

const TIPOS_DOCUMENTO = [
  { value: 'cedula_identidad', label: 'Cédula de Identidad' },
  { value: 'cedula_extranjeria', label: 'Cédula de Extranjería' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'documento_extranjero', label: 'Documento Extranjero' },
];

const TomarPedidoPage = () => {
  const [clientes,  setClientes]  = useState([]);
  const [mesas,     setMesas]     = useState([]);
  const [productos, setProductos] = useState([]);
  
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [selectedMesa,    setSelectedMesa]    = useState(null);
  const [carrito,         setCarrito]         = useState([]);
  
  const [busquedaProd, setBusquedaProd] = useState('');
  
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  
  // Modal Crear Cliente Rápido
  const [openModalCliente, setOpenModalCliente] = useState(false);
  const [formCliente, setFormCliente]           = useState({ nombre: '', apellido: '', numero_documento: '', tipo_documento: '', telefono: '' });

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resCli, resMes, resProd] = await Promise.all([
          clienteService.getAll(),
          mesaService.getAll(),
          productoService.getAll()
        ]);
        setClientes(resCli.data);
        // Filtramos solo mesas disponibles y las ordenamos
        setMesas(resMes.data.filter(m => m.estado === 'disponible').sort((a,b) => a.numero_mesa - b.numero_mesa));
        setProductos(resProd.data);
      } catch (err) {
        showSnack('Error cargando la base de datos para los pedidos.', 'error');
      }
    };
    fetchData();
  }, []);

  // Agregar al carrito
  const agregarProducto = (prod) => {
    setCarrito(prev => [...prev, { ...prod, uid: Math.random().toString(36).substr(2, 9) }]);
  };

  // Quitar del carrito
  const quitarProducto = (uid) => {
    setCarrito(prev => prev.filter(item => item.uid !== uid));
  };

  // Crear Cliente Rápido
  const guardarCliente = async () => {
    try {
      const res = await clienteService.create(formCliente);
      setClientes(prev => [res.data, ...prev]);
      setSelectedCliente(res.data);
      setOpenModalCliente(false);
      showSnack('Cliente creado y seleccionado.');
      setFormCliente({ nombre: '', apellido: '', numero_documento: '', tipo_documento: '', telefono: '' });
    } catch {
      showSnack('Error al crear el cliente.', 'error');
    }
  };

  // Guardar la Comanda
  const enviarPedido = async () => {
    if (!selectedMesa) {
      return showSnack('Debes seleccionar una mesa.', 'warning');
    }
    if (carrito.length === 0) {
      return showSnack('El carrito está vacío.', 'warning');
    }

    try {
      const datos = {
        id_mesa: selectedMesa._id,
        id_cliente: selectedCliente ? selectedCliente._id : undefined,
        ids_productos: carrito.map(p => p._id) // Múltiples referencias al ID del producto
      };
      await comandaService.create(datos);
      showSnack('Pedido (comanda) creado exitosamente.');
      
      // Reset
      setSelectedCliente(null);
      setSelectedMesa(null);
      setCarrito([]);
      
      // Actualizar mesas disponibles (sacar la que recién usamos)
      setMesas(prev => prev.filter(m => m._id !== selectedMesa._id));
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al guardar la comanda.', 'error');
    }
  };

  const total = carrito.reduce((acc, curr) => acc + (curr.precio || 0), 0);
  const prodFiltrados = productos.filter(p => (p.nombre || '').toLowerCase().includes((busquedaProd || '').toLowerCase()));

  return (
    <Box sx={{ pb: 5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)' }}>
          <PostAddIcon sx={{ color: '#fff', display: 'block' }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#1a1a2e">Tomar Pedido</Typography>
          <Typography variant="body2" color="text.secondary">Gestión rápida de comandas en sala</Typography>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Columna Izquierda: Selección */}
        <Grid item xs={12} md={7} lg={8}>
          
          {/* Selección de Mesa */}
          <Paper elevation={0} sx={{ p: 3, mb: 2, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Mesa de Destino</Typography>
            <Autocomplete
              options={mesas}
              getOptionLabel={(option) => option ? `Mesa #${option.numero_mesa}` : ''}
              value={selectedMesa}
              onChange={(_, val) => setSelectedMesa(val)}
              renderInput={(params) => <TextField {...params} label="Seleccionar Mesa (Solo Libres) *" size="small" />}
              noOptionsText="Sin mesas libres"
            />
          </Paper>

          {/* Información del Cliente */}
          <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Datos del Cliente</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={10}>
                <Autocomplete
                  options={clientes}
                  getOptionLabel={(o) => o ? `${o.nombre || ''} ${o.apellido || ''} ${o.numero_documento ? `(${o.numero_documento})` : ''}`.trim() : ''}
                  value={selectedCliente}
                  onChange={(_, val) => setSelectedCliente(val)}
                  renderInput={(params) => <TextField {...params} label="Buscar Cliente (Opcional)" size="small" />}
                  noOptionsText="Cliente no encontrado"
                />
              </Grid>
              <Grid item xs={12} sm={2} sx={{ display: 'flex' }}>
                <Tooltip title="Nuevo Cliente">
                  <Button fullWidth variant="outlined" sx={{ borderRadius: 2 }} onClick={() => setOpenModalCliente(true)}>
                    <PersonAddIcon />
                  </Button>
                </Tooltip>
              </Grid>
            </Grid>
          </Paper>

          {/* Menú de Productos */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>Menú de Productos</Typography>
              <TextField 
                size="small" 
                placeholder="Buscar producto..." 
                value={busquedaProd}
                onChange={e => setBusquedaProd(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              />
            </Box>
            <Grid container spacing={2} sx={{ maxHeight: 500, overflowY: 'auto', p: 1 }}>
              {prodFiltrados.map(prod => (
                <Grid item xs={12} sm={6} md={4} key={prod._id}>
                  <Card elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 3, transition: 'all 0.2s', '&:hover': { borderColor: '#e94560', transform: 'translateY(-2px)' } }}>
                    <CardActionArea onClick={() => agregarProducto(prod)} sx={{ p: 2 }}>
                       <Typography variant="subtitle2" fontWeight={700} noWrap>{prod.nombre}</Typography>
                       <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                         <Typography variant="body2" color="#4caf50" fontWeight={600}>
                           {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(prod.precio)}
                         </Typography>
                         <Chip label={prod.tipo} size="small" sx={{ fontSize: '0.65rem', height: 20 }} />
                       </Box>
                    </CardActionArea>
                  </Card>
                </Grid>
              ))}
              {prodFiltrados.length === 0 && (
                <Typography variant="body2" sx={{ m: 2, color: 'text.secondary' }}>No hay productos coincidentes.</Typography>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Columna Derecha: Carrito */}
        <Grid item xs={12} md={5} lg={4}>
          <Paper elevation={0} sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 400, borderRadius: 3, border: '1px solid', borderColor: selectedMesa ? 'rgba(0,0,0,0.08)' : 'warning.main', overflow: 'hidden' }}>
            <Box sx={{ p: 2, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff' }}>
               <Typography variant="h6" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                 <AddShoppingCartIcon /> Resumen Pedido
               </Typography>
               {selectedMesa && (
                 <Typography variant="caption" sx={{ opacity: 0.8 }}>Mesa #{selectedMesa.numero_mesa}</Typography>
               )}
            </Box>
            
            <List sx={{ flex: 1, overflowY: 'auto', p: 0 }}>
              {carrito.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                   <AddShoppingCartIcon sx={{ fontSize: 48, mb: 1 }} />
                   <Typography>Añade productos de la lista</Typography>
                </Box>
              ) : (
                carrito.map((item, index) => (
                  <Box key={item.uid}>
                    <ListItem>
                      <ListItemText 
                        primary={<Typography variant="body2" fontWeight={600}>{item.nombre}</Typography>} 
                        secondary={<Typography variant="caption" color="text.secondary">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(item.precio)}</Typography>} 
                      />
                      <ListItemSecondaryAction>
                        <IconButton size="small" onClick={() => quitarProducto(item.uid)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    {index < carrito.length - 1 && <Divider />}
                  </Box>
                ))
              )}
            </List>

            <Box sx={{ p: 3, background: '#fafafa', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>Total:</Typography>
                <Typography variant="h5" fontWeight={800} color="#e94560">
                   {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(total)}
                </Typography>
              </Box>
              <Button 
                fullWidth 
                variant="contained" 
                size="large" 
                onClick={enviarPedido}
                disabled={!selectedMesa || carrito.length === 0}
                sx={{ background: 'linear-gradient(135deg, #e94560, #c62a47)', borderRadius: 2, fontWeight: 700 }}
              >
                Confirmar y Enviar
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Modal Crear Cliente */}
      <Dialog open={openModalCliente} onClose={() => setOpenModalCliente(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
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
              select
              fullWidth
              label="Documento"
              value={formCliente.tipo_documento}
              onChange={e => setFormCliente(p => ({ ...p, tipo_documento: e.target.value }))}
              margin="normal"
              size="small"
              SelectProps={{ native: true }}
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

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TomarPedidoPage;
