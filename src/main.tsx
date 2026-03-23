import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';

// Material UI teması
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#18181b',
      light: '#71717a',
      dark: '#09090b',
      contrastText: '#fff',
    },
    secondary: {
      main: '#3f3f46',
      light: '#71717a',
      dark: '#27272a',
      contrastText: '#fff',
    },
    background: {
      default: 'transparent',
      paper: '#ffffff',
    },
    text: {
      primary: '#09090b',
      secondary: '#6b7280',
    },
    grey: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800 },
    h2: { fontWeight: 800 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
    button: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04)',
    '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.03)',
    '0 20px 25px -5px rgba(0,0,0,0.08), 0 10px 10px -5px rgba(0,0,0,0.02)',
    '0 25px 50px -12px rgba(0,0,0,0.12)',
    '0 25px 50px -12px rgba(0,0,0,0.15)',
    '0 25px 50px -12px rgba(0,0,0,0.18)',
    '0 25px 50px -12px rgba(0,0,0,0.20)',
    '0 25px 50px -12px rgba(0,0,0,0.22)',
    '0 25px 50px -12px rgba(0,0,0,0.24)',
    '0 25px 50px -12px rgba(0,0,0,0.26)',
    '0 25px 50px -12px rgba(0,0,0,0.28)',
    '0 25px 50px -12px rgba(0,0,0,0.30)',
    '0 25px 50px -12px rgba(0,0,0,0.32)',
    '0 25px 50px -12px rgba(0,0,0,0.34)',
    '0 25px 50px -12px rgba(0,0,0,0.36)',
    '0 25px 50px -12px rgba(0,0,0,0.38)',
    '0 25px 50px -12px rgba(0,0,0,0.40)',
    '0 25px 50px -12px rgba(0,0,0,0.42)',
    '0 25px 50px -12px rgba(0,0,0,0.44)',
    '0 25px 50px -12px rgba(0,0,0,0.46)',
    '0 25px 50px -12px rgba(0,0,0,0.48)',
    '0 25px 50px -12px rgba(0,0,0,0.50)',
    '0 25px 50px -12px rgba(0,0,0,0.52)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 10,
          fontWeight: 600,
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)',
          '&:hover': {
            background: 'linear-gradient(135deg, #09090b 0%, #27272a 100%)',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.24)',
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'translateY(0)' },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(0,0,0,0.07)',
          backgroundImage: 'none',
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: 16,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: '#ffffff',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#18181b',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#18181b',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: 'rgba(0,0,0,0.06)',
        },
        bar: {
          borderRadius: 8,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 20,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 1px 20px rgba(0,0,0,0.06)',
          color: '#09090b',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '8px !important',
          fontWeight: 500,
        },
      },
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
