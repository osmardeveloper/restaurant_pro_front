// ============================================================
// src/pages/ClientesPage.jsx — CRUD de Clientes con paginación
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel, Typography,
  IconButton, Snackbar, Alert, Paper, Tooltip, InputAdornment
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon           from '@mui/icons-material/Add';
import EditIcon          from '@mui/icons-material/Edit';
import DeleteIcon        from '@mui/icons-material/Delete';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import SearchIcon        from '@mui/icons-material/Search';
import { clienteService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TIPOS_DOCUMENTO = [
  { value: 'cedula_identidad', label: 'Cédula de Identidad' },
  { value: 'cedula_extranjeria', label: 'Cédula de Extranjería' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'documento_extranjero', label: 'Documento Extranjero' },
];

const FORM_INICIAL = {
  nombre: '',
  apellido: '',
  telefono: '',
  tipo_documento: '',
  numero_documento: '',
  correo: ''
};

const ClientesPage = () => {
  const { usuario } = useAuth();
  const [clientes, setClientes]         = useState([]);
  const [loading, setLoading]           = useState(false);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nombre: '', masterKey: '' });
  const [editId, setEditId]             = useState(null);
  const [form, setForm]                 = useState(FORM_INICIAL);
  const [busqueda, setBusqueda]         = useState('');
  const [snack, setSnack]               = useState({ open: false, msg: '', severity: 'success' });

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  const fetchClientes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clienteService.getAll();
      setClientes(res.data.map(c => ({ ...c, id: c._id })));
    } catch {
      showSnack('Error al cargar los clientes.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchClientes(); }, [fetchClientes]);

  const abrirCrear = () => { setEditId(null); setForm(FORM_INICIAL); setDialogOpen(true); };
  
  const abrirEditar = (row) => { 
    setEditId(row._id); 
    setForm({ 
      nombre: row.nombre || '', 
      apellido: row.apellido || '', 
      telefono: row.telefono || '',
      tipo_documento: row.tipo_documento || '',
      numero_documento: row.numero_documento || '',
      correo: row.correo || ''
    }); 
    setDialogOpen(true); 
  };

  const guardar = async () => {
    try {
      const datos = { ...form };
      if (editId) { 
        await clienteService.update(editId, datos); 
        showSnack('Cliente actualizado correctamente.'); 
      } else {        
        await clienteService.create(datos);         
        showSnack('Cliente creado correctamente.'); 
      }
      setDialogOpen(false);
      fetchClientes();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al guardar el cliente.', 'error');
    }
  };

  const confirmarEliminar = async () => {
    if (!deleteDialog.masterKey) {
      showSnack('Ingresa la clave maestra.', 'warning');
      return;
    }
    try {
      await clienteService.remove(deleteDialog.id, deleteDialog.masterKey);
      showSnack('Cliente eliminado correctamente.');
      setDeleteDialog({ open: false, id: null, nombre: '', masterKey: '' });
      fetchClientes();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Clave incorrecta o error al eliminar el cliente.', 'error');
    }
  };

  const columns = [
    { field: 'nombre', headerName: 'Nombre', flex: 1, minWidth: 120 },
    { field: 'apellido', headerName: 'Apellido', flex: 1, minWidth: 120 },
    { field: 'telefono', headerName: 'Teléfono', flex: 1, minWidth: 120 },
    { field: 'numero_documento', headerName: 'Nº Documento', flex: 1, minWidth: 130 },
    { field: 'correo', headerName: 'Correo', flex: 1.5, minWidth: 150 },
    {
      field: 'acciones', headerName: 'Acciones', width: 120, sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Editar"><IconButton size="small" onClick={() => abrirEditar(row)} sx={{ color: '#0f3460' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
          {usuario?.rol === 'admin' && (
            <Tooltip title="Eliminar"><IconButton size="small" onClick={() => setDeleteDialog({ open: true, id: row._id, nombre: `${row.nombre} ${row.apellido}` })} sx={{ color: '#e94560' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
          )}
        </Box>
      ),
    },
  ];

  const filtrados = clientes.filter(c => {
    const term = busqueda.toLowerCase();
    return (c.nombre?.toLowerCase().includes(term) || c.apellido?.toLowerCase().includes(term) || c.numero_documento?.toLowerCase().includes(term));
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)' }}>
            <AssignmentIndIcon sx={{ color: '#fff', display: 'block' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a1a2e">Clientes</Typography>
            <Typography variant="body2" color="text.secondary">{clientes.length} cliente(s) registrado(s)</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
             placeholder="Buscar cliente..."
             size="small"
             value={busqueda}
             onChange={(e) => setBusqueda(e.target.value)}
             InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
             sx={{ width: 250, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCrear} sx={{ background: 'linear-gradient(135deg, #e94560, #c62a47)', borderRadius: 2, px: 3, boxShadow: '0 4px 14px rgba(233,69,96,0.35)' }}>
            Nuevo Cliente
          </Button>
        </Box>
      </Box>

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <DataGrid
          rows={filtrados} columns={columns} loading={loading} autoHeight
          pageSizeOptions={[20]}
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
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
          {editId ? 'Editar Cliente' : 'Nuevo Cliente'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth label="Nombre" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} margin="normal" />
            <TextField fullWidth label="Apellido" value={form.apellido} onChange={e => setForm(p => ({ ...p, apellido: e.target.value }))} margin="normal" />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="tipo-doc-label">Tipo de Documento</InputLabel>
              <Select labelId="tipo-doc-label" value={form.tipo_documento} label="Tipo de Documento" onChange={e => setForm(p => ({ ...p, tipo_documento: e.target.value }))}>
                <MenuItem value=""><em>Ninguno</em></MenuItem>
                {TIPOS_DOCUMENTO.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField fullWidth label="Nº de Documento" value={form.numero_documento} onChange={e => setForm(p => ({ ...p, numero_documento: e.target.value }))} margin="normal" />
          </Box>
          <TextField fullWidth label="Teléfono" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} margin="normal" />
          <TextField fullWidth label="Correo Electrónico" type="email" value={form.correo} onChange={e => setForm(p => ({ ...p, correo: e.target.value }))} margin="normal" />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={guardar} variant="contained" sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #e94560, #c62a47)' }}>{editId ? 'Actualizar' : 'Crear'}</Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar eliminar */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, nombre: '', masterKey: '' })} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Eliminar Cliente</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            ¿Estás seguro de eliminar a <strong>{deleteDialog.nombre}</strong>? Esta acción es irreversible.
            Ingresa la <strong>Clave Maestra</strong> para confirmar:
          </Typography>
          <TextField 
            fullWidth label="Clave Maestra" type="password" size="small" autoComplete="off"
            value={deleteDialog.masterKey} onChange={e => setDeleteDialog(p => ({ ...p, masterKey: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && confirmarEliminar()}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
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

export default ClientesPage;
