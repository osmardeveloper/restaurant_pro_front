// ============================================================
// src/pages/UsuariosPage.jsx — CRUD completo de Usuarios
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel, Chip,
  Typography, IconButton, Snackbar, Alert, Paper, Tooltip,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon    from '@mui/icons-material/Add';
import EditIcon   from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import { usuarioService } from '../services/api';

const rolConfig = {
  admin:  { label: 'Admin',  color: 'error'   },
  mesero: { label: 'Mesero', color: 'primary' },
  cocina: { label: 'Cocina', color: 'warning' },
};

const FORM_INICIAL = { nombre: '', password: '', rol: 'mesero' };

const UsuariosPage = () => {
  const [usuarios, setUsuarios]         = useState([]);
  const [loading, setLoading]           = useState(false);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nombre: '' });
  const [editId, setEditId]             = useState(null);
  const [form, setForm]                 = useState(FORM_INICIAL);
  const [formErrors, setFormErrors]     = useState({});
  const [snack, setSnack]               = useState({ open: false, msg: '', severity: 'success' });

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usuarioService.getAll();
      setUsuarios(res.data.map(u => ({ ...u, id: u._id })));
    } catch {
      showSnack('Error al cargar los usuarios.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  const validar = () => {
    const errors = {};
    if (!form.nombre.trim()) errors.nombre = 'El nombre es requerido.';
    if (!editId && !form.password.trim()) errors.password = 'La contraseña es requerida.';
    if (form.password && form.password.length < 6) errors.password = 'Mínimo 6 caracteres.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const abrirCrear = () => { setEditId(null); setForm(FORM_INICIAL); setFormErrors({}); setDialogOpen(true); };
  const abrirEditar = (row) => { setEditId(row._id); setForm({ nombre: row.nombre, password: '', rol: row.rol }); setFormErrors({}); setDialogOpen(true); };

  const guardar = async () => {
    if (!validar()) return;
    try {
      const datos = { ...form };
      if (editId && !datos.password) delete datos.password;
      if (editId) { await usuarioService.update(editId, datos); showSnack('Usuario actualizado correctamente.'); }
      else        { await usuarioService.create(datos);         showSnack('Usuario creado correctamente.'); }
      setDialogOpen(false);
      fetchUsuarios();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al guardar el usuario.', 'error');
    }
  };

  const confirmarEliminar = async () => {
    try {
      await usuarioService.remove(deleteDialog.id);
      showSnack('Usuario eliminado correctamente.');
      setDeleteDialog({ open: false, id: null, nombre: '' });
      fetchUsuarios();
    } catch {
      showSnack('Error al eliminar el usuario.', 'error');
    }
  };

  const columns = [
    { field: 'nombre', headerName: 'Nombre', flex: 1, minWidth: 150 },
    {
      field: 'rol', headerName: 'Rol', width: 130,
      renderCell: ({ value }) => <Chip label={rolConfig[value]?.label || value} color={rolConfig[value]?.color || 'default'} size="small" />,
    },
    {
      field: 'createdAt', headerName: 'Creado', width: 160,
      valueFormatter: (value) => value ? new Date(value).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '',
    },
    {
      field: 'acciones', headerName: 'Acciones', width: 120, sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Editar"><IconButton id={`edit-usuario-${row._id}`} size="small" onClick={() => abrirEditar(row)} sx={{ color: '#0f3460' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
          <Tooltip title="Eliminar"><IconButton id={`delete-usuario-${row._id}`} size="small" onClick={() => setDeleteDialog({ open: true, id: row._id, nombre: row.nombre })} sx={{ color: '#e94560' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)' }}>
            <PeopleIcon sx={{ color: '#fff', display: 'block' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a1a2e">Usuarios</Typography>
            <Typography variant="body2" color="text.secondary">{usuarios.length} usuario(s) registrado(s)</Typography>
          </Box>
        </Box>
        <Button id="crear-usuario-btn" variant="contained" startIcon={<AddIcon />} onClick={abrirCrear} sx={{ background: 'linear-gradient(135deg, #e94560, #c62a47)', borderRadius: 2, px: 3, boxShadow: '0 4px 14px rgba(233,69,96,0.35)' }}>
          Nuevo Usuario
        </Button>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <DataGrid
          rows={usuarios} columns={columns} loading={loading} autoHeight
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          disableColumnMenu
          disableColumnSorting
          disableColumnFilter
          disableColumnSelector
          slotProps={{
            pagination: {
              labelRowsPerPage: 'Filas por página',
              labelDisplayedRows: ({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`,
            },
          }}
          localeText={{
            footerRowSelected: (count) => `${count.toLocaleString()} fila(s) seleccionada(s)`,
          }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeader': { background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff' },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, color: '#fff' },
            '& .MuiDataGrid-row:hover': { background: 'rgba(233,69,96,0.04)' },
          }}
        />
      </Paper>

      {/* Modal Crear/Editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontWeight: 700 }}>
          {editId ? 'Editar Usuario' : 'Nuevo Usuario'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          <TextField fullWidth id="usuario-nombre" label="Nombre" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} margin="normal" error={!!formErrors.nombre} helperText={formErrors.nombre} />
          <TextField fullWidth id="usuario-password" label={editId ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña'} type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} margin="normal" error={!!formErrors.password} helperText={formErrors.password} />
          <FormControl fullWidth margin="normal">
            <InputLabel id="rol-label">Rol</InputLabel>
            <Select labelId="rol-label" id="usuario-rol" value={form.rol} label="Rol" onChange={e => setForm(p => ({ ...p, rol: e.target.value }))}>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="mesero">Mesero</MenuItem>
              <MenuItem value="cocina">Cocina</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button id="cancel-usuario-btn" onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button id="save-usuario-btn" onClick={guardar} variant="contained" sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #e94560, #c62a47)' }}>{editId ? 'Actualizar' : 'Crear'}</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar eliminar */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, nombre: '' })} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>¿Eliminar usuario?</DialogTitle>
        <DialogContent><Typography>¿Estás seguro de eliminar a <strong>{deleteDialog.nombre}</strong>?</Typography></DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, nombre: '' })} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button id="confirm-delete-usuario-btn" onClick={confirmarEliminar} variant="contained" color="error" sx={{ borderRadius: 2 }}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default UsuariosPage;
