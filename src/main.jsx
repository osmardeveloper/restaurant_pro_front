// ============================================================
// src/main.jsx — Punto de entrada de la aplicación React
// ============================================================
import { StrictMode }  from 'react';
import { createRoot }  from 'react-dom/client';
import { createTheme, ThemeProvider, CssBaseline, GlobalStyles } from '@mui/material';
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
    h4: { fontWeight: 800, lineHeight: 1.15 },
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
          minHeight: 40,
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 40,
          minHeight: 40,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiTextField: {
      defaultProps: {
        fullWidth: false,
      },
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles
        styles={(theme) => ({
          'html, body, #root': {
            minWidth: 0,
            width: '100%',
            minHeight: '100%',
          },
          body: {
            overflowX: 'hidden',
          },
          '#root': {
            display: 'flex',
            flexDirection: 'column',
          },
          'img, video, canvas, svg': {
            maxWidth: '100%',
          },
          '.app-main-content': {
            minWidth: 0,
            width: '100%',
          },
          '.MuiPaper-root, .MuiCard-root': {
            maxWidth: '100%',
          },
          '.MuiTableContainer-root': {
            width: '100%',
            maxWidth: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          },
          '.MuiTable-root': {
            minWidth: 680,
          },
          '.MuiDataGrid-root': {
            minWidth: 0,
            width: '100%',
          },
          '.MuiDataGrid-main': {
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
          },
          '.MuiDataGrid-columnHeaderTitle, .MuiDataGrid-cell': {
            overflowWrap: 'anywhere',
          },
          '.MuiTabs-root': {
            maxWidth: '100%',
          },
          '.MuiTabs-scroller': {
            overflowX: 'auto !important',
            WebkitOverflowScrolling: 'touch',
          },
          '.MuiChip-root': {
            maxWidth: '100%',
          },
          '.MuiChip-label': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
          '.MuiAutocomplete-root[style]': {
            width: '100% !important',
            minWidth: '0 !important',
          },
          '.MuiDialogContent-root [style*="min-width"]': {
            minWidth: '0 !important',
          },
          [theme.breakpoints.down('md')]: {
            '.MuiTypography-h4': {
              fontSize: '1.75rem',
            },
            '.MuiTypography-h5': {
              fontSize: '1.35rem',
            },
            '.MuiTypography-h6': {
              fontSize: '1.1rem',
            },
            '.MuiDialog-paper': {
              width: 'calc(100% - 24px) !important',
              maxWidth: 'calc(100% - 24px) !important',
              maxHeight: 'calc(100dvh - 24px) !important',
              margin: '12px !important',
              borderRadius: '14px !important',
            },
            '.MuiDialogContent-root': {
              padding: '16px !important',
            },
            '.MuiDialogActions-root': {
              padding: '12px 16px 16px !important',
              flexWrap: 'wrap',
              gap: 8,
            },
            '.MuiDialogActions-root .MuiButton-root': {
              flex: '1 1 140px',
            },
            '.MuiCardActions-root > *': {
              minWidth: 0,
            },
            '.MuiTable-root': {
              minWidth: 760,
            },
          },
          [theme.breakpoints.down('sm')]: {
            '.MuiButton-root': {
              minHeight: 44,
            },
            '.MuiIconButton-root': {
              minWidth: 44,
              minHeight: 44,
            },
            '.MuiFormControl-root, .MuiTextField-root': {
              maxWidth: '100%',
            },
            '.MuiSnackbar-root': {
              left: '12px !important',
              right: '12px !important',
              width: 'auto !important',
            },
            '.MuiDataGrid-footerContainer': {
              minHeight: 64,
              alignItems: 'flex-start',
            },
            '.MuiTable-root': {
              minWidth: 820,
            },
          },
        })}
      />
      <App />
    </ThemeProvider>
  </StrictMode>
);
