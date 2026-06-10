// ============================================================
// src/pages/TurnosTrabajadosPage.jsx — Control de Turnos Trabajados (Admin)
// ============================================================
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel, Chip,
  Typography, IconButton, Snackbar, Alert, Paper, Tooltip, Grid, Card, CardContent, Avatar,
  Popover, Divider
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import InfoIcon from '@mui/icons-material/Info';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { turnosTrabajadosService, usuarioService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const FORM_INICIAL = {
  usuarioId: '',
  mes: new Date().toISOString().slice(0, 7), // Formato "YYYY-MM" (mes actual)
  diasTrabajados: []
};

// Componente personalizado para seleccionar mes y año
const MonthYearPicker = ({ value, onChange, label, error, helperText }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  
  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const open = Boolean(anchorEl);
  
  // Parsear el valor actual "YYYY-MM"
  const [currentYear, currentMonth] = useMemo(() => {
    if (!value) {
      const now = new Date();
      return [now.getFullYear(), now.getMonth() + 1];
    }
    const [y, m] = value.split('-');
    return [parseInt(y, 10), parseInt(m, 10)];
  }, [value]);

  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Sincronizar el año si el valor cambia externamente
  useEffect(() => {
    if (value) {
      const [y] = value.split('-');
      setSelectedYear(parseInt(y, 10));
    }
  }, [value]);

  const handlePrevYear = (e) => {
    e.stopPropagation();
    setSelectedYear(prev => prev - 1);
  };
  const handleNextYear = (e) => {
    e.stopPropagation();
    setSelectedYear(prev => prev + 1);
  };

  const months = [
    { label: 'Ene', val: 1 }, { label: 'Feb', val: 2 }, { label: 'Mar', val: 3 }, { label: 'Abr', val: 4 },
    { label: 'May', val: 5 }, { label: 'Jun', val: 6 }, { label: 'Jul', val: 7 }, { label: 'Ago', val: 8 },
    { label: 'Sep', val: 9 }, { label: 'Oct', val: 10 }, { label: 'Nov', val: 11 }, { label: 'Dic', val: 12 }
  ];

  const handleSelectMonth = (monthVal) => {
    const monthStr = monthVal.toString().padStart(2, '0');
    onChange(`${selectedYear}-${monthStr}`);
    handleClose();
  };

  // Nombre legible del mes seleccionado (ej: "Junio de 2026")
  const labelText = useMemo(() => {
    if (!value) return '';
    const [y, m] = value.split('-');
    const date = new Date(y, parseInt(m, 10) - 1, 15);
    const labelStr = date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long' });
    return labelStr.charAt(0).toUpperCase() + labelStr.slice(1);
  }, [value]);

  return (
    <>
      <TextField
        fullWidth
        label={label}
        value={labelText}
        onClick={handleOpen}
        error={error}
        helperText={helperText}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <IconButton onClick={handleOpen} size="small" sx={{ color: '#e94560' }}>
              <CalendarMonthIcon />
            </IconButton>
          ),
          style: { cursor: 'pointer' }
        }}
        sx={{ mt: 1.5, '& input': { cursor: 'pointer' } }}
      />
      
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
        PaperProps={{
          sx: {
            p: 2,
            width: 280,
            borderRadius: 3,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            border: '1px solid rgba(0,0,0,0.08)'
          }
        }}
      >
        {/* Selector de Año */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <IconButton size="small" onClick={handlePrevYear} sx={{ color: '#0f3460' }}>
            <ChevronLeftIcon />
          </IconButton>
          <Typography variant="body1" fontWeight={700} color="#1a1a2e">
            {selectedYear}
          </Typography>
          <IconButton size="small" onClick={handleNextYear} sx={{ color: '#0f3460' }}>
            <ChevronRightIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Cuadrícula de Meses */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
          {months.map((m) => {
            const isSelected = currentYear === selectedYear && currentMonth === m.val;
            return (
              <Button
                key={m.val}
                variant={isSelected ? 'contained' : 'outlined'}
                onClick={() => handleSelectMonth(m.val)}
                sx={{
                  py: 1,
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: 1.5,
                  textTransform: 'none',
                  minWidth: 0,
                  ...(isSelected ? {
                    background: 'linear-gradient(135deg, #e94560, #c62a47)',
                    border: 'none',
                    color: '#fff',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #c62a47, #a81c37)',
                    }
                  } : {
                    borderColor: 'rgba(0,0,0,0.12)',
                    color: 'text.primary',
                    '&:hover': {
                      borderColor: '#e94560',
                      bgcolor: 'rgba(233, 69, 96, 0.04)',
                    }
                  })
                }}
              >
                {m.label}
              </Button>
            );
          })}
        </Box>
      </Popover>
    </>
  );
};

