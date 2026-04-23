// ============================================================
// src/pages/AuditoriaFacturacionPage.jsx — Auditoría de Facturas Eliminadas
// ============================================================
import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, Button, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
  CircularProgress, Card, CardContent, Divider, MenuItem, Select, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { facturacionService, usuarioService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const AuditoriaFacturacionPage = () => {
  const { usuario } = useAuth();
  
  const [eliminadas, setEliminadas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [estadisticas, setEstadisticas] = useState(null);
  const [detalleAbierto, setDetalleAbierto] = useState(false);
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState(null);

  // Filtros
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');

  useEffect(() => {
    fetchUsuarios();
    fetchDatos();

    // Usar BroadcastChannel para comunicación entre páginas/pestañas
    const channel = new BroadcastChannel('facturacion_eventos');
    
    const handleMessage = (event) => {
      if (event.data.tipo === 'factura_eliminada') {
        console.log('Se eliminó una factura, actualizando auditoría...');
        fetchDatos();
      }
    };

    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, []);

  const fetchUsuarios = async () => {
    try {
      const response = await usuarioService.getAll();
      const data = response.data || response;
      const admins = data.filter(u => {
        const rol = u.rol ? u.rol.toLowerCase() : '';
        return rol === 'admin';
      });
      setUsuarios(admins);
    } catch (err) {
      console.error('Error al obtener usuarios:', err);
    }
  };

  const fetchDatos = async () => {
    try {
      setLoading(true);
      const params = {};
      if (fechaDesde) params.fechaDesde = fechaDesde;
      if (fechaHasta) params.fechaHasta = fechaHasta;
      if (filtroUsuario) params.id_usuario = filtroUsuario;

      const [dataEliminadas, dataEstadisticas] = await Promise.all([
        facturacionService.getFacturasEliminadas(params),
        facturacionService.getEstadisticasEliminadas(params)
      ]);

      // Desempacar data si viene en { data: [...] }
      const eliminadasArray = Array.isArray(dataEliminadas) ? dataEliminadas : (dataEliminadas?.data || []);
      const estadisticasData = dataEstadisticas?.data || dataEstadisticas;
      
      setEliminadas(eliminadasArray);
      setEstadisticas(estadisticasData);
    } catch (err) {
      console.error('Error al obtener datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltrar = () => {
    fetchDatos();
  };

  const handleLimpiar = () => {
    setFechaDesde('');
    setFechaHasta('');
    setFiltroUsuario('');
  };

  const handleVerDetalle = (auditoria) => {
    setAuditoriaSeleccionada(auditoria);
    setDetalleAbierto(true);
  };

  const totalMonto = useMemo(() => {
    return eliminadas.reduce((sum, e) => sum + (e.id_factura?.total_pagado || 0), 0);
  }, [eliminadas]);

  return (
    <Box sx={{ p: 4, backgroundColor: '#f5f7fa', minHeight: '100vh' }}>
      {/* ENCABEZADO CON ESTADÍSTICAS */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 3 }}>
        {/* TÍTULO A LA IZQUIERDA */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <HistoryIcon sx={{ fontSize: 32, color: '#e94560' }} />
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#2c3e50' }}>
              Auditoría de Facturas Eliminadas
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#7f8c8d', mt: 1 }}>
            Control y seguimiento de facturas eliminadas. Acceso exclusivo para administradores.
          </Typography>
        </Box>

        {/* TARJETA TOTAL ELIMINADAS A LA DERECHA */}
        {estadisticas && !loading && (
          <Card sx={{ borderRadius: 2, boxShadow: 1, minWidth: 200, minHeight: 'fit-content' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AssignmentIcon sx={{ fontSize: 40, color: '#e94560' }} />
                <Box>
                  <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
                    Total Eliminadas
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {estadisticas.total}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* FILTROS */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2, boxShadow: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#2c3e50' }}>
          Filtros
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <Box sx={{ width: '15%' }}>
            <TextField
              fullWidth
              type="date"
              label="Desde"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
            />
          </Box>
          <Box sx={{ width: '15%' }}>
            <TextField
              fullWidth
              type="date"
              label="Hasta"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              sx={{ '& .MuiInputBase-input': { fontSize: '0.85rem' } }}
            />
          </Box>
          <Box sx={{ width: '35%' }}>
            <FormControl fullWidth size="small">
              <InputLabel sx={{ fontSize: '0.85rem' }}>Usuario Admin</InputLabel>
              <Select
                value={filtroUsuario}
                label="Usuario Admin"
                onChange={(e) => setFiltroUsuario(e.target.value)}
                sx={{ fontSize: '0.85rem' }}
              >
                <MenuItem value="">Todos</MenuItem>
                {usuarios.map(u => (
                  <MenuItem key={u._id} value={u._id}>
                    {u.nombre} {u.apellido}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, flex: 1 }}>
            <Button
              size="small"
              variant="contained"
              onClick={handleFiltrar}
              sx={{ 
                borderRadius: 1, 
                backgroundColor: '#e94560', 
                textTransform: 'none', 
                fontWeight: 600,
                flex: 1,
                fontSize: '0.8rem',
                py: 0.8
              }}
            >
              Filtrar
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={handleLimpiar}
              sx={{ 
                borderRadius: 1, 
                textTransform: 'none', 
                fontWeight: 600,
                fontSize: '0.8rem',
                py: 0.8
              }}
            >
              Limpiar
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* TABLA DE ELIMINACIONES */}
      <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress sx={{ color: '#e94560' }} />
          </Box>
        ) : eliminadas.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <HistoryIcon sx={{ fontSize: 48, color: '#bdc3c7', mb: 2 }} />
            <Typography variant="body2" sx={{ color: '#7f8c8d' }}>
              No hay facturas eliminadas en el período seleccionado.
            </Typography>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#ecf0f1' }}>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#2c3e50' }}>Acciones</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>Fecha Eliminación</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#2c3e50' }}>Nro Factura</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>Usuario Eliminador</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#2c3e50' }}>Motivo</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#2c3e50' }}>Monto</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#2c3e50' }}>Método Pago</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#2c3e50' }}>Fecha Factura</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {eliminadas.map((row, idx) => (
                <TableRow 
                  key={row._id}
                  sx={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8f9fa',
                    '&:hover': { backgroundColor: '#f0f3f6' },
                    borderBottom: '1px solid #ecf0f1'
                  }}
                >
                  <TableCell align="center" sx={{ py: 1.5 }}>
                    <IconButton 
                      size="small" 
                      onClick={() => handleVerDetalle(row)}
                      sx={{ color: '#3498db', '&:hover': { backgroundColor: '#ecf0f1' } }}
                    >
                      <VisibilityIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {new Date(row.fecha_eliminacion).toLocaleDateString('es-CO', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Typography>
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1.5 }}>
                    <Chip 
                      label={`#${row.id_factura?.numero_factura || 'N/A'}`}
                      variant="outlined"
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: '#2c3e50' }}>
                      {row.id_usuario?.nombre} {row.id_usuario?.apellido}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#7f8c8d' }}>
                      {row.id_usuario?.email}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.5, maxWidth: 250 }}>
                    <Typography variant="body2" sx={{ color: '#2c3e50', wordBreak: 'break-word' }}>
                      {row.motivo_eliminacion}
                    </Typography>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.5, fontWeight: 600, color: '#e74c3c' }}>
                    ${(row.id_factura?.total_pagado || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1.5 }}>
                    <Chip 
                      label={row.id_factura?.metodo_pago || 'N/A'}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {row.id_factura?.fecha_emision ? new Date(row.id_factura.fecha_emision).toLocaleDateString('es-CO') : 'N/A'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* MODAL DETALLE DE FACTURA ELIMINADA */}
      <Dialog 
        open={detalleAbierto} 
        onClose={() => setDetalleAbierto(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <ReceiptLongIcon />
          Detalle Factura #{auditoriaSeleccionada?.id_factura?.numero_factura}
        </DialogTitle>
        <DialogContent sx={{ pt: 3, maxHeight: '80vh', overflowY: 'auto' }}>
          {auditoriaSeleccionada && (
            <>
              {/* LEYENDA DE ELIMINACIÓN */}
              <Box sx={{ p: 2, backgroundColor: '#fff3cd', borderRadius: 1, borderLeft: '4px solid #ffc107', mb: 2 }}>
                <Typography variant="caption" sx={{ color: '#856404', fontWeight: 700, display: 'block', mb: 0.5 }}>
                  ⚠ FACTURA ELIMINADA
                </Typography>
                <Typography variant="caption" sx={{ color: '#856404', display: 'block', mb: 0.3 }}>
                  <strong>Usuario:</strong> {auditoriaSeleccionada?.id_usuario?.nombre} {auditoriaSeleccionada?.id_usuario?.apellido}
                </Typography>
                <Typography variant="caption" sx={{ color: '#856404', display: 'block', mb: 0.3 }}>
                  <strong>Fecha y Hora:</strong> {auditoriaSeleccionada?.fecha_eliminacion ? new Date(auditoriaSeleccionada.fecha_eliminacion).toLocaleDateString('es-CO', { 
                    year: 'numeric', 
                    month: '2-digit', 
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A'}
                </Typography>
                <Typography variant="caption" sx={{ color: '#856404', display: 'block' }}>
                  <strong>Motivo:</strong> {auditoriaSeleccionada?.motivo_eliminacion}
                </Typography>
              </Box>

              {/* Info principal */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>FECHA</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {auditoriaSeleccionada?.id_factura?.fecha_emision 
                      ? new Date(auditoriaSeleccionada.id_factura.fecha_emision).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
                      : auditoriaSeleccionada?.id_factura?.createdAt
                      ? new Date(auditoriaSeleccionada.id_factura.createdAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
                      : 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>MÉTODO DE PAGO</Typography>
                  <Box mt={0.5}>
                    <Chip label={auditoriaSeleccionada.id_factura?.metodo_pago || 'N/A'} size="small" sx={{ textTransform: 'capitalize' }} />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>CLIENTE</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    Consumidor Final
                  </Typography>
                </Box>
              </Box>

              {/* Productos */}
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5, color: '#1a1a2e' }}>PRODUCTOS FACTURADOS</Typography>
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(0,0,0,0.03)' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Producto</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="center">Cant.</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">P. Unit.</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Subtotal</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(auditoriaSeleccionada?.id_factura?.detalle_pedido || []).length > 0 ? (
                      (auditoriaSeleccionada.id_factura.detalle_pedido || []).map((item, i) => {
                        const precioUnitario = item.precio || 0;
                        const cantidad = item.cantidad || 1;

                        return (
                          <TableRow key={i}>
                            <TableCell>{item.nombre || '—'}</TableCell>
                            <TableCell align="center">{cantidad}</TableCell>
                            <TableCell align="right">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(precioUnitario)}</TableCell>
                            <TableCell align="right">
                              <Typography fontWeight={700}>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(precioUnitario * cantidad)}</Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                          Sin productos registrados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: '#1a1a2e' }}>PAGOS</Typography>
                  <Box sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, p: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 0.75 }}>
                      <Chip label={auditoriaSeleccionada.id_factura?.metodo_pago || 'Sin método'} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                      <Typography variant="body2" fontWeight={800}>
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(auditoriaSeleccionada.id_factura?.total_pagado || 0)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, pt: 1, mt: 0.5 }}>
                      <Typography variant="body2" fontWeight={900}>Total pagos</Typography>
                      <Typography variant="body2" fontWeight={900}>
                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(auditoriaSeleccionada.id_factura?.total_pagado || 0)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: '#ef6c00' }}>PROPINAS</Typography>
                  <Box sx={{ border: '1px solid #ffcc80', borderRadius: 2, p: 1.5, bgcolor: '#fffaf0' }}>
                    {(() => {
                      const propinas = auditoriaSeleccionada.id_factura?.propinas || [];
                      const totalPropinas = propinas.reduce((sum, p) => sum + (p.monto || 0), 0);
                      const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });

                      return propinas.length ? (
                        <>
                          {propinas.map((propina, idx) => (
                            <Box key={`${propina.metodo_pago}-${idx}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px solid #ffe0b2' }}>
                              <Chip label={propina.metodo_pago || 'Sin método'} size="small" variant="outlined" sx={{ textTransform: 'capitalize', borderColor: '#ef6c00', color: '#ef6c00' }} />
                              <Typography variant="body2" fontWeight={800} color="#ef6c00">
                                {formatoCOP.format(propina.monto || 0)}
                              </Typography>
                            </Box>
                          ))}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, pt: 1, mt: 0.5 }}>
                            <Typography variant="body2" fontWeight={900} color="#ef6c00">Total propinas</Typography>
                            <Typography variant="body2" fontWeight={900} color="#ef6c00">
                              {formatoCOP.format(totalPropinas)}
                            </Typography>
                          </Box>
                        </>
                      ) : (
                        <>
                          <Typography variant="body2" color="text.secondary" sx={{ pb: 1, borderBottom: '1px solid #ffe0b2' }}>Sin propina registrada</Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, pt: 1, mt: 0.5 }}>
                            <Typography variant="body2" fontWeight={900} color="#ef6c00">Total propinas</Typography>
                            <Typography variant="body2" fontWeight={900} color="#ef6c00">
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(0)}
                            </Typography>
                          </Box>
                        </>
                      );
                    })()}
                  </Box>
                </Box>
              </Box>

              {/* Total */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Box sx={{ bgcolor: '#1a1a2e', color: '#fff', px: 3, py: 1.5, borderRadius: 2, textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>TOTAL PAGADO</Typography>
                  <Typography variant="h5" fontWeight={900} color="#e94560">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(auditoriaSeleccionada.id_factura?.total_pagado || 0)}
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDetalleAbierto(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cerrar</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default AuditoriaFacturacionPage;
