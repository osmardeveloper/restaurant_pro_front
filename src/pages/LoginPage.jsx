// ============================================================
// src/pages/LoginPage.jsx — Página de autenticación
// ============================================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  InputAdornment, IconButton, Alert, CircularProgress,
} from '@mui/material';
import PersonIcon        from '@mui/icons-material/Person';
import LockIcon          from '@mui/icons-material/Lock';
import VisibilityIcon    from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import RestaurantIcon    from '@mui/icons-material/Restaurant';
import BrunchDiningIcon  from '@mui/icons-material/BrunchDining';
import { authService }   from '../services/api';
import { useAuth }       from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm]           = useState({ nombre: '', password: '' });
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.password) {
      setError('Por favor completa todos los campos.');
      return;
    }
    setLoading(true);
    try {
      const res = await authService.login(form);
      login(res.data.token, res.data.usuario);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión. Verifica las credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        p: { xs: 1.5, sm: 2 },
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 312, // Reducido un 35% de 480px
          borderRadius: 3,
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Box sx={{ textAlign: 'center', mb: 1.5 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
              <Box 
                component="img" 
                src="/images/logo_la_perla.png" 
                alt="Logo La Perla" 
                sx={{ 
                  width: { xs: 110, sm: 156 }, // Reducido ~35% de 240px
                  height: 'auto', 
                  borderRadius: '8px', 
                  border: '3px solid #fff' 
                }} 
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: { xs: 0.75, sm: 1 }, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: { xs: 28, sm: 32 }, height: { xs: 28, sm: 32 }, borderRadius: '50%', background: 'linear-gradient(135deg, #e94560, #c62a47)', boxShadow: '0 3px 10px rgba(233,69,96,0.3)' }}>
                <RestaurantIcon sx={{ color: '#fff', fontSize: 16 }} />
              </Box>
              <Typography variant="h5" sx={{ color: '#fff', fontWeight: 700, fontSize: { xs: '1.15rem', sm: '1.35rem' } }}>
                RestaurantPro
              </Typography>
              <Box sx={{ display: { xs: 'none', sm: 'inline-flex' }, alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #e94560, #c62a47)', boxShadow: '0 3px 10px rgba(233,69,96,0.3)' }}>
                <BrunchDiningIcon sx={{ color: '#fff', fontSize: 18 }} />
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', mt: 0.5, mb: 1, fontSize: '0.8rem' }}>
              Inicia sesión para continuar
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 1.5, py: 0.25, px: 1, fontSize: '0.8rem', borderRadius: 1.5 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth id="login-nombre" name="nombre" label="Nombre de usuario"
              value={form.nombre} onChange={handleChange} margin="dense"
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} /></InputAdornment>,
              }}
              sx={{
                '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' }, '&.Mui-focused fieldset': { borderColor: '#e94560' } },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#e94560' },
                '& input:-webkit-autofill': { WebkitBoxShadow: '0 0 0 100px #16213e inset', WebkitTextFillColor: '#fff' },
              }}
            />

            <TextField
              fullWidth id="login-password" name="password" label="Contraseña"
              type={showPass ? 'text' : 'password'} value={form.password} onChange={handleChange} margin="dense"
              size="small"
              InputProps={{
                startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPass(!showPass)} edge="end" sx={{ color: 'rgba(255,255,255,0.4)' }} size="small">
                      {showPass ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' }, '&.Mui-focused fieldset': { borderColor: '#e94560' } },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#e94560' },
                '& input:-webkit-autofill': { WebkitBoxShadow: '0 0 0 100px #16213e inset', WebkitTextFillColor: '#fff' },
              }}
            />

            <Button
              fullWidth type="submit" variant="contained" size="medium" disabled={loading}
              id="login-submit-btn"
              sx={{
                mt: 2, py: 1, borderRadius: 1.5,
                background: 'linear-gradient(135deg, #e94560, #c62a47)',
                fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.5px',
                boxShadow: '0 4px 16px rgba(233,69,96,0.4)',
                '&:hover': { background: 'linear-gradient(135deg, #ff5c74, #e94560)', boxShadow: '0 6px 22px rgba(233,69,96,0.5)' },
                '&:disabled': { background: 'rgba(255,255,255,0.1)' },
              }}
            >
              {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Iniciar Sesión'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
