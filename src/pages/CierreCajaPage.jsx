// ============================================================
// src/pages/CierreCajaPage.jsx — Cierre de Caja en Tiempo Real
// ============================================================
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Snackbar, Alert, Divider
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { facturacionService, gastoService, costoService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const METODOS_PAGO = ['efectivo', 'bancolombia', 'nequi', 'daviplata', 'datafono'];
const formatCol = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val || 0);
const crearResumenMetodos = () => METODOS_PAGO.reduce((acc, metodo) => {
  acc[metodo] = { total: 0, montos: [] };
  return acc;
}, {});

const obtenerPagosFactura = (factura) => {
  if (factura.metodo_pago === 'dividido' && Array.isArray(factura.pagos_parciales) && factura.pagos_parciales.length > 0) {
    return factura.pagos_parciales;
  }

  return [{
    metodo_pago: factura.metodo_pago,
    monto: factura.total_pagado || 0,
  }];
};

const agruparPagosFactura = (factura) => {
  const resumen = crearResumenMetodos();

  obtenerPagosFactura(factura).forEach(pago => {
    if (!METODOS_PAGO.includes(pago.metodo_pago)) return;
    const monto = Number(pago.monto || 0);
    resumen[pago.metodo_pago].total += monto;
    resumen[pago.metodo_pago].montos.push(monto);
  });

  return resumen;
};

const nombreFormaPago = (factura) => {
  if (factura.metodo_pago !== 'dividido') return factura.metodo_pago;

  const totalPagos = obtenerPagosFactura(factura).length;
  return totalPagos === 1 ? 'dividido (1 pago)' : `dividido (${totalPagos} pagos)`;
};

const obtenerPropinasFactura = (factura) => Array.isArray(factura.propinas) ? factura.propinas : [];

const totalPropinasFactura = (factura) => obtenerPropinasFactura(factura)
  .reduce((sum, propina) => sum + Number(propina.monto || 0), 0);

const textoPropinasFactura = (factura) => {
  const propinas = obtenerPropinasFactura(factura);
  if (!propinas.length) return '$0';

  return propinas
    .map(propina => `${formatCol(propina.monto)} ${propina.metodo_pago}`)
    .join(', ');
};

const textoDomicilioFactura = (factura) => {
  if (!factura.a_domicilio) return '-';
  const monto = factura.monto_domicilio || 0;
  const metodo = factura.metodo_pago_domicilio || 'N/A';
  if (monto === 0) return 'Gratis';
  return `${formatCol(monto)} ${metodo}`;
};

const totalDomicilioFacturas = (facturas) => {
  return facturas
    .filter(f => f.a_domicilio && f.monto_domicilio > 0)
    .reduce((sum, f) => sum + Number(f.monto_domicilio || 0), 0);
};

const totalPropinasFacturasPorMetodo = (facturas) => {
  const resumen = {};
  facturas.forEach(f => {
    const propinas = obtenerPropinasFactura(f);
    propinas.forEach(propina => {
      const metodo = propina.metodo_pago || 'sin_metodo';
      if (!resumen[metodo]) resumen[metodo] = 0;
      resumen[metodo] += Number(propina.monto || 0);
    });
  });
  return resumen;
};

const totalDomiciliosFacturasPorMetodo = (facturas) => {
  const resumen = {};
  facturas
    .filter(f => f.a_domicilio && f.monto_domicilio > 0)
    .forEach(f => {
      const metodo = f.metodo_pago_domicilio || 'sin_metodo';
      if (!resumen[metodo]) resumen[metodo] = 0;
      resumen[metodo] += Number(f.monto_domicilio || 0);
    });
  return resumen;
};

const textoResumenPorMetodo = (resumen) => {
  if (Object.keys(resumen).length === 0) return '-';
  return Object.entries(resumen)
    .map(([metodo, monto]) => `${formatCol(monto)} ${metodo}`)
    .join(', ');
};

const formatPeriodo = (iso) => {
  const [y, m, d] = iso.split('-');
  return new Date(Number(y), Number(m) - 1, Number(d))
    .toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
};

