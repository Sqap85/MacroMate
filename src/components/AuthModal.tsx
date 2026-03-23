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
import LockResetIcon from '@mui/icons-material/LockReset';
import { useAuth } from '../contexts/AuthContext';

/**
 * Authentication Modal
 * Kullanıcı kayıt ve giriş işlemleri
 */

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export function AuthModal({ open, onClose }: Readonly<AuthModalProps>) {
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
          .matches(/[a-zA-Z]/, 'En az bir harf içermelidir')
          .matches(/\d/, 'En az bir rakam içermelidir'),
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
          await signup(values.email, values.password, '');
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

  const darkFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      bgcolor: 'rgba(255,255,255,0.06)',
      color: '#fff',
      '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
      '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
      '&.Mui-focused fieldset': { borderColor: '#18181b', borderWidth: 2 },
    },
    '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.45)' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#a8b8ff' },
    '& .MuiFormHelperText-root': { color: '#fca5a5' },
    '& input': { color: '#fff' },
  };

  return (
    <>
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="auth-dialog-title"
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflowY: 'auto',
          maxHeight: '95vh',
          background: 'linear-gradient(145deg, #09090b 0%, #18181b 60%, #27272a 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
        }
      }}
    >
      <Box sx={{ p: { xs: 3, sm: 4 }, position: 'relative' }}>
        {/* Close button */}
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            position: 'absolute', right: 16, top: 16,
            color: 'rgba(255,255,255,0.5)',
            bgcolor: 'rgba(255,255,255,0.06)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.12)', color: '#fff' },
          }}
          aria-label="Kapat"
        >
          <CloseIcon fontSize="small" />
        </IconButton>

        {/* Logo + Header */}
        <Box textAlign="center" mb={4}>
          <Typography
            id="auth-dialog-title"
            variant="h5"
            fontWeight={800}
            sx={{
              background: 'linear-gradient(135deg, #ffffff 0%, #a1a1aa 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 0.5,
            }}
          >
            MacroMate
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem' }}>
            Kalori ve makrolarınızı takip edin
          </Typography>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => { setTabValue(newValue); setError(''); }}
          variant="fullWidth"
          sx={{
            mb: 3,
            bgcolor: 'rgba(255,255,255,0.06)',
            borderRadius: 2,
            p: 0.5,
            minHeight: 38,
            '& .MuiTabs-indicator': {
              height: '100%', borderRadius: 1.5,
              background: 'linear-gradient(135deg, #18181b, #3f3f46)',
              zIndex: 0,
            },
            '& .MuiTab-root': {
              minHeight: 34, fontSize: '0.85rem', fontWeight: 600, zIndex: 1,
              color: 'rgba(255,255,255,0.45)',
              transition: 'color 0.2s',
            },
            '& .Mui-selected': { color: '#fff !important' },
          }}
        >
          <Tab label="Giriş Yap" />
          <Tab label="Kayıt Ol" />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2, bgcolor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5', '& .MuiAlert-icon': { color: '#f87171' } }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={formik.handleSubmit}>
          <TextField
            fullWidth label="E-posta" type="email" name="email"
            value={formik.values.email} onChange={formik.handleChange}
            error={formik.touched.email && Boolean(formik.errors.email)}
            helperText={formik.touched.email && formik.errors.email}
            margin="dense" autoFocus disabled={loading}
            sx={darkFieldSx}
          />
          <TextField
            fullWidth label="Şifre" type={showPassword ? 'text' : 'password'} name="password"
            value={formik.values.password} onChange={formik.handleChange}
            error={formik.touched.password && Boolean(formik.errors.password)}
            helperText={formik.touched.password && formik.errors.password}
            margin="dense" disabled={loading}
            sx={darkFieldSx}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: 'rgba(255,255,255,0.4)' }}>
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {isLogin && (
            <Box textAlign="right" mt={0.5}>
              <Button
                variant="text" size="small"
                onClick={() => { setForgotPasswordOpen(true); setForgotPasswordEmail(formik.values.email); }}
                sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)', '&:hover': { color: 'rgba(255,255,255,0.9)' } }}
              >
                Şifremi unuttum?
              </Button>
            </Box>
          )}

          {!isLogin && (
            <TextField
              fullWidth label="Şifre Tekrar" type={showPassword ? 'text' : 'password'} name="confirmPassword"
              value={formik.values.confirmPassword} onChange={formik.handleChange}
              error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
              helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
              margin="dense" disabled={loading}
              sx={darkFieldSx}
            />
          )}

          <Button
            type="submit" fullWidth variant="contained" size="large"
            sx={{ mt: 2.5, mb: 1.5, py: 1.4, borderRadius: 2.5, fontWeight: 700, fontSize: '0.95rem' }}
            disabled={loading}
          >
            {loading ? 'Lütfen bekleyin...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </Button>
        </Box>

        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.08)' }}>
          <Chip label="veya" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', border: '1px solid rgba(255,255,255,0.08)' }} />
        </Divider>

        <Stack spacing={1.5}>
          <Button
            fullWidth variant="outlined" size="large" startIcon={<GoogleIcon />}
            onClick={handleGoogleLogin} disabled={loading}
            sx={{
              py: 1.2, borderRadius: 2.5, fontWeight: 600,
              borderColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)',
              '&:hover': { borderColor: 'rgba(255,255,255,0.3)', bgcolor: 'rgba(255,255,255,0.06)' },
            }}
          >
            Google ile devam et
          </Button>
          <Button
            fullWidth variant="outlined" size="large" startIcon={<PersonOutlineIcon />}
            onClick={handleGuestLogin} disabled={loading}
            sx={{
              py: 1.2, borderRadius: 2.5, fontWeight: 600,
              borderColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.45)',
              '&:hover': { borderColor: 'rgba(255,255,255,0.2)', bgcolor: 'rgba(255,255,255,0.04)' },
            }}
          >
            Misafir olarak devam et
          </Button>
        </Stack>

        <Box textAlign="center" mt={2.5}>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.35)' }}>
            {isLogin ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}{' '}
            <Button
              size="small"
              onClick={() => setTabValue(isLogin ? 1 : 0)}
              disabled={loading}
              sx={{ fontWeight: 700, color: 'rgba(255,255,255,0.85)', p: 0.5, minWidth: 0, '&:hover': { color: '#fff' } }}
            >
              {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
            </Button>
          </Typography>
        </Box>
      </Box>
    </Dialog>

    {/* Forgot Password Dialog */}
    <Dialog
      open={forgotPasswordOpen}
      onClose={handleCloseForgotPassword}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      <DialogTitle sx={{ pb: 1.5, pt: 2.5, px: 3 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2, flexShrink: 0,
            bgcolor: 'rgba(24,24,27,0.06)',
            border: '1.5px solid rgba(24,24,27,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <LockResetIcon sx={{ fontSize: 20, color: 'text.primary' }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>Şifremi Unuttum</Typography>
            <Typography variant="caption" color="text.secondary">Sıfırlama bağlantısı gönderilecek</Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 1 }}>
        {forgotPasswordSuccess ? (
          <Box sx={{ py: 1, px: 1.5, borderRadius: 2, bgcolor: 'rgba(21,128,61,0.06)', border: '1px solid rgba(21,128,61,0.2)' }}>
            <Typography variant="body2" color="#15803d" fontWeight={500}>
              Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Gelen kutunuzu kontrol edin.
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Kayıtlı e-posta adresinizi girin, size sıfırlama bağlantısı gönderelim.
            </Typography>
            <TextField
              fullWidth
              label="E-posta"
              type="email"
              value={forgotPasswordEmail}
              onChange={(e) => setForgotPasswordEmail(e.target.value)}
              disabled={loading}
              autoFocus
              size="small"
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            {error && (
              <Box sx={{ mt: 1.5, px: 1.5, py: 1.25, borderRadius: 2, bgcolor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
                <Typography variant="body2" color="error" fontSize="0.8rem">{error}</Typography>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
        {forgotPasswordSuccess ? (
          <Button
            onClick={handleCloseForgotPassword}
            variant="contained"
            fullWidth
            sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)', boxShadow: 'none' }}
          >
            Tamam
          </Button>
        ) : (
          <>
            <Button
              onClick={handleCloseForgotPassword}
              disabled={loading}
              variant="outlined"
              sx={{ borderRadius: 2, flex: 1, borderColor: 'rgba(0,0,0,0.18)', color: 'text.secondary' }}
            >
              İptal
            </Button>
            <Button
              onClick={handleForgotPassword}
              variant="contained"
              disabled={loading || !forgotPasswordEmail}
              sx={{ borderRadius: 2, flex: 1, background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)', boxShadow: 'none', '&.Mui-disabled': { background: 'rgba(0,0,0,0.12)' } }}
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