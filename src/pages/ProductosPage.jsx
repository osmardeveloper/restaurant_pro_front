// ============================================================
// src/pages/ProductosPage.jsx — CRUD completo de Productos
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Typography, IconButton, Snackbar, Alert,
  Paper, Tooltip, InputAdornment, MenuItem, Select, FormControl, InputLabel, Chip
} from '@mui/material';
import { DataGrid }       from '@mui/x-data-grid';
import AddIcon            from '@mui/icons-material/Add';
import EditIcon           from '@mui/icons-material/Edit';
import DeleteIcon         from '@mui/icons-material/Delete';
import CategoryIcon       from '@mui/icons-material/Category';
import AttachMoneyIcon    from '@mui/icons-material/AttachMoney';
import SearchIcon         from '@mui/icons-material/Search';
import InventoryIcon      from '@mui/icons-material/Inventory';
import { productoService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TIPOS_PRODUCTO = [
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'postres', label: 'Postres' },
  { value: 'platos_principales', label: 'Platos Principales' },
  { value: 'sopas', label: 'Sopas' },
  { value: 'entradas', label: 'Entradas' },
  { value: 'comidas_rapidas', label: 'Comidas Rápidas' },
  { value: 'adicionales', label: 'Adicionales' },
];

const FORM_INICIAL = { nombre: '', descripcion: '', tipo: 'platos_principales', precio: '', cantidad: '', costo: '' };

