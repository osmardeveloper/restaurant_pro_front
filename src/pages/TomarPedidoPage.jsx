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
import PrintIcon        from '@mui/icons-material/Print';
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
  const [categoria, setCategoria] = useState('todas');
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
  const [openModalExito, setOpenModalExito] = useState(false);
  const [comandaParaImprimir, setComandaParaImprimir] = useState(null);

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
      
      // Guardamos info para la impresión antes de limpiar
      setComandaParaImprimir({
        mesa: selectedMesa.numero_mesa,
        cliente: selectedCliente ? `${selectedCliente.nombre} ${selectedCliente.apellido}` : 'Consumidor Final',
        productos: [...carrito],
        fecha: new Date().toLocaleString()
      });

      // Abrir modal de éxito
      setOpenModalExito(true);
      
      // Limpiar mesas si es necesario (sacar la que recién usamos)
      setMesas(prev => prev.filter(m => m._id !== selectedMesa._id));
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al guardar la comanda.', 'error');
    }
  };

  const finalizarTodo = () => {
    setSelectedCliente(null);
    setSelectedMesa(null);
    setCarrito([]);
    setOpenModalExito(false);
    setComandaParaImprimir(null);
  };

  const imprimirComanda = () => {
    setTimeout(() => {
      window.print();
    }, 300);
  };

  const total = carrito.reduce((acc, curr) => acc + (curr.precio || 0), 0);
  const prodFiltrados = productos.filter(p => {
    const matchBusqueda = (p.nombre || '').toLowerCase().includes((busquedaProd || '').toLowerCase());
    const matchCategoria = categoria === 'todas' || p.tipo === categoria;
    return matchBusqueda && matchCategoria;
  });

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

      <Box sx={{ width: 'calc(100% + 48px)', ml: -3, mr: -3, px: 3, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        {/* Columna Izquierda: Selección */}
        <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Autocomplete
                fullWidth
                options={clientes}
                getOptionLabel={(o) => o ? `${o.nombre || ''} ${o.apellido || ''} ${o.numero_documento ? `(${o.numero_documento})` : ''}`.trim() : ''}
                value={selectedCliente}
                onChange={(_, val) => setSelectedCliente(val)}
                renderInput={(params) => <TextField {...params} label="Buscar Cliente por Nombre o Documento (Opcional)" size="small" />}
                noOptionsText="Cliente no encontrado"
              />
              <Button 
                fullWidth 
                variant="contained" 
                startIcon={<PersonAddIcon />}
                sx={{ borderRadius: 2, height: 44, bgcolor: '#1a1a2e', fontWeight: 700 }} 
                onClick={() => setOpenModalCliente(true)}
              >
                Nuevo Cliente
              </Button>
            </Box>
          </Paper>

          {/* Menú de Productos */}
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h6" fontWeight={700}>Productos</Typography>
              <TextField 
                size="small" 
                placeholder="Buscar producto..." 
                value={busquedaProd}
                onChange={e => setBusquedaProd(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
                sx={{ width: { xs: '100%', sm: 300 } }}
              />
            </Box>

            {/* Filtro por Categorías */}
            <Box sx={{ display: 'flex', gap: 1, mb: 3, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { height: 4 } }}>
              {['todas', 'bebidas', 'postres', 'platos_principales', 'sopas', 'entradas', 'comidas_rapidas', 'adicionales'].map(cat => (
                <Chip 
                  key={cat} 
                  label={cat === 'todas' ? 'Todas' : cat.replace('_', ' ')} 
                  onClick={() => setCategoria(cat)}
                  color={categoria === cat ? 'primary' : 'default'}
                  variant={categoria === cat ? 'filled' : 'outlined'}
                  sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                />
              ))}
            </Box>
            <Grid container spacing={1.5} sx={{ maxHeight: '70vh', overflowY: 'auto', p: 1 }}>
              {prodFiltrados.map(prod => (
                <Grid item xs={6} sm={4} md={3} lg={2} xl={1.5} key={prod._id}>
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
        </Box>

        {/* Columna Derecha: Carrito */}
        <Box sx={{ width: 340, flexShrink: 0, position: 'sticky', top: 84 }}>
          <Paper elevation={0} sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)', minHeight: 400, borderRadius: 3, border: '1px solid', borderColor: selectedMesa ? 'rgba(0,0,0,0.08)' : 'warning.main', overflow: 'hidden' }}>
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
        </Box>
      </Box>

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

      {/* Modal de Éxito / Imprimir */}
      <Dialog open={openModalExito} onClose={finalizarTodo} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4, p: 1 } }}>
        <DialogContent sx={{ textAlign: 'center', pt: 4 }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
             <Box sx={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(76, 175, 80, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <PostAddIcon sx={{ fontSize: 40, color: '#4caf50' }} />
             </Box>
          </Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>¡Pedido Enviado!</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            La comanda ha sido guardada correctamente en el sistema.
          </Typography>
          
          <Button 
            fullWidth 
            variant="contained" 
            size="large" 
            startIcon={<PrintIcon />}
            onClick={imprimirComanda}
            sx={{ mb: 2, background: '#1a1a2e', borderRadius: 2, py: 1.5, fontWeight: 700 }}
          >
            Imprimir Comanda
          </Button>
          
          <Button 
            fullWidth 
            variant="outlined" 
            onClick={finalizarTodo}
            sx={{ borderRadius: 2, py: 1.2, fontWeight: 600 }}
          >
            Cerrar
          </Button>
        </DialogContent>
      </Dialog>

      {/* COMPONENTE DE IMPRESIÓN (OCULTO) */}
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
            <Typography fontSize="16px" fontWeight="bold">MESA #{comandaParaImprimir.mesa}</Typography>
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

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default TomarPedidoPage;

