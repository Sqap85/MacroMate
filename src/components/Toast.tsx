import { Snackbar, Box, Typography, IconButton } from '@mui/material';
import type { AlertColor } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';

interface ToastProps {
  open: boolean;
  message: string;
  severity: AlertColor;
  onClose: () => void;
}

const CONFIG: Record<AlertColor, { icon: React.ElementType; color: string; bg: string; accent: string }> = {
  success: { icon: CheckCircleOutlineIcon, color: '#16a34a', bg: '#f0fdf4', accent: '#16a34a' },
  error:   { icon: ErrorOutlineIcon,       color: '#dc2626', bg: '#fef2f2', accent: '#dc2626' },
  warning: { icon: WarningAmberIcon,       color: '#d97706', bg: '#fffbeb', accent: '#d97706' },
  info:    { icon: InfoOutlinedIcon,        color: '#0284c7', bg: '#f0f9ff', accent: '#0284c7' },
};

export function Toast({ open, message, severity, onClose }: Readonly<ToastProps>) {
  const { icon: Icon, color, bg, accent } = CONFIG[severity];

  return (
    <Snackbar
      open={open}
      autoHideDuration={3500}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ bottom: { xs: 24, sm: 32 } }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          minWidth: 280,
          maxWidth: 420,
          px: 2,
          py: 1.25,
          borderRadius: '12px',
          bgcolor: '#fff',
          border: '1px solid',
          borderColor: 'rgba(0,0,0,0.08)',
          borderLeft: `4px solid ${accent}`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <Box
          sx={{
            width: 28, height: 28, borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: bg, flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 16, color }} />
        </Box>

        <Typography
          variant="body2"
          sx={{ flex: 1, fontWeight: 500, color: 'text.primary', lineHeight: 1.4 }}
        >
          {message}
        </Typography>

        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: 'text.disabled', p: 0.25, flexShrink: 0, '&:hover': { color: 'text.secondary' } }}
        >
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>
    </Snackbar>
  );
}