// Estilos de impresión — usa clases .screen-only / .print-only
const PRINT_STYLE = `
  .print-only { display: none; }
  .screen-only { display: block; }

  @media print {
    @page { margin: 0.4cm; size: letter; }

    .screen-only {
      display: none !important;
      height: 0 !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .print-only  { display: block !important; }

    header, nav, .MuiDrawer-root, .MuiAppBar-root { display: none !important; }

    body, html {
      margin: 0 !important;
      padding: 6px !important;
      background: #fff !important;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 7px;
      color: #000;
    }

    /* Encabezado de una línea */
    .ph { display: flex; align-items: baseline; gap: 18px; border-bottom: 1.5px solid #333; padding-bottom: 3px; margin-bottom: 5px; }
    .ph-title { font-size: 12px; font-weight: bold; }
    .ph-sub    { font-size: 7px; color: #444; }

    /* Tabla resumen tipo Excel */
    .sg { border-collapse: collapse; width: 100%; margin-bottom: 6px; }
    .sg td { border: 1px solid #555; padding: 2px 4px; text-align: center; vertical-align: middle; }
    .sg .lbl { font-size: 5.5px; text-transform: uppercase; color: #555; font-weight: bold; display: block; }
    .sg .val { font-size: 8px; font-weight: bold; display: block; }
    .sg thead td { background: #d8d8d8 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    /* Títulos de sección */
    .st { font-size: 8px; font-weight: bold; margin: 6px 0 2px; }
    .st-blue { color: #1565c0; }
    .st-red  { color: #c62828; }
    .st-green { color: #2e7d32; }

    /* Tablas de datos */
    table.data { font-size: 7px; border-collapse: collapse; width: 100%; margin-bottom: 8px; }
    table.data th, table.data td { padding: 2px 3px; border: 1px solid #000; white-space: nowrap; }
    table.data thead th {
      background: #d0d0d0 !important;
      font-weight: bold;
      text-align: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    table.data .tr {
      background: #e8e8e8 !important;
      font-weight: bold;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .c-blue  { color: #1565c0 !important; }
    .c-red   { color: #c62828 !important; }
    .c-green { color: #2e7d32 !important; }
  }
`;

