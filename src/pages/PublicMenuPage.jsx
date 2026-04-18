// ============================================================
// src/pages/PublicMenuPage.jsx — Menú Público (Sin Login)
// ============================================================
import { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Card, CardContent, Chip, 
  Grid, Paper, Tab, Tabs, Skeleton
} from '@mui/material';
import { productoService, categoriasProductosService } from '../services/api';

const CATEGORIAS_ESTATICAS = [
  { value: 'platos_principales', label: 'Platos Principales' },
  { value: 'bebidas', label: 'Bebidas' },
  { value: 'postres', label: 'Postres' },
  { value: 'sopas', label: 'Sopas' },
  { value: 'entradas', label: 'Entradas' },
  { value: 'adicionales', label: 'Adicionales' },
];

const PublicMenuPage = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Cargar categorías
      try {
        const resCategorias = await categoriasProductosService.getAll();
        const categoriasNuevas = resCategorias.data
          .filter(c => c.activa)
          .map(c => ({ value: c.detalles.value, label: c.detalles.label }));
        const nuevasNoRepetidas = categoriasNuevas.filter(
          cat => !CATEGORIAS_ESTATICAS.some(est => est.label === cat.label)
        );
        setCategorias([...CATEGORIAS_ESTATICAS, ...nuevasNoRepetidas]);
      } catch {
        setCategorias(CATEGORIAS_ESTATICAS);
      }

      // Cargar productos
      const res = await productoService.getAll();
      setProductos(res.data);
    } catch (error) {
      console.error('Error al cargar menú:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setCategoriaActiva(newValue);
  };

  const productosFiltrados = productos.filter(
    p => p.tipo === categorias[categoriaActiva]?.value
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
        pb: 4,
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
          color: '#fff',
          py: 3,
          textAlign: 'center',
          borderBottom: '3px solid #e94560',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
      >
        <Typography variant="h5" fontWeight={600} sx={{ mb: 2, opacity: 0.95 }}>
        La Perla Restaurante
        </Typography>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
          🍽️ Nuestro Menú
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          Descubre nuestras deliciosas opciones
        </Typography>
      </Box>

      {/* Container Mobile */}
      <Container maxWidth="sm" sx={{ mt: 3 }}>
        {/* Tabs de Categorías */}
        <Paper
          elevation={0}
          sx={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 2,
            mb: 3,
            border: '1px solid rgba(233, 69, 96, 0.2)',
          }}
        >
          <Tabs
            value={categoriaActiva}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTabs-indicator': {
                backgroundColor: '#e94560',
                height: 4,
              },
              '& .MuiTab-root': {
                color: '#666',
                fontWeight: 600,
                fontSize: '12px',
                textTransform: 'capitalize',
                '&.Mui-selected': {
                  color: '#e94560',
                },
              },
            }}
          >
            {categorias.map((cat, idx) => (
              <Tab key={idx} label={cat.label} />
            ))}
          </Tabs>
        </Paper>

        {/* Productos */}
        <Box>
          {loading ? (
            <Grid container spacing={2}>
              {[1, 2, 3].map(i => (
                <Grid item xs={12} key={i}>
                  <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
                </Grid>
              ))}
            </Grid>
          ) : productosFiltrados.length === 0 ? (
            <Paper
              elevation={0}
              sx={{
                p: 4,
                textAlign: 'center',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 2,
              }}
            >
              <Typography variant="h6" sx={{ color: '#fff', opacity: 0.7 }}>
                No hay productos en esta categoría
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {productosFiltrados.map(producto => (
                <Grid item xs={12} key={producto._id}>
                  <Card
                    sx={{
                      background: 'rgba(255,255,255,0.95)',
                      borderRadius: 2,
                      border: '1px solid rgba(233, 69, 96, 0.1)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(233, 69, 96, 0.2)',
                      },
                      overflow: 'hidden',
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      {/* Nombre y Precio */}
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 1.5,
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 700,
                              color: '#1a1a2e',
                              fontSize: '16px',
                              mb: 0.5,
                            }}
                          >
                            {producto.nombre}
                          </Typography>
                        </Box>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 700,
                            color: '#e94560',
                            fontSize: '16px',
                            ml: 1.5,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          ${producto.precio.toLocaleString('es-CO')}
                        </Typography>
                      </Box>

                      {/* Descripción */}
                      {producto.descripcion && (
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#666',
                            mb: 1.5,
                            lineHeight: 1.4,
                            fontSize: '13px',
                          }}
                        >
                          {producto.descripcion}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ mt: 6, textAlign: 'center', pb: 2 }}>
          <Typography
            variant="body2"
            sx={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '12px',
            }}
          >
            💡 Escanea códigos QR en las mesas para ver el menú
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default PublicMenuPage;
