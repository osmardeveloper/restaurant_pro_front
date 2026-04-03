// ============================================================
// src/pages/PlatosPage.jsx — CRUD completo de Platos del menú
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Typography, IconButton, Snackbar, Alert,
  Paper, Tooltip, InputAdornment,
} from '@mui/material';
import { DataGrid }       from '@mui/x-data-grid';
import AddIcon            from '@mui/icons-material/Add';
import EditIcon           from '@mui/icons-material/Edit';
import DeleteIcon         from '@mui/icons-material/Delete';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import AttachMoneyIcon    from '@mui/icons-material/AttachMoney';
import SearchIcon         from '@mui/icons-material/Search';
import { productoService } from '../services/api';

const FORM_INICIAL = { nombre: '', descripcion: '', precio: '' };

const PlatosPage = () => {
  const [platos, setPlatos]             = useState([]);
  const [loading, setLoading]           = useState(false);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nombre: '' });
  const [editId, setEditId]             = useState(null);
  const [form, setForm]                 = useState(FORM_INICIAL);
  const [formErrors, setFormErrors]     = useState({});
  const [busqueda, setBusqueda]         = useState('');
  const [snack, setSnack]               = useState({ open: false, msg: '', severity: 'success' });

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  const fetchPlatos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productoService.getAll('platos_principales');
      setPlatos(res.data.map(p => ({ ...p, id: p._id })));
    } catch {
      showSnack('Error al cargar los platos.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlatos(); }, [fetchPlatos]);

  const validar = () => {
    const errors = {};
    if (!form.nombre || !String(form.nombre).trim()) errors.nombre = 'El nombre es requerido.';
    
    const precioStr = String(form.precio || '').trim();
    if (!precioStr) {
      errors.precio = 'El precio es requerido.';
    } else if (isNaN(Number(precioStr))) {
      errors.precio = 'Debe ser un número válido.';
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      showSnack('Revisa los campos resaltados.', 'warning');
      return false;
    }
    return true;
  };

  const guardar = async () => {
    if (!validar()) return;
    try {
      const datos = { 
        ...form, 
        tipo: 'platos_principales',
        precio: Number(String(form.precio).trim()),
        cantidad: 999 
      };
      
      if (editId) { 
        await productoService.update(editId, datos); 
        showSnack('Plato actualizado correctamente.'); 
      } else { 
        await productoService.create(datos); 
        showSnack('Plato creado correctamente.'); 
      }
      setDialogOpen(false);
      fetchPlatos();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al guardar el plato.', 'error');
    }
  };

  const confirmarEliminar = async () => {
    try {
      await productoService.remove(deleteDialog.id);
      showSnack('Plato eliminado correctamente.');
      setDeleteDialog({ open: false, id: null, nombre: '' });
      fetchPlatos();
    } catch {
      showSnack('Error al eliminar el plato.', 'error');
    }
  };

  const columns = [
    { field: 'nombre', headerName: 'Nombre', flex: 1.5, minWidth: 200, sortable: false },
    { field: 'descripcion', headerName: 'Descripción', flex: 3, minWidth: 350, sortable: false },
    {
      field: 'precio', headerName: 'Precio', width: 150, sortable: false,
      renderCell: ({ value }) => <Typography fontWeight={600} color="#0f3460">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value)}</Typography>,
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)' }}>
            <RestaurantMenuIcon sx={{ color: '#fff', display: 'block' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a1a2e">Platos Principales</Typography>
            <Typography variant="body2" color="text.secondary">{platos.length} plato(s) en menú</Typography>
          </Box>
        </Box>
        <TextField
          placeholder="Buscar plato..."
          size="small"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
          sx={{ width: 300, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
        />
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <DataGrid
          rows={platos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))} 
          columns={columns} 
          loading={loading} 
          autoHeight
          disableRowSelectionOnClick
          disableColumnMenu
          disableColumnSorting
          disableColumnFilter
          disableColumnSelector
          hideFooterPagination
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeader': { background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff' },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, color: '#fff' },
          }}
        />
      </Paper>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontWeight: 700 }}>{editId ? 'Editar Plato' : 'Nuevo Plato'}</DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          <TextField fullWidth id="plato-nombre" label="Nombre del plato" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} margin="normal" error={!!formErrors.nombre} helperText={formErrors.nombre} />
          <TextField fullWidth id="plato-descripcion" label="Descripción" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} margin="normal" multiline rows={3} />
          <TextField fullWidth id="plato-precio" label="Precio" value={form.precio} type="number" onChange={e => setForm(p => ({ ...p, precio: e.target.value }))} margin="normal" error={!!formErrors.precio} helperText={formErrors.precio} InputProps={{ startAdornment: <InputAdornment position="start"><AttachMoneyIcon /></InputAdornment> }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button id="cancel-plato-btn" onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button id="save-plato-btn" onClick={guardar} variant="contained" sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #e94560, #c62a47)' }}>{editId ? 'Actualizar' : 'Crear'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, nombre: '' })} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>¿Eliminar plato?</DialogTitle>
        <DialogContent><Typography>¿Estás seguro de eliminar <strong>{deleteDialog.nombre}</strong>?</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, nombre: '' })} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button id="confirm-delete-plato-btn" onClick={confirmarEliminar} variant="contained" color="error" sx={{ borderRadius: 2 }}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default PlatosPage;