const CierreCajaPage = () => {
  const { usuario } = useAuth();
  const isAdmin = usuario?.rol === 'admin';
  
  const [facturas, setFacturas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [costos, setCostos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });

  // Fecha local para filtros iniciales (Evitar desfase UTC)
  const hoy = new Date();
  const hoyLocal = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

  const [fechaInicio, setFechaInicio] = useState(hoyLocal);
  const [fechaFin, setFechaFin]       = useState(hoyLocal);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [resFac, resGas, resCos] = await Promise.all([facturacionService.getAll(), gastoService.getAll(), costoService.getAll()]);
      setFacturas(resFac.data || []);
      setGastos(resGas.data || []);
      setCostos(resCos.data || []);
    } catch {
      setSnack({ open: true, msg: 'Error al cargar datos.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { filtradas, egresos, costosFiltrados } = useMemo(() => {
    if (!fechaInicio || !fechaFin) return { filtradas: [], egresos: [], costosFiltrados: [] };
    
    // Normalizar fechas para comparación (Local)
    const fInit = new Date(fechaInicio + 'T00:00:00');
    const fEnd  = new Date(fechaFin + 'T23:59:59');
    
    return {
      filtradas: facturas.filter(x => {
        const d = new Date(x.createdAt);
        return d >= fInit && d <= fEnd;
      }),
      egresos:   gastos.filter(x => {
        const d = new Date(x.createdAt);
        return d >= fInit && d <= fEnd;
      }),
      costosFiltrados: costos.filter(x => {
        const d = new Date(x.createdAt);
        return d >= fInit && d <= fEnd;
      }),
    };
  }, [facturas, gastos, costos, fechaInicio, fechaFin]);

  const globalesIngreso = useMemo(() => {
    const c = { total: 0, propina: 0 };
    METODOS_PAGO.forEach(m => c[m] = 0);
    filtradas.forEach(f => {
      c.total += f.total_pagado || 0;
      c.propina += totalPropinasFactura(f);
      const pagosPorMetodo = agruparPagosFactura(f);
      METODOS_PAGO.forEach(m => {
        c[m] += pagosPorMetodo[m].total;
      });
    });
    return c;
  }, [filtradas]);

  const globalesEgreso = useMemo(() => {
    const c = { total: 0 };
    METODOS_PAGO.forEach(m => c[m] = 0);
    egresos.forEach(g => {
      const a = g.monto || 0;
      c.total += a;
      if (METODOS_PAGO.includes(g.metodo_pago)) c[g.metodo_pago] += a;
    });
    return c;
  }, [egresos]);

  const globalesCostos = useMemo(() => {
    const c = { total: 0 };
    METODOS_PAGO.forEach(m => c[m] = 0);
    costosFiltrados.forEach(co => {
      const a = co.monto || 0;
      c.total += a;
      if (METODOS_PAGO.includes(co.metodo_pago)) c[co.metodo_pago] += a;
    });
    return c;
  }, [costosFiltrados]);

  const RCell = ({ isHeader, children, color, align, colSpan }) => (
    <TableCell align={align || 'left'} colSpan={colSpan}
      sx={{ fontWeight: isHeader ? 700 : 500, color: isHeader ? 'text.secondary' : (color || 'inherit'), border: '1px solid rgba(0,0,0,0.08)' }}>
      {children}
    </TableCell>
  );

  const efectivoNeto = globalesIngreso.efectivo - globalesEgreso.efectivo - globalesCostos.efectivo;

  return (
    <Box>
      <style>{PRINT_STYLE}</style>

      {/* ══ PANTALLA ══ */}
      <div className="screen-only">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)' }}>
            <CalculateIcon sx={{ color: '#fff', display: 'block' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a1a2e">Cierre de Caja</Typography>
            <Typography variant="body2" color="text.secondary">Balances dinámicos.</Typography>
          </Box>
        </Box>

        <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <TextField fullWidth size="small" type="date" InputLabelProps={{ shrink: true }} value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField fullWidth size="small" type="date" InputLabelProps={{ shrink: true }} value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
            </Grid>
            <Grid item xs={6} md={2}>
              <Button fullWidth variant="contained" color="primary" onClick={fetchData}>Consultar</Button>
            </Grid>
            <Grid item xs={6} md={2}>
              <Button fullWidth variant="contained" color="error" startIcon={<InsertDriveFileIcon />} onClick={() => window.print()}>PDF</Button>
            </Grid>
          </Grid>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid #e0e0e0', overflow: 'hidden', mb: 4 }}>
          {/* Sección 1: INGRESOS RECAUDADOS */}
          <Box sx={{ p: 3, background: 'rgba(76,175,80,0.02)' }}>
            <Typography variant="subtitle1" fontWeight={700} color="success.main" textAlign="center" mb={2}>
              INGRESOS RECAUDADOS
            </Typography>
            <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mb={2}>
              del {formatPeriodo(fechaInicio)} al {formatPeriodo(fechaFin)}
            </Typography>
            <Grid container spacing={2} justifyContent="center" textAlign="center">
              {[
                { label: 'TOTAL FACTURA', val: globalesIngreso.total, color: '#1976d2', tipo: 'simple' },
                { label: 'PROPINA', val: totalPropinasFacturasPorMetodo(filtradas), color: '#ef6c00', tipo: 'resumen' },
                { label: 'BANCOLOMBIA', val: globalesIngreso.bancolombia, color: '#1a1a2e', tipo: 'simple' },
                { label: 'NEQUI', val: globalesIngreso.nequi, color: '#1a1a2e', tipo: 'simple' },
                { label: 'DAVIPLATA', val: globalesIngreso.daviplata, color: '#1a1a2e', tipo: 'simple' },
                { label: 'DATAFONO', val: globalesIngreso.datafono, color: '#1a1a2e', tipo: 'simple' },
                { label: 'EFECTIVO', val: globalesIngreso.efectivo, color: '#1a1a2e', tipo: 'simple' },
                { label: 'GASTO EN EFECTIVO', val: globalesEgreso.efectivo, color: '#c62828', tipo: 'simple' },
                { label: 'EFECTIVO EN CAJA', val: globalesIngreso.efectivo - globalesEgreso.efectivo, color: '#2e7d32', tipo: 'simple' },
              ].map(({ label, val, color, tipo }) => (
                <Grid item xs={4} md={2} key={label}>
                  <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight={600} display="block">{label}</Typography>
                  {tipo === 'simple' ? (
                    <Typography variant="h6" fontWeight={700} color={color}>{formatCol(val)}</Typography>
                  ) : (
                    <Box sx={{ fontSize: '0.75rem', fontWeight: 700, color }}>
                      {Object.entries(val).length === 0 ? (
                        '-'
                      ) : (
                        Object.entries(val).map(([metodo, monto], idx, arr) => (
                          <div key={metodo}>
                            {formatCol(monto)} {metodo}
                          </div>
                        ))
                      )}
                    </Box>
                  )}
                </Grid>
              ))}
            </Grid>
          </Box>

          <Divider sx={{ my: 0 }} />

          {/* Sección 2: GASTOS OPERATIVOS - Solo para admin */}
          {isAdmin && (
            <Box sx={{ p: 3, background: 'rgba(198,40,40,0.02)' }}>
              <Typography variant="subtitle1" fontWeight={700} color="#c62828" textAlign="center" mb={2}>
                GASTOS POR MÉTODO DE PAGO
              </Typography>
              <Grid container spacing={2} justifyContent="center" textAlign="center">
                {[
                  { label: 'GASTO EFECTIVO', val: globalesEgreso.efectivo, color: '#c62828' },
                  { label: 'GASTO BANCOLOMBIA', val: globalesEgreso.bancolombia, color: '#c62828' },
                  { label: 'GASTO NEQUI', val: globalesEgreso.nequi, color: '#c62828' },
                  { label: 'GASTO DAVIPLATA', val: globalesEgreso.daviplata, color: '#c62828' },
                  { label: 'GASTO DATAFONO', val: globalesEgreso.datafono, color: '#c62828' },
                  { label: 'GASTOS GLOBALES', val: globalesEgreso.total, color: '#c62828' },
                ].map(({ label, val, color }) => (
                  <Grid item xs={4} md={2} key={label}>
                    <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight={600} display="block">{label}</Typography>
                    <Typography variant="h6" fontWeight={700} color={color}>{formatCol(val)}</Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          <Divider sx={{ my: 0 }} />

          {/* Sección 2.5: COSTOS OPERATIVOS - Solo para admin */}
          {isAdmin && (
            <Box sx={{ p: 3, background: 'rgba(21,101,192,0.02)' }}>
              <Typography variant="subtitle1" fontWeight={700} color="#1565c0" textAlign="center" mb={2}>
                COSTOS OPERATIVOS POR MÉTODO DE PAGO
              </Typography>
              <Grid container spacing={2} justifyContent="center" textAlign="center">
                {[
                  { label: 'COSTO EFECTIVO', val: globalesCostos.efectivo, color: '#1565c0' },
                  { label: 'COSTO BANCOLOMBIA', val: globalesCostos.bancolombia, color: '#1565c0' },
                  { label: 'COSTO NEQUI', val: globalesCostos.nequi, color: '#1565c0' },
                  { label: 'COSTO DAVIPLATA', val: globalesCostos.daviplata, color: '#1565c0' },
                  { label: 'COSTO DATAFONO', val: globalesCostos.datafono, color: '#1565c0' },
                  { label: 'COSTOS GLOBALES', val: globalesCostos.total, color: '#1565c0' },
                ].map(({ label, val, color }) => (
                  <Grid item xs={4} md={2} key={label}>
                    <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight={600} display="block">{label}</Typography>
                    <Typography variant="h6" fontWeight={700} color={color}>{formatCol(val)}</Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          <Divider sx={{ my: 0 }} />
          {/* SALDOS TOTALES - Solo para admin */}
          {isAdmin && (
            <Box sx={{ p: 3, background: 'rgba(76,175,80,0.02)' }}>
              <Typography variant="subtitle1" fontWeight={700} color="#2e7d32" textAlign="center" mb={2}>
                SALDOS TOTALES
              </Typography>
              <Grid container spacing={2} justifyContent="center" textAlign="center">
                {[
                  { label: 'SALDO EFECTIVO', val: globalesIngreso.efectivo - globalesEgreso.efectivo - globalesCostos.efectivo, color: '#2e7d32' },
                  { label: 'SALDO BANCOLOMBIA', val: globalesIngreso.bancolombia - globalesEgreso.bancolombia - globalesCostos.bancolombia, color: '#2e7d32' },
                  { label: 'SALDO NEQUI', val: globalesIngreso.nequi - globalesEgreso.nequi - globalesCostos.nequi, color: '#2e7d32' },
                  { label: 'SALDO DAVIPLATA', val: globalesIngreso.daviplata - globalesEgreso.daviplata - globalesCostos.daviplata, color: '#2e7d32' },
                  { label: 'SALDO DATAFONO', val: globalesIngreso.datafono - globalesEgreso.datafono - globalesCostos.datafono, color: '#2e7d32' },
                  { label: 'SALDOS GLOBALES', val: globalesIngreso.total - globalesEgreso.total - globalesCostos.total, color: '#2e7d32' },
                ].map(({ label, val, color }) => (
                  <Grid item xs={4} md={2} key={label}>
                    <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight={600} display="block">{label}</Typography>
                    <Typography variant="h6" fontWeight={700} color={color}>{formatCol(val)}</Typography>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Paper>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
        ) : (
          <>
            <Typography variant="h6" color="#1976d2" fontWeight={700} mb={1}>Facturado</Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', mb: 4 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#fafafa' }}>
                  <TableRow>
                    <RCell isHeader>Factura</RCell><RCell isHeader>Fecha</RCell>
                    <RCell isHeader>Cliente</RCell><RCell isHeader>Forma Pago</RCell>
                    <RCell isHeader>Total Factura</RCell>
                    <RCell isHeader>Propina</RCell>
                    <RCell isHeader>Domicilio</RCell>
                    {METODOS_PAGO.map(m => <RCell isHeader align="center" key={m}>{m.toUpperCase()}</RCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtradas.length === 0
                    ? <TableRow><TableCell colSpan={11} align="center" sx={{ py: 3 }}>No hay facturas en este periodo</TableCell></TableRow>
                    : filtradas.map(f => {
                      const pagosPorMetodo = agruparPagosFactura(f);

                      return (
                        <TableRow key={f._id} hover>
                          <RCell>{f.numero_factura || '...'}</RCell>
                          <RCell>
                            <Typography variant="body2">{new Date(f.createdAt).toLocaleDateString()}</Typography>
                            <Typography variant="caption" color="text.secondary">{new Date(f.createdAt).toLocaleTimeString()}</Typography>
                          </RCell>
                          <RCell>{f.id_cliente ? `${f.id_cliente.nombre} ${f.id_cliente.apellido}` : 'Consumidor Final'}</RCell>
                          <RCell>{nombreFormaPago(f)}</RCell>
                          <RCell>{formatCol(f.total_pagado)}</RCell>
                          <RCell>{textoPropinasFactura(f)}</RCell>
                          <RCell>{textoDomicilioFactura(f)}</RCell>
                          {METODOS_PAGO.map(m => (
                            <RCell align="center" key={m}>
                              {pagosPorMetodo[m].montos.length === 0 ? (
                                <Typography variant="body2" fontWeight={600}>{formatCol(0)}</Typography>
                              ) : (
                                pagosPorMetodo[m].montos.map((monto, idx) => (
                                  <Typography variant="body2" fontWeight={600} key={`${m}-${idx}`}>
                                    {formatCol(monto)}
                                  </Typography>
                                ))
                              )}
                            </RCell>
                          ))}
                        </TableRow>
                      );
                    })
                  }
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <RCell isHeader colSpan={4} align="right">TOTALES FACTURADO</RCell>
                    <RCell isHeader color="#1976d2">{formatCol(globalesIngreso.total)}</RCell>
                    <RCell isHeader color="#ef6c00">{textoResumenPorMetodo(totalPropinasFacturasPorMetodo(filtradas))}</RCell>
                    <RCell isHeader color="#1565c0">{textoResumenPorMetodo(totalDomiciliosFacturasPorMetodo(filtradas))}</RCell>
                    {METODOS_PAGO.map(m => <RCell isHeader align="center" key={m}>{formatCol(globalesIngreso[m])}</RCell>)}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

{isAdmin && (
              <>
                <Typography variant="h6" color="error.main" fontWeight={700} mb={1}>Gastos</Typography>
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', mb: 4 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#fafafa' }}>
                      <TableRow>
                        <RCell isHeader>Egreso No.</RCell><RCell isHeader>Fecha</RCell>
                        <RCell isHeader>Nombre</RCell><RCell isHeader>Descripción</RCell>
                        <RCell isHeader>MÉTODO/MONTO</RCell>
                        <RCell isHeader align="right">Total</RCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {egresos.length === 0
                        ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}>No hay egresos en este periodo</TableCell></TableRow>
                        : egresos.map(g => (
                          <TableRow key={g._id} hover>
                            <RCell>{g.numero_gasto || '...'}</RCell>
                            <RCell>
                              <Typography variant="body2">{new Date(g.createdAt).toLocaleDateString()}</Typography>
                              <Typography variant="caption" color="text.secondary">{new Date(g.createdAt).toLocaleTimeString()}</Typography>
                            </RCell>
                            <RCell>{g.nombre}</RCell>
                            <RCell>{g.descripcion}</RCell>
                            <RCell>
                              <Typography variant="body2" fontWeight={600}>
                                {formatCol(g.monto)} {g.metodo_pago}
                              </Typography>
                            </RCell>
                            <RCell align="right" color="error.main">{formatCol(g.monto)}</RCell>
                          </TableRow>
                        ))
                      }
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <RCell isHeader colSpan={4} align="right">TOTALES EGRESOS</RCell>
                        <RCell isHeader></RCell>
                        <RCell isHeader align="right" color="error.main">{formatCol(globalesEgreso.total)}</RCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

{isAdmin && (
              <>
                <Typography variant="h6" color="#1565c0" fontWeight={700} mb={1} mt={2}>Costos Operativos</Typography>
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', mb: 4 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#fafafa' }}>
                      <TableRow>
                        <RCell isHeader>Costo No.</RCell><RCell isHeader>Fecha</RCell>
                        <RCell isHeader>Nombre</RCell><RCell isHeader>Descripción</RCell>
                        <RCell isHeader>MÉTODO/MONTO</RCell>
                        <RCell isHeader align="right">Total</RCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {costosFiltrados.length === 0
                        ? <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3 }}>No hay costos registrados en este periodo</TableCell></TableRow>
                        : costosFiltrados.map(c => (
                          <TableRow key={c._id} hover>
                            <RCell>{c.numero_costo || '...'}</RCell>
                            <RCell>
                              <Typography variant="body2">{new Date(c.createdAt).toLocaleDateString()}</Typography>
                              <Typography variant="caption" color="text.secondary">{new Date(c.createdAt).toLocaleTimeString()}</Typography>
                            </RCell>
                            <RCell>{c.nombre}</RCell>
                            <RCell>{c.descripcion}</RCell>
                            <RCell>
                              <Typography variant="body2" fontWeight={600}>
                                {formatCol(c.monto)} {c.metodo_pago}
                              </Typography>
                            </RCell>
                            <RCell align="right" color="#1565c0">{formatCol(c.monto)}</RCell>
                          </TableRow>
                        ))
                      }
                      <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                        <RCell isHeader colSpan={4} align="right">TOTALES COSTOS</RCell>
                        <RCell isHeader></RCell>
                        <RCell isHeader align="right" color="#1565c0">{formatCol(globalesCostos.total)}</RCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </>
        )}
      </div>

      {/* ══ IMPRESIÓN (oculto en pantalla, visible al imprimir) ══ */}
      <div className="print-only">

        <div className="ph">
          <span className="ph-title">CIERRE DE CAJA</span>
          <span className="ph-sub">Período: {fechaInicio} al {fechaFin}</span>
          <span className="ph-sub">Generado: {new Date().toLocaleString('es-CO')}</span>
        </div>

        {/* Resumen como tabla Excel */}
        <table className="sg">
          <thead>
            <tr>
              <td><span className="lbl">Total Factura</span></td>
              <td><span className="lbl">Propina</span></td>
              {METODOS_PAGO.map(m => <td key={m}><span className="lbl">{m}</span></td>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="val c-blue">{formatCol(globalesIngreso.total)}</span></td>
              <td><span className="val">{formatCol(globalesIngreso.propina)}</span></td>
              {METODOS_PAGO.map(m => <td key={m}><span className="val">{formatCol(globalesIngreso[m])}</span></td>)}
            </tr>
          </tbody>
        </table>

        {/* Tabla Facturado */}
        <p className="st st-blue">Facturado</p>
        <table className="data">
          <thead>
            <tr>
              <th>Factura</th><th>Fecha</th><th>Cliente</th><th>Forma Pago</th><th>Total</th><th>Propina</th><th>Domicilio</th>
              {METODOS_PAGO.map(m => <th key={m}>{m.toUpperCase()}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtradas.map(f => {
              const pagosPorMetodo = agruparPagosFactura(f);

              return (
                <tr key={f._id}>
                  <td>{f.numero_factura}</td>
                  <td>{new Date(f.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  <td>{f.id_cliente ? `${f.id_cliente.nombre} ${f.id_cliente.apellido}` : 'Consumidor Final'}</td>
                  <td>{nombreFormaPago(f)}</td>
                  <td>{formatCol(f.total_pagado)}</td>
                  <td>{textoPropinasFactura(f)}</td>
                  <td>{textoDomicilioFactura(f)}</td>
                  {METODOS_PAGO.map(m => {
                    const pago = pagosPorMetodo[m];
                    return <td key={m} align="center">{pago.montos.length ? pago.montos.map(formatCol).join(' / ') : '$0'}</td>;
                  })}
                </tr>
              );
            })}
            <tr className="tr">
              <td colSpan={4} style={{ textAlign: 'right' }}>TOTALES</td>
              <td>{formatCol(globalesIngreso.total)}</td>
              <td>{textoResumenPorMetodo(totalPropinasFacturasPorMetodo(filtradas))}</td>
              <td>{textoResumenPorMetodo(totalDomiciliosFacturasPorMetodo(filtradas))}</td>
              {METODOS_PAGO.map(m => <td key={m} align="center">{formatCol(globalesIngreso[m])}</td>)}
            </tr>
          </tbody>
        </table>

        {/* Tabla Egresos */}
        <p className="st st-red">Gastos</p>
        <table className="data">
          <thead>
            <tr>
              <th>Egreso No.</th><th>Fecha</th><th>Nombre</th><th>Descripción</th>
              <th>Método/Monto</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {egresos.map(g => (
              <tr key={g._id}>
                <td>{g.numero_gasto}</td>
                <td>{new Date(g.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td>{g.nombre}</td>
                <td>{g.descripcion}</td>
                <td>{g.metodo_pago} - {formatCol(g.monto)}</td>
                <td className="c-red">{formatCol(g.monto)}</td>
              </tr>
            ))}
            <tr className="tr">
              <td colSpan={4} style={{ textAlign: 'right' }}>TOTALES</td>
              <td></td>
              <td className="c-red">{formatCol(globalesEgreso.total)}</td>
            </tr>
          </tbody>
        </table>

        {/* Tabla Costos */}
        <p className="st st-blue">Costos Operativos</p>
        <table className="data">
          <thead>
            <tr>
              <th>Costo No.</th><th>Fecha</th><th>Nombre</th><th>Descripción</th>
              <th>Método/Monto</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {costosFiltrados.map(c => (
              <tr key={c._id}>
                <td>{c.numero_costo}</td>
                <td>{new Date(c.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</td>
                <td>{c.nombre}</td>
                <td>{c.descripcion}</td>
                <td>{c.metodo_pago} - {formatCol(c.monto)}</td>
                <td className="c-blue">{formatCol(c.monto)}</td>
              </tr>
            ))}
            <tr className="tr">
              <td colSpan={4} style={{ textAlign: 'right' }}>TOTALES</td>
              <td></td>
              <td className="c-blue">{formatCol(globalesCostos.total)}</td>
            </tr>
          </tbody>
        </table>

        {/* Tabla Gastos Operativos por Método de Pago */}
        <p className="st st-red">Gastos Operativos por Método de Pago</p>
        <table className="data">
          <thead>
            <tr>
              <th>Método de Pago</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Efectivo', val: globalesEgreso.efectivo },
              { label: 'Bancolombia', val: globalesEgreso.bancolombia },
              { label: 'Nequi', val: globalesEgreso.nequi },
              { label: 'Daviplata', val: globalesEgreso.daviplata },
              { label: 'Datafono', val: globalesEgreso.datafono },
            ].map((item, idx) => (
              <tr key={idx}>
                <td>{item.label}</td>
                <td className="c-red">{formatCol(item.val)}</td>
              </tr>
            ))}
            <tr className="tr">
              <td style={{ textAlign: 'right' }}>TOTALES GLOBALES</td>
              <td className="c-red">{formatCol(globalesEgreso.total)}</td>
            </tr>
          </tbody>
        </table>

        {/* Tabla Costos Operativos por Método de Pago */}
        <p className="st st-blue">Costos Operativos por Método de Pago</p>
        <table className="data">
          <thead>
            <tr>
              <th>Método de Pago</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Efectivo', val: globalesCostos.efectivo },
              { label: 'Bancolombia', val: globalesCostos.bancolombia },
              { label: 'Nequi', val: globalesCostos.nequi },
              { label: 'Daviplata', val: globalesCostos.daviplata },
              { label: 'Datafono', val: globalesCostos.datafono },
            ].map((item, idx) => (
              <tr key={idx}>
                <td>{item.label}</td>
                <td className="c-blue">{formatCol(item.val)}</td>
              </tr>
            ))}
            <tr className="tr">
              <td style={{ textAlign: 'right' }}>TOTALES GLOBALES</td>
              <td className="c-blue">{formatCol(globalesCostos.total)}</td>
            </tr>
          </tbody>
        </table>

        {/* Tabla Saldos Totales */}
        <p className="st st-green">Saldos Totales</p>
        <table className="data">
          <thead>
            <tr>
              <th>Método de Pago</th>
              <th>Ingresos</th>
              <th>Gastos</th>
              <th>Costos</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: 'Efectivo', ingreso: globalesIngreso.efectivo, gasto: globalesEgreso.efectivo, costo: globalesCostos.efectivo },
              { label: 'Bancolombia', ingreso: globalesIngreso.bancolombia, gasto: globalesEgreso.bancolombia, costo: globalesCostos.bancolombia },
              { label: 'Nequi', ingreso: globalesIngreso.nequi, gasto: globalesEgreso.nequi, costo: globalesCostos.nequi },
              { label: 'Daviplata', ingreso: globalesIngreso.daviplata, gasto: globalesEgreso.daviplata, costo: globalesCostos.daviplata },
              { label: 'Datafono', ingreso: globalesIngreso.datafono, gasto: globalesEgreso.datafono, costo: globalesCostos.datafono },
            ].map((item, idx) => (
              <tr key={idx}>
                <td>{item.label}</td>
                <td className="c-blue">{formatCol(item.ingreso)}</td>
                <td className="c-red">{formatCol(item.gasto)}</td>
                <td className="c-blue">{formatCol(item.costo)}</td>
                <td className="c-green">{formatCol(item.ingreso - item.gasto - item.costo)}</td>
              </tr>
            ))}
            <tr className="tr">
              <td style={{ textAlign: 'right' }}>TOTALES GLOBALES</td>
              <td className="c-blue">{formatCol(globalesIngreso.total)}</td>
              <td className="c-red">{formatCol(globalesEgreso.total)}</td>
              <td className="c-blue">{formatCol(globalesCostos.total)}</td>
              <td className="c-green">{formatCol(globalesIngreso.total - globalesEgreso.total - globalesCostos.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity={snack.severity} variant="filled">{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default CierreCajaPage;
