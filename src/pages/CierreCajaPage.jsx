// ============================================================
// src/pages/CierreCajaPage.jsx — Cierre de Caja en Tiempo Real
// ============================================================
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Snackbar, Alert
} from '@mui/material';
import CalculateIcon from '@mui/icons-material/Calculate';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { facturacionService, gastoService } from '../services/api';

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
  const [facturas, setFacturas] = useState([]);
  const [gastos, setGastos] = useState([]);
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
      const [resFac, resGas] = await Promise.all([facturacionService.getAll(), gastoService.getAll()]);
      setFacturas(resFac.data || []);
      setGastos(resGas.data || []);
    } catch {
      setSnack({ open: true, msg: 'Error al cargar datos.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const { filtradas, egresos } = useMemo(() => {
    if (!fechaInicio || !fechaFin) return { filtradas: [], egresos: [] };
    
    // Normalizar fechas para comparación (Local)
    const fInit = new Date(fechaInicio + 'T00:00:00');
    const fEnd  = new Date(fechaFin + 'T23:59:59');
    
    return {
      filtradas: facturas.filter(x => {
        const d = new Date(x.createdAt);
        // Comparación de objetos Date es robusta si ambos se crearon/parsearon bien
        return d >= fInit && d <= fEnd;
      }),
      egresos:   gastos.filter(x => {
        const d = new Date(x.createdAt);
        return d >= fInit && d <= fEnd;
      }),
    };
  }, [facturas, gastos, fechaInicio, fechaFin]);

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

  const RCell = ({ isHeader, children, color, align, colSpan }) => (
    <TableCell align={align || 'left'} colSpan={colSpan}
      sx={{ fontWeight: isHeader ? 700 : 500, color: isHeader ? 'text.secondary' : (color || 'inherit'), border: '1px solid rgba(0,0,0,0.08)' }}>
      {children}
    </TableCell>
  );

  const efectivoNeto = globalesIngreso.efectivo - globalesEgreso.efectivo;

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

        <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, border: '1px solid #c8e6c9', background: 'rgba(76,175,80,0.02)' }}>
          <Typography variant="subtitle1" fontWeight={700} color="success.main" textAlign="center" mb={2}>
            TOTALES GLOBALES (INGRESOS RECAUDADOS)
          </Typography>
          <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mb={2}>
            del {formatPeriodo(fechaInicio)} al {formatPeriodo(fechaFin)}
          </Typography>
          <Grid container spacing={2} justifyContent="center" textAlign="center">
            {[
              { label: 'TOTAL FACTURA', val: globalesIngreso.total, color: '#1976d2' },
              { label: 'PROPINA', val: globalesIngreso.propina, color: '#ef6c00' },
              ...METODOS_PAGO.map(m => ({ label: m.toUpperCase(), val: globalesIngreso[m], color: '#1a1a2e' })),
              { label: 'GASTOS GLOBALES', val: globalesEgreso.total, color: 'error.main' },
              { label: 'GASTOS EN EFECTIVO', val: globalesEgreso.efectivo, color: 'error.main' },
              { label: 'EFECTIVO EN CAJA', val: efectivoNeto, color: efectivoNeto >= 0 ? 'success.main' : 'error.main' },
            ].map(({ label, val, color }) => (
              <Grid item xs={4} md={2} key={label}>
                <Typography variant="caption" color="text.secondary" textTransform="uppercase" fontWeight={600} display="block">{label}</Typography>
                <Typography variant="h6" fontWeight={700} color={color}>{formatCol(val)}</Typography>
              </Grid>
            ))}
          </Grid>
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
                    <RCell isHeader color="#ef6c00">{formatCol(globalesIngreso.propina)}</RCell>
                    {METODOS_PAGO.map(m => <RCell isHeader align="center" key={m}>{formatCol(globalesIngreso[m])}</RCell>)}
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="h6" color="error.main" fontWeight={700} mb={1}>Egresos</Typography>
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', mb: 4 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#fafafa' }}>
                  <TableRow>
                    <RCell isHeader>Egreso No.</RCell><RCell isHeader>Fecha</RCell>
                    <RCell isHeader>Nombre</RCell><RCell isHeader>Descripción</RCell>
                    {METODOS_PAGO.map(m => <RCell isHeader align="center" key={m}>{m.toUpperCase()}</RCell>)}
                    <RCell isHeader align="right">Total</RCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {egresos.length === 0
                    ? <TableRow><TableCell colSpan={10} align="center" sx={{ py: 3 }}>No hay egresos en este periodo</TableCell></TableRow>
                    : egresos.map(g => (
                      <TableRow key={g._id} hover>
                        <RCell>{g.numero_gasto || '...'}</RCell>
                        <RCell>
                          <Typography variant="body2">{new Date(g.createdAt).toLocaleDateString()}</Typography>
                          <Typography variant="caption" color="text.secondary">{new Date(g.createdAt).toLocaleTimeString()}</Typography>
                        </RCell>
                        <RCell>{g.nombre}</RCell>
                        <RCell>{g.descripcion}</RCell>
                        {METODOS_PAGO.map(m => <RCell align="center" key={m}>{g.metodo_pago === m ? formatCol(g.monto) : '$ 0'}</RCell>)}
                        <RCell align="right" color="error.main">{formatCol(g.monto)}</RCell>
                      </TableRow>
                    ))
                  }
                  <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                    <RCell isHeader colSpan={4} align="right">TOTALES EGRESOS</RCell>
                    {METODOS_PAGO.map(m => <RCell isHeader align="center" key={m}>{formatCol(globalesEgreso[m])}</RCell>)}
                    <RCell isHeader align="right" color="error.main">{formatCol(globalesEgreso.total)}</RCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
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
              <td><span className="lbl">Gastos Globales</span></td>
              <td><span className="lbl">Gastos Efectivo</span></td>
              <td><span className="lbl">Efectivo en Caja</span></td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="val c-blue">{formatCol(globalesIngreso.total)}</span></td>
              <td><span className="val">{formatCol(globalesIngreso.propina)}</span></td>
              {METODOS_PAGO.map(m => <td key={m}><span className="val">{formatCol(globalesIngreso[m])}</span></td>)}
              <td><span className="val c-red">{formatCol(globalesEgreso.total)}</span></td>
              <td><span className="val c-red">{formatCol(globalesEgreso.efectivo)}</span></td>
              <td><span className={`val ${efectivoNeto >= 0 ? 'c-green' : 'c-red'}`}>{formatCol(efectivoNeto)}</span></td>
            </tr>
          </tbody>
        </table>

        {/* Tabla Facturado */}
        <p className="st st-blue">Facturado</p>
        <table className="data">
          <thead>
            <tr>
              <th>Factura</th><th>Fecha</th><th>Cliente</th><th>Forma Pago</th><th>Total</th><th>Propina</th>
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
              <td>{formatCol(globalesIngreso.propina)}</td>
              {METODOS_PAGO.map(m => <td key={m} align="center">{formatCol(globalesIngreso[m])}</td>)}
            </tr>
          </tbody>
        </table>

        {/* Tabla Egresos */}
        <p className="st st-red">Egresos</p>
        <table className="data">
          <thead>
            <tr>
              <th>Egreso No.</th><th>Fecha</th><th>Nombre</th><th>Descripción</th>
              {METODOS_PAGO.map(m => <th key={m}>{m.toUpperCase()}</th>)}
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
                {METODOS_PAGO.map(m => <td key={m} align="center">{g.metodo_pago === m ? formatCol(g.monto) : '$0'}</td>)}
                <td className="c-red">{formatCol(g.monto)}</td>
              </tr>
            ))}
            <tr className="tr">
              <td colSpan={4} style={{ textAlign: 'right' }}>TOTALES</td>
              {METODOS_PAGO.map(m => <td key={m} align="center">{formatCol(globalesEgreso[m])}</td>)}
              <td className="c-red">{formatCol(globalesEgreso.total)}</td>
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
