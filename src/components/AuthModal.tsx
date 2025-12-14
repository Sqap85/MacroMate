import { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
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
  DialogTitle,
  DialogContent,
  DialogActions,
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
  const { signup, login, loginWithGoogle, continueAsGuest, resetPassword } = useAuth();
  const [tabValue, setTabValue] = useState(0); // 0: Login, 1: Signup
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);

  const isLogin = tabValue === 0;

  // Validation schema
  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Geçersiz e-posta adresi')
      .required('E-posta adresi zorunlu')
      .matches(
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Geçerli bir e-posta adresi girin'
      ),
    password: isLogin
      ? Yup.string().required('Şifre zorunlu') // Login: sadece boş olmasın
      : Yup.string() // Signup: güçlü şifre kuralları
          .required('Şifre zorunlu')
          .min(8, 'Şifre en az 8 karakter olmalı')
          .max(128, 'Şifre en fazla 128 karakter olabilir')
          .matches(/[a-z]/, 'En az bir küçük harf içermelidir')
          .matches(/[A-Z]/, 'En az bir büyük harf içermelidir')
          .matches(/[0-9]/, 'En az bir rakam içermelidir')
          .matches(/[@$!%*?&#.]/, 'En az bir özel karakter içermelidir (@$!%*?&#.)'),
    displayName: !isLogin
      ? Yup.string()
          .required('İsim zorunlu')
          .min(2, 'İsim en az 2 karakter olmalı')
          .max(50, 'İsim en fazla 50 karakter olabilir')
          .matches(/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/, 'Sadece harf ve boşluk kullanabilirsiniz')
      : Yup.string(),
    confirmPassword: !isLogin
      ? Yup.string()
          .oneOf([Yup.ref('password')], 'Şifreler eşleşmiyor')
          .required('Şifre tekrarı zorunlu')
      : Yup.string(),
  });

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      displayName: '',
      confirmPassword: '',
    },
    validationSchema,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: async (values) => {
      try {
        setError('');
        setLoading(true);
        if (isLogin) {
          await login(values.email, values.password);
        } else {
          await signup(values.email, values.password, values.displayName);
        }
        onClose();
        formik.resetForm();
      } catch (err: any) {
        console.error('Auth error:', err);
        // Wrong password için özel mesaj
        if (isLogin && err.code === 'auth/wrong-password') {
          setError('Hatalı şifre. Lütfen tekrar deneyin veya "Şifremi Unuttum" linkini kullanın.');
          setLoading(false);
          return;
        }
        // Firebase hata mesajlarını Türkçeleştir (üstte handle edilmediyse)
        const errorMessages: Record<string, string> = {
          'auth/email-already-in-use': 'Bu e-posta adresi zaten kullanımda',
          'auth/invalid-email': 'Geçersiz e-posta adresi',
          'auth/user-not-found': 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı. Lütfen kayıt olun.',
          'auth/wrong-password': 'Hatalı şifre. "Şifremi Unuttum" linkini kullanabilirsiniz.',
          'auth/weak-password': 'Şifre çok zayıf (en az 6 karakter)',
          'auth/too-many-requests': 'Çok fazla deneme. Lütfen birkaç dakika sonra tekrar deneyin.',
          'auth/network-request-failed': 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.',
          'auth/invalid-credential': 'E-posta veya şifre hatalı. Lütfen kontrol edip tekrar deneyin.',
        };
        setError(errorMessages[err.code] || 'Bir hata oluştu. Lütfen tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    },
  });

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      await loginWithGoogle();
      onClose();
      formik.resetForm();
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
    formik.resetForm();
  };

  const handleClose = () => {
  formik.resetForm();
  setError('');
  setShowPassword(false);
  setForgotPasswordOpen(false);
  setForgotPasswordEmail('');
  setForgotPasswordSuccess(false);
  onClose();
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail) {
      setError('Lütfen e-posta adresinizi girin');
      return;
    }

    // Email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(forgotPasswordEmail)) {
      setError('Geçerli bir e-posta adresi girin');
      return;
    }

    try {
      setError('');
      setLoading(true);
      await resetPassword(forgotPasswordEmail);
      setForgotPasswordSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      
      const errorMessages: Record<string, string> = {
        'auth/user-not-found': 'Bu e-posta adresi ile kayıtlı kullanıcı bulunamadı',
        'auth/invalid-email': 'Geçersiz e-posta adresi',
        'auth/too-many-requests': 'Çok fazla deneme. Lütfen daha sonra tekrar deneyin',
      };
      
      setError(errorMessages[err.code] || 'Şifre sıfırlama emaili gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseForgotPassword = () => {
    setForgotPasswordOpen(false);
    setForgotPasswordEmail('');
    setForgotPasswordSuccess(false);
    setError('');
  };

  return (
    <>
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      aria-labelledby="auth-dialog-title"
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
            aria-label="Kapat"
          >
            <CloseIcon />
          </IconButton>
          
          <Typography 
            id="auth-dialog-title" 
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


        <Box component="form" onSubmit={formik.handleSubmit}>
          {!isLogin && (
            <TextField
              fullWidth
              label="Adınız"
              name="displayName"
              value={formik.values.displayName}
              onChange={formik.handleChange}
              error={formik.touched.displayName && Boolean(formik.errors.displayName)}
              helperText={formik.touched.displayName && formik.errors.displayName}
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
            name="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
            margin="normal"
            autoFocus={isLogin}
            disabled={loading}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />

          <TextField
            fullWidth
            label="Şifre"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formik.values.password}
            onChange={formik.handleChange}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={formik.touched.password && formik.errors.password}
            margin="normal"
            disabled={loading}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            slotProps={{
              input: {
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
              },
            }}
          />

          {isLogin && (
            <Box textAlign="right" mt={1}>
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setForgotPasswordOpen(true);
                  setForgotPasswordEmail(formik.values.email);
                }}
                sx={{ 
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  p: 0.5,
                }}
              >
                Şifremi unuttum?
              </Button>
            </Box>
          )}

          {!isLogin && (
            <TextField
              fullWidth
              label="Şifre Tekrar"
              type={showPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formik.values.confirmPassword}
              onChange={formik.handleChange}
              error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
              helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
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
              sx={{ fontWeight: 600 }}
            >
              {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
            </Button>
          </Typography>
        </Box>
      </Paper>
    </Dialog>

    {/* Forgot Password Dialog */}
    <Dialog
      open={forgotPasswordOpen}
      onClose={handleCloseForgotPassword}
      maxWidth="xs"
      fullWidth
    >
      <DialogTitle>Şifremi Unuttum</DialogTitle>
      <DialogContent>
        {forgotPasswordSuccess ? (
          <Alert severity="success" sx={{ mt: 1 }}>
            Şifre sıfırlama linki e-posta adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.
          </Alert>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
              E-posta adresinizi girin, size şifre sıfırlama linki gönderelim.
            </Typography>
            <TextField
              fullWidth
              label="E-posta"
              type="email"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              disabled={loading}
              autoFocus
              sx={{ mb: 2 }}
            />
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        {forgotPasswordSuccess ? (
          <Button onClick={handleCloseForgotPassword} variant="contained">
            Tamam
          </Button>
        ) : (
          <>
            <Button onClick={handleCloseForgotPassword} disabled={loading}>
              İptal
            </Button>
            <Button 
              onClick={handleForgotPassword} 
              variant="contained"
              disabled={loading || !forgotPasswordEmail}
            >
              {loading ? 'Gönderiliyor...' : 'Gönder'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  </>
  );
}