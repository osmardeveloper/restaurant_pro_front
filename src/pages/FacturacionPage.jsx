// ============================================================
// src/pages/FacturacionPage.jsx
// ============================================================
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, TextField, Autocomplete,
  Button, MenuItem, Select, FormControl, InputLabel, IconButton,
  Divider, Snackbar, Alert, Tabs, Tab, Tooltip, InputAdornment,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
  CircularProgress, FormControlLabel, Switch
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PrintIcon from '@mui/icons-material/Print';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import AssessmentIcon from '@mui/icons-material/Assessment';
import TodayIcon from '@mui/icons-material/Today';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';
import TableBarIcon from '@mui/icons-material/TableBar';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import { productoService, clienteService, facturacionService, mesaService, comandaService, costoService, categoriasProductosService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIAS_ESTATICAS = [
  { value: 'platos_principales', label: 'Platos Principales' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'postres', label: 'Postres' },
  { value: 'sopas', label: 'Sopas' },
  { value: 'entradas', label: 'Entradas' },
  { value: 'comidas_rapidas', label: 'Comidas Rápidas' },
  { value: 'adicionales', label: 'Adicionales' },
];

const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'bancolombia', label: 'Bancolombia' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'daviplata', label: 'Daviplata' },
  { value: 'datafono', label: 'Datáfono (Tarjeta)' }
];

const TIPOS_DOCUMENTO = [
  { value: 'cedula_identidad', label: 'Cédula de Identidad' },
  { value: 'cedula_extranjeria', label: 'Cédula de Extranjería' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'documento_extranjero', label: 'Documento Extranjero' },
];

const FacturacionPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state: navState } = location;
  const { usuario } = useAuth();
  
  const [tab, setTab] = useState(0);
  const [platos, setPlatos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [mesas, setMesas] = useState([]);
  const [costos, setCostos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMesa, setLoadingMesa] = useState(false);

  // Estado del Facturador (Tab 0)
  const [cliente, setCliente] = useState(null);
  const [pedidoActual, setPedidoActual] = useState([]);
  const [metodoPago, setMetodoPago] = useState('');
  const [idComandaVinculada, setIdComandaVinculada] = useState(null);
  const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
  const [a_domicilio, setA_domicilio] = useState(false);
  const [venta_directa, setVenta_directa] = useState(false);
  const [direccion_entrega, setDireccion_entrega] = useState('');
  const [busquedaProd, setBusquedaProd] = useState('');
  const [categoria, setCategoria] = useState('todas');

  // Modal Crear Cliente Rápido
  const [openModalCliente, setOpenModalCliente] = useState(false);
  const [formCliente, setFormCliente] = useState({ nombre: '', apellido: '', numero_documento: '', tipo_documento: '', telefono: '' });

  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const [facturaFinal, setFacturaFinal] = useState(null);
  const [facturas, setFacturas] = useState([]);
  
  // Borrar Factura (Seguridad)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [masterKey, setMasterKey] = useState('');

  const [filtroGeneral, setFiltroGeneral] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroMetodoPago, setFiltroMetodoPago] = useState('todos');
  const [filtroPropinas, setFiltroPropinas] = useState('todas');
  const [filtroMetodoPropina, setFiltroMetodoPropina] = useState('todos');
  const [filtroDestino, setFiltroDestino] = useState('todos'); // todos, mesa, domicilio
  
  // Estados para pestaña de Utilidad
  const [fechaUtilDesde, setFechaUtilDesde] = useState('');
  const [fechaUtilHasta, setFechaUtilHasta] = useState('');
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);

  // Estados para División de Cuentas
  const [openDividirCuentaModal, setOpenDividirCuentaModal] = useState(false);
  const [numeroParcialPersonas, setNumeroParcialPersonas] = useState(1);
  const [pagosPartiales, setPagosPartiales] = useState([]);
  const [modoContaDividida, setModoContaDividida] = useState(false);
  const [propinas, setPropinas] = useState([]);
  const [formPropina, setFormPropina] = useState({ metodo_pago: '', monto: '', porcentaje: '' });
  
  // Estados para Domicilio
  const [montoDomicilio, setMontoDomicilio] = useState(0);
  const [metodoPagoDomicilio, setMetodoPagoDomicilio] = useState('');

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  const fetchCategorias = useCallback(async () => {
    try {
      const res = await categoriasProductosService.getAll();
      const categoriasNuevas = res.data.filter(c => c.activa).map(c => ({ 
        value: c.detalles.value, 
        label: c.detalles.label 
      }));
      const nuevasNoRepetidas = categoriasNuevas.filter(cat => !CATEGORIAS_ESTATICAS.some(est => est.label === cat.label));
      const todasLasCategorias = [...CATEGORIAS_ESTATICAS, ...nuevasNoRepetidas];
      setCategorias(todasLasCategorias);
    } catch {
      setCategorias(CATEGORIAS_ESTATICAS);
    }
  }, []);

  const fetchDatos = useCallback(async () => {
    setLoading(true);
    try {
      const [resC, resP, resM, resF, resCos] = await Promise.all([
        clienteService.getAll(),
        productoService.getAll(),
        mesaService.getAll(),
        facturacionService.getAll(),
        costoService.getAll(),
      ]);
      setClientes(resC.data);
      setPlatos(resP.data);
      setMesas(resM.data);
      setFacturas(resF.data);
      setCostos(resCos.data);

      // Cargar categorías
      fetchCategorias();

      // Si venimos de la pantalla de comandas (navegación directa)
      if (navState?.comandaId) {
        const productosConUid = (navState.productos || []).map(p => ({
          ...p,
          uid: p.uid || Math.random().toString(36).substr(2, 9)
        }));
        setPedidoActual(productosConUid);
        setIdComandaVinculada(navState.comandaId);
        setA_domicilio(navState.a_domicilio || false);
        setVenta_directa(navState.venta_directa || false);
        setDireccion_entrega(navState.direccion_entrega || '');
        setMontoDomicilio(0); // Reset, se pide durante facturación
        setMetodoPagoDomicilio('');
        const mesaVinculada = navState.mesaId
          ? resM.data.find(m => m._id === navState.mesaId)
          : resM.data.find(m => m.pedido_actual?._id === navState.comandaId);
        setMesaSeleccionada(mesaVinculada?._id || null);
        if (navState.cliente) {
          const cli = resC.data.find(c => c._id === navState.cliente._id);
          setCliente(cli || null);
        }
        // Limpiamos el estado para evitar recargas infinitas
        navigate(location.pathname, { replace: true });
        // Si viene indicado un tab específico, usarlo
        if (navState?.tab !== undefined) {
          setTab(navState.tab);
        }
      }
    } catch (error) {
      console.error(error);
      showSnack('Error al cargar datos básicos.', 'error');
    } finally {
      setLoading(false);
    }
  }, [navState, navigate, location.pathname]);

  useEffect(() => { fetchDatos(); }, [fetchDatos]);

  // Sincronizar dirección de cliente cuando es domicilio
  useEffect(() => {
    if (a_domicilio && cliente && cliente.direccion && !direccion_entrega) {
      setDireccion_entrega(cliente.direccion);
    }
  }, [a_domicilio, cliente, direccion_entrega]);

  const cargarComandaPorMesa = async (mesaId) => {
    if (!mesaId) {
      setMesaSeleccionada(null);
      return;
    }
    setLoadingMesa(true);
    try {
      const res = await comandaService.getAll();
      const comandaActiva = res.data.find(c => 
        c.id_mesa && c.id_mesa._id === mesaId && !c.facturada
      );

      if (comandaActiva) {
        const productosConUid = (comandaActiva.ids_productos || []).map(p => ({
          ...p,
          uid: p.uid || Math.random().toString(36).substr(2, 9)
        }));
        setPedidoActual(productosConUid);
        setCliente(comandaActiva.id_cliente || null);
        setIdComandaVinculada(comandaActiva._id);
        setA_domicilio(comandaActiva.a_domicilio || false);
        setDireccion_entrega(comandaActiva.direccion_entrega || '');
        setMontoDomicilio(0); // Reset monto, se pide durante la facturación
        setMetodoPagoDomicilio('');
        showSnack(`Comanda de la Mesa #${comandaActiva.id_mesa.numero_mesa} cargada.`);
      } else {
        showSnack('Esta mesa no tiene comandas activas pendientes.', 'warning');
      }
    } catch (error) {
      showSnack('Error al buscar comandas de esta mesa.', 'error');
    } finally {
      setLoadingMesa(false);
    }
  };

  // -------- LOGICA PESTAÑA UTILIDAD --------
  const calcularUtilidades = useMemo(() => {
    let facturasFiltradasPorFecha = facturas;

    // Filtrar por rango de fechas
    if (fechaUtilDesde) {
      facturasFiltradasPorFecha = facturasFiltradasPorFecha.filter(f =>
        new Date(f.createdAt) >= new Date(fechaUtilDesde + 'T00:00:00')
      );
    }
    if (fechaUtilHasta) {
      facturasFiltradasPorFecha = facturasFiltradasPorFecha.filter(f =>
        new Date(f.createdAt) <= new Date(fechaUtilHasta + 'T23:59:59')
      );
    }

    const facturaMap = {};

    facturasFiltradasPorFecha.forEach(factura => {
      const facturaId = factura._id;
      const fechaFactura = new Date(factura.createdAt);
      const facturaFecha = fechaFactura.toLocaleDateString('es-CO');
      const facturaHora = fechaFactura.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

      if (!facturaMap[facturaId]) {
        facturaMap[facturaId] = {
          id: facturaId,
          factura_numero: factura.numero_factura,
          factura_fecha: facturaFecha,
          factura_hora: facturaHora,
          productos: new Set(),
          cantidad: 0,
          total_venta: 0,
          total_costo: 0,
        };
      }

      factura.detalle_pedido?.forEach(item => {
        const productoId = String(item.id_producto?._id || item.id_producto);
        if (productosSeleccionados.length > 0 && !productosSeleccionados.includes(productoId)) {
          return;
        }

        const cantidad = item.cantidad || 1;
        const costoRegistrado = item.costo ?? null;
        const productoActual = platos.find(p => p._id === productoId);
        const costoUnitario = costoRegistrado !== null && costoRegistrado !== undefined
          ? costoRegistrado
          : productoActual?.costo ?? 0;
        const precioUnitario = item.precio || 0;

        facturaMap[facturaId].productos.add(item.nombre || 'Producto');
        facturaMap[facturaId].cantidad += cantidad;
        facturaMap[facturaId].total_venta += precioUnitario * cantidad;
        facturaMap[facturaId].total_costo += costoUnitario * cantidad;
      });
    });

    return Object.values(facturaMap)
      .filter(f => f.cantidad > 0)
      .map(f => ({
        ...f,
        productos_label: f.productos.size === 0 ? 'Sin productos' : f.productos.size === 1 ? [...f.productos][0] : `${f.productos.size} productos`,
        costo_unitario: f.cantidad > 0 ? f.total_costo / f.cantidad : 0,
        utilidad_bruta: f.total_venta - f.total_costo,
        margen_utilidad: f.total_venta > 0 ? ((f.total_venta - f.total_costo) / f.total_venta * 100).toFixed(2) : 0,
      }))
      .sort((a, b) => b.utilidad_bruta - a.utilidad_bruta);
  }, [facturas, fechaUtilDesde, fechaUtilHasta, productosSeleccionados, platos]);

  const totalUtilidad = useMemo(() => {
    return calcularUtilidades.reduce((sum, p) => sum + p.utilidad_bruta, 0);
  }, [calcularUtilidades]);

  // -------- LOGICA TAB 0: CAJA --------
  const totalProductos = pedidoActual.reduce((acc, curr) => acc + (curr.precio || 0), 0);
  const totalCaja = totalProductos; // Solo productos, domicilio es informativo
  const prodFiltrados = platos.filter(p => {
    const matchBusqueda = (p.nombre || '').toLowerCase().includes(busquedaProd.toLowerCase());
    const matchCategoria = categoria === 'todas' || p.tipo === categoria;
    return matchBusqueda && matchCategoria;
  });

  const agregarProducto = (prod) => setPedidoActual(prev => [...prev, { ...prod, uid: Math.random().toString(36).substr(2, 9) }]);
  const quitarProducto = (uid) => setPedidoActual(prev => prev.filter(item => item.uid !== uid));
  const totalPropinas = propinas.reduce((sum, propina) => sum + (propina.monto || 0), 0);

  const agregarPropina = () => {
    let monto = Number(formPropina.monto || 0);
    
    // Si se ingresa porcentaje, calcular el monto
    if (formPropina.porcentaje) {
      const porcentaje = Number(formPropina.porcentaje || 0);
      if (porcentaje < 0 || porcentaje > 100) {
        showSnack('El porcentaje debe estar entre 0 y 100.', 'warning');
        return;
      }
      monto = (totalCaja * porcentaje) / 100;
    }
    
    if (!formPropina.metodo_pago || monto <= 0) {
      showSnack('Selecciona método y ingresa monto o porcentaje mayor a cero.', 'warning');
      return;
    }

    setPropinas(prev => [...prev, { metodo_pago: formPropina.metodo_pago, monto }]);
    setFormPropina({ metodo_pago: '', monto: '', porcentaje: '' });
  };

  const quitarPropina = (index) => {
    setPropinas(prev => prev.filter((_, idx) => idx !== index));
  };

  const renderPropinas = () => {
    // Calcular monto cuando hay porcentaje
    const montoCalculado = formPropina.porcentaje 
      ? (totalCaja * Number(formPropina.porcentaje)) / 100 
      : Number(formPropina.monto);

    return (
      <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: '#fffaf0', border: '1px solid #ffcc80' }}>
        <Typography variant="subtitle2" fontWeight={800} color="#ef6c00" sx={{ mb: 1.5 }}>
          Propina
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ flex: 1, minWidth: 100 }}>
            <InputLabel>Método</InputLabel>
            <Select
              value={formPropina.metodo_pago}
              label="Método"
              onChange={e => setFormPropina(prev => ({ ...prev, metodo_pago: e.target.value }))}
              sx={{ borderRadius: 1 }}
            >
              {METODOS_PAGO.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Porcentaje"
            type="number"
            value={formPropina.porcentaje}
            onChange={e => setFormPropina(prev => ({ ...prev, porcentaje: e.target.value, monto: '' }))}
            InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
            sx={{ flex: 1, minWidth: 100 }}
            placeholder="0-100"
          />
          <TextField
            size="small"
            label="Monto"
            type="number"
            value={formPropina.porcentaje ? montoCalculado.toFixed(0) : formPropina.monto}
            onChange={e => {
              if (!formPropina.porcentaje) {
                setFormPropina(prev => ({ ...prev, monto: e.target.value }));
              }
            }}
            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            sx={{ flex: 1, minWidth: 100 }}
            disabled={!!formPropina.porcentaje}
            title={formPropina.porcentaje ? 'Se calcula automáticamente' : ''}
          />
        </Box>
        {formPropina.porcentaje && montoCalculado > 0 && (
          <Box sx={{ p: 1, mb: 1, bgcolor: '#fff9e6', border: '1px solid #ffe0b2', borderRadius: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" fontWeight={700} color="#666">
              Monto calculado: {formPropina.porcentaje}% de ${new Intl.NumberFormat('es-CO').format(totalCaja)}
            </Typography>
            <Typography variant="caption" fontWeight={900} color="#ef6c00">
              ${new Intl.NumberFormat('es-CO').format(Math.round(montoCalculado))}
            </Typography>
          </Box>
        )}
        <Button fullWidth variant="outlined" onClick={agregarPropina} sx={{ mb: propinas.length ? 1.5 : 0, borderRadius: 2, borderColor: '#ef6c00', color: '#ef6c00', fontWeight: 700 }}>
          Agregar propina
        </Button>
        {propinas.map((propina, idx) => (
          <Box key={`${propina.metodo_pago}-${idx}`} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, py: 0.5 }}>
            <Typography variant="caption" fontWeight={700}>
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(propina.monto)} {propina.metodo_pago}
            </Typography>
            <IconButton size="small" color="error" onClick={() => quitarPropina(idx)} sx={{ p: 0.25 }}>
              <DeleteIcon fontSize="inherit" />
            </IconButton>
          </Box>
        ))}
        {propinas.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #ffcc80', mt: 1, pt: 1 }}>
            <Typography variant="caption" fontWeight={800}>Total propina:</Typography>
            <Typography variant="caption" fontWeight={900} color="#ef6c00">
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalPropinas)}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  const imprimirFacturaTermica = (factura, delay = 500) => {
    setFacturaFinal(null);
    setTimeout(() => {
      setFacturaFinal(factura);
      setTimeout(() => {
        window.print();
      }, delay);
    }, 0);
  };

  const manejarFacturacion = async () => {
    // Protección contra doble-clic
    if (loading) {
      return;
    }

    if (!metodoPago) {
      showSnack('Debes seleccionar un método de pago.', 'warning');
      return;
    }
    if (pedidoActual.length === 0) {
      showSnack('No hay productos en el pedido para facturar.', 'warning');
      return;
    }
    if (a_domicilio && !direccion_entrega?.trim()) {
      showSnack('La dirección de entrega es obligatoria para pedidos a domicilio.', 'warning');
      return;
    }
    if (a_domicilio && (!montoDomicilio || montoDomicilio === 0)) {
      showSnack('El monto del domicilio es obligatorio para pedidos a domicilio.', 'warning');
      return;
    }
    if (a_domicilio && !metodoPagoDomicilio?.trim()) {
      showSnack('El método de pago del domicilio es obligatorio para pedidos a domicilio.', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        metodo_pago: metodoPago,
        total_pagado: totalCaja,
        id_cliente: cliente?._id || null,
        detalle_pedido: pedidoActual.map(p => {
          const productoActual = platos.find(x => x._id === p._id);
          return {
            id_producto: p._id,
            nombre: p.nombre,
            precio: p.precio,
            costo: p.costo !== undefined && p.costo !== null ? p.costo : productoActual?.costo ?? null,
            cantidad: 1
          };
        }),
        id_comanda: idComandaVinculada,
        a_domicilio: a_domicilio,
        venta_directa: venta_directa,
        direccion_entrega: direccion_entrega,
        monto_domicilio: a_domicilio ? montoDomicilio : 0,
        metodo_pago_domicilio: a_domicilio ? metodoPagoDomicilio : '',
        propinas
      };

      // 1. Crear la Factura
      const res = await facturacionService.create(payload);
      const facturaCreada = res.data;
      
      // 2. Si vino de una mesa, cerrar la comanda y guardar monto_domicilio
      if (idComandaVinculada) {
        await comandaService.update(idComandaVinculada, { 
          facturada: true,
          monto_domicilio: a_domicilio ? montoDomicilio : 0
        });
        showSnack('Factura creada y mesa liberada correctamente.', 'success');
      } else {
        showSnack('Factura procesada con éxito.', 'success');
      }

      // 3. Limpiar Todo
      setPedidoActual([]);
      setCliente(null);
      setIdComandaVinculada(null);
      setMesaSeleccionada(null);
      setA_domicilio(false);
      setVenta_directa(false);
      setDireccion_entrega('');
      setMetodoPago('');
      setMontoDomicilio(0);
      setMetodoPagoDomicilio('');
      setPropinas([]);
      setFormPropina({ metodo_pago: '', monto: '' });
      
      // 4. Refrescar datos para liberar mesa en UI local
      fetchDatos();
      
      // Imprimir comprobante
      imprimirFacturaTermica(facturaCreada, 500);

    } catch (error) {
      console.error('Error en facturación:', error);
      showSnack('Error al procesar el pago o cerrar la comanda.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const guardarCliente = async () => {
    if (!formCliente.nombre || !formCliente.numero_documento) {
      showSnack('Nombre y documento son obligatorios para registrar cliente.', 'warning');
      return;
    }
    try {
      const res = await clienteService.create(formCliente);
      setClientes(prev => [...prev, res.data]);
      setCliente(res.data);
      setOpenModalCliente(false);
      setFormCliente({ nombre: '', apellido: '', numero_documento: '', tipo_documento: '', telefono: '' });
      showSnack('Cliente registrado y seleccionado para la factura.');
    } catch (error) {
      showSnack('Error al registrar el cliente.', 'error');
    }
  };

  const reImprimir = (factura, delay = 650) => {
    imprimirFacturaTermica(factura, delay);
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setMasterKey('');
    setDeleteDialogOpen(true);
  };

  const confirmarEliminar = async () => {
    if (!masterKey) {
      showSnack('Ingresa la clave maestra.', 'warning');
      return;
    }
    try {
      // Obtener la factura completa para extraer id_comanda
      const factura = facturas.find(f => f._id === deleteId);
      
      // Eliminar la factura
      await facturacionService.remove(deleteId, masterKey);
      showSnack('Factura eliminada e inventario restituido.', 'success');
      
      // Si la factura tiene una comanda asociada, eliminarla también
      if (factura?.id_comanda) {
        try {
          await comandaService.remove(factura.id_comanda, masterKey);
          showSnack('Factura y comanda eliminadas correctamente.', 'success');
        } catch (err) {
          console.warn('Error al eliminar comanda asociada:', err);
          showSnack('Factura eliminada, pero hubo un error al eliminar la comanda.', 'warning');
        }
      }
      
      setDeleteDialogOpen(false);
      fetchDatos(); // Refrescar lista
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al eliminar o clave incorrecta.', 'error');
    }
  };

  // --- FUNCIONES PARA DIVISIÓN DE CUENTAS ---
  const abrirDividirCuenta = () => {
    setNumeroParcialPersonas(1);
    setPagosPartiales([]);
    setOpenDividirCuentaModal(true);
  };

  const confirmarDividirCuenta = () => {
    const personas = Number(numeroParcialPersonas);
    if (!Number.isInteger(personas) || personas < 1 || personas > 10) {
      showSnack('Debes seleccionar entre 1 y 10 personas.', 'warning');
      return;
    }
    const nuevasPagos = Array(personas).fill(null).map(() => ({
      metodo_pago: '',
      monto: 0
    }));
    setPagosPartiales(nuevasPagos);
    setModoContaDividida(true);
    setOpenDividirCuentaModal(false);
    showSnack(`Modo dividido activado para ${personas} personas.`);
  };

  const actualizarPagoPartial = (index, metodo_pago, monto) => {
    const nuevos = [...pagosPartiales];
    nuevos[index] = { metodo_pago, monto: typeof monto === 'string' ? parseFloat(monto) || 0 : monto };
    setPagosPartiales(nuevos);
  };

  const cancelarDividirCuenta = () => {
    setModoContaDividida(false);
    setPagosPartiales([]);
    setNumeroParcialPersonas(1);
    showSnack('Modo dividido cancelado.');
  };

  const sumaPagos = pagosPartiales.reduce((sum, p) => sum + (p.monto || 0), 0);
  const faltaPagar = totalCaja - sumaPagos;
  const puedeFacturar = sumaPagos >= totalCaja && pagosPartiales.every(p => p.metodo_pago);

  const manejarFacturacionDividida = async () => {
    // Protección contra doble-clic
    if (loading) {
      return;
    }

    if (a_domicilio && !direccion_entrega?.trim()) {
      showSnack('La dirección de entrega es obligatoria para pedidos a domicilio.', 'warning');
      return;
    }
    if (a_domicilio && (!montoDomicilio || montoDomicilio === 0)) {
      showSnack('El monto del domicilio es obligatorio para pedidos a domicilio.', 'warning');
      return;
    }
    if (a_domicilio && !metodoPagoDomicilio?.trim()) {
      showSnack('El método de pago del domicilio es obligatorio para pedidos a domicilio.', 'warning');
      return;
    }
    if (!puedeFacturar) {
      const razon = sumaPagos < totalCaja 
        ? `Aún faltan $${new Intl.NumberFormat('es-CO').format(Math.max(0, faltaPagar))}`
        : 'Debes asignar un método de pago a cada persona';
      showSnack(razon, 'warning');
      return;
    }

    setLoading(true);
    try {
      // Crear factura con detalles de pagos parciales
      const payload = {
        metodo_pago: 'dividido', // Indicador de pago dividido
        total_pagado: (() => {
          const sumaProdYDomicilio = pedidoActual.reduce((acc, curr) => acc + (curr.precio || 0), 0) + (a_domicilio && montoDomicilio > 0 ? parseInt(montoDomicilio) : 0);
          return sumaProdYDomicilio;
        })(),
        id_cliente: cliente?._id || null,
        detalle_pedido: pedidoActual.map(p => {
          const productoActual = platos.find(x => x._id === p._id);
          return {
            id_producto: p._id,
            nombre: p.nombre,
            precio: p.precio,
            costo: p.costo !== undefined && p.costo !== null ? p.costo : productoActual?.costo ?? null,
            cantidad: 1
          };
        }),
        id_comanda: idComandaVinculada,
        a_domicilio: a_domicilio,
        venta_directa: venta_directa,
        direccion_entrega: direccion_entrega,
        monto_domicilio: a_domicilio ? montoDomicilio : 0,
        metodo_pago_domicilio: a_domicilio ? metodoPagoDomicilio : '',
        pagos_parciales: pagosPartiales, // Agregar info de pagos divididos
        propinas
      };

      const res = await facturacionService.create(payload);
      const facturaCreada = res.data;
      
      if (idComandaVinculada) {
        await comandaService.update(idComandaVinculada, { 
          facturada: true,
          monto_domicilio: a_domicilio ? montoDomicilio : 0
        });
        showSnack('Factura creada con cuenta dividida y mesa liberada.', 'success');
      } else {
        showSnack('Factura con cuenta dividida procesada con éxito.', 'success');
      }

      // Limpiar
      setPedidoActual([]);
      setCliente(null);
      setIdComandaVinculada(null);
      setMesaSeleccionada(null);
      setA_domicilio(false);
      setVenta_directa(false);
      setDireccion_entrega('');
      setMetodoPago('');
      setMontoDomicilio(0);
      setMetodoPagoDomicilio('');
      setModoContaDividida(false);
      setPagosPartiales([]);
      setPropinas([]);
      setFormPropina({ metodo_pago: '', monto: '' });
      fetchDatos();
      
      imprimirFacturaTermica(facturaCreada, 500);
    } catch (error) {
      console.error('Error en facturación dividida:', error);
      showSnack(error.response?.data?.error || error.response?.data?.message || 'Error al procesar la factura dividida.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: 'calc(100% + 48px)', ml: -3, mr: -3, px: 3 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} onChange={(e, val) => setTab(val)} textColor="primary" indicatorColor="primary">
          <Tab icon={<TodayIcon />} label="Ventas de Hoy" iconPosition="start" />
          <Tab icon={<AssessmentIcon />} label="Listado General" iconPosition="start" />
          {(usuario?.rol === 'cajero' || usuario?.rol === 'admin') && (
            <Tab icon={<TrendingUpIcon />} label="Utilidad" iconPosition="start" />
          )}
          <Tab icon={<PointOfSaleIcon />} label="Punto de Caja" iconPosition="start" />
        </Tabs>
      </Box>

      {tab === 3 && (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
          
          {/* CABECERA: CLIENTE Y MESA */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <Paper elevation={0} sx={{ flex: 1, p: 2, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
              <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ mb: 1.5 }}>DATOS DEL CLIENTE</Typography>
              {!cliente ? (
                <Box sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">El cliente viene de la facturación seleccionada</Typography>
                </Box>
              ) : (
                <Box sx={{ p: 1, bgcolor: 'rgba(233,69,96,0.03)', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight={700}>
                    {cliente.nombre} {cliente.apellido}
                    {cliente.telefono && `, ${cliente.telefono}`}
                    {cliente.direccion && `, ${cliente.direccion}`}
                  </Typography>
                </Box>
              )}
            </Paper>

            <Paper elevation={0} sx={{ flex: 1, p: 2, borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
              <Typography variant="subtitle2" fontWeight={700} color="#4caf50" sx={{ mb: 1.5 }}>MESA / DESTINO</Typography>
              {!idComandaVinculada && !mesaSeleccionada && !a_domicilio && !venta_directa ? (
                <Box sx={{ p: 1, bgcolor: 'rgba(76, 175, 80, 0.08)', borderRadius: 2, textAlign: 'center', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
                  <Typography variant="body2" color="text.secondary">Viene de la facturación seleccionada</Typography>
                </Box>
              ) : !idComandaVinculada ? (
                <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
                  <Autocomplete
                    fullWidth
                    options={mesas}
                    getOptionLabel={(o) => o ? `Mesa #${o.numero_mesa}` : ''}
                    getOptionDisabled={(o) => !(o.pedido_actual?.ids_productos?.length > 0)}
                    value={mesas.find(m => m._id === mesaSeleccionada) || null}
                    onChange={(_, val) => { 
                      setMesaSeleccionada(val?._id || null); 
                      cargarComandaPorMesa(val?._id);
                      if (val?._id) {
                        setVenta_directa(false);
                        setA_domicilio(false);
                      }
                    }}
                    disabled={a_domicilio || !!idComandaVinculada}
                    renderOption={(props, option) => {
                      const tienePedido = option.pedido_actual?.ids_productos?.length > 0;
                      return (
                        <Box component="li" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }} {...props}>
                          <Typography>{`Mesa #${option.numero_mesa}`}</Typography>
                          <Chip
                            label={tienePedido ? 'Con pedido' : 'Libre'}
                            size="small"
                            color={tienePedido ? 'success' : 'default'}
                            sx={{ textTransform: 'none', ml: 1 }}
                          />
                        </Box>
                      );
                    }}
                    renderInput={(params) => <TextField {...params} label="Elegir mesa..." size="small" />}
                  />
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={a_domicilio}
                          onChange={(e) => {
                            setA_domicilio(e.target.checked);
                            if (e.target.checked) {
                              setMesaSeleccionada(null);
                              setVenta_directa(false);
                              // Si se activa domicilio y hay cliente con dirección, cargarla
                              if (cliente && cliente.direccion) {
                                setDireccion_entrega(cliente.direccion);
                              }
                            }
                          }}
                          color="primary"
                          size="small"
                          disabled={!!idComandaVinculada}
                        />
                      }
                      label="Domicilio"
                      sx={{ m: 0, flex: 1}}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={venta_directa}
                          onChange={(e) => {
                            setVenta_directa(e.target.checked);
                            if (e.target.checked) {
                              setMesaSeleccionada(null);
                              setA_domicilio(false);
                            }
                          }}
                          color="success"
                          size="small"
                          disabled={!!idComandaVinculada}
                        />
                      }
                      label="Venta Directa"
                      sx={{ m: 0, flex: 1 }}
                    />
                  </Box>
                </Box>
              ) : (
                <Box sx={{ p: 1, bgcolor: 'rgba(233,69,96,0.03)', borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight={700}>
                    {venta_directa ? 'Venta Directa' : a_domicilio ? 'A Domicilio' : mesaSeleccionada ? `Mesa #${mesas.find(m => m._id === mesaSeleccionada)?.numero_mesa || '?'}` : 'Sin asignar'}
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>

          {/* ÁREA DERECHA: RESUMEN - Ocupando toda la página */}
          <Box sx={{ width: '100%' }}>
            <Paper elevation={6} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(233,69,96,0.1)', bgcolor: '#fff', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 280px)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3, pb: 2, borderBottom: '3px solid #e94560' }}>
                <Typography variant="h6" fontWeight={900}>RESUMEN</Typography>
                {pedidoActual.length === 0 && !idComandaVinculada && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1.5, 
                    bgcolor: '#ffc107',
                    color: '#000',
                    px: 2.5,
                    py: 1.2,
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    boxShadow: '0 2px 8px rgba(255, 193, 7, 0.4)',
                    border: '2px solid #ffb300'
                  }}>
                    <WarningIcon sx={{ fontSize: '22px', color: '#000' }} />
                    <Typography sx={{ color: '#000', fontWeight: 700, fontSize: '0.95rem' }}>
                      Este módulo es solo para montar facturas desde Mesas, Domicilios y Ventas Directas
                    </Typography>
                  </Box>
                )}
              </Box>
              
              <Box sx={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3 }}>
                <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', pr: { lg: 2 }, borderRight: { lg: '1px solid #f0f0f0' } }}>
                  {pedidoActual.length === 0 && !a_domicilio ? (
                    <Box sx={{ py: 10, textAlign: 'center', opacity: 0.5 }}>
                      <ReceiptLongIcon sx={{ fontSize: 60, mb: 1, color: '#ccc' }} />
                      <Typography variant="body2">Ningún pedido cargado</Typography>
                    </Box>
                  ) : (
                    <>
                      {pedidoActual.map((item, idx) => (
                        <Box key={item.uid || idx} sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, pb: 1, borderBottom: '1px solid #f9f9f9' }}>
                          <Box sx={{ maxWidth: '100%' }}>
                            <Typography variant="body2" fontWeight={700} display="block" sx={{ lineHeight: 1.2 }}>{item.nombre}</Typography>
                            <Typography variant="caption" color="text.secondary">${new Intl.NumberFormat('es-CO').format(item.precio)}</Typography>
                          </Box>
                        </Box>
                      ))}
                      
                      {/* Línea de Domicilio */}
                      {a_domicilio && montoDomicilio > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, pb: 1, borderBottom: '1px solid #f9f9f9', bgcolor: 'rgba(76,175,80,0.08)', p: 1, borderRadius: 1 }}>
                          <Box sx={{ maxWidth: '75%' }}>
                            <Typography variant="body2" fontWeight={700} display="block" sx={{ lineHeight: 1.2 }}>🚚 Valor Domicilio</Typography>
                            <Typography variant="caption" color="text.secondary">{metodoPagoDomicilio ? METODOS_PAGO.find(m => m.value === metodoPagoDomicilio)?.label : 'Sin asignar'}</Typography>
                          </Box>
                          <Typography variant="body2" fontWeight={700} color="#4caf50">${new Intl.NumberFormat('es-CO').format(montoDomicilio)}</Typography>
                        </Box>
                      )}
                    </>
                  )}
                </Box>

                <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {!modoContaDividida ? (
                  <>
                    {pedidoActual.length === 0 && (
                      <Box sx={{ 
                        p: 2, 
                        mb: 2,
                        bgcolor: 'rgba(33, 150, 243, 0.08)',
                        borderRadius: 2,
                        border: '1px solid rgba(33, 150, 243, 0.2)',
                        textAlign: 'center'
                      }}>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Estas funciones se habilitan cuando vas a facturar
                        </Typography>
                      </Box>
                    )}
                    {pedidoActual.length > 0 && (
                      <Button
                        fullWidth variant="outlined" onClick={abrirDividirCuenta} sx={{ mb: 2, borderRadius: 2, color: '#1a1a2e', borderColor: '#1a1a2e', fontWeight: 700 }}
                      >
                        Dividir Cuenta
                      </Button>
                    )}

                    {/* Campo Monto Domicilio - Solo si es a domicilio */}
                    {a_domicilio && (
                      <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: 'rgba(76,175,80,0.1)', border: '1px dashed #4caf50' }}>
                        <Typography variant="caption" fontWeight={700} color="#4caf50" display="block" sx={{ mb: 1 }}>🚚 VALOR DEL DOMICILIO</Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <TextField
                            size="small"
                            type="number"
                            placeholder="0"
                            value={montoDomicilio === 0 ? '' : montoDomicilio}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMontoDomicilio(val === '' ? 0 : Math.max(0, parseInt(val) || 0));
                            }}
                            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                            sx={{ flex: 1 }}
                          />
                          <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Pago</InputLabel>
                            <Select
                              value={metodoPagoDomicilio}
                              label="Pago"
                              onChange={e => setMetodoPagoDomicilio(e.target.value)}
                              sx={{ borderRadius: 1 }}
                            >
                              {METODOS_PAGO.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                            </Select>
                          </FormControl>
                        </Box>
                      </Box>
                    )}

                    {pedidoActual.length > 0 && (
                      <>
                        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                          <InputLabel>Forma de Pago Única</InputLabel>
                          <Select value={metodoPago} label="Forma de Pago ÚnicaPropina Sugerida" onChange={e => setMetodoPago(e.target.value)} sx={{ fontWeight: 700, borderRadius: 2 }}>
                            {METODOS_PAGO.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                          </Select>
                        </FormControl>

                        <Box sx={{ bgcolor: '#1a1a2e', color: '#fff', p: 3, borderRadius: 3, textAlign: 'center', mb: 3, boxShadow: '0 8px 32px rgba(26,26,46,0.3)' }}>
                          <Typography variant="caption" sx={{ opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1.5, fontSize: '0.6rem' }}>Total Neto</Typography>
                          <Typography variant="h4" fontWeight={900} color="#e94560">
                            ${new Intl.NumberFormat('es-CO').format(totalCaja + totalPropinas)}
                          </Typography>
                        </Box>

                        {renderPropinas()}
                      </>
                    )}

                    {pedidoActual.length > 0 && (
                      <Button
                        fullWidth variant="contained" onClick={manejarFacturacion} disabled={pedidoActual.length === 0 || loading}
                        sx={{ mt: 'auto', py: 2, background: 'linear-gradient(135deg, #e94560, #c62a47)', borderRadius: 3, fontWeight: 800, fontSize: '1rem', letterSpacing: 1, boxShadow: '0 4px 15px rgba(233,69,96,0.4)' }}
                      >
                        {loading ? <CircularProgress size={24} sx={{ mr: 1, color: '#fff' }} /> : ''}
                        COBRAR AHORA
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Box sx={{ mb: 2, p: 2, borderRadius: 2, bgcolor: 'rgba(76,175,80,0.1)', border: '1px solid #4caf50' }}>
                      <Typography variant="subtitle2" fontWeight={700} color="#4caf50" sx={{ mb: 2 }}>MOD↓ CUENTA DIVIDIDA</Typography>
                      {pagosPartiales.map((pago, idx) => (
                        <Box key={idx} sx={{ mb: 2, pb: 2, borderBottom: idx < pagosPartiales.length - 1 ? '1px dashed #ccc' : 'none' }}>
                          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" sx={{ mb: 0.5 }}>Persona {idx + 1}</Typography>
                          <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                            <FormControl size="small" fullWidth>
                              <InputLabel>Método</InputLabel>
                              <Select
                                value={pago.metodo_pago}
                                label="Método"
                                onChange={e => actualizarPagoPartial(idx, e.target.value, pago.monto)}
                                sx={{ borderRadius: 1 }}
                              >
                                {METODOS_PAGO.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Box>
                          <TextField
                            fullWidth size="small" label="Monto" type="number" 
                            value={pago.monto || ''}
                            onChange={e => actualizarPagoPartial(idx, pago.metodo_pago, e.target.value)}
                            InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                            sx={{ borderRadius: 1 }}
                          />
                        </Box>
                      ))}

                      {/* Campo Monto Domicilio en Modo Dividido */}
                      {a_domicilio && (
                        <Box sx={{ mb: 2, p: 2, borderRadius: 1, bgcolor: 'rgba(76,175,80,0.08)', border: '1px dashed #4caf50' }}>
                          <Typography variant="caption" fontWeight={700} color="#4caf50" display="block" sx={{ mb: 1 }}>🚚 VALOR DEL DOMICILIO</Typography>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                              size="small"
                              type="number"
                              placeholder="0"
                              value={montoDomicilio === 0 ? '' : montoDomicilio}
                              onChange={(e) => {
                                const val = e.target.value;
                                setMontoDomicilio(val === '' ? 0 : Math.max(0, parseInt(val) || 0));
                              }}
                              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                              sx={{ flex: 1 }}
                            />
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                              <InputLabel>Pago</InputLabel>
                              <Select
                                value={metodoPagoDomicilio}
                                label="Pago"
                                onChange={e => setMetodoPagoDomicilio(e.target.value)}
                                sx={{ borderRadius: 1 }}
                              >
                                {METODOS_PAGO.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                              </Select>
                            </FormControl>
                          </Box>
                        </Box>
                      )}

                      <Box sx={{ pt: 2, borderTop: '2px solid #eee', mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" fontWeight={700}>Total Pagado:</Typography>
                          <Typography variant="caption" fontWeight={700} color={sumaPagos === totalCaja ? '#4caf50' : '#f44336'}>
                            ${new Intl.NumberFormat('es-CO').format(sumaPagos)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="caption" fontWeight={700}>Pendiente:</Typography>
                          <Typography variant="caption" fontWeight={800} color={faltaPagar === 0 ? '#4caf50' : '#e94560'}>
                            ${new Intl.NumberFormat('es-CO').format(Math.max(0, faltaPagar))}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {renderPropinas()}

                    <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
                      <Button
                        fullWidth variant="outlined" color="error" onClick={cancelarDividirCuenta} sx={{ borderRadius: 2 }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        fullWidth variant="contained" onClick={manejarFacturacionDividida} disabled={!puedeFacturar || loading}
                        sx={{ background: (puedeFacturar && !loading) ? 'linear-gradient(135deg, #4caf50, #388e3c)' : '#ccc', borderRadius: 2, fontWeight: 800 }}
                      >
                        {loading ? <CircularProgress size={24} sx={{ mr: 1, color: '#fff' }} /> : ''}
                        COBRAR
                      </Button>
                    </Box>
                  </>
                )}
                </Box>
              </Box>
            </Paper>
          </Box>
        </Box>
      )}

      {/* TAB 1: VENTAS DE HOY */}
      {tab === 0 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small" style={{minWidth: "150px"}}>
                <InputLabel>Filtrar por Destino</InputLabel>
                <Select value={filtroDestino} label="Filtrar por Destino" onChange={e => setFiltroDestino(e.target.value)}>
                  <MenuItem value="todos">Todos</MenuItem>
                  <MenuItem value="mesa">Mesas</MenuItem>
                  <MenuItem value="domicilio">A Domicilio</MenuItem>
                  <MenuItem value="venta_directa">Venta Directa</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Button 
                variant="outlined" 
                color="error" 
                onClick={() => setFiltroDestino('todos')}
                fullWidth
              >
                Limpiar Filtro
              </Button>
            </Grid>
          </Grid>
          <TablaReporteFacturas
            facturas={facturas.filter(f => {
              const d = new Date();
              const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              const fechaFac = new Date(f.createdAt);
              const facLocal = `${fechaFac.getFullYear()}-${String(fechaFac.getMonth() + 1).padStart(2, '0')}-${String(fechaFac.getDate()).padStart(2, '0')}`;
              
              if (facLocal !== hoy) return false;
              
              if (filtroDestino === 'mesa' && (f.a_domicilio || f.venta_directa)) return false;
              if (filtroDestino === 'domicilio' && (!f.a_domicilio || f.venta_directa)) return false;
              if (filtroDestino === 'venta_directa' && !f.venta_directa) return false;
              
              return true;
            })}
            enReproduccion={reImprimir}
            onDelete={handleDelete}
          />
        </Paper>
      )}

      {/* TAB 2: LISTADO GENERAL Y FILTROS */}
      {tab === 1 && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth size="small" label="Buscar P/Cliente o N° Factura" placeholder="Cédula, nombre o ID..."
                value={filtroGeneral} onChange={e => setFiltroGeneral(e.target.value)}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth size="small" label="Desde" type="date" InputLabelProps={{ shrink: true }}
                value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                fullWidth size="small" label="Hasta" type="date" InputLabelProps={{ shrink: true }}
                value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={2.5}>
              <FormControl fullWidth size="small" style={{minWidth: "150px"}}>
                <InputLabel>Méteodo de Pago</InputLabel>
                <Select value={filtroMetodoPago} label="Método de Pago" onChange={e => setFiltroMetodoPago(e.target.value)}>
                  <MenuItem value="todos">Todos</MenuItem>
                  {METODOS_PAGO.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Propinas</InputLabel>
                <Select value={filtroPropinas} label="Propinas" onChange={e => setFiltroPropinas(e.target.value)}>
                  <MenuItem value="todas">Todas</MenuItem>
                  <MenuItem value="con">Con propina</MenuItem>
                  <MenuItem value="sin">Sin propina</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={2.5}>
              <FormControl fullWidth size="small" style={{minWidth: "150px"}}>
                <InputLabel>Método Propina</InputLabel>
                <Select value={filtroMetodoPropina} label="Método Propina" onChange={e => setFiltroMetodoPropina(e.target.value)}>
                  <MenuItem value="todos">Todos</MenuItem>
                  {METODOS_PAGO.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4} md={2.5}>
              <FormControl fullWidth size="small" style={{minWidth: "150px"}}>
                <InputLabel>Filtrar por Destino</InputLabel>
                <Select value={filtroDestino} label="Filtrar por Destino" onChange={e => setFiltroDestino(e.target.value)}>
                  <MenuItem value="todos">Todos</MenuItem>
                  <MenuItem value="mesa">Mesas</MenuItem>
                  <MenuItem value="domicilio">A Domicilio</MenuItem>
                  <MenuItem value="venta_directa">Venta Directa</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={12}>
              <Button variant="outlined" color="error" onClick={() => { setFiltroGeneral(''); setFechaDesde(''); setFechaHasta(''); setFiltroMetodoPago('todos'); setFiltroPropinas('todas'); setFiltroMetodoPropina('todos'); setFiltroDestino('todos'); }}>
                Limpiar Filtros
              </Button>
            </Grid>
          </Grid>
          <TablaReporteFacturas
            facturas={facturas.filter(f => {
              let match = true;
              const txt = filtroGeneral.toLowerCase();
              if (txt) {
                const nFac = f.numero_factura ? f.numero_factura.toString() : '';
                const cliNom = f.id_cliente ? (f.id_cliente.nombre + ' ' + f.id_cliente.apellido).toLowerCase() : '';
                const cliDoc = f.id_cliente?.numero_documento || '';
                match = nFac.includes(txt) || cliNom.includes(txt) || cliDoc.includes(txt);
              }
              if (match && fechaDesde) {
                match = new Date(f.createdAt) >= new Date(fechaDesde + 'T00:00:00');
              }
              if (match && fechaHasta) {
                match = new Date(f.createdAt) <= new Date(fechaHasta + 'T23:59:59');
              }
              const pagosFactura = f.pagos_parciales?.length
                ? f.pagos_parciales
                : [{ metodo_pago: f.metodo_pago, monto: f.total_pagado }];
              const propinasFactura = f.propinas || [];
              if (match && filtroMetodoPago !== 'todos') {
                match = pagosFactura.some(pago => pago.metodo_pago === filtroMetodoPago);
              }
              if (match && filtroPropinas === 'con') {
                match = propinasFactura.length > 0;
              }
              if (match && filtroPropinas === 'sin') {
                match = propinasFactura.length === 0;
              }
              if (match && filtroMetodoPropina !== 'todos') {
                match = propinasFactura.some(propina => propina.metodo_pago === filtroMetodoPropina);
              }
              if (match && filtroDestino === 'mesa') {
                match = !f.a_domicilio && !f.venta_directa;
              }
              if (match && filtroDestino === 'domicilio') {
                match = f.a_domicilio && !f.venta_directa;
              }
              if (match && filtroDestino === 'venta_directa') {
                match = f.venta_directa;
              }
              return match;
            })}
            enReproduccion={reImprimir}
            onDelete={handleDelete}
          />
        </Paper>
      )}

      {/* TAB 3: ANÁLISIS DE UTILIDAD */}
      {tab === 2 && (usuario?.rol === 'cajero' || usuario?.rol === 'admin') && (
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid rgba(0,0,0,0.08)' }}>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth size="small" label="Desde" type="date" InputLabelProps={{ shrink: true }}
                value={fechaUtilDesde} onChange={e => setFechaUtilDesde(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth size="small" label="Hasta" type="date" InputLabelProps={{ shrink: true }}
                value={fechaUtilHasta} onChange={e => setFechaUtilHasta(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={10}>
              <Autocomplete
                multiple
                options={platos}
                style={{width: '30vw'}}
                getOptionLabel={(o) => o.nombre || ''}
                value={platos.filter(p => productosSeleccionados.includes(p._id))}
                onChange={(_, val) => setProductosSeleccionados(val.map(v => v._id))}
                renderInput={(params) => <TextField {...params} fullWidth size="small" label="Filtrar por productos (opcional)" />}
                disableCloseOnSelect
              />
            </Grid>
            <Grid item xs={12}>
              <Button fullWidth variant="outlined" color="error" onClick={() => { setFechaUtilDesde(''); setFechaUtilHasta(''); setProductosSeleccionados([]); }}>
                Limpiar Filtros
              </Button>
            </Grid>
          </Grid>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#1a1a2e' }}>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Factura</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Fecha / Hora</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Productos</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Cantidad</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', textAlign: 'right' }}>Total Venta</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', textAlign: 'right' }}>Costo Unit.</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', textAlign: 'right' }}>Total Costo</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', textAlign: 'right' }}>Utilidad Bruta</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 'bold', textAlign: 'right' }}>Margen %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {calcularUtilidades.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      <AssessmentIcon sx={{ fontSize: 40, opacity: 0.3, display: 'block', mx: 'auto', mb: 1 }} />
                      No hay datos para el período seleccionado.
                    </TableCell>
                  </TableRow>
                ) : (
                  calcularUtilidades.map((prod) => (
                    <TableRow key={prod.id} hover>
                      <TableCell>
                        <Typography fontWeight="bold">#{prod.factura_numero}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography>{prod.factura_fecha}</Typography>
                        <Typography variant="caption" color="text.secondary">{prod.factura_hora}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="bold">{prod.productos_label}</Typography>
                      </TableCell>
                      <TableCell align="center">{prod.cantidad}</TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold">
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(prod.total_venta)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography>
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(prod.costo_unitario)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography>
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(prod.total_costo)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography fontWeight="bold" color={prod.utilidad_bruta >= 0 ? '#4caf50' : '#e94560'}>
                          {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(prod.utilidad_bruta)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={`${prod.margen_utilidad}%`} 
                          color={parseFloat(prod.margen_utilidad) >= 25 ? 'success' : parseFloat(prod.margen_utilidad) >= 10 ? 'warning' : 'error'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {calcularUtilidades.length > 0 && (
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eee', mt: 2, gap: 3 }}>
              <Box sx={{ border: '1px solid #4caf50', borderRadius: 2, p: 2, bgcolor: 'rgba(76,175,80,0.05)' }}>
                <Typography variant="caption" color="#1a1a2e" display="block">UTILIDAD TOTAL</Typography>
                <Typography variant="h5" fontWeight={800} color="#4caf50">
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalUtilidad)}
                </Typography>
              </Box>
              <Box sx={{ border: '1px dashed #666', borderRadius: 2, p: 2, bgcolor: 'rgba(0,0,0,0.02)' }}>
                <Typography variant="caption" color="#1a1a2e" display="block">PRODUCTOS MOSTRADOS</Typography>
                <Typography variant="h5" fontWeight={800} color="#1a1a2e">
                  {calcularUtilidades.length}
                </Typography>
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* Recibo Oculto para Impresión */}
      {facturaFinal && (
        <Box className="print-only">
          <style>
            {`
              .print-only { display: none; }
              @media print {
                html, body, #root { height: auto !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
                body * { visibility: hidden !important; }
                .print-only, .print-only * { visibility: visible !important; }
                .print-only { 
                   display: block !important; 
                   position: absolute !important; 
                   left: 0 !important; top: 0 !important; 
                   width: 80mm !important; 
                   padding: 5mm !important;
                   font-family: monospace !important; 
                   font-size: 12px; 
                   color: #000; 
                   box-sizing: border-box; 
                }
                @page { size: 80mm auto; margin: 0; }
              }
            `}
          </style>
          <Box textAlign="center" mb={2}>
            <Typography fontWeight="bold" fontSize="16px">LA PERLA RESTAURANTE BQ</Typography>
            <Typography fontSize="12px">Dir.: cra 62 # 72-28</Typography>
            <Typography fontSize="12px">Telf.: 315 075 2214</Typography>
            <Typography fontSize="12px">Fecha: {new Date(facturaFinal.createdAt || new Date()).toLocaleString()}</Typography>
            <Typography fontSize="12px">Factura Venta #: {facturaFinal.numero_factura || 'N/A'}</Typography>
          </Box>

          <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: '#000' }} />

          {facturaFinal.id_cliente && (
            <Box mb={1}>
              <Typography fontSize="12px">Cliente: {facturaFinal.id_cliente.nombre} {facturaFinal.id_cliente.apellido}</Typography>
              <Typography fontSize="12px">Doc: {facturaFinal.id_cliente.numero_documento || 'N/A'}</Typography>
              {facturaFinal.id_cliente.telefono && (
                <Typography fontSize="12px">Telf: {facturaFinal.id_cliente.telefono}</Typography>
              )}
            </Box>
          )}

          {facturaFinal.a_domicilio && (
            <Box mb={1} sx={{ p: 1, border: '1px dashed #000', borderRadius: '2px' }}>
              <Typography fontSize="12px" fontWeight="bold" textAlign="center" sx={{ mb: 0.5 }}>** VENTA A DOMICILIO **</Typography>
              <Typography fontSize="11px"><strong>Dirección:</strong> {facturaFinal.direccion_entrega || 'N/A'}</Typography>
              {facturaFinal.id_cliente?.telefono && (
                <Typography fontSize="11px"><strong>Teléfono:</strong> {facturaFinal.id_cliente.telefono}</Typography>
              )}
              {facturaFinal.monto_domicilio > 0 && (
                <Box sx={{ mt: 0.5 }}>
                  <Typography fontSize="11px"><strong>Valor Domicilio:</strong> {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(facturaFinal.monto_domicilio)}</Typography>
                  {facturaFinal.metodo_pago_domicilio && (
                    <Typography fontSize="11px"><strong>Forma de Pago Domicilio:</strong> {facturaFinal.metodo_pago_domicilio}</Typography>
                  )}
                </Box>
              )}
            </Box>
          )}

          <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: '#000' }} />

          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" mb={1} pb={0.5} borderBottom="1px solid #000">
              <Typography fontSize="12px" fontWeight="bold">DESCRIPCIÓN</Typography>
              <Typography fontSize="12px" fontWeight="bold">TOTAL</Typography>
            </Box>
            {facturaFinal.detalle_pedido?.map((item, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'flex-end', mb: 0.5 }}>
                <Typography fontSize="12px" sx={{ whiteSpace: 'nowrap' }}>{item.cantidad}x {item.nombre}</Typography>
                <Box sx={{ flexGrow: 1, borderBottom: '1px dotted #000', mx: 0.5, position: 'relative', top: '-4px' }} />
                <Typography fontSize="12px" sx={{ whiteSpace: 'nowrap' }}>
                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(item.precio * item.cantidad)}
                </Typography>
              </Box>
            ))}
          </Box>

          <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: '#000' }} />

          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography fontSize="12px">Subtotal productos:</Typography>
            <Typography fontSize="12px">
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(facturaFinal.detalle_pedido?.reduce((sum, item) => sum + (item.precio * item.cantidad), 0) || 0)}
            </Typography>
          </Box>

          {facturaFinal.propinas?.length > 0 && (
            <>
              <Box mt={1}>
                <Typography fontSize="12px" fontWeight="bold">Propina</Typography>
                {facturaFinal.propinas.map((propina, idx) => (
                  <Box key={idx} display="flex" justifyContent="space-between">
                    <Typography fontSize="12px">{propina.metodo_pago || 'Sin método'}</Typography>
                    <Typography fontSize="12px">
                      {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(propina.monto || 0)}
                    </Typography>
                  </Box>
                ))}
                <Box display="flex" justifyContent="space-between" mt={0.5} pt={0.5} borderTop="1px dotted #000">
                  <Typography fontSize="12px">Total propina</Typography>
                  <Typography fontSize="12px">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(facturaFinal.propinas.reduce((sum, propina) => sum + (propina.monto || 0), 0))}
                  </Typography>
                </Box>
              </Box>
            </>
          )}

          <Divider sx={{ borderStyle: 'dashed', my: 1, borderColor: '#000' }} />
          <Box display="flex" justifyContent="space-between" mb={2} p={1} sx={{ bgcolor: '#f5f5f5' }}>
            <Typography fontSize="14px" fontWeight="bold">TOTAL FINAL</Typography>
            <Typography fontSize="14px" fontWeight="bold">
              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(
                facturaFinal.total_pagado + (facturaFinal.propinas?.reduce((sum, propina) => sum + (propina.monto || 0), 0) || 0)
              )}
            </Typography>
          </Box>

          <Typography textAlign="center" fontSize="12px" fontWeight="bold" mt={3}>
            ¡GRACIAS POR SU COMPRA!
          </Typography>
        </Box>
      )}

      {/* Modal Crear Cliente */}
      <Dialog open={openModalCliente} onClose={() => setOpenModalCliente(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontWeight: 700 }}>
          Registrar Nuevo Cliente
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField fullWidth label="Nombre" value={formCliente.nombre} onChange={e => setFormCliente(p => ({ ...p, nombre: e.target.value }))} margin="normal" size="small"/>
            <TextField fullWidth label="Apellido" value={formCliente.apellido} onChange={e => setFormCliente(p => ({ ...p, apellido: e.target.value }))} margin="normal" size="small"/>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              select
              fullWidth
              label="Documento"
              value={formCliente.tipo_documento}
              onChange={e => setFormCliente(p => ({ ...p, tipo_documento: e.target.value }))}
              margin="normal"
              size="small"
              SelectProps={{ native: true }}
            >
              <option value=""></option>
              {TIPOS_DOCUMENTO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </TextField>
            <TextField fullWidth label="Número" value={formCliente.numero_documento} onChange={e => setFormCliente(p => ({ ...p, numero_documento: e.target.value }))} margin="normal" size="small"/>
          </Box>
          <TextField fullWidth label="Teléfono" value={formCliente.telefono} onChange={e => setFormCliente(p => ({ ...p, telefono: e.target.value }))} margin="normal" size="small"/>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenModalCliente(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={guardarCliente} variant="contained" sx={{ borderRadius: 2, background: '#1a1a2e' }}>Guardar y Asignar</Button>
        </DialogActions>
      </Dialog>

      {/* MODAL DIVIDIR CUENTA */}
      <Dialog open={openDividirCuentaModal} onClose={() => setOpenDividirCuentaModal(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #4caf50, #388e3c)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box>Dividir Cuenta</Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
            ¿Cuántas personas van a pagar esta cuenta?
          </Typography>
          <TextField
            fullWidth
            type="number"
            label="Número de Personas"
            value={numeroParcialPersonas}
            onChange={e => setNumeroParcialPersonas(e.target.value === '' ? '' : Number(e.target.value))}
            inputProps={{ min: 1, max: 10 }}
            variant="outlined"
            autoFocus
            helperText="Mínimo 1, máximo 10 personas"
          />
          <Box sx={{ mt: 3, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
            <Typography variant="caption" fontWeight={700} display="block" sx={{ mb: 1 }}>TOTAL A DIVIDIR:</Typography>
            <Typography variant="h6" fontWeight={900} color="#4caf50">
              ${new Intl.NumberFormat('es-CO').format(totalCaja)}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setOpenDividirCuentaModal(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={confirmarDividirCuenta} variant="contained" sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #4caf50, #388e3c)', fontWeight: 700 }}>
            Continuar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>

      {/* ── MODAL ELIMINAR CON CLAVE MAESTRA ── */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700, color: 'error.main' }}>Eliminar Factura</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 3 }}>
            ¿Estás seguro de eliminar esta factura? <br/>
            <strong>Se restituirá el stock de los productos facturados automáticamente.</strong><br/><br/>
            Ingresa la <strong>Clave Maestra</strong> para confirmar:
          </Typography>
          <TextField 
            fullWidth label="Clave Maestra" type="password" size="small" autoComplete="off"
            value={masterKey} onChange={e => setMasterKey(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && confirmarEliminar()}
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2 }}>Cancelar</Button>
          <Button onClick={confirmarEliminar} variant="contained" color="error" sx={{ borderRadius: 2 }}>Confirmar Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// --- Subcomponente de Tabla para simplificar renderizado ---
const TablaReporteFacturas = ({ facturas, enReproduccion, onDelete }) => {
  const [facturaDetalle, setFacturaDetalle] = useState(null);
  const formatoCOP = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
  const obtenerMetodoPago = (factura) => {
    if (factura.metodo_pago !== 'dividido') return factura.metodo_pago;

    const metodos = [...new Set((factura.pagos_parciales || []).map(pago => pago.metodo_pago).filter(Boolean))];
    return metodos.length ? metodos.join(', ') : 'dividido';
  };
  const obtenerPagosFactura = (factura) => (
    factura.pagos_parciales?.length
      ? factura.pagos_parciales
      : [{ metodo_pago: factura.metodo_pago, monto: factura.total_pagado }]
  );
  const sumaTotal = facturas.reduce((sum, f) => sum + (f.total_pagado || 0), 0);
  const resumenPagos = METODOS_PAGO
    .map(metodo => ({
      metodo: metodo.value,
      label: metodo.label,
      total: facturas.reduce((sum, factura) => (
        sum + obtenerPagosFactura(factura)
          .filter(pago => pago.metodo_pago === metodo.value)
          .reduce((acc, pago) => acc + (pago.monto || 0), 0)
      ), 0)
    }))
    .filter(item => item.total > 0);
  const resumenPropinas = METODOS_PAGO
    .map(metodo => ({
      metodo: metodo.value,
      label: metodo.label,
      total: facturas.reduce((sum, factura) => (
        sum + (factura.propinas || [])
          .filter(propina => propina.metodo_pago === metodo.value)
          .reduce((acc, propina) => acc + (propina.monto || 0), 0)
      ), 0)
    }))
    .filter(item => item.total > 0);
  const sumaPropinas = resumenPropinas.reduce((sum, item) => sum + item.total, 0);

  return (
    <>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#1a1a2e' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>No. Factura</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Fecha</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Cliente / Cédula</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Mesa / Destino</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold' }}>Total / Métodos</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {facturas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  <ReceiptLongIcon sx={{ fontSize: 40, opacity: 0.3, display: 'block', mx: 'auto', mb: 1 }} />
                  No existen registros bajo este filtro.
                </TableCell>
              </TableRow>
            ) : (
              facturas.map(f => (
                <TableRow key={f._id} hover>
                  <TableCell>
                    <Typography fontWeight="bold">#{f.numero_factura || '...'}</Typography>
                  </TableCell>
                  <TableCell>{new Date(f.createdAt).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                  <TableCell>
                    {f.id_cliente ? (
                      <Box>
                        <Typography variant="body2">{f.id_cliente.nombre} {f.id_cliente.apellido}</Typography>
                        <Typography variant="caption" color="text.secondary">{f.id_cliente.numero_documento}</Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">Consumidor Final</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {f.venta_directa ? (
                      <Chip label="🏪 VENTA DIRECTA" color="success" variant="outlined" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }} />
                    ) : f.a_domicilio ? (
                      <Chip label="🚚 PEDIDO A DOMICILIO" color="warning" variant="outlined" sx={{ fontWeight: 'bold', textTransform: 'uppercase' }} />
                    ) : f.id_comanda?.id_mesa ? (
                      <Chip label={`🪑 MESA #${f.id_comanda.id_mesa.numero_mesa}`} color="info" variant="outlined" sx={{ fontWeight: 'bold' }} />
                    ) : (
                      <Typography variant="caption" color="text.secondary">—</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ minWidth: 220 }}>
                      <Typography variant="caption" fontWeight={800} color="text.secondary">Pagos</Typography>
                      {obtenerPagosFactura(f).map((pago, idx) => (
                        <Box key={`${pago.metodo_pago}-${idx}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 0.25 }}>
                          <Chip label={pago.metodo_pago || 'Sin método'} size="small" variant="outlined" sx={{ textTransform: 'uppercase', height: 22 }} />
                          <Typography variant="body2" fontWeight={800} color="#4caf50">
                            {formatoCOP.format(pago.monto || 0)}
                          </Typography>
                        </Box>
                      ))}
                      {f.propinas?.length > 0 && (
                        <Box sx={{ mt: 0.75, pt: 0.75, borderTop: '1px dashed #ffcc80' }}>
                          <Typography variant="caption" fontWeight={800} color="#ef6c00">Propinas</Typography>
                          {f.propinas.map((propina, idx) => (
                            <Box key={`${propina.metodo_pago}-${idx}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 0.25 }}>
                              <Chip label={propina.metodo_pago || 'Sin método'} size="small" variant="outlined" sx={{ textTransform: 'uppercase', height: 22, borderColor: '#ef6c00', color: '#ef6c00' }} />
                              <Typography variant="body2" fontWeight={800} color="#ef6c00">
                                {formatoCOP.format(propina.monto || 0)}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                      <Tooltip title="Ver Detalles">
                        <IconButton size="small" sx={{ color: '#0f3460' }} onClick={() => setFacturaDetalle(f)}>
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Re-Imprimir">
                        <IconButton size="small" color="primary" onClick={() => enReproduccion(f)}>
                          <PrintIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => onDelete(f._id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #eee', mt: 1 }}>
        <Box sx={{ width: { xs: '100%', md: 560 }, border: '1px dashed #e94560', borderRadius: 2, p: 2, bgcolor: 'rgba(233,69,96,0.05)' }}>
          <Typography variant="caption" color="#1a1a2e" display="block" fontWeight={800}>RECAUDO MOSTRADO</Typography>
          <Typography variant="h5" fontWeight={800} color="#e94560" sx={{ mb: 1.5 }}>
            {formatoCOP.format(sumaTotal)}
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={900} color="#1a1a2e" sx={{ mb: 0.5 }}>Pagos por método</Typography>
              {resumenPagos.length ? resumenPagos.map(item => (
                <Box key={item.metodo} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.25 }}>
                  <Typography variant="body2" sx={{ textTransform: 'uppercase' }}>{item.label}</Typography>
                  <Typography variant="body2" fontWeight={800}>{formatoCOP.format(item.total)}</Typography>
                </Box>
              )) : (
                <Typography variant="body2" color="text.secondary">Sin pagos en el filtro</Typography>
              )}
            </Box>

            <Box>
              <Typography variant="subtitle2" fontWeight={900} color="#ef6c00" sx={{ mb: 0.5 }}>Propinas por método</Typography>
              {resumenPropinas.length ? resumenPropinas.map(item => (
                <Box key={item.metodo} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, py: 0.25 }}>
                  <Typography variant="body2" sx={{ textTransform: 'uppercase' }}>{item.label}</Typography>
                  <Typography variant="body2" fontWeight={800} color="#ef6c00">{formatoCOP.format(item.total)}</Typography>
                </Box>
              )) : (
                <Typography variant="body2" color="text.secondary">Sin propinas en el filtro</Typography>
              )}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mt: 0.75, pt: 0.75, borderTop: '1px dashed #ffcc80' }}>
                <Typography variant="body2" fontWeight={900} color="#ef6c00">Total propinas</Typography>
                <Typography variant="body2" fontWeight={900} color="#ef6c00">{formatoCOP.format(sumaPropinas)}</Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── MODAL DETALLE DE FACTURA ── */}
      <Dialog open={!!facturaDetalle} onClose={() => setFacturaDetalle(null)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        {facturaDetalle && (
          <>
            <DialogTitle sx={{ background: 'linear-gradient(135deg, #1a1a2e, #0f3460)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <ReceiptLongIcon />
              Detalle Factura #{facturaDetalle.numero_factura}
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              {/* Info principal */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>FECHA</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(facturaDetalle.createdAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>MÉTODO DE PAGO</Typography>
                  <Box mt={0.5}>
                    <Chip label={obtenerMetodoPago(facturaDetalle)} size="small" sx={{ textTransform: facturaDetalle.metodo_pago === 'dividido' ? 'uppercase' : 'capitalize' }} />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>CLIENTE</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {facturaDetalle.id_cliente
                      ? `${facturaDetalle.id_cliente.nombre} ${facturaDetalle.id_cliente.apellido}`
                      : 'Consumidor Final'}
                  </Typography>
                  {facturaDetalle.id_cliente?.numero_documento && (
                    <Typography variant="caption" color="text.secondary">
                      {facturaDetalle.id_cliente.numero_documento}
                    </Typography>
                  )}
                </Box>
                {facturaDetalle.id_mesa && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>MESA</Typography>
                    <Typography variant="body2" fontWeight={600}>{facturaDetalle.id_mesa.nombre || `Mesa ${facturaDetalle.id_mesa.numero}`}</Typography>
                  </Box>
                )}
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
                    {(facturaDetalle.detalle_pedido || []).map((item, i) => {
                      const precioUnitario = item.precio ?? item.precio_unitario ?? 0;
                      const cantidad = item.cantidad || 1;

                      return (
                        <TableRow key={i}>
                          <TableCell>{item.nombre || item.id_plato?.nombre || item.id_producto?.nombre || '—'}</TableCell>
                          <TableCell align="center">{cantidad}</TableCell>
                          <TableCell align="right">
                            {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(precioUnitario)}
                          </TableCell>
                          <TableCell align="right">
                            <Typography fontWeight={700}>
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(precioUnitario * cantidad)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: '#1a1a2e' }}>PAGOS</Typography>
                  <Box sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: 2, p: 1.5 }}>
                    {(() => {
                      const pagos = facturaDetalle.pagos_parciales?.length
                        ? facturaDetalle.pagos_parciales
                        : [{ metodo_pago: facturaDetalle.metodo_pago, monto: facturaDetalle.total_pagado }];
                      const totalPagos = pagos.reduce((sum, pago) => sum + (pago.monto || 0), 0);

                      return (
                        <>
                          {pagos.map((pago, idx) => (
                            <Box key={`${pago.metodo_pago}-${idx}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px solid #f2f2f2' }}>
                              <Chip label={pago.metodo_pago || 'Sin método'} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                              <Typography variant="body2" fontWeight={800}>
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(pago.monto || 0)}
                              </Typography>
                            </Box>
                          ))}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, pt: 1, mt: 0.5 }}>
                            <Typography variant="body2" fontWeight={900}>Total pagos</Typography>
                            <Typography variant="body2" fontWeight={900}>
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalPagos)}
                            </Typography>
                          </Box>
                        </>
                      );
                    })()}
                  </Box>
                </Box>

                <Box>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1, color: '#ef6c00' }}>PROPINAS</Typography>
                  <Box sx={{ border: '1px solid #ffcc80', borderRadius: 2, p: 1.5, bgcolor: '#fffaf0' }}>
                    {(() => {
                      const propinasFactura = facturaDetalle.propinas || [];
                      const totalPropinasFactura = propinasFactura.reduce((sum, propina) => sum + (propina.monto || 0), 0);

                      return propinasFactura.length ? (
                        <>
                          {propinasFactura.map((propina, idx) => (
                            <Box key={`${propina.metodo_pago}-${idx}`} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px solid #ffe0b2' }}>
                              <Chip label={propina.metodo_pago || 'Sin método'} size="small" variant="outlined" sx={{ textTransform: 'capitalize', borderColor: '#ef6c00', color: '#ef6c00' }} />
                              <Typography variant="body2" fontWeight={800} color="#ef6c00">
                                {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(propina.monto || 0)}
                              </Typography>
                            </Box>
                          ))}
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, pt: 1, mt: 0.5 }}>
                            <Typography variant="body2" fontWeight={900} color="#ef6c00">Total propinas</Typography>
                            <Typography variant="body2" fontWeight={900} color="#ef6c00">
                              {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(totalPropinasFactura)}
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
              <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Box sx={{ bgcolor: '#1a1a2e', color: '#fff', px: 3, py: 1.5, borderRadius: 2, textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>TOTAL PAGADO</Typography>
                  <Typography variant="h5" fontWeight={900} color="#e94560">
                    {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(facturaDetalle.total_pagado || 0)}
                  </Typography>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 3 }}>
              <Button onClick={() => setFacturaDetalle(null)} variant="outlined" sx={{ borderRadius: 2 }}>Cerrar</Button>
              <Button onClick={() => { const factura = facturaDetalle; setFacturaDetalle(null); enReproduccion(factura, 650); }} variant="contained" startIcon={<PrintIcon />} sx={{ borderRadius: 2, background: '#0f3460' }}>
                Re-Imprimir
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
};

export default FacturacionPage;
