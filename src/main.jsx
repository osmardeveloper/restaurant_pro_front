// ============================================================
// src/main.jsx — Punto de entrada de la aplicación React
// ============================================================
import { StrictMode }  from 'react';
import { createRoot }  from 'react-dom/client';
import { createTheme, ThemeProvider, CssBaseline } from '@mui/material';
import App from './App.jsx';
import './index.css';

// ── Tema personalizado de MUI ────────────────────────────────
const theme = createTheme({
  palette: {
    primary: {
      main:  '#0f3460',
      light: '#1a4a7a',
      dark:  '#0a2440',
    },
    secondary: {
      main: '#e94560',
    },
    background: {
      default: '#f0f2f5',
      paper:   '#ffffff',
    },
  },
  typography: {
    fontFamily: "'Inter', 'Roboto', sans-serif",
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>
);