const ProductosPage = () => {
  const { usuario } = useAuth();
  const [productos, setProductos]       = useState([]);
  const [loading, setLoading]           = useState(false);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nombre: '', masterKey: '' });
  const [editId, setEditId]             = useState(null);
  const [form, setForm]                 = useState(FORM_INICIAL);
  const [formErrors, setFormErrors]     = useState({});
  const [busqueda, setBusqueda]         = useState('');
  const [categoria, setCategoria]       = useState('todas');
  const [snack, setSnack]               = useState({ open: false, msg: '', severity: 'success' });

  const [loadingGuardar, setLoadingGuardar] = useState(false);

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productoService.getAll();
      setProductos(res.data.map(p => ({ ...p, id: p._id })));
    } catch {
      showSnack('Error al cargar los productos.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProductos(); }, [fetchProductos]);

  const validar = () => {
    const errors = {};
    if (!form.nombre || !String(form.nombre).trim()) errors.nombre = 'El nombre es requerido.';
    if (!form.tipo) errors.tipo = 'El tipo es requerido.';
    
    const precioStr = String(form.precio || '').trim();
    if (!precioStr) {
      errors.precio = 'El precio es requerido.';
    } else if (isNaN(Number(precioStr))) {
      errors.precio = 'Debe ser un número válido.';
    }

    const cantidadStr = String(form.cantidad || '').trim();
    if (cantidadStr !== '' && isNaN(Number(cantidadStr))) {
      errors.cantidad = 'Debe ser un número válido.';
    }

    const costoStr = String(form.costo || '').trim();
    if (costoStr !== '' && isNaN(Number(costoStr))) {
      errors.costo = 'Debe ser un número válido.';
    }
    
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      showSnack('Revisa los campos resaltados en rojo.', 'warning');
      return false;
    }
    return true;
  };

  const abrirCrear  = () => { setEditId(null); setForm(FORM_INICIAL); setFormErrors({}); setDialogOpen(true); };
  const abrirEditar = (row) => { 
    setEditId(row._id); 
    setForm({ 
      nombre: row.nombre, 
      descripcion: row.descripcion || '', 
      tipo: row.tipo,
      precio: String(row.precio),
      cantidad: row.cantidad !== undefined ? String(row.cantidad) : '',
      costo: row.costo !== undefined && row.costo !== null ? String(row.costo) : ''
    }); 
    setFormErrors({}); 
    setDialogOpen(true); 
  };

  const guardar = async () => {
    if (!validar()) return;
    
    setLoadingGuardar(true);
    try {
      const datos = { 
        ...form, 
        precio: Number(String(form.precio).trim()), 
        cantidad: form.cantidad ? Number(String(form.cantidad).trim()) : 0,
        costo: form.costo ? Number(String(form.costo).trim()) : null
      };
      
      if (editId) { 
        await productoService.update(editId, datos); 
        showSnack('Producto actualizado correctamente.'); 
      } else { 
        await productoService.create(datos); 
        showSnack('Producto creado correctamente.'); 
      }
      setDialogOpen(false);
      fetchProductos();
    } catch (err) {
      showSnack(err.response?.data?.message || err.message || 'Error al guardar el producto.', 'error');
    } finally {
      setLoadingGuardar(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!deleteDialog.masterKey) {
      showSnack('Ingresa la clave maestra.', 'warning');
      return;
    }
    try {
      await productoService.remove(deleteDialog.id, deleteDialog.masterKey);
      showSnack('Producto eliminado correctamente.');
      setDeleteDialog({ open: false, id: null, nombre: '', masterKey: '' });
      fetchProductos();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Clave incorrecta o error al eliminar el producto.', 'error');
    }
  };

  const columns = [
    { field: 'nombre', headerName: 'Nombre', flex: 1, minWidth: 150 },
    { 
      field: 'tipo', headerName: 'Tipo', width: 150, 
      renderCell: ({ value }) => <Chip label={TIPOS_PRODUCTO.find(t => t.value === value)?.label || value} size="small" variant="outlined" color="primary" />
    },
    { field: 'descripcion', headerName: 'Descripción', flex: 1.5, minWidth: 200 },
    { 
      field: 'precio', headerName: 'Precio', width: 110,
      renderCell: ({ value }) => <Typography fontWeight={600}>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)}</Typography>
    },
    ...(usuario?.rol === 'cajero' || usuario?.rol === 'admin' ? [{
      field: 'costo', headerName: 'Costo', width: 110,
      renderCell: ({ value }) => <Typography fontWeight={600}>{value ? new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value) : '-'}</Typography>
    }] : []),
    { 
      field: 'cantidad', headerName: 'Stock', width: 90,
      renderCell: ({ value }) => <Typography color={value <= 5 ? 'error' : 'inherit'}>{value}</Typography>
    },
    {
      field: 'acciones', headerName: 'Acciones', width: 110, sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {usuario?.rol === 'admin' && (
            <>
              <Tooltip title="Editar"><IconButton size="small" onClick={() => abrirEditar(row)} sx={{ color: '#0f3460' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Eliminar"><IconButton size="small" onClick={() => setDeleteDialog({ open: true, id: row._id, nombre: row.nombre })} sx={{ color: '#e94560' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
            </>
          )}
        </Box>
      ),
    },
  ];

  const filteredRows = productos.filter(p => {
    const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchCategoria = categoria === 'todas' || p.tipo === categoria;
    return matchBusqueda && matchCategoria;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)' }}>
            <InventoryIcon sx={{ color: '#fff', display: 'block' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a1a2e">Productos</Typography>
            <Typography variant="body2" color="text.secondary">{productos.length} producto(s) en total</Typography>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            placeholder="Buscar producto..."
            size="small"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            sx={{ width: 250, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
          />
          {usuario?.rol === 'admin' && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCrear} sx={{ background: 'linear-gradient(135deg, #e94560, #c62a47)', borderRadius: 2, px: 3 }}>
              Nuevo Producto
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Filtro por Categorías */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { height: 4 } }}>
        {['todas', ...TIPOS_PRODUCTO.map(t => t.value)].map(cat => (
          <Chip 
            key={cat} 
            label={cat === 'todas' ? 'Todas' : TIPOS_PRODUCTO.find(t => t.value === cat)?.label} 
            onClick={() => setCategoria(cat)}
            color={categoria === cat ? 'primary' : 'default'}
            variant={categoria === cat ? 'filled' : 'outlined'}
            sx={{ textTransform: 'capitalize', fontWeight: 600 }}
          />
        ))}
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <DataGrid
          rows={filteredRows} columns={columns} loading={loading} autoHeight
          hideFooterPagination
          disableRowSelectionOnClick
          disableColumnMenu
          disableColumnSorting
          disableColumnFilter
          disableColumnSelector
          slotProps={{
            pagination: { labelRowsPerPage: 'Filas por página' }
          }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeader': { background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff' },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, color: '#fff' },
          }}
        />
      </Paper>

      {/* Modal Crear/Editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontWeight: 700 }}>
          {editId ? 'Editar Producto' : 'Nuevo Producto'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField fullWidth label="Nombre" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} margin="normal" error={!!formErrors.nombre} helperText={formErrors.nombre} />
          
          <FormControl fullWidth margin="normal" error={!!formErrors.tipo}>
            <InputLabel>Tipo de Producto</InputLabel>
            <Select value={form.tipo} label="Tipo de Producto" onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
              {TIPOS_PRODUCTO.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
            </Select>
            {formErrors.tipo && <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>{formErrors.tipo}</Typography>}
          </FormControl>

          <TextField fullWidth label="Descripción" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} margin="normal" multiline rows={2} />
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth label="Precio" value={form.precio} onChange={e => setForm(p => ({ ...p, precio: e.target.value }))} margin="normal" error={!!formErrors.precio} helperText={formErrors.precio} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            {(usuario?.rol === 'cajero' || usuario?.rol === 'admin') && (
              <TextField fullWidth label="Costo (Opcional)" value={form.costo} onChange={e => setForm(p => ({ ...p, costo: e.target.value }))} margin="normal" error={!!formErrors.costo} helperText={formErrors.costo || ''} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} />
            )}
          </Box>

          <TextField 
            fullWidth label="Stock Actual" value={form.cantidad} margin="normal" 
            disabled helperText="Ajuste vía módulo de Inventario"
            InputProps={{ readOnly: true }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={guardar} disabled={loadingGuardar} variant="contained" sx={{ background: 'linear-gradient(135deg, #e94560, #c62a47)', borderRadius: 2 }}>
            {loadingGuardar ? 'Guardando...' : (editId ? 'Actualizar' : 'Crear')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar eliminar */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, nombre: '', masterKey: '' })} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Eliminar Producto</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            ¿Estás seguro de eliminar <strong>{deleteDialog.nombre}</strong>? Esta acción es irreversible.
            Ingresa la <strong>Clave Maestra</strong> para confirmar:
          </Typography>
          <TextField 
            fullWidth label="Clave Maestra" type="password" size="small" autoComplete="off"
            value={deleteDialog.masterKey} onChange={e => setDeleteDialog(p => ({ ...p, masterKey: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && confirmarEliminar()}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, nombre: '', masterKey: '' })} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={confirmarEliminar} variant="contained" color="error" sx={{ borderRadius: 2 }}>Confirmar Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default ProductosPage;
