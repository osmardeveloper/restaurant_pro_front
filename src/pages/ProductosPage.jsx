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
import FileDownloadIcon   from '@mui/icons-material/FileDownload';
import PrintIcon          from '@mui/icons-material/Print';
import QrCode2Icon        from '@mui/icons-material/QrCode2';
import * as XLSX          from 'xlsx';
import QRCode             from 'qrcode.react';
import { productoService, categoriasProductosService } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Categorías estáticas base
const CATEGORIAS_ESTATICAS = [
  { value: 'platos_principales', label: 'Platos Principales' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'postres', label: 'Postres' },
  { value: 'sopas', label: 'Sopas' },
  { value: 'entradas', label: 'Entradas' },
  { value: 'adicionales', label: 'Adicionales' },
];

const FORM_INICIAL = { nombre: '', descripcion: '', tipo: 'platos_principales', precio: '', cantidad: '', costo: '' };

const ProductosPage = () => {
  const { usuario } = useAuth();
  const [productos, setProductos]       = useState([]);
  const [categorias, setCategorias]     = useState([]);
  const [loading, setLoading]           = useState(false);
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nombre: '', masterKey: '' });
  const [editId, setEditId]             = useState(null);
  const [form, setForm]                 = useState(FORM_INICIAL);
  const [formErrors, setFormErrors]     = useState({});
  const [busqueda, setBusqueda]         = useState('');
  const [categoria, setCategoria]       = useState('todas');
  const [snack, setSnack]               = useState({ open: false, msg: '', severity: 'success' });
  const [modalNuevaCategoria, setModalNuevaCategoria] = useState(false);
  const [formNuevaCategoria, setFormNuevaCategoria] = useState({ nombre: '' });
  const [loadingGuardarCategoria, setLoadingGuardarCategoria] = useState(false);

  const [loadingGuardar, setLoadingGuardar] = useState(false);
  const [modalQROpen, setModalQROpen] = useState(false);

  const showSnack = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  const fetchCategorias = useCallback(async () => {
    try {
      const res = await categoriasProductosService.getAll();
      const categoriasNuevas = res.data.filter(c => c.activa).map(c => ({ 
        value: c.detalles.value, 
        label: c.detalles.label 
      }));
      // Mantener orden de estáticas y agregar las nuevas dinámicas al final, sin duplicados
      const nuevasNoRepetidas = categoriasNuevas.filter(cat => !CATEGORIAS_ESTATICAS.some(est => est.label === cat.label));
      const todasLasCategorias = [...CATEGORIAS_ESTATICAS, ...nuevasNoRepetidas];
      setCategorias(todasLasCategorias);
    } catch {
      // Si hay error al cargar dinámicas, mantener las estáticas
      setCategorias(CATEGORIAS_ESTATICAS);
      showSnack('Usando categorías estáticas.', 'info');
    }
  }, []);

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

  useEffect(() => { 
    fetchCategorias();
    fetchProductos(); 
  }, [fetchCategorias, fetchProductos]);

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

  const abrirCrear  = () => { 
    setEditId(null); 
    setForm({ ...FORM_INICIAL, tipo: categorias.length > 0 ? categorias[0].value : 'platos_principales' }); 
    setFormErrors({}); 
    setDialogOpen(true); 
  };
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

  const guardarNuevaCategoria = async () => {
    if (!formNuevaCategoria.nombre.trim()) {
      showSnack('El nombre de la categoría es requerido.', 'warning');
      return;
    }
    setLoadingGuardarCategoria(true);
    try {
      // El backend se encarga de convertir nombre a detalles.label y detalles.value
      await categoriasProductosService.create({ nombre: formNuevaCategoria.nombre, activa: true });
      showSnack('Categoría creada correctamente.');
      setFormNuevaCategoria({ nombre: '' });
      setModalNuevaCategoria(false);
      await fetchCategorias(); // Recargar categorías
    } catch (err) {
      showSnack(err.response?.data?.message || 'Error al crear la categoría.', 'error');
    } finally {
      setLoadingGuardarCategoria(false);
    }
  };

  const columns = [
    { field: 'nombre', headerName: 'Nombre', flex: 1, minWidth: 150 },
    { 
      field: 'tipo', headerName: 'Tipo', width: 150, 
      renderCell: ({ value }) => {
        const categoria = categorias.find(c => c.value === value);
        return <Chip label={categoria?.label || value} size="small" variant="outlined" color="primary" />;
      }
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

  const exportarExcel = () => {
    if (filteredRows.length === 0) {
      showSnack('No hay productos para exportar.', 'warning');
      return;
    }

    // Preparar datos para Excel
    const datosExcel = filteredRows.map(p => ({
      Nombre: p.nombre,
      Descripción: p.descripcion || '',
      Categoría: categorias.find(c => c.value === p.tipo)?.label || p.tipo,
      Precio: p.precio,
      Stock: p.cantidad,
    }));

    // Crear workbook y worksheet
    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productos');

    // Ajustar ancho de columnas
    ws['!cols'] = [
      { wch: 25 }, // Nombre
      { wch: 35 }, // Descripción
      { wch: 20 }, // Categoría
      { wch: 15 }, // Precio
      { wch: 10 }, // Stock
    ];

    // Descargar archivo
    const fecha = new Date().toLocaleDateString('es-CO').replace(/\//g, '-');
    XLSX.writeFile(wb, `Productos_${fecha}.xlsx`);
    showSnack('Archivo Excel descargado correctamente.', 'success');
  };

  const exportarPDF = async () => {
    if (filteredRows.length === 0) {
      showSnack('No hay productos para exportar.', 'warning');
      return;
    }

    try {
      const jsPDF = (await import('jspdf')).default;
      // Crear elemento temporal para generar PDF
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPosition = 20;

      // Encabezado
      doc.setFontSize(16);
      doc.text('LISTADO DE PRODUCTOS', pageWidth / 2, yPosition, { align: 'center' });
      doc.setFontSize(10);
      yPosition += 8;
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')} - Total: ${filteredRows.length} productos`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      // Tabla
      const columnHeaders = ['Nombre', 'Descripción', 'Categoría', 'Precio', 'Costo', 'Stock'];
      const columnWidths = [35, 50, 25, 20, 20, 15];
      const rowHeight = 8;

      // Headers
      doc.setFillColor(26, 26, 46);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');

      let xPosition = 10;
      columnHeaders.forEach((header, index) => {
        doc.text(header, xPosition, yPosition, { maxWidth: columnWidths[index] - 2 });
        xPosition += columnWidths[index];
      });
      yPosition += rowHeight;

      // Datos
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);

      filteredRows.forEach((row, rowIndex) => {
        if (yPosition > pageHeight - 15) {
          doc.addPage('l', 'mm', 'a4');
          yPosition = 15;
          // Repetir headers en nueva página
          doc.setFillColor(26, 26, 46);
          doc.setTextColor(255, 255, 255);
          doc.setFont(undefined, 'bold');
          xPosition = 10;
          columnHeaders.forEach((header, index) => {
            doc.text(header, xPosition, yPosition, { maxWidth: columnWidths[index] - 2 });
            xPosition += columnWidths[index];
          });
          yPosition += rowHeight;
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'normal');
        }

        xPosition = 10;
        const rowData = [
          row.nombre.substring(0, 30),
          (row.descripcion || '').substring(0, 40),
          categorias.find(c => c.value === row.tipo)?.label || row.tipo,
          row.precio.toLocaleString('es-CO'),
          row.costo ? row.costo.toLocaleString('es-CO') : '-',
          row.cantidad,
        ];

        rowData.forEach((cell, colIndex) => {
          doc.text(String(cell), xPosition, yPosition, { maxWidth: columnWidths[colIndex] - 2 });
          xPosition += columnWidths[colIndex];
        });

        // Línea separadora
        doc.setDrawColor(200, 200, 200);
        doc.line(10, yPosition + 2, pageWidth - 10, yPosition + 2);
        yPosition += rowHeight + 1;
      });

      // Pie de página
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Página ${doc.internal.pages.length - 1}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

      // Descargar
      const fecha = new Date().toLocaleDateString('es-CO').replace(/\//g, '-');
      doc.save(`Productos_${fecha}.pdf`);
      showSnack('PDF descargado correctamente.', 'success');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      showSnack('Error al generar el PDF.', 'error');
    }
  };

  const imprimirProductos = async () => {
    if (filteredRows.length === 0) {
      showSnack('No hay productos para imprimir.', 'warning');
      return;
    }

    try {
      // Crear HTML para impresión
      const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Listado de Productos</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; background: #fff; }
          .container { max-width: 100%; padding: 20px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #1a1a2e; padding-bottom: 15px; }
          .header h1 { font-size: 24px; color: #1a1a2e; margin-bottom: 5px; }
          .header p { font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          thead { background: #1a1a2e; color: white; }
          th { padding: 12px 8px; text-align: left; font-size: 12px; font-weight: bold; }
          td { padding: 10px 8px; border-bottom: 1px solid #ddd; font-size: 11px; }
          tbody tr:nth-child(even) { background: #f9f9f9; }
          tbody tr:hover { background: #f0f0f0; }
          .precio { text-align: right; font-weight: 600; }
          .stock { text-align: center; }
          .categoria { color: #0f3460; font-weight: 600; }
          .fecha { text-align: center; font-size: 10px; color: #999; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; }
          @media print {
            body { margin: 0; padding: 0; }
            .container { padding: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LISTADO DE PRODUCTOS</h1>
            <p>Fecha: ${new Date().toLocaleDateString('es-CO')} | Total: ${filteredRows.length} productos</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th class="precio">Precio</th>
                <th class="stock">Stock</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRows.map(row => `
                <tr>
                  <td><strong>${row.nombre}</strong></td>
                  <td>${row.descripcion || '-'}</td>
                  <td class="categoria">${categorias.find(c => c.value === row.tipo)?.label || row.tipo}</td>
                  <td class="precio">${row.precio.toLocaleString('es-CO')}</td>
                  <td class="stock">${row.cantidad}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="fecha">Impreso: ${new Date().toLocaleString('es-CO')}</div>
        </div>
      </body>
      </html>
    `;

    // Abrir ventana de impresión
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
      showSnack('Documento enviado a impresión.', 'success');
    }, 250);
    } catch (error) {
      console.error('Error al imprimir:', error);
      showSnack('Error al imprimir el documento.', 'error');
    }
  };

  const generarURLMenu = () => {
    const baseURL = window.location.origin;
    return `${baseURL}/menu`;
  };

  const descargarQRPDF = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      
      const qrElement = document.getElementById('qr-menu-code');
      const canvas = await html2canvas(qrElement, { backgroundColor: '#fff', scale: 2 });
      
      const doc = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      
      // Calcular posiciones para centrar
      const imgWidth = 80; // 80mm de ancho
      const imgHeight = 80;
      const xPosition = (210 - imgWidth) / 2; // Centrar horizontalmente (A4 = 210mm)
      const yPosition = 40;
      
      // Título
      doc.setFontSize(16);
      doc.text('CÓDIGO QR - MENÚ', 105, 20, { align: 'center' });
      
      // URL
      doc.setFontSize(10);
      doc.text(`${generarURLMenu()}`, 105, 35, { align: 'center' });
      
      // QR Code
      doc.addImage(imgData, 'PNG', xPosition, yPosition, imgWidth, imgHeight);
      
      // Instrucciones
      doc.setFontSize(9);
      doc.text('Escanea este código QR acceder al menú digital', 105, yPosition + imgHeight + 15, { align: 'center' });
      doc.text('desde tu celular', 105, yPosition + imgHeight + 22, { align: 'center' });
      
      // Pie de página
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 105, 280, { align: 'center' });
      
      // Descargar
      doc.save('menu-qr.pdf');
      showSnack('QR descargado correctamente.', 'success');
    } catch (error) {
      console.error('Error al generar PDF del QR:', error);
      showSnack('Error al generar el PDF del QR.', 'error');
    }
  };

  const imprimirQR = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      
      const qrElement = document.getElementById('qr-menu-code');
      const canvas = await html2canvas(qrElement, { backgroundColor: '#fff', scale: 2 });
      
      const printWindow = window.open('', '_blank');
      const imgData = canvas.toDataURL('image/png');
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>QR Menú</title>
          <style>
            * { margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
            .container { text-align: center; }
            .header { margin-bottom: 20px; }
            .header h1 { font-size: 24px; margin-bottom: 10px; color: #1a1a2e; }
            .header p { color: #666; font-size: 14px; }
            .qr-container { margin: 30px 0; }
            .qr-container img { max-width: 300px; height: auto; }
            .footer { margin-top: 30px; font-size: 12px; color: #999; }
            @media print { body { background: transparent; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>CÓDIGO QR - MENÚ</h1>
              <p>${generarURLMenu()}</p>
            </div>
            <div class="qr-container">
              <img src="${imgData}" alt="QR Code">
            </div>
            <div class="footer">
              <p>Escanea este código QR para acceder al menú digital desde tu celular</p>
              <p>Generado: ${new Date().toLocaleString('es-CO')}</p>
            </div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
        showSnack('Enviado a impresión.', 'success');
      }, 250);
    } catch (error) {
      console.error('Error al imprimir QR:', error);
      showSnack('Error al imprimir el QR.', 'error');
    }
  };

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
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Buscar producto..."
            size="small"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            sx={{ width: 250, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
          />
          
          {/* Botones de exportación */}
          <Tooltip title="Descargar Excel">
            <Button 
              variant="outlined" 
              size="small"
              startIcon={<FileDownloadIcon />} 
              onClick={exportarExcel}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Excel
            </Button>
          </Tooltip>

          <Tooltip title="Imprimir listado">
            <Button 
              variant="outlined" 
              size="small"
              startIcon={<PrintIcon />} 
              onClick={imprimirProductos}
              sx={{ borderRadius: 2, textTransform: 'none' }}
            >
              Imprimir
            </Button>
          </Tooltip>

          <Tooltip title="Generar QR para menú">
            <Button 
              variant="outlined" 
              size="small"
              startIcon={<QrCode2Icon />} 
              onClick={() => setModalQROpen(true)}
              sx={{ borderRadius: 2, textTransform: 'none', color: '#e94560', borderColor: '#e94560', '&:hover': { background: 'rgba(233, 69, 96, 0.08)' } }}
            >
              QR Menú
            </Button>
          </Tooltip>
          
          {usuario?.rol === 'admin' && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={abrirCrear} sx={{ background: 'linear-gradient(135deg, #e94560, #c62a47)', borderRadius: 2, px: 3 }}>
              Nuevo Producto
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Filtro por Categorías */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, overflowX: 'auto', pb: 1, '&::-webkit-scrollbar': { height: 4 } }}>
        <Chip 
          label="Todas" 
          onClick={() => setCategoria('todas')}
          color={categoria === 'todas' ? 'primary' : 'default'}
          variant={categoria === 'todas' ? 'filled' : 'outlined'}
          sx={{ fontWeight: 600 }}
        />
        {categorias.map(cat => (
          <Chip 
            key={cat.value} 
            label={cat.label} 
            onClick={() => setCategoria(cat.value)}
            color={categoria === cat.value ? 'primary' : 'default'}
            variant={categoria === cat.value ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600 }}
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
            <InputLabel>Categoría de Producto</InputLabel>
            <Select value={form.tipo} label="Categoría de Producto" onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}>
              {categorias.map(cat => <MenuItem key={cat.value} value={cat.value}>{cat.label}</MenuItem>)}
            </Select>
            {formErrors.tipo && <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>{formErrors.tipo}</Typography>}
          </FormControl>
          
          <Button fullWidth variant="outlined" onClick={() => setModalNuevaCategoria(true)} sx={{ mt: 2, borderColor: '#0f3460', color: '#0f3460', fontWeight: 600 }}>
            + Nueva Categoría
          </Button>

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

      {/* Modal QR del Menú */}
      <Dialog open={modalQROpen} onClose={() => setModalQROpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #e94560, #c62a47)', color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <QrCode2Icon /> Código QR - Menú Digital
        </DialogTitle>
        <DialogContent sx={{ pt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          {/* QR Code */}
          <Box
            id="qr-menu-code"
            sx={{
              p: 2,
              background: '#fff',
              border: '2px solid #e94560',
              borderRadius: 2,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <QRCode 
              value={generarURLMenu()} 
              size={256} 
              level="H" 
              includeMargin={true}
            />
          </Box>

          {/* URL */}
          <Typography variant="body2" sx={{ textAlign: 'center', color: '#666', fontSize: '12px' }}>
            URL: <strong>{generarURLMenu()}</strong>
          </Typography>

          {/* Instrucciones */}
          <Paper elevation={0} sx={{ p: 2, background: '#f5f5f5', borderRadius: 2, width: '100%' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              💡 Instrucciones:
            </Typography>
            <Typography variant="body2" sx={{ fontSize: '12px', color: '#666', lineHeight: 1.6 }}>
              1. Descarga o imprime este QR<br/>
              2. Pógalo en las mesas del restaurante<br/>
              3. Los clientes pueden escanear para ver el menú en su celular
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1, justifyContent: 'center' }}>
          <Button 
            onClick={() => setModalQROpen(false)} 
            variant="outlined" 
            sx={{ borderRadius: 2 }}
          >
            Cerrar
          </Button>
          <Button 
            onClick={descargarQRPDF} 
            variant="contained" 
            startIcon={<FileDownloadIcon />}
            sx={{ background: 'linear-gradient(135deg, #e94560, #c62a47)', borderRadius: 2 }}
          >
            Descargar PDF
          </Button>
          <Button 
            onClick={imprimirQR} 
            variant="contained" 
            startIcon={<PrintIcon />}
            color="success"
            sx={{ borderRadius: 2 }}
          >
            Imprimir
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack(p => ({ ...p, open: false }))} anchorOrigin={{ vertical: 'top', horizontal: 'right' }}>
        <Alert severity={snack.severity} variant="filled" sx={{ borderRadius: 2 }}>{snack.msg}</Alert>
      </Snackbar>

      {/* Modal Nueva Categoría */}
      <Dialog open={modalNuevaCategoria} onClose={() => setModalNuevaCategoria(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #4caf50, #388e3c)', color: '#fff', fontWeight: 700 }}>
          Nueva Categoría
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField 
            fullWidth 
            label="Nombre de la Categoría" 
            value={formNuevaCategoria.nombre} 
            onChange={e => setFormNuevaCategoria({ nombre: e.target.value })}
            margin="normal"
            placeholder="Ej: Bebidas Premium"
            autoFocus
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setModalNuevaCategoria(false)}>Cancelar</Button>
          <Button onClick={guardarNuevaCategoria} disabled={loadingGuardarCategoria} variant="contained" sx={{ background: 'linear-gradient(135deg, #4caf50, #388e3c)', borderRadius: 2 }}>
            {loadingGuardarCategoria ? 'Guardando...' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {categorias.length === 0 && (
        <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">No hay categorías disponibles. Ve a Productos y crea una categoría para comenzar.</Typography>
        </Box>
      )}
    </Box>
  );
};

export default ProductosPage;
