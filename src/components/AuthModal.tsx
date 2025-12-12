import { useState } from 'react';
import {
  Dialog,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Divider,
  IconButton,
  Tab,
  Tabs,
  InputAdornment,
  Paper,
  Stack,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import GoogleIcon from '@mui/icons-material/Google';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../contexts/AuthContext';

/**
 * Authentication Modal
 * Kullanıcı kayıt ve giriş işlemleri
 */

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { signup, login, loginWithGoogle, continueAsGuest } = useAuth();
  const [tabValue, setTabValue] = useState(0); // 0: Login, 1: Signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isLogin = tabValue === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validasyon
    if (!email || !password) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    if (!isLogin) {
      if (!displayName) {
        setError('Lütfen adınızı girin');
        return;
      }
      if (password !== confirmPassword) {
        setError('Şifreler eşleşmiyor');
        return;
      }
      if (password.length < 6) {
        setError('Şifre en az 6 karakter olmalı');
        return;
      }
    }

    try {
      setError('');
      setLoading(true);

      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, displayName);
      }

      // Başarılı - Modal'ı kapat
      onClose();
      resetForm();
    } catch (err: any) {
      console.error('Auth error:', err);
      
      // Firebase hata mesajlarını Türkçeleştir
      const errorMessages: Record<string, string> = {
        'auth/email-already-in-use': 'Bu e-posta adresi zaten kullanımda',
        'auth/invalid-email': 'Geçersiz e-posta adresi',
        'auth/user-not-found': 'Kullanıcı bulunamadı',
        'auth/wrong-password': 'Hatalı şifre',
        'auth/weak-password': 'Şifre çok zayıf (en az 6 karakter)',
        'auth/too-many-requests': 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin',
        'auth/network-request-failed': 'Bağlantı hatası. İnternet bağlantınızı kontrol edin',
        'auth/invalid-credential': 'E-posta veya şifre hatalı',
      };

      setError(errorMessages[err.code] || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      onClose();
      resetForm();
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError('Google ile giriş başarısız. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    continueAsGuest();
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setConfirmPassword('');
    setError('');
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          p: 0.5,
        }
      }}
    >
      <Paper sx={{ borderRadius: 2.5, p: 4 }}>
        {/* Header */}
        <Box textAlign="center" mb={4}>
          <IconButton 
            onClick={handleClose} 
            sx={{ position: 'absolute', right: 16, top: 16 }}
          >
            <CloseIcon />
          </IconButton>
          
          <Typography 
            variant="h4" 
            fontWeight="bold" 
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}
          >
            MacroMate
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Kalori ve makrolarınızı takip edin
          </Typography>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => {
            setTabValue(newValue);
            setError('');
          }}
          sx={{ 
            mb: 3,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 600,
            }
          }}
          variant="fullWidth"
        >
          <Tab label="Giriş Yap" />
          <Tab label="Kayıt Ol" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          {!isLogin && (
            <TextField
              fullWidth
              label="Adınız"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              margin="normal"
              autoFocus={!isLogin}
              disabled={loading}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          )}

          <TextField
            fullWidth
            label="E-posta"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            autoFocus={isLogin}
            disabled={loading}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />

          <TextField
            fullWidth
            label="Şifre"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            disabled={loading}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {!isLogin && (
            <TextField
              fullWidth
              label="Şifre Tekrar"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              disabled={loading}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ 
              mt: 3, 
              mb: 2, 
              borderRadius: 2,
              py: 1.5,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a4190 100%)',
              }
            }}
            disabled={loading}
          >
            {loading ? 'Lütfen bekleyin...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }}>
          <Chip label="veya" size="small" />
        </Divider>

        {/* Social Login */}
        <Stack spacing={2}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin}
            disabled={loading}
            sx={{ 
              borderRadius: 2,
              py: 1.2,
              textTransform: 'none',
              borderColor: '#e0e0e0',
              '&:hover': {
                borderColor: '#b0b0b0',
                bgcolor: '#f5f5f5',
              }
            }}
          >
            Google ile devam et
          </Button>

          <Button
            fullWidth
            variant="outlined"
            size="large"
            startIcon={<PersonOutlineIcon />}
            onClick={handleGuestLogin}
            disabled={loading}
            sx={{ 
              borderRadius: 2,
              py: 1.2,
              textTransform: 'none',
              borderColor: '#e0e0e0',
              color: 'text.secondary',
              '&:hover': {
                borderColor: '#b0b0b0',
                bgcolor: '#f5f5f5',
              }
            }}
          >
            Misafir olarak devam et
          </Button>
        </Stack>

        <Box textAlign="center" mt={3}>
          <Typography variant="caption" color="text.secondary">
            {isLogin ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}{' '}
            <Button
              size="small"
              onClick={() => setTabValue(isLogin ? 1 : 0)}
              disabled={loading}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
            </Button>
          </Typography>
        </Box>
      </Paper>
    </Dialog>
  );
}
