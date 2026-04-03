// ============================================================
// src/pages/FacturacionPage.jsx
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, TextField, Autocomplete,
  Button, MenuItem, Select, FormControl, InputLabel, IconButton,
  Divider, Snackbar, Alert, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TodayIcon from '@mui/icons-material/Today';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { productoService, clienteService, facturacionService } from '../services/api';

const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'bancolombia', label: 'Bancolombia' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'datafono', label: 'Datáfono (Tarjeta)' }
];

const FacturacionPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // TABS
  const [tab, setTab] = useState(0);

  // Data Base
  const [platos, setPlatos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [facturas, setFacturas] = useState([]);

  // Estado del Facturador (Tab 0)
  const [pedidoActual, setPedidoActual] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [comandaId, setComandaId] = useState(null);
  const [busquedaProd, setBusquedaProd] = useState('');

  // Estados Filtros (Tab 2)
  const [filtroGeneral, setFiltroGeneral] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  // Recibo Termico
  const [facturaFinal, setFacturaFinal] = useState(null);

  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  const fetchGlobalData = async () => {
    try {
      const [prodRes, cliRes, factRes] = await Promise.all([
        productoService.getAll(),
        clienteService.getAll(),
        facturacionService.getAll()
      ]);
      setPlatos(prodRes.data);
      setClientes(cliRes.data);
      setFacturas(factRes.data);

      if (location.state && location.state.comandaId) {
        setPedidoActual(location.state.productos?.map(p => ({ ...p, uid: Math.random().toString() })) || []);
        setComandaId(location.state.comandaId);
        if (location.state.cliente) {
          const foundClient = cliRes.data.find(c => c._id === location.state.cliente._id);
          setCliente(foundClient || null);
        }
        setTab(0);
        // Clear history state to avoid infinite auto-fill on refresh
        navigate(location.pathname, { replace: true });
      }
    } catch (error) {
      setSnack({ open: true, msg: 'Error al cargar datos básicos.', severity: 'error' });
    }
  };

  useEffect(() => { fetchGlobalData(); }, [location.state]);

  // -------- LOGICA TAB 0: CAJA --------
  const totalCaja = pedidoActual.reduce((acc, curr) => acc + (curr.precio || 0), 0);
  const prodFiltrados = platos.filter(p => (p.nombre || '').toLowerCase().includes(busquedaProd.toLowerCase()));

  const agregarProducto = (prod) => setPedidoActual(prev => [...prev, { ...prod, uid: Math.random().toString(36).substr(2, 9) }]);
  const quitarProducto = (uid) => setPedidoActual(prev => prev.filter(item => item.uid !== uid));

  const manejarFacturacion = async () => {
    if (pedidoActual.length === 0) {
      setSnack({ open: true, msg: 'No hay productos para facturar', severity: 'warning' });
      return;
    }
    try {
      const payload = {
        metodo_pago: metodoPago,
        total_pagado: totalCaja,
        id_cliente: cliente?._id || null,
        id_comanda: comandaId || null,
        detalle_pedido: pedidoActual.map(p => ({
          id_producto: p._id,
          nombre: p.nombre,
          precio: p.precio,
          cantidad: 1
        }))
      };

      const res = await facturacionService.create(payload);
      setFacturaFinal(res.data);
      setSnack({ open: true, msg: 'Pago procesado exitosamente', severity: 'success' });

      setTimeout(() => {
        window.print();
        setPedidoActual([]);
        setCliente(null);
        setComandaId(null);
        fetchGlobalData(); // Recargar facturas
      }, 500);

    } catch (err) {
      setSnack({ open: true, msg: err.response?.data?.message || 'Error al procesar pago.', severity: 'error' });
    }
  };

  const reImprimir = (factura) => {
    setFacturaFinal(factura);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(e, val) => setTab(val)} textColor="primary" indicatorColor="primary">
          <Tab icon={<PointOfSaleIcon />} label="Punto de Caja" iconPosition="start" />
          <Tab icon={<TodayIcon />} label="Ventas de Hoy" iconPosition="start" />
          <Tab icon={<AssessmentIcon />} label="Listado General" iconPosition="start" />
        </Tabs>
      </Box>

      {/* TAB 0: CAJA CENTRAL */}
      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', minHeight: '60vh' }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Seleccionar Items</Typography>
              <TextField
                fullWidth size="small" placeholder="Buscar producto para venta rápida..."
                value={busquedaProd} onChange={e => setBusquedaProd(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Grid container spacing={1} sx={{ overflowY: 'auto', alignContent: 'flex-start', maxHeight: '50vh' }}>
                {prodFiltrados.slice(0, 20).map(prod => (
                  <Grid item xs={12} sm={6} md={4} key={prod._id}>
                    <Box
                      onClick={() => agregarProducto(prod)}
                      sx={{ p: 1.5, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 2, cursor: 'pointer', transition: 'all 0.2s', '&:hover': { borderColor: '#e94560', bgcolor: 'rgba(233,69,96,0.04)' } }}
                    >
                      <Typography variant="body2" fontWeight={700} noWrap>{prod.nombre}</Typography>
                      <Typography variant="body2" color="#4caf50" fontWeight={600} mt={0.5}>
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(prod.precio)}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Cliente {comandaId ? '(Comanda Vinculada)' : ''}</Typography>
              <Autocomplete
                options={clientes}
                getOptionLabel={(o) => o ? `${o.nombre || ''} ${o.apellido || ''} ${o.numero_documento ? `(${o.numero_documento})` : ''}` : ''}
                value={cliente}
                onChange={(_, val) => setCliente(val)}
                renderInput={(params) => <TextField {...params} label="Asignar Cliente (Opcional)" size="small" />}
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                <InputLabel>Método de Pago</InputLabel>
                <Select value={metodoPago} label="Método de Pago" onChange={e => setMetodoPago(e.target.value)}>
                  {METODOS_PAGO.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                </Select>
              </FormControl>
              <Divider sx={{ mb: 2 }} />
              <Box sx={{ maxHeight: '35vh', overflowY: 'auto', mb: 2 }}>
                {pedidoActual.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center">Caja vacía.</Typography>
                ) : (
                  pedidoActual.map((item, idx) => (
                    <Box key={item.uid || idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, pb: 1, borderBottom: '1px dashed #eee' }}>
                      <Box sx={{ flex: 1, pr: 2 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{item.nombre}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(item.precio)}
                        </Typography>
                      </Box>
                      <IconButton size="small" color="error" onClick={() => quitarProducto(item.uid)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))
                )}
              </Box>
              <Box sx={{ bgcolor: '#1a1a2e', color: '#fff', p: 3, borderRadius: 2, textAlign: 'center', mb: 2 }}>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>TOTAL</Typography>
                <Typography variant="h4" fontWeight={800}>
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalCaja)}
                </Typography>
              </Box>
              <Button
                fullWidth variant="contained" onClick={manejarFacturacion} disabled={pedidoActual.length === 0} startIcon={<PrintIcon />}
                sx={{ py: 1.5, background: 'linear-gradient(135deg, #e94560, #c62a47)', borderRadius: 2, fontWeight: 700 }}
              >
                Cobrar e Imprimir
              </Button>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: VENTAS DE HOY */}
      {tab === 1 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
          <TablaReporteFacturas
            facturas={facturas.filter(f => {
              const hoy = new Date().toISOString().split('T')[0];
              return new Date(f.createdAt).toISOString().split('T')[0] === hoy;
            })}
            enReproduccion={reImprimir}
          />
        </Paper>
      )}

      {/* TAB 2: LISTADO GENERAL Y FILTROS */}
      {tab === 2 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth size="small" label="Buscar P/Cliente o N° Factura" placeholder="Cédula, nombre o ID..."
                value={filtroGeneral} onChange={e => setFiltroGeneral(e.target.value)}
              />
            </Grid>
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
              <Button fullWidth variant="outlined" color="error" onClick={() => { setFiltroGeneral(''); setFechaDesde(''); setFechaHasta(''); }}>
                Limpiar Filtros
              </Button>
            </Grid>
          </Grid>
          <TablaReporteFacturas
            facturas={facturas.filter(f => {
              let match = true;
              const txt = filtroGeneral.toLowerCase();
              if (txt) {
                const nFac = f.numero_factura ? f.numero_factura.toString() : '';
                const cliNom = f.id_cliente ? (f.id_cliente.nombre + ' ' + f.id_cliente.apellido).toLowerCase() : '';
                const cliDoc = f.id_cliente?.numero_documento || '';
                match = nFac.includes(txt) || cliNom.includes(txt) || cliDoc.includes(txt);
              }
              if (match && fechaDesde) {
                match = new Date(f.createdAt) >= new Date(fechaDesde + 'T00:00:00');
              }
              if (match && fechaHasta) {
                match = new Date(f.createdAt) <= new Date(fechaHasta + 'T23:59:59');
              }
              return match;
            })}
            enReproduccion={reImprimir}
          />
        </Paper>
      )}

      {/* Recibo Oculto para Impresión */}
      {facturaFinal && (
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
                   font-family: monospace !important; 
                   font-size: 12px; 
                   color: #000; 
                   box-sizing: border-box; 
                }
                @page { size: auto; margin: 0; }
              }
            `}
          </style>
          <Box textAlign="center" mb={2}>
            <Typography fontWeight="bold" fontSize="16px">MI RESTAURANTE S.A.S</Typography>
            <Typography fontSize="12px">NIT: 900.XXX.XXX-X</Typography>
            <Typography fontSize="12px">Fecha: {new Date(facturaFinal.createdAt || new Date()).toLocaleString()}</Typography>
            <Typography fontSize="12px">Factura Venta #: {facturaFinal.numero_factura || 'N/A'}</Typography>
          </Box>

          <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: '#000' }} />

          {facturaFinal.id_cliente && (
            <Box mb={1}>
              <Typography fontSize="12px">Cliente: {facturaFinal.id_cliente.nombre} {facturaFinal.id_cliente.apellido}</Typography>
              <Typography fontSize="12px">Doc: {facturaFinal.id_cliente.numero_documento || 'N/A'}</Typography>
            </Box>
          )}

          <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: '#000' }} />

          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" mb={1} pb={0.5} borderBottom="1px solid #000">
              <Typography fontSize="12px" fontWeight="bold">DESCRIPCIÓN</Typography>
              <Typography fontSize="12px" fontWeight="bold">TOTAL</Typography>
            </Box>
            {facturaFinal.detalle_pedido?.map((item, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'flex-end', mb: 0.5 }}>
                <Typography fontSize="12px" sx={{ whiteSpace: 'nowrap' }}>{item.cantidad}x {item.nombre}</Typography>
                <Box sx={{ flexGrow: 1, borderBottom: '1px dotted #000', mx: 0.5, position: 'relative', top: '-4px' }} />
                <Typography fontSize="12px" sx={{ whiteSpace: 'nowrap' }}>
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(item.precio * item.cantidad)}
                </Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: '#000' }} />

          <Box display="flex" justifyContent="space-between" mb={1} fontWeight="bold">
            <Typography fontSize="14px" fontWeight="bold">TOTAL PAGADO</Typography>
            <Typography fontSize="14px" fontWeight="bold">
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(facturaFinal.total_pagado)}
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" mb={2}>
            <Typography fontSize="12px">Método Pago:</Typography>
            <Typography fontSize="12px" textTransform="uppercase">{facturaFinal.metodo_pago}</Typography>
          </Box>

          <Typography textAlign="center" fontSize="12px" fontWeight="bold" mt={3}>
            ¡GRACIAS POR SU COMPRA!
          </Typography>
        </Box>
      )}

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

// --- Subcomponente de Tabla para simplificar renderizado ---
const TablaReporteFacturas = ({ facturas, enReproduccion }) => {
  const sumaTotal = facturas.reduce((sum, f) => sum + (f.total_pagado || 0), 0);

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#1a1a2e' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>No. Factura</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Fecha</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Cliente / Cédula</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Método</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Total</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {facturas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  <ReceiptLongIcon sx={{ fontSize: 40, opacity: 0.3, display: 'block', mx: 'auto', mb: 1 }} />
                  No existen registros bajo este filtro.
                </TableCell>
              </TableRow>
            ) : (
              facturas.map(f => (
                <TableRow key={f._id} hover>
                  <TableCell>
                    <Typography fontWeight="bold">#{f.numero_factura || '...'}</Typography>
                  </TableCell>
                  <TableCell>{new Date(f.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                  <TableCell>
                    {f.id_cliente ? (
                      <Box>
                        <Typography variant="body2">{f.id_cliente.nombre} {f.id_cliente.apellido}</Typography>
                        <Typography variant="caption" color="text.secondary">{f.id_cliente.numero_documento}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Consumidor Final</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={f.metodo_pago} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                  </TableCell>
                  <TableCell>
                    <Typography fontWeight="bold" color="#4caf50">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(f.total_pagado || 0)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Button variant="text" size="small" startIcon={<PrintIcon />} onClick={() => enReproduccion(f)}>Re-Imprimir</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eee', mt: 1 }}>
        <Box sx={{ border: '1px dashed #e94560', borderRadius: 2, p: 2, bgcolor: 'rgba(233,69,96,0.05)' }}>
          <Typography variant="caption" color="#1a1a2e" display="block">RECAUDO MOSTRADO</Typography>
          <Typography variant="h5" fontWeight={800} color="#e94560">
            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(sumaTotal)}
          </Typography>
        </Box>
      </Box>
    </>
  );
};

export default FacturacionPage;
