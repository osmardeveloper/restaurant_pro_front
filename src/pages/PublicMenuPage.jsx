// ============================================================
// src/pages/PublicMenuPage.jsx — Menú Público (Sin Login)
// ============================================================
import { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Card, CardContent, Chip, 
  Grid, Paper, Tab, Tabs, Skeleton, CircularProgress
} from '@mui/material';
import { publicProductoService, publicCategoriasService } from '../services/api';
import './PublicMenuPage.css';

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
        const resCategorias = await publicCategoriasService.getAll();
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
      const res = await publicProductoService.getAll();
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
        background: '#F4EFE4',
        pb: 4,
        position: 'relative',
        // Marca de agua del logo ampliado - toda la pantalla
        '&::before': {
          content: '""',
          position: 'fixed',
          top: '200px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          backgroundImage: 'url("/images/logo_la_perla.png")',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'contain',
          backgroundPosition: 'center',
          opacity: 0.06,
          pointerEvents: 'none',
          zIndex: 0,
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
          color: '#fff',
          py: 3,
          px: 2,
          borderBottom: '3px solid #e94560',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
          position: 'relative',
          zIndex: 10,
          '@media (max-width: 600px)': {
            flexDirection: 'column',
            textAlign: 'center',
            gap: 2,
          }
        }}
      >
        {/* Logo Grande - Izquierda */}
        <Box
          sx={{
            width: 180,
            height: 180,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '16px',
            border: '2px solid rgba(233, 69, 96, 0.5)',
            backdropFilter: 'blur(10px)',
            overflow: 'hidden',
            flexShrink: 0,
            '@media (max-width: 600px)': {
              width: 120,
              height: 120,
            }
          }}
        >
          <img
            src="/images/logo_la_perla.png"
            alt="La Perla Restaurante"
            style={{
              width: '85%',
              height: '85%',
              objectFit: 'contain',
            }}
          />
        </Box>

        {/* Texto - Derecha */}
        <Box sx={{
          textAlign: 'left',
          '@media (max-width: 600px)': {
            textAlign: 'center',
          }
        }}>
          <Typography variant="h5" fontWeight={600} sx={{ mb: 0.5, opacity: 0.95 }}>
            La Perla
          </Typography>
          <Typography variant="h4" fontWeight={700} sx={{ mb: 1 }}>
            🍽️ Menú
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Descubre nuestras deliciosas opciones
          </Typography>
        </Box>
      </Box>

      {/* Container Mobile */}
      <Container maxWidth="sm" sx={{ mt: 3, position: 'relative', zIndex: 2 }}>
        {/* Tabs de Categorías con indicador de scroll */}
        <Box>
          <Paper
            elevation={0}
            className="public-menu-tabs-container"
            sx={{
              background: 'rgba(255,255,255,0.95)',
              borderRadius: 2,
              border: '1px solid rgba(233, 69, 96, 0.2)',
              overflow: 'hidden',
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

          {/* Texto animado de deslizamiento con dedo */}
          <div className="scroll-hint-container">
            <span className="swipe-hand">👆</span>
            <span className="scroll-hint-text">Desliza para ver mas categorías »</span>
          </div>
        </Box>

        {/* Productos */}
        <Box>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                gap: 3,
                pt: 4,
                pb: 4,
              }}
            >
              {/* Spinner Animado */}
              <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress
                  size={100}
                  thickness={4}
                  sx={{
                    color: '#e94560',
                    animation: 'spin 2s linear infinite',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' },
                    },
                  }}
                />
                {/* Centro del Spinner */}
                <Box
                  sx={{
                    position: 'absolute',
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    boxShadow: '0 4px 15px rgba(233, 69, 96, 0.3)',
                  }}
                >
                  🍽️
                </Box>
              </Box>

              {/* Mensaje Principal */}
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: '#1a1a2e',
                    mb: 1,
                    fontSize: { xs: '18px', sm: '22px' },
                  }}
                >
                  ¡Bienvenido a La Perla! 🎉
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: '#555',
                    mb: 1.5,
                    fontSize: '15px',
                    fontWeight: 500,
                  }}
                >
                  Espere mientras el servidor carga los datos del menú
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#999',
                    fontSize: '13px',
                    fontStyle: 'italic',
                  }}
                >
                  Puede tardar unos segundos... ⏳
                </Typography>
              </Box>

              {/* Puntos Animados de Carga */}
              <Box sx={{ display: 'flex', gap: 0.8, justifyContent: 'center', mt: 1 }}>
                {[0, 1, 2].map((index) => (
                  <Box
                    key={index}
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: '#e94560',
                      animation: `bounce 1.4s infinite ease-in-out`,
                      animationDelay: `${index * 0.16}s`,
                      '@keyframes bounce': {
                        '0%, 80%, 100%': {
                          opacity: 0.5,
                          transform: 'scale(0.8)',
                        },
                        '40%': {
                          opacity: 1,
                          transform: 'scale(1)',
                        },
                      },
                    }}
                  />
                ))}
              </Box>

              {/* Emoji Animados de Comida */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  fontSize: '24px',
                  justifyContent: 'center',
                  mt: 2,
                }}
              >
                {['🍕', '🍔', '🍜'].map((emoji, idx) => (
                  <Typography
                    key={idx}
                    sx={{
                      animation: `float 3s ease-in-out infinite`,
                      animationDelay: `${idx * 0.3}s`,
                      '@keyframes float': {
                        '0%, 100%': { transform: 'translateY(0px)' },
                        '50%': { transform: 'translateY(-20px)' },
                      },
                    }}
                  >
                    {emoji}
                  </Typography>
                ))}
              </Box>
            </Box>
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
                      background: 'rgba(255,255,255,0.97)',
                      borderRadius: 2,
                      border: '1px solid rgba(15, 52, 96, 0.2)',
                      transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(15, 52, 96, 0.25)',
                        borderColor: 'rgba(233, 69, 96, 0.4)',
                      },
                      overflow: 'hidden',
                      position: 'relative',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(90deg, #0f3460 0%, #e94560 100%)',
                      }
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
