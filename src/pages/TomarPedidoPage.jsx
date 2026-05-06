// ============================================================
// src/pages/TomarPedidoPage.jsx — Módulo interactivo de Pedidos
// ============================================================
import { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Paper, Grid, Divider, Autocomplete, TextField,
  IconButton, List, ListItem, ListItemText, ListItemSecondaryAction,
  Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Chip,
  InputAdornment, Card, CardContent, CardActionArea, Tooltip, Switch, FormControlLabel
} from '@mui/material';
import DeleteIcon       from '@mui/icons-material/Delete';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import PostAddIcon      from '@mui/icons-material/PostAdd';
import PersonAddIcon    from '@mui/icons-material/PersonAdd';
import SearchIcon       from '@mui/icons-material/Search';
import PrintIcon        from '@mui/icons-material/Print';
import { clienteService, mesaService, productoService, comandaService, categoriasProductosService } from '../services/api';

const TIPOS_DOCUMENTO = [
  { value: 'cedula_identidad', label: 'Cédula de Identidad' },
  { value: 'cedula_extranjeria', label: 'Cédula de Extranjería' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'documento_extranjero', label: 'Documento Extranjero' },
];

const CATEGORIAS_ESTATICAS = [
  { value: 'platos_principales', label: 'Platos Principales' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'postres', label: 'Postres' },
  { value: 'sopas', label: 'Sopas' },
  { value: 'entradas', label: 'Entradas' },
  { value: 'comidas_rapidas', label: 'Comidas Rápidas' },
  { value: 'adicionales', label: 'Adicionales' },
];