const TurnosTrabajadosPage = () => {
  const { usuario } = useAuth();
  const [registros, setRegistros] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, info: '', masterKey: '' });
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const [formErrors, setFormErrors] = useState({});

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  // Cargar registros de turnos
  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    try {
      const res = await turnosTrabajadosService.getAll();
      setRegistros(res.data.map(r => ({ ...r, id: r._id })));
    } catch (err) {
      showSnack('Error al cargar los turnos trabajados.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar lista de usuarios para el selector
  const fetchUsuarios = useCallback(async () => {
    try {
      const res = await usuarioService.getAll();
      // Filtrar u ordenar si es necesario, los guardamos todos
      setUsuarios(res.data);
    } catch (err) {
      showSnack('Error al cargar la lista de trabajadores.', 'error');
    }
  }, []);

  useEffect(() => {
    fetchRegistros();
    fetchUsuarios();
  }, [fetchRegistros, fetchUsuarios]);

  // Eliminado el useEffect que sobreescribía y cambiaba de modo automáticamente al elegir usuario/mes duplicado

  // Obtener los datos del calendario para el mes seleccionado
  const calendarData = useMemo(() => {
    if (!form.mes) return { firstDayIndex: 0, totalDays: 30 };
    const [yearStr, monthStr] = form.mes.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1; // 0-based

    const firstDayIndex = new Date(year, monthIndex, 1).getDay(); // 0 = Domingo
    const totalDays = new Date(year, monthIndex + 1, 0).getDate(); // Días totales

    return { firstDayIndex, totalDays };
  }, [form.mes]);

  const toggleDay = (day) => {
    setForm(prev => {
      const isSelected = prev.diasTrabajados.includes(day);
      let nuevosDias;
      if (isSelected) {
        nuevosDias = prev.diasTrabajados.filter(d => d !== day);
      } else {
        nuevosDias = [...prev.diasTrabajados, day];
      }
      // Ordenar ascendente
      nuevosDias.sort((a, b) => a - b);
      return { ...prev, diasTrabajados: nuevosDias };
    });
  };

  const selectAllDays = () => {
    const days = Array.from({ length: calendarData.totalDays }, (_, i) => i + 1);
    setForm(prev => ({ ...prev, diasTrabajados: days }));
  };

  const clearAllDays = () => {
    setForm(prev => ({ ...prev, diasTrabajados: [] }));
  };

  const abrirCrear = () => {
    setEditId(null);
    setForm(FORM_INICIAL);
    setFormErrors({});
    setDialogOpen(true);
  };

  const abrirEditar = (row) => {
    setEditId(row._id);
    setForm({
      usuarioId: row.usuarioId._id || row.usuarioId,
      mes: row.mes,
      diasTrabajados: [...row.diasTrabajados].sort((a, b) => a - b)
    });
    setFormErrors({});
    setDialogOpen(true);
  };

  const guardar = async () => {
    const errors = {};
    if (!form.usuarioId) errors.usuarioId = 'El trabajador es requerido.';
    if (!form.mes) errors.mes = 'El mes es requerido.';
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    // Validar duplicado localmente para advertir
    const duplicado = registros.some(r => {
      const uId = r.usuarioId?._id || r.usuarioId;
      return uId === form.usuarioId && r.mes === form.mes && r._id !== editId;
    });

    if (duplicado) {
      showSnack('Ya existe un registro de turnos para este usuario en el mes seleccionado.', 'warning');
      return;
    }

    try {
      if (editId) {
        await turnosTrabajadosService.update(editId, form);
      } else {
        await turnosTrabajadosService.createOrUpdate(form);
      }
      showSnack(`Turnos guardados correctamente.`);
      setDialogOpen(false);
      fetchRegistros();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al guardar los turnos.', 'error');
    }
  };

  const confirmarEliminar = async () => {
    if (!deleteDialog.masterKey) {
      showSnack('Ingresa la clave maestra.', 'warning');
      return;
    }
    try {
      await turnosTrabajadosService.remove(deleteDialog.id, deleteDialog.masterKey);
      showSnack('Registro de turnos eliminado correctamente.');
      setDeleteDialog({ open: false, id: null, info: '', masterKey: '' });
      fetchRegistros();
    } catch (err) {
      showSnack(err.response?.data?.message || 'Clave incorrecta o error al eliminar el registro.', 'error');
    }
  };

  // Formateador legible de mes (ej: "junio de 2026")
  const formatMes = (mesStr) => {
    if (!mesStr) return '';
    const [year, month] = mesStr.split('-');
    const date = new Date(year, parseInt(month, 10) - 1, 15);
    const label = date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  // Obtener nombre del usuario seleccionado para el resumen
  const nombreTrabajadorSeleccionado = useMemo(() => {
    const u = usuarios.find(usr => (usr._id || usr.id) === form.usuarioId);
    return u ? u.nombre : 'el trabajador';
  }, [form.usuarioId, usuarios]);

  const columns = [
    {
      field: 'usuarioId',
      headerName: 'Trabajador',
      flex: 1,
      minWidth: 200,
      valueGetter: (value) => value?.nombre || 'Desconocido',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ bgcolor: 'rgba(233,69,96,0.1)', color: '#e94560', width: 32, height: 32, fontSize: '0.9rem' }}>
            {row.usuarioId?.nombre?.charAt(0).toUpperCase() || '?'}
          </Avatar>
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="body2" fontWeight={700} color="#1a1a2e" sx={{ lineHeight: 1.1 }}>
              {row.usuarioId?.nombre || 'Desconocido'}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, mt: 0.2 }}>
              Rol: {row.usuarioId?.rol || 'N/A'}
            </Typography>
          </Box>
        </Box>
      )
    },
    {
      field: 'mes',
      headerName: 'Mes',
      width: 180,
      renderCell: ({ value }) => (
        <Chip 
          icon={<CalendarMonthIcon sx={{ fontSize: '0.9rem !important' }} />}
          label={formatMes(value)} 
          variant="outlined" 
          size="small" 
          sx={{ fontWeight: 600, borderColor: 'rgba(0,0,0,0.12)' }} 
        />
      )
    },
    {
      field: 'diasTrabajados',
      headerName: 'Total Días Trabajados',
      width: 180,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ value }) => (
        <Chip 
          label={`${value?.length || 0} día(s)`} 
          color={(value?.length || 0) > 0 ? 'success' : 'default'} 
          size="small" 
          sx={{ fontWeight: 700, minWidth: 80 }} 
        />
      )
    },
    {
      field: 'detalles',
      headerName: 'Días Específicos',
      flex: 1.5,
      minWidth: 250,
      valueGetter: (value, row) => row.diasTrabajados?.join(', ') || '',
      renderCell: ({ row }) => (
        <Tooltip title={row.diasTrabajados?.join(', ') || 'Ninguno'}>
          <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: '100%', fontStyle: 'italic' }}>
            {row.diasTrabajados?.length > 0 ? row.diasTrabajados.join(', ') : 'Ninguno'}
          </Typography>
        </Tooltip>
      )
    },
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Editar">
            <IconButton 
              id={`edit-turno-${row._id}`} 
              size="small" 
              onClick={() => abrirEditar(row)} 
              sx={{ color: '#0f3460', '&:hover': { bgcolor: 'rgba(15,52,96,0.08)' } }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton 
              id={`delete-turno-${row._id}`} 
              size="small" 
              onClick={() => setDeleteDialog({ open: true, id: row._id, info: `${row.usuarioId?.nombre} - ${formatMes(row.mes)}`, masterKey: '' })} 
              sx={{ color: '#e94560', '&:hover': { bgcolor: 'rgba(233,69,96,0.08)' } }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', boxShadow: '0 4px 10px rgba(15,52,96,0.2)' }}>
            <CalendarMonthIcon sx={{ color: '#fff', display: 'block' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a1a2e">Turnos Trabajados</Typography>
            <Typography variant="body2" color="text.secondary">Control y registro de asistencias mensuales por trabajador</Typography>
          </Box>
        </Box>
        <Button 
          id="registrar-turnos-btn" 
          variant="contained" 
          startIcon={<AddIcon />} 
          onClick={abrirCrear} 
          sx={{ 
            background: 'linear-gradient(135deg, #e94560, #c62a47)', 
            borderRadius: 2, 
            px: 3, 
            boxShadow: '0 4px 14px rgba(233,69,96,0.35)', 
            '&:hover': { background: 'linear-gradient(135deg, #c62a47, #a81c37)' },
            alignSelf: { xs: 'stretch', sm: 'center' } 
          }}
        >
          Registrar Turnos
        </Button>
      </Box>

      {/* Grid Principal */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
        <DataGrid
          rows={registros} 
          columns={columns} 
          loading={loading} 
          autoHeight
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
            noRowsLabel: 'No hay registros de turnos trabajados.'
          }}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeader': { background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff' },
            '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 700, color: '#fff' },
            '& .MuiDataGrid-row:hover': { background: 'rgba(233,69,96,0.04)' },
          }}
        />
      </Paper>

      {/* Modal Registrar/Editar */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth 
        PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CalendarMonthIcon /> 
          {editId ? 'Editar Turnos Trabajados' : 'Registrar Turnos Trabajados'}
        </DialogTitle>

        <DialogContent sx={{ pt: 3, pb: 2 }}>
          {/* Selectores */}
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3, width: '100%' }}>
            <Box>
              <FormControl fullWidth error={!!formErrors.usuarioId} sx={{ mt: 1.5 }}>
                <InputLabel id="usuario-select-label">Trabajador</InputLabel>
                <Select
                  fullWidth
                  labelId="usuario-select-label"
                  id="turno-usuarioId"
                  value={form.usuarioId}
                  label="Trabajador"
                  onChange={e => setForm(p => ({ ...p, usuarioId: e.target.value }))}
                >
                  {usuarios.map(usr => (
                    <MenuItem key={usr._id} value={usr._id}>
                      {usr.nombre} ({usr.rol})
                    </MenuItem>
                  ))}
                </Select>
                {formErrors.usuarioId && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {formErrors.usuarioId}
                  </Typography>
                )}
              </FormControl>
            </Box>
            <Box>
              <MonthYearPicker
                label="Mes"
                value={form.mes}
                onChange={val => setForm(p => ({ ...p, mes: val }))}
                error={!!formErrors.mes}
                helperText={formErrors.mes}
              />
            </Box>
          </Box>

          {/* Calendario Dinámico */}
          {form.usuarioId && form.mes ? (
            <Card variant="outlined" sx={{ borderRadius: 2, mb: 2, bgcolor: '#fbfbfb', border: '1px solid rgba(0,0,0,0.08)' }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="body2" fontWeight={700} color="#0f3460">
                    Calendario de {formatMes(form.mes)}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" onClick={selectAllDays} sx={{ fontSize: '0.75rem', py: 0 }}>
                      Marcar Todo
                    </Button>
                    <Button size="small" color="error" onClick={clearAllDays} sx={{ fontSize: '0.75rem', py: 0 }}>
                      Desmarcar Todo
                    </Button>
                  </Box>
                </Box>

                {/* Días de la semana */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75, mb: 1, textAlign: 'center' }}>
                  {DAYS_OF_WEEK.map((day) => (
                    <Typography key={day} variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem' }}>
                      {day}
                    </Typography>
                  ))}
                </Box>

                {/* Grid de días */}
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.75 }}>
                  {/* Celdas vacías iniciales */}
                  {Array.from({ length: calendarData.firstDayIndex }).map((_, idx) => (
                    <Box key={`empty-${idx}`} />
                  ))}

                  {/* Celdas del mes */}
                  {Array.from({ length: calendarData.totalDays }).map((_, idx) => {
                    const dayNumber = idx + 1;
                    const isWorked = form.diasTrabajados.includes(dayNumber);
                    return (
                      <Button
                        key={`day-${dayNumber}`}
                        variant={isWorked ? 'contained' : 'outlined'}
                        onClick={() => toggleDay(dayNumber)}
                        sx={{
                          minWidth: 0,
                          aspectRatio: '1',
                          borderRadius: 1.5,
                          p: 0,
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          transition: 'all 0.15s ease',
                          ...(isWorked ? {
                            background: 'linear-gradient(135deg, #e94560, #c62a47)',
                            boxShadow: '0 3px 6px rgba(233, 69, 96, 0.25)',
                            color: '#fff',
                            border: 'none',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #c62a47, #a81c37)',
                            }
                          } : {
                            borderColor: 'rgba(0,0,0,0.12)',
                            color: 'text.primary',
                            '&:hover': {
                              borderColor: '#e94560',
                              bgcolor: 'rgba(233, 69, 96, 0.04)',
                            }
                          })
                        }}
                      >
                        {dayNumber}
                      </Button>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, bgcolor: '#f5f5f5', borderRadius: 2, border: '1px dashed rgba(0,0,0,0.12)' }}>
              <InfoIcon sx={{ color: 'text.secondary', mb: 1, fontSize: 32 }} />
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Selecciona un trabajador y un mes para habilitar el calendario de turnos.
              </Typography>
            </Box>
          )}

          {/* Resumen inferior dinámico */}
          {form.usuarioId && form.mes && (
            <Box sx={{ p: 2, bgcolor: 'rgba(233,69,96,0.04)', borderRadius: 2, border: '1px dashed rgba(233,69,96,0.2)', mt: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} color="#e94560" sx={{ mb: 0.5 }}>
                Resumen de registro:
              </Typography>
              <Typography variant="body2" color="#1a1a2e">
                Días trabajados por <strong>{nombreTrabajadorSeleccionado}</strong>: {form.diasTrabajados.length > 0 ? form.diasTrabajados.join(', ') : <em>Ninguno seleccionado aún</em>}
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ mt: 1, color: '#1a1a2e' }}>
                Total: {form.diasTrabajados.length} día(s) trabajados.
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button 
            onClick={guardar} 
            variant="contained" 
            disabled={!form.usuarioId || !form.mes}
            sx={{ 
              borderRadius: 2, 
              background: 'linear-gradient(135deg, #e94560, #c62a47)', 
              fontWeight: 700,
              '&:hover': { background: 'linear-gradient(135deg, #c62a47, #a81c37)' }
            }}
          >
            Guardar Registro
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Confirmar Eliminar */}
      <Dialog 
        open={deleteDialog.open} 
        onClose={() => setDeleteDialog({ open: false, id: null, info: '', masterKey: '' })}
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Eliminar Registro de Turnos</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            ¿Estás seguro de eliminar el registro de turnos para: <strong>{deleteDialog.info}</strong>? 
            Esta acción no se puede deshacer. Ingresa la <strong>Clave Maestra</strong> para confirmar:
          </Typography>
          <TextField 
            fullWidth 
            label="Clave Maestra" 
            type="password" 
            size="small" 
            autoComplete="off"
            value={deleteDialog.masterKey || ''} 
            onChange={e => setDeleteDialog(p => ({ ...p, masterKey: e.target.value }))}
            onKeyPress={(e) => e.key === 'Enter' && confirmarEliminar()}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, info: '', masterKey: '' })} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button onClick={confirmarEliminar} variant="contained" color="error" sx={{ borderRadius: 2 }}>
            Confirmar Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notificación (Snackbar) */}
      <Snackbar 
        open={snack.open} 
        autoHideDuration={4000} 
        onClose={() => setSnack(p => ({ ...p, open: false }))} 
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TurnosTrabajadosPage;
