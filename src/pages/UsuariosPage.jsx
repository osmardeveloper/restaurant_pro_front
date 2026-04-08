// ============================================================
// src/pages/UsuariosPage.jsx — CRUD completo de Usuarios
// ============================================================
import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel, Chip,
  Typography, IconButton, Snackbar, Alert, Paper, Tooltip,
  Tabs, Tab, Switch, FormControlLabel, Grid, Divider
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon    from '@mui/icons-material/Add';
import EditIcon   from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import { usuarioService, configuracionService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const rolConfig = {
  admin:  { label: 'Admin',  color: 'error'   },
  mesero: { label: 'Mesero', color: 'primary' },
  cocina: { label: 'Cocina', color: 'warning' },
  cajero: { label: 'Cajero', color: 'success' },
};

const MODULOS_PERMISOS = [
  { key: 'usuarios',     label: 'Usuarios',       icon: '👥' },
  { key: 'clientes',     label: 'Clientes',       icon: '👤' },
  { key: 'productos',    label: 'Productos',      icon: '📦' },
  { key: 'platos',       label: 'Platos',         icon: '🍽️' },
  { key: 'mesas',        label: 'Mesas',          icon: '🪑' },
  { key: 'tomar_pedido', label: 'Tomar Pedido',   icon: '📝' },
  { key: 'comandas',     label: 'Comandas',       icon: '🧾' },
  { key: 'facturacion',  label: 'Facturación',    icon: '💵' },
  { key: 'gastos',       label: 'Gastos',         icon: '📉' },
  { key: 'inventario',   label: 'Inventario',     icon: '📦' },
  { key: 'cierre_caja',  label: 'Cierre de Caja', icon: '🏦' },
];

const PERMISOS_INICIALES = MODULOS_PERMISOS.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.key !== 'usuarios' }), {});

const FORM_INICIAL = { nombre: '', password: '', rol: 'mesero' };

