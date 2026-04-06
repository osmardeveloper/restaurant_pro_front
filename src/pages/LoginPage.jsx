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
        p: 2,
      }}
    >
      <Box sx={{ position: 'fixed', top: '-10%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(233,69,96,0.15)', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <Box sx={{ position: 'fixed', bottom: '-10%', left: '-5%', width: 350, height: 350, borderRadius: '50%', background: 'rgba(15,52,96,0.6)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <Card
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 4,
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #e94560, #c62a47)', mb: 2, boxShadow: '0 8px 32px rgba(233,69,96,0.4)' }}>
              <RestaurantIcon sx={{ color: '#fff', fontSize: 36 }} />
            </Box>
            <Typography variant="h4" sx={{ color: '#fff', fontWeight: 700, letterSpacing: '-0.5px' }}>
              RestaurantPro
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
              Inicia sesión para continuar
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              fullWidth id="login-nombre" name="nombre" label="Nombre de usuario"
              value={form.nombre} onChange={handleChange} margin="normal"
              InputProps={{
                startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: 'rgba(255,255,255,0.4)' }} /></InputAdornment>,
              }}
              sx={{
                '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' }, '&.Mui-focused fieldset': { borderColor: '#e94560' } },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#e94560' },
                '& input:-webkit-autofill': { WebkitBoxShadow: '0 0 0 100px #16213e inset', WebkitTextFillColor: '#fff' },
              }}
            />

            <TextField
              fullWidth id="login-password" name="password" label="Contraseña"
              type={showPass ? 'text' : 'password'} value={form.password} onChange={handleChange} margin="normal"
              InputProps={{
                startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'rgba(255,255,255,0.4)' }} /></InputAdornment>,
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPass(!showPass)} edge="end" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                      {showPass ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.4)' }, '&.Mui-focused fieldset': { borderColor: '#e94560' } },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' },
                '& .MuiInputLabel-root.Mui-focused': { color: '#e94560' },
                '& input:-webkit-autofill': { WebkitBoxShadow: '0 0 0 100px #16213e inset', WebkitTextFillColor: '#fff' },
              }}
            />

            <Button
              fullWidth type="submit" variant="contained" size="large" disabled={loading}
              id="login-submit-btn"
              sx={{
                mt: 3, py: 1.5, borderRadius: 2,
                background: 'linear-gradient(135deg, #e94560, #c62a47)',
                fontWeight: 700, fontSize: '1rem', letterSpacing: '0.5px',
                boxShadow: '0 4px 20px rgba(233,69,96,0.4)',
                '&:hover': { background: 'linear-gradient(135deg, #ff5c74, #e94560)', boxShadow: '0 6px 28px rgba(233,69,96,0.5)' },
                '&:disabled': { background: 'rgba(255,255,255,0.1)' },
              }}
            >
              {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Iniciar Sesión'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;
