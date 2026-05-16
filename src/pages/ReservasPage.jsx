// ============================================================
// src/pages/ReservasPage.jsx — Gestión de reservas
// ============================================================
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  IconButton,
  Snackbar,
  Alert,
  Paper,
  Tooltip,
  Grid,
  Chip,
  Autocomplete,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PeopleIcon from '@mui/icons-material/People';
import TableBarIcon from '@mui/icons-material/TableBar';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { reservaService, mesaService, clienteService } from '../services/api';

const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const sumarDias = (fecha, dias) => {
  const base = new Date(`${fecha}T00:00:00-05:00`);
  base.setDate(base.getDate() + dias);
  return base.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
};

const formatearFechaDia = (dia) => {
  if (!dia) return '-';
  const fecha = new Date(`${dia}T00:00:00-05:00`);
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(fecha);
};

const formatearHora = (hora) => {
  if (!hora) return '-';
  const [h, m] = hora.split(':').map(Number);
  const periodo = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${periodo}`;
};

const obtenerHoraInicial = () => {
  const fecha = new Date();
  fecha.setMinutes(fecha.getMinutes() + 60);
  fecha.setMinutes(Math.ceil(fecha.getMinutes() / 30) * 30, 0, 0);
  return fecha.toTimeString().slice(0, 5);
};

const FORM_INICIAL = {
  cantidad_personas: '',
  mesas: [],
  dia: hoy(),
  hora_inicio: '',
  hora_fin: '',
  id_cliente: null,
  observaciones: '',
};

const CLAVE_MAESTRA = 'res2026';

const ReservasPage = () => {
  const [reservas, setReservas] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, descripcion: '', clave: '' });
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [formErrors, setFormErrors] = useState({});
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const [conflictoHora, setConflictoHora] = useState(null);
  const [filtros, setFiltros] = useState({
    desde: hoy(),
    hasta: sumarDias(hoy(), 30),
  });
  const [openModalCliente, setOpenModalCliente] = useState(false);
  const [formCliente, setFormCliente] = useState({ nombre: '', apellido: '', telefono: '' });

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  const fetchMesas = useCallback(async () => {
    const res = await mesaService.getAll();
    setMesas(res.data);
  }, []);

  const fetchClientes = useCallback(async () => {
    const res = await clienteService.getAll();
    setClientes(res.data);
  }, []);

  const fetchReservas = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const res = await reservaService.getAll(params);
      setReservas(res.data.map((r) => ({ ...r, id: r._id })));
    } catch {
      showSnack('Error al cargar las reservas.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const cargar = async () => {
      try {
        await Promise.all([
          fetchMesas(),
          fetchClientes(),
          fetchReservas({ desde: hoy(), hasta: sumarDias(hoy(), 30) }),
        ]);
      } catch {
        showSnack('No fue posible cargar la información inicial.', 'error');
      }
    };
    cargar();
  }, [fetchMesas, fetchClientes, fetchReservas]);

  const mesasPorId = useMemo(
    () => new Map(mesas.map((mesa) => [String(mesa._id), mesa])),
    [mesas]
  );

  const resumen = useMemo(() => {
    const hoyStr = hoy();
    const reservasHoy = reservas.filter((r) => r.dia === hoyStr);
    return {
      total: reservas.length,
      hoy: reservasHoy.length,
      mesasHoy: new Set(reservasHoy.flatMap((r) => (r.mesas || []).map((m) => String(m._id || m)))).size,
    };
  }, [reservas]);

  const validar = () => {
    const errors = {};
    if (!form.cantidad_personas || Number(form.cantidad_personas) < 1) {
      errors.cantidad_personas = 'Indica la cantidad de personas.';
    }
    if (!form.dia) errors.dia = 'Selecciona el día.';
    if (!form.hora_inicio) errors.hora_inicio = 'Selecciona la hora de inicio.';
    if (!form.hora_fin) errors.hora_fin = 'Selecciona la hora de fin.';
    if (!form.mesas || form.mesas.length === 0) errors.mesas = 'Selecciona al menos una mesa.';
    if (!form.id_cliente) errors.id_cliente = 'Selecciona o crea un cliente.';

    // Validar que hora_fin sea después de hora_inicio
    if (form.hora_inicio && form.hora_fin) {
      const [hI, mI] = form.hora_inicio.split(':').map(Number);
      const [hF, mF] = form.hora_fin.split(':').map(Number);
      const minInicio = hI * 60 + mI;
      const minFin = hF * 60 + mF;
      
      if (minFin <= minInicio) {
        errors.hora_fin = 'Debe ser posterior a la hora de inicio.';
      }
    }

    if (conflictoHora) errors.mesas = 'Hay conflicto de horario con otra reserva.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const abrirCrear = () => {
    setEditId(null);
    setForm(FORM_INICIAL);
    setFormErrors({});
    setConflictoHora(null);
    setDialogOpen(true);
  };

  const abrirEditar = (row) => {
    setEditId(row._id);
    // Extraer el _id si id_cliente es un objeto, si no, usar el valor directamente
    const clienteId = row.id_cliente?._id || row.id_cliente;
    setForm({
      cantidad_personas: row.cantidad_personas || '',
      mesas: (row.mesas || []).map((mesa) => (mesa?._id ? mesa._id : mesa)),
      dia: row.dia || hoy(),
      hora_inicio: row.hora_inicio || '',
      hora_fin: row.hora_fin || '',
      id_cliente: clienteId || null,
      observaciones: row.observaciones || '',
    });
    setFormErrors({});
    setConflictoHora(null);
    setDialogOpen(true);
  };

  const guardar = async () => {
    if (!validar()) return;

    const datos = {
      cantidad_personas: Number(form.cantidad_personas),
      mesas: form.mesas,
      dia: form.dia,
      hora_inicio: form.hora_inicio,
      hora_fin: form.hora_fin,
      id_cliente: form.id_cliente,
      observaciones: form.observaciones || '',
    };

    try {
      if (editId) {
        await reservaService.update(editId, datos);
        showSnack('Reserva actualizada correctamente.');
      } else {
        await reservaService.create(datos);
        showSnack('Reserva agendada correctamente.');
      }
      setDialogOpen(false);
      fetchReservas(filtros);
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al guardar la reserva.', 'error');
    }
  };

  const confirmarEliminar = async () => {
    if (!deleteDialog.clave) {
      showSnack('Ingresa la clave maestra.', 'warning');
      return;
    }
    if (deleteDialog.clave !== CLAVE_MAESTRA) {
      showSnack('Clave incorrecta.', 'error');
      return;
    }
    try {
      await reservaService.remove(deleteDialog.id);
      showSnack('Reserva eliminada correctamente.');
      setDeleteDialog({ open: false, id: null, descripcion: '', clave: '' });
      fetchReservas(filtros);
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al eliminar la reserva.', 'error');
    }
  };

  const guardarCliente = async () => {
    if (!formCliente.nombre.trim() || !formCliente.apellido.trim()) {
      showSnack('Nombre y apellido son obligatorios.', 'warning');
      return;
    }
    try {
      const res = await clienteService.create(formCliente);
      setClientes((prev) => [res.data, ...prev]);
      setForm((p) => ({ ...p, id_cliente: res.data._id }));
      setOpenModalCliente(false);
      showSnack('Cliente creado correctamente.');
      setFormCliente({ nombre: '', apellido: '', telefono: '' });
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al crear el cliente.', 'error');
    }
  };

  const verificarConflictosHora = (dia, horaInicio, mesas, horaFin) => {
    if (!dia || !horaInicio || !horaFin || mesas.length === 0) return null;

    const horaEnMinutos = (h) => {
      const [hh, mm] = h.split(':').map(Number);
      return hh * 60 + mm;
    };

    const nuevaHoraInicio = horaEnMinutos(horaInicio);
    const nuevaHoraFin = horaEnMinutos(horaFin);

    // Validar que horaFin > horaInicio
    if (nuevaHoraFin <= nuevaHoraInicio) return null;

    // Buscar conflictos en reservas existentes
    for (const reserva of reservas) {
      if (reserva.dia !== dia) continue;

      const horaExistenteInicio = horaEnMinutos(reserva.hora_inicio);
      const horaExistenteFin = horaEnMinutos(reserva.hora_fin);

      // Verificar si alguna mesa seleccionada entra en conflicto
      const mesasSeleccionadas = new Set(mesas.map(String));
      const mesasReserva = new Set((reserva.mesas || []).map((m) => String(m._id || m)));

      const hayMesaComun = [...mesasSeleccionadas].some((m) => mesasReserva.has(m));

      if (hayMesaComun && nuevaHoraInicio < horaExistenteFin && nuevaHoraFin > horaExistenteInicio) {
        return {
          mesasConflicto: [...mesasSeleccionadas].filter((m) => mesasReserva.has(m)),
          horaExistente: formatearHora(reserva.hora_inicio),
          horaFinExistente: formatearHora(reserva.hora_fin),
          cliente: reserva.id_cliente?.nombre && reserva.id_cliente?.apellido
            ? `${reserva.id_cliente.nombre} ${reserva.id_cliente.apellido}`
            : 'Sin asignar',
        };
      }
    }

    return null;
  };

  const columns = [
    {
      field: 'dia',
      headerName: 'Día',
      flex: 1,
      minWidth: 160,
      renderCell: ({ value }) => (
        <Box sx={{ py: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Typography fontWeight={700}>{formatearFechaDia(value)}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.1, whiteSpace: 'normal' }}>
            {value}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'hora_inicio',
      headerName: 'Horario',
      width: 180,
      renderCell: ({ value, row }) => (
        <Typography fontWeight={600}>
          {formatearHora(value)} - {formatearHora(row.hora_fin)}
        </Typography>
      ),
    },
    {
      field: 'cantidad_personas',
      headerName: 'Personas',
      width: 120,
      renderCell: ({ value }) => (
        <Chip icon={<PeopleIcon />} label={value} size="small" variant="outlined" />
      ),
    },
    {
      field: 'id_cliente',
      headerName: 'Cliente',
      flex: 1,
      minWidth: 180,
      renderCell: ({ value }) => {
        const clienteId = value?._id || value;
        const cliente = clientes.find((c) => String(c._id) === String(clienteId));
        return (
          <Typography variant="body2">
            {cliente ? `${cliente.nombre} ${cliente.apellido}` : 'Sin asignar'}
          </Typography>
        );
      },
    },
    {
      field: 'mesas',
      headerName: 'Mesas',
      flex: 1.3,
      minWidth: 220,
      renderCell: ({ value }) => (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, py: 1 }}>
          {(value || []).map((mesa) => {
            const mesaObj = mesasPorId.get(String(mesa._id || mesa));
            return (
              <Chip
                key={String(mesa._id || mesa)}
                icon={<TableBarIcon />}
                label={mesaObj ? `Mesa #${mesaObj.numero_mesa}` : 'Mesa'}
                size="small"
                color="primary"
                variant="outlined"
              />
            );
          })}
        </Box>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Creada',
      width: 180,
      renderCell: ({ value }) => {
        if (!value) return '-';
        const fecha = new Date(value);
        const fechaFormato = fecha.toLocaleDateString('es-CO');
        const horaFormato = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Typography variant="caption" fontWeight={600}>{fechaFormato}</Typography>
            <Typography variant="caption" color="text.secondary">{horaFormato}</Typography>
          </Box>
        );
      },
    },
    {
      field: 'acciones',
      headerName: 'Acciones',
      width: 120,
      sortable: false,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Editar">
            <IconButton size="small" onClick={() => abrirEditar(row)} sx={{ color: '#0f3460' }}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton
              size="small"
              onClick={() => setDeleteDialog({ open: true, id: row._id, descripcion: `${row.dia} ${formatearHora(row.hora_inicio)} - ${formatearHora(row.hora_fin)}`, clave: '' })}
              sx={{ color: '#e94560' }}
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' }, mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 1, borderRadius: 2, background: 'linear-gradient(135deg, #1a1a2e, #0f3460)' }}>
            <EventAvailableIcon sx={{ color: '#fff', display: 'block' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="#1a1a2e">Reservas</Typography>
            <Typography variant="body2" color="text.secondary">
              Agenda de mesas para hoy y fechas futuras, sin afectar la disponibilidad
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={abrirCrear}
          sx={{
            background: 'linear-gradient(135deg, #e94560, #c62a47)',
            borderRadius: 2,
            px: 3,
            boxShadow: '0 4px 14px rgba(233,69,96,0.35)',
            alignSelf: { xs: 'stretch', sm: 'center' },
          }}
        >
          Agendar reserva
        </Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={0} sx={{ p: 2.25, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
            <Typography variant="body2" color="text.secondary">Reservas para hoy</Typography>
            <Typography variant="h4" fontWeight={800} color="#1a1a2e">{resumen.hoy}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={0} sx={{ p: 2.25, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
            <Typography variant="body2" color="text.secondary">Mesas reservadas hoy</Typography>
            <Typography variant="h4" fontWeight={800} color="#1a1a2e">{resumen.mesasHoy}</Typography>
          </Paper>
        </Grid>
      </Grid>

        <Paper elevation={0} sx={{ p: { xs: 2, md: 2.5 }, mb: 2.5, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <FilterAltIcon color="primary" />
            <Typography fontWeight={700} color="#1a1a2e">Filtrar por fecha</Typography>
          </Box>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="date"
              label="Desde"
              InputLabelProps={{ shrink: true }}
              value={filtros.desde}
              onChange={(e) => setFiltros((p) => ({ ...p, desde: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="date"
              label="Hasta"
              InputLabelProps={{ shrink: true }}
              value={filtros.hasta}
              onChange={(e) => setFiltros((p) => ({ ...p, hasta: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', flexDirection: { xs: 'column', sm: 'row' } }}>
              <Button variant="outlined" startIcon={<RestartAltIcon />} onClick={() => {
                const desde = hoy();
                const hasta = hoy();
                setFiltros({ desde, hasta });
                fetchReservas({ desde, hasta });
              }} sx={{ flex: { xs: '1 1 auto', sm: '0 0 auto' } }}>
                Reiniciar
              </Button>
              <Button
                variant="contained"
                onClick={() => fetchReservas(filtros)}
                sx={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', flex: { xs: '1 1 auto', sm: '0 0 auto' } }}
              >
                Buscar
              </Button>
            </Box>
          </Grid>
        </Grid>
        <Divider sx={{ my: 2 }} />
      </Paper>

      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <DataGrid
          rows={reservas}
          columns={columns}
          loading={loading}
          autoHeight
          getRowHeight={() => 'auto'}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableRowSelectionOnClick
          disableColumnMenu
          disableColumnSorting
          disableColumnFilter
          disableColumnSelector
          slotProps={{
            pagination: {
              labelRowsPerPage: 'Filas por página:',
              labelDisplayedRows: ({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`,
            },
          }}
          localeText={{
            noRowsLabel: 'No hay reservas en el rango seleccionado.',
            paginationRowsPerPage: 'Filas por página:',
            paginationDisplayedRows: ({ from, to, count }) => `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`,
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CalendarMonthIcon />
          {editId ? 'Editar reserva' : 'Agendar reserva'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3, px: { xs: 2, sm: 3 } }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Completa los datos de la reserva.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5, mb: 3 }}>
            <TextField
              fullWidth
              label="Cantidad de personas"
              type="number"
              size="small"
              value={form.cantidad_personas}
              onChange={(e) => setForm((p) => ({ ...p, cantidad_personas: e.target.value }))}
              error={!!formErrors.cantidad_personas}
              helperText={formErrors.cantidad_personas}
              inputProps={{ min: 1 }}
            />
            <TextField
              fullWidth
              label="Día"
              type="date"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={form.dia}
              onChange={(e) => {
                setForm((p) => ({ ...p, dia: e.target.value }));
                const conflicto = verificarConflictosHora(e.target.value, form.hora_inicio, form.mesas, form.hora_fin);
                setConflictoHora(conflicto);
              }}
              error={!!formErrors.dia}
              helperText={formErrors.dia}
            />
            <TextField
              fullWidth
              label="Hora de inicio"
              type="time"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={form.hora_inicio}
              onChange={(e) => {
                setForm((p) => ({ ...p, hora_inicio: e.target.value }));
                const conflicto = verificarConflictosHora(form.dia, e.target.value, form.mesas, form.hora_fin);
                setConflictoHora(conflicto);
              }}
              error={!!formErrors.hora_inicio || !!conflictoHora}
              helperText={formErrors.hora_inicio}
            />
            <TextField
              fullWidth
              label="Hora de fin"
              type="time"
              size="small"
              InputLabelProps={{ shrink: true }}
              value={form.hora_fin}
              onChange={(e) => {
                setForm((p) => ({ ...p, hora_fin: e.target.value }));
                const conflicto = verificarConflictosHora(form.dia, form.hora_inicio, form.mesas, e.target.value);
                setConflictoHora(conflicto);
              }}
              error={!!formErrors.hora_fin || !!conflictoHora}
              helperText={formErrors.hora_fin || (conflictoHora ? `⚠️ Conflicto: mesa(s) ocupada(s) de ${conflictoHora.horaExistente} a ${conflictoHora.horaFinExistente}` : '')}
            />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.5, mb: 2 }}>
            <Autocomplete
              options={clientes}
              value={clientes.find((c) => String(c._id) === String(form.id_cliente)) || null}
              onChange={(_, value) => setForm((p) => ({ ...p, id_cliente: value?._id || null }))}
              getOptionLabel={(option) => `${option.nombre} ${option.apellido}${option.telefono ? ` - ${option.telefono}` : ''}`}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cliente"
                  placeholder="Selecciona un cliente"
                  size="small"
                  error={!!formErrors.id_cliente}
                  helperText={formErrors.id_cliente}
                />
              )}
              noOptionsText="No hay clientes. Crea uno con el botón '+ Cliente'"
              isOptionEqualToValue={(option, value) => value ? String(option._id) === String(value._id) : false}
              slotProps={{ paper: { sx: { textAlign: 'left' } } }}
            />
            <Autocomplete
              multiple
              options={mesas}
              value={mesas.filter((mesa) => form.mesas.includes(mesa._id))}
              onChange={(_, values) => {
                const mesasIds = values.map((mesa) => mesa._id);
                setForm((p) => ({ ...p, mesas: mesasIds }));
                const conflicto = verificarConflictosHora(form.dia, form.hora_inicio, mesasIds, form.hora_fin);
                setConflictoHora(conflicto);
              }}
              getOptionLabel={(option) => `Mesa #${option.numero_mesa}`}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Mesas"
                  placeholder="Selecciona una o varias mesas"
                  size="small"
                  error={!!formErrors.mesas || !!conflictoHora}
                  helperText={formErrors.mesas || (conflictoHora ? `⚠️ ${conflictoHora.mesasConflicto.map(m => `Mesa #${mesas.find(mesa => mesa._id === m)?.numero_mesa}`).join(', ')} ocupada(s) de ${conflictoHora.horaExistente} a ${conflictoHora.horaFinExistente}` : '')}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    variant="outlined"
                    label={`Mesa #${option.numero_mesa}`}
                    {...getTagProps({ index })}
                    key={option._id}
                    sx={{ borderRadius: 1.5 }}
                  />
                ))
              }
              noOptionsText="No hay mesas disponibles"
              isOptionEqualToValue={(option, value) => option._id === value._id}
              slotProps={{ paper: { sx: { textAlign: 'left' } } }}
            />
          </Box>
          <Box sx={{ mb: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setOpenModalCliente(true)}
              sx={{ borderRadius: 2 }}
            >
              + Nuevo cliente
            </Button>
          </Box>

          <Box sx={{ mb: 2.5 }}>
            <TextField
              fullWidth
              label="Observaciones (opcional)"
              placeholder="Ej: Cumpleaños, preferencias especiales, etc."
              value={form.observaciones || ''}
              onChange={(e) => setForm((p) => ({ ...p, observaciones: e.target.value }))}
              size="small"
              multiline
              rows={3}
            />
          </Box>

          <Box sx={{ mt: 3, p: 2, borderRadius: 2, bgcolor: 'rgba(15,52,96,0.05)', border: '1px dashed rgba(15,52,96,0.35)' }}>
            <Typography variant="subtitle2" fontWeight={700} color="#0f3460">
              Aviso operativo
            </Typography>
            <Typography variant="body2" color="text.secondary">
              La reserva marca la mesa como reservada en la interfaz. Se eliminará automáticamente después del tiempo especificado.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button
            onClick={guardar}
            variant="contained"
            sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #e94560, #c62a47)' }}
          >
            {editId ? 'Guardar cambios' : 'Agendar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, descripcion: '', clave: '' })} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Eliminar reserva</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            ¿Deseas eliminar la reserva de <strong>{deleteDialog.descripcion}</strong>?
          </Typography>
          <TextField
            fullWidth
            type="password"
            label="Clave maestra"
            value={deleteDialog.clave}
            onChange={(e) => setDeleteDialog((p) => ({ ...p, clave: e.target.value }))}
            placeholder="Ingresa la clave para confirmar"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, descripcion: '', clave: '' })} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button onClick={confirmarEliminar} variant="contained" color="error" sx={{ borderRadius: 2 }}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openModalCliente} onClose={() => setOpenModalCliente(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontWeight: 700 }}>
          Crear nuevo cliente
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Nombre"
              size="small"
              sx={{ mt: 1 }}
              value={formCliente.nombre}
              onChange={(e) => setFormCliente((p) => ({ ...p, nombre: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Apellido"
              size="small"
              value={formCliente.apellido}
              onChange={(e) => setFormCliente((p) => ({ ...p, apellido: e.target.value }))}
            />
            <TextField
              fullWidth
              label="Teléfono"
              size="small"
              value={formCliente.telefono}
              onChange={(e) => setFormCliente((p) => ({ ...p, telefono: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={() => setOpenModalCliente(false)} variant="outlined" sx={{ borderRadius: 2 }}>
            Cancelar
          </Button>
          <Button onClick={guardarCliente} variant="contained" sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #e94560, #c62a47)' }}>
            Crear cliente
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((p) => ({ ...p, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ReservasPage;