const UsuariosPage = () => {
  const { usuario } = useAuth();
  const [usuarios, setUsuarios]         = useState([]);
  const [loading, setLoading]           = useState(false);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nombre: '', masterKey: '' });
  const [editId, setEditId]             = useState(null);
  const [form, setForm]                 = useState(FORM_INICIAL);
  const [formErrors, setFormErrors]     = useState({});
  const [snack, setSnack]               = useState({ open: false, msg: '', severity: 'success' });
  
  // Estados para Permisos
  const [tabIndex, setTabIndex] = useState(0);
  const [permisos, setPermisos] = useState(PERMISOS_INICIALES);

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
    if (form.password && form.password.length < 4) errors.password = 'Mínimo 4 caracteres.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const abrirCrear = () => { 
    setEditId(null); 
    setForm(FORM_INICIAL); 
    setPermisos(PERMISOS_INICIALES);
    setFormErrors({}); 
    setTabIndex(0);
    setDialogOpen(true); 
  };
  
  const abrirEditar = async (row) => { 
    setEditId(row._id); 
    setForm({ nombre: row.nombre, password: '', rol: row.rol }); 
    setFormErrors({}); 
    setTabIndex(0);
    
    // Cargar permisos del usuario
    try {
      const res = await configuracionService.getByUser(row._id);
      if (res.data && res.data.detalles) {
        setPermisos(res.data.detalles);
      } else {
        setPermisos(PERMISOS_INICIALES);
      }
    } catch {
      setPermisos(PERMISOS_INICIALES);
    }
    
    setDialogOpen(true); 
  };

  const guardar = async () => {
    if (!validar()) return;
    try {
      const datos = { ...form };
      if (editId && !datos.password) delete datos.password;
      
      let resUser;
      if (editId) { 
        resUser = await usuarioService.update(editId, datos); 
      } else {
        resUser = await usuarioService.create(datos);
      }
      
      // Guardar permisos (configuración)
      const userId = editId || resUser.data._id;
      await configuracionService.save({
        id_usuario: userId,
        tipo: 'interfaz',
        subtipo: 'front',
        detalles: permisos
      });

      showSnack(`Usuario ${editId ? 'actualizado' : 'creado'} y permisos guardados correctamente.`);
      setDialogOpen(false);
      fetchUsuarios();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al guardar el usuario.', 'error');
    }
  };

  const handleTogglePermiso = (key) => {
    setPermisos(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const confirmarEliminar = async () => {
    if (!deleteDialog.masterKey) {
      showSnack('Ingresa la clave maestra.', 'warning');
      return;
    }
    try {
      await usuarioService.remove(deleteDialog.id, deleteDialog.masterKey);
      showSnack('Usuario eliminado correctamente.');
      setDeleteDialog({ open: false, id: null, nombre: '', masterKey: '' });
      fetchUsuarios();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Clave incorrecta o error al eliminar el usuario.', 'error');
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
          {usuario?.rol === 'admin' && (
            <>
              <Tooltip title="Editar"><IconButton id={`edit-usuario-${row._id}`} size="small" onClick={() => abrirEditar(row)} sx={{ color: '#0f3460' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="Eliminar"><IconButton id={`delete-usuario-${row._id}`} size="small" onClick={() => setDeleteDialog({ open: true, id: row._id, nombre: row.nombre })} sx={{ color: '#e94560' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
            </>
          )}
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
        {usuario?.rol === 'admin' && (
          <Button id="crear-usuario-btn" variant="contained" startIcon={<AddIcon />} onClick={abrirCrear} sx={{ background: 'linear-gradient(135deg, #e94560, #c62a47)', borderRadius: 2, px: 3, boxShadow: '0 4px 14px rgba(233,69,96,0.35)' }}>
            Nuevo Usuario
          </Button>
        )}
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {editId ? <EditIcon /> : <AddIcon />} 
          {editId ? 'Editar Usuario' : 'Nuevo Usuario'}
        </DialogTitle>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabIndex} onChange={(_, val) => setTabIndex(val)} variant="fullWidth" textColor="primary" indicatorColor="primary">
            <Tab icon={<AssignmentIndIcon />} label="DATOS GENERALES" iconPosition="start" />
            <Tab icon={<SecurityIcon />} label="PERMISOS" iconPosition="start" />
          </Tabs>
        </Box>

        <DialogContent sx={{ pt: 3, pb: 2, minHeight: 400 }}>
          {tabIndex === 0 && (
            <Box>
              <TextField fullWidth id="usuario-nombre" label="Usuario" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} margin="normal" error={!!formErrors.nombre} helperText={formErrors.nombre} />
              <TextField fullWidth id="usuario-password" label={editId ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña'} type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} margin="normal" error={!!formErrors.password} helperText={formErrors.password} />
              <FormControl fullWidth margin="normal">
                <InputLabel id="rol-label">Rol del Sistema</InputLabel>
                <Select labelId="rol-label" id="usuario-rol" value={form.rol} label="Rol del Sistema" onChange={e => setForm(p => ({ ...p, rol: e.target.value }))}>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="mesero">Mesero</MenuItem>
                  <MenuItem value="cocina">Cocina</MenuItem>
                  <MenuItem value="cajero">Cajero</MenuItem>
                </Select>
              </FormControl>
              <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(233,69,96,0.05)', borderRadius: 2, border: '1px dashed #e94560' }}>
                 <Typography variant="caption" color="error" fontWeight={600}>NOTA:</Typography>
                 <Typography variant="caption" display="block">Los roles definen permisos predeterminados a nivel de servidor, mientras que los permisos manuales controlan la interfaz de usuario.</Typography>
              </Box>
            </Box>
          )}

          {tabIndex === 1 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Activa o desactiva los módulos a los que este usuario tiene acceso en el panel lateral.
              </Typography>
              <Grid container spacing={2}>
                {MODULOS_PERMISOS.map((mod) => (
                  <Grid item xs={12} sm={6} key={mod.key}>
                    <Paper elevation={0} sx={{ p: 1, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, transition: '0.2s', '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' } }}>
                      <FormControlLabel
                        sx={{ width: '100%', m: 0, px: 1 }}
                        control={<Switch checked={permisos[mod.key] || false} onChange={() => handleTogglePermiso(mod.key)} color="primary" />}
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Typography sx={{ fontSize: '1.2rem' }}>{mod.icon}</Typography>
                            <Typography variant="body2" fontWeight={600}>{mod.label}</Typography>
                          </Box>
                        }
                      />
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button id="cancel-usuario-btn" onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button id="save-usuario-btn" onClick={guardar} variant="contained" sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #e94560, #c62a47)', fontWeight: 700 }}>
            {editId ? 'Guardar Cambios' : 'Crear Usuario'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmar eliminar */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, nombre: '', masterKey: '' })} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Eliminar Usuario</DialogTitle>
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
          <Button id="confirm-delete-usuario-btn" onClick={confirmarEliminar} variant="contained" color="error" sx={{ borderRadius: 2 }}>Confirmar Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default UsuariosPage;