const TomarPedidoPage = () => {
  const [clientes,  setClientes]  = useState([]);
  const [mesas,     setMesas]     = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [selectedMesa,    setSelectedMesa]    = useState(null);
  const [carrito,         setCarrito]         = useState([]);
  const [a_domicilio,     setA_domicilio]     = useState(false);
  const [venta_directa,   setVenta_directa]   = useState(false);
  const [observaciones,   setObservaciones]   = useState('');
  
  const [busquedaProd, setBusquedaProd] = useState('');
  const [categoria, setCategoria] = useState('todas');
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  
  // Modal Crear Cliente Rápido
  const [openModalCliente, setOpenModalCliente] = useState(false);
  const [formCliente, setFormCliente]           = useState({ nombre: '', apellido: '', numero_documento: '', tipo_documento: '', telefono: '', direccion: '' });

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  const fetchCategorias = async () => {
    try {
      const res = await categoriasProductosService.getAll();
      const categoriasNuevas = res.data.filter(c => c.activa).map(c => ({ 
        value: c.detalles.value, 
        label: c.detalles.label 
      }));
      const nuevasNoRepetidas = categoriasNuevas.filter(cat => !CATEGORIAS_ESTATICAS.some(est => est.label === cat.label));
      const todasLasCategorias = [...CATEGORIAS_ESTATICAS, ...nuevasNoRepetidas];
      setCategorias(todasLasCategorias);
    } catch {
      setCategorias(CATEGORIAS_ESTATICAS);
    }
  };

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
    fetchCategorias();
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
    if (a_domicilio && !formCliente.telefono) {
      return showSnack('El teléfono es obligatorio para pedidos a domicilio.', 'warning');
    }
    if (a_domicilio && !formCliente.direccion) {
      return showSnack('La dirección es obligatoria para pedidos a domicilio.', 'warning');
    }
    try {
      const res = await clienteService.create(formCliente);
      setClientes(prev => [res.data, ...prev]);
      setSelectedCliente(res.data);
      setOpenModalCliente(false);
      showSnack('Cliente creado y seleccionado.');
      setFormCliente({ nombre: '', apellido: '', numero_documento: '', tipo_documento: '', telefono: '', direccion: '' });
    } catch {
      showSnack('Error al crear el cliente.', 'error');
    }
  };

  // Guardar la Comanda
  const [openModalExito, setOpenModalExito] = useState(false);
  const [comandaParaImprimir, setComandaParaImprimir] = useState(null);

  const enviarPedido = async () => {
    if (!venta_directa && !a_domicilio && !selectedMesa) {
      return showSnack('Debes seleccionar una mesa, marcar como pedido a domicilio o venta directa.', 'warning');
    }
    if (a_domicilio && !selectedCliente) {
      return showSnack('El cliente es obligatorio para pedidos a domicilio.', 'warning');
    }
    if (a_domicilio && !selectedCliente?.direccion) {
      return showSnack('La dirección es obligatoria para pedidos a domicilio.', 'warning');
    }
    if (carrito.length === 0) {
      return showSnack('El carrito está vacío.', 'warning');
    }

    try {
      const datos = {
        id_mesa: selectedMesa ? selectedMesa._id : undefined,
        id_cliente: selectedCliente ? selectedCliente._id : undefined,
        ids_productos: carrito.map(p => p._id),
        a_domicilio: a_domicilio,
        venta_directa: venta_directa,
        direccion_entrega: selectedCliente?.direccion || '',
        observaciones
      };
      await comandaService.create(datos);
      
      // Guardamos info para la impresión antes de limpiar
      setComandaParaImprimir({
        mesa: selectedMesa ? selectedMesa.numero_mesa : (a_domicilio ? 'Domicilio' : 'Venta Directa'),
        cliente: selectedCliente ? `${selectedCliente.nombre} ${selectedCliente.apellido}` : 'Consumidor Final',
        productos: [...carrito],
        fecha: new Date().toLocaleString(),
        a_domicilio: a_domicilio,
        venta_directa: venta_directa,
        observaciones
      });

      // Abrir modal de éxito
      setOpenModalExito(true);
      
      // Limpiar mesas si es necesario (sacar la que recién usamos)
      if (selectedMesa) {
        setMesas(prev => prev.filter(m => m._id !== selectedMesa._id));
      }
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al guardar la comanda.', 'error');
    }
  };

  const finalizarTodo = () => {
    setSelectedCliente(null);
    setSelectedMesa(null);
    setCarrito([]);
    setObservaciones('');
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
          
          {/* Selección de Mesa / Pedido a Domicilio */}
          <Paper elevation={0} sx={{ p: 3, mb: 2, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Mesa de Destino / Pedido a Domicilio</Typography>
            <Grid container spacing={2}>
              {/* Columna Izquierda: Selector de Mesa (visible solo si no es a domicilio) */}
              <Grid item xs={12} sm={6}>
                {!a_domicilio && (
                  <Autocomplete
                    options={mesas}
                    getOptionLabel={(option) => option ? `Mesa #${option.numero_mesa}` : ''}
                    value={selectedMesa}
                    style={{minWidth: "300px"}}
                    onChange={(_, val) => {
                      setSelectedMesa(val);
                      if (val) {
                        setVenta_directa(false);
                        setA_domicilio(false);
                      }
                    }}
                    renderInput={(params) => <TextField {...params} label="Seleccionar Mesa (Solo Libres) *" size="small" />}
                    noOptionsText="Sin mesas libres"
                  />
                )}
                {a_domicilio && (
                  <TextField
                    label="Seleccionar Mesa (Solo Libres)"
                    size="small"
                    disabled
                    placeholder="Deshabilitado para pedidos a domicilio"
                    fullWidth
                  />
                )}
              </Grid>

              {/* Columna Derecha: Switches */}
              <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={a_domicilio}
                      onChange={(e) => {
                        setA_domicilio(e.target.checked);
                        if (e.target.checked) {
                          setSelectedMesa(null);
                          setVenta_directa(false);
                        }
                      }}
                      color="primary"
                    />
                  }
                  label="Pedido a Domicilio"
                  sx={{ m: 0 }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={venta_directa}
                      onChange={(e) => {
                        setVenta_directa(e.target.checked);
                        if (e.target.checked) {
                          setSelectedMesa(null);
                          setA_domicilio(false);
                        }
                      }}
                      color="success"
                    />
                  }
                  label="Venta Directa"
                  sx={{ m: 0 }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Información del Cliente */}
          <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Datos del Cliente</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Autocomplete
                fullWidth
                options={clientes}
                getOptionLabel={(o) => o ? `${o.nombre || ''} ${o.apellido || ''}${o.direccion ? `, Dir: ${o.direccion}` : ''}${o.numero_documento ? `, Doc: ${o.numero_documento}` : ''}${o.telefono ? `, Tel: ${o.telefono}` : ''}`.trim() : ''}
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
              {[{ value: 'todas', label: 'Todas' }, ...categorias].map(cat => (
                <Chip 
                  key={cat.value} 
                  label={cat.label}
                  onClick={() => setCategoria(cat.value)}
                  color={categoria === cat.value ? 'primary' : 'default'}
                  variant={categoria === cat.value ? 'filled' : 'outlined'}
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
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="Observaciones"
                placeholder='Ej: "el menú ejecutivo va sin arroz"'
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                sx={{ mb: 2 }}
              />
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
                disabled={carrito.length === 0 || (venta_directa ? false : (a_domicilio ? !selectedCliente : !selectedMesa))}
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
          <TextField 
            fullWidth 
            label={`Teléfono${a_domicilio ? ' *' : ''}`}
            value={formCliente.telefono} 
            onChange={e => setFormCliente(p => ({ ...p, telefono: e.target.value }))} 
            margin="normal" 
            size="small"
            required={a_domicilio}
            placeholder="Ej: +57 3001234567"
          />
          <TextField 
            fullWidth 
            label={`Dirección${a_domicilio ? ' *' : ''}`}
            value={formCliente.direccion} 
            onChange={e => setFormCliente(p => ({ ...p, direccion: e.target.value }))} 
            margin="normal" 
            size="small"
            placeholder="Calle, número, apartamento..."
            required={a_domicilio}
          />
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
            <Typography fontSize="16px" fontWeight="bold">
              {comandaParaImprimir.a_domicilio ? 'PEDIDO A DOMICILIO' : (comandaParaImprimir.venta_directa ? 'VENTA DIRECTA' : `MESA #${comandaParaImprimir.mesa}`)}
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

export default TomarPedidoPage;
