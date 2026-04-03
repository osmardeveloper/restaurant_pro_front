// ============================================================
// src/pages/ComandasPage.jsx — Vista de Comandas con Edición POS
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Chip, Snackbar, Alert, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, IconButton, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions, Button, Grid,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import { comandaService, productoService } from '../services/api';

const ComandasPage = () => {
  const navigate = useNavigate();
  const [comandas, setComanadas]         = useState([]);
  const [platos, setPlatos]              = useState([]);
  const [loading, setLoading]            = useState(false);
  const [page, setPage]                  = useState(0);
  const [rowsPerPage, setRowsPerPage]    = useState(10);
  const [snack, setSnack]                = useState({ open: false, msg: '', severity: 'error' });

  // Modal State
  const [dialogOpen, setDialogOpen]      = useState(false);
  const [editId, setEditId]              = useState(null);
  const [busquedaProd, setBusquedaProd]  = useState('');
  const [pedidoActual, setPedidoActual]  = useState([]);

  const fetchDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [comandasRes, prodRes] = await Promise.all([
        comandaService.getAll(),
        productoService.getAll()
      ]);
      setComanadas(comandasRes.data);
      setPlatos(prodRes.data);
    } catch {
      setSnack({ open: true, msg: 'Error al cargar los datos.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDatos(); }, [fetchDatos]);

  const abrirEditar = (comanda) => {
    setEditId(comanda._id);
    const productos = comanda.ids_productos || [];
    setPedidoActual(productos.map(p => ({ ...p, uid: Math.random().toString(36).substr(2, 9) })));
    setBusquedaProd('');
    setDialogOpen(true);
  };

  const irAFacturar = (comanda) => {
    navigate('/facturacion', {
      state: {
        productos: comanda.ids_productos || [],
        cliente: comanda.id_cliente || null,
        comandaId: comanda._id
      }
    });
  };

  const agregarProducto = (prod) => {
    setPedidoActual(prev => [...prev, { ...prod, uid: Math.random().toString(36).substr(2, 9) }]);
  };

  const quitarProducto = (uid) => {
    setPedidoActual(prev => prev.filter(item => item.uid !== uid));
  };

  const guardarEdicion = async () => {
    if (!editId) return;
    try {
      await comandaService.update(editId, { ids_productos: pedidoActual.map(p => p._id) });
      setSnack({ open: true, msg: 'Comanda actualizada exitosamente.', severity: 'success' });
      setDialogOpen(false);
      fetchDatos();
    } catch (err) {
      setSnack({ open: true, msg: err.response?.data?.message || 'Error al actualizar comanda.', severity: 'error' });
    }
  };

  const paginadas = comandas.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const totalEdicion = pedidoActual.reduce((acc, curr) => acc + (curr.precio || 0), 0);
  const prodFiltrados = platos.filter(p => (p.nombre || '').toLowerCase().includes(busquedaProd.toLowerCase()));

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)' }}>
          <ReceiptLongIcon sx={{ color: '#fff', display: 'block' }} />
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#1a1a2e">Comandas</Typography>
          <Typography variant="body2" color="text.secondary">{comandas.length} comanda(s) activas</Typography>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#e94560' }} />
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)' }}>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Mesa</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Cliente</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Productos</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Fecha / Hora</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700, textAlign: 'center' }}>Facturada</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 700, textAlign: 'center' }}>Editar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginadas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 8, color: 'text.secondary' }}>
                        <ReceiptLongIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3, display: 'block', mx: 'auto' }} />
                        No hay comandas registradas aún.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginadas.map((comanda) => {
                      return (
                        <TableRow key={comanda._id} sx={{ '&:hover': { background: 'rgba(233,69,96,0.04)' }, '&:last-child td': { border: 0 } }}>
                          <TableCell><Typography fontWeight={700} color="#0f3460">Mesa #{comanda.id_mesa?.numero_mesa ?? '—'}</Typography></TableCell>
                          <TableCell>
                            {comanda.id_cliente ? (
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{comanda.id_cliente.nombre} {comanda.id_cliente.apellido}</Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary"><em>Anónimo</em></Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {(comanda.ids_productos || []).length === 0 ? (
                                <Typography color="text.secondary" variant="body2">Sin productos</Typography>
                              ) : (
                                (comanda.ids_productos || []).map((prod, i) => (
                                  <Chip key={prod._id || i} label={prod.nombre || 'Producto'} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }} />
                                ))
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {comanda.createdAt ? new Date(comanda.createdAt).toLocaleString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {comanda.facturada ? (
                              <CheckCircleIcon color="success" />
                            ) : (
                              <AccessTimeIcon color="warning" />
                            )}
                          </TableCell>
                          <TableCell align="center">
                            {!comanda.facturada ? (
                              <Tooltip title="Editar Comanda">
                                <IconButton size="small" onClick={() => abrirEditar(comanda)} sx={{ color: '#0f3460' }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : (
                              <Typography variant="caption" color="text.secondary">Bloqueado</Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div" count={comandas.length} page={page}
              onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage}
              onRowsPerPageChange={e => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[5, 10, 25]}
              labelRowsPerPage="Filas por página:"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
            />
          </>
        )}
      </Paper>

      {/* Modal Editar Pedidos */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 3, minHeight: '80vh' } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontWeight: 700 }}>
          Modificar Productos de Comanda
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
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
                <Typography variant="subtitle2" fontWeight={700}>Productos Actuales</Typography>
              </Box>
              <Box sx={{ flex: 1, overflowY: 'auto' }}>
                {pedidoActual.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" mt={4}>
                    Esta comanda no tiene productos.
                  </Typography>
                ) : (
                  pedidoActual.map((item, index) => (
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
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Total Comanda</Typography>
                <Typography variant="h6" fontWeight={700}>
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalEdicion)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={guardarEdicion} variant="contained" sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #e94560, #c62a47)' }}>Actualizar Comanda</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ComandasPage;
