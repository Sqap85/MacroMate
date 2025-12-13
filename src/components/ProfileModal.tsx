import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Box,
  IconButton,
  Stack,
  Alert,
  Divider,
  Typography,
  Avatar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../contexts/AuthContext';
import { useFormik } from 'formik';
import * as Yup from 'yup';

/**
 * Profile Modal
 * Kullanıcı profil bilgilerini görüntüleme ve güncelleme
 */

interface ProfileModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export function ProfileModal({ open, onClose, onSuccess }: ProfileModalProps) {
  const { currentUser, updateUserProfile, updateUserPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  // Formik for display name
  const profileFormik = useFormik({
    initialValues: {
      displayName: currentUser?.displayName || '',
    },
    validationSchema: Yup.object({
      displayName: Yup.string()
        .required('İsim boş olamaz')
        .trim()
        .min(1, 'İsim en az 1 karakter olmalı'),
    }),
    enableReinitialize: true,
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: async (values) => {
      setLoading(true);
      setError('');

      try {
        await updateUserProfile(values.displayName);
        setLoading(false);
        
        if (onSuccess) {
          onSuccess('✅ İsim başarıyla güncellendi!');
        }
        
        setIsClosing(true);
        setTimeout(() => {
          onClose();
        }, 500);
      } catch (err: any) {
        console.error('Profile update error:', err);
        setError(err.message || 'Profil güncellenirken hata oluştu');
        setLoading(false);
      }
    },
  });

  // Formik for password change
  const passwordFormik = useFormik({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema: Yup.object({
      currentPassword: Yup.string()
        .required('Mevcut şifre zorunlu')
        .min(8, 'En az 8 karakter olmalı'),
      newPassword: Yup.string()
        .required('Yeni şifre zorunlu')
        .min(8, 'Şifre en az 8 karakter olmalı')
        .max(128, 'Şifre en fazla 128 karakter olabilir')
        .matches(/[a-z]/, 'En az bir küçük harf içermelidir')
        .matches(/[A-Z]/, 'En az bir büyük harf içermelidir')
        .matches(/[0-9]/, 'En az bir rakam içermelidir')
        .matches(/[@$!%*?&#.]/, 'En az bir özel karakter içermelidir (@$!%*?&#.)')
        .notOneOf([Yup.ref('currentPassword')], 'Yeni şifre mevcut şifre ile aynı olamaz'),
      confirmPassword: Yup.string()
        .required('Şifre tekrarı zorunlu')
        .oneOf([Yup.ref('newPassword')], 'Şifreler eşleşmiyor'),
    }),
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: async (values) => {
      setLoading(true);

      try {
        await updateUserPassword(values.currentPassword, values.newPassword);
        setLoading(false);
        
        if (onSuccess) {
          onSuccess('✅ Şifre başarıyla güncellendi!');
        }
        
        passwordFormik.resetForm();
        setIsClosing(true);
        setTimeout(() => {
          onClose();
        }, 500);
      } catch (err: any) {
        console.error('Password update error:', err);
        
        // Firebase hatalarını Formik field error olarak göster
        if (err.code === 'auth/wrong-password' || 
            err.code === 'auth/invalid-credential' || 
            err.code === 'auth/invalid-login-credentials') {
          passwordFormik.setFieldError('currentPassword', 'Mevcut şifre hatalı. Lütfen tekrar deneyin.');
        } else if (err.code === 'auth/weak-password') {
          passwordFormik.setFieldError('newPassword', 'Yeni şifre çok zayıf. En az 6 karakter kullanın.');
        } else if (err.code === 'auth/requires-recent-login') {
          setError('⚠️ Güvenlik nedeniyle çıkış yapıp tekrar giriş yapmanız gerekiyor.');
        } else if (err.code === 'auth/too-many-requests') {
          setError('⏱️ Çok fazla deneme. Lütfen birkaç dakika sonra tekrar deneyin.');
        } else if (err.code === 'auth/network-request-failed') {
          setError('🌐 Bağlantı hatası. İnternet bağlantınızı kontrol edin.');
        } else {
          setError('❌ Şifre güncellenirken bir hata oluştu. Lütfen tekrar deneyin.');
        }
        
        setLoading(false);
      }
    },
  });

  // Modal açıldığında state'leri reset et
  useEffect(() => {
    if (open) {
      profileFormik.resetForm();
      passwordFormik.resetForm();
      setError('');
      setLoading(false);
      setIsClosing(false);
    }
  }, [open]);

  const handleClose = () => {
    if (isClosing) return;
    profileFormik.resetForm();
    passwordFormik.resetForm();
    setError('');
    onClose();
  };

  // Email provider check (Google login kullanıcıları şifre değiştiremez)
  const isEmailProvider = currentUser?.providerData.some(
    (provider) => provider.providerId === 'password'
  );

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      aria-labelledby="profile-dialog-title"
      disableEscapeKeyDown={isClosing}
    >
      <DialogTitle id="profile-dialog-title">
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <PersonIcon color="primary" />
            <Typography variant="h6">Profil Ayarları</Typography>
          </Box>
          <IconButton 
            onClick={handleClose} 
            size="small"
            aria-label="Kapat"
            disabled={isClosing}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} mt={1}>
          {/* User Avatar & Info */}
          <Box display="flex" alignItems="center" gap={2}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: 'primary.main',
                fontSize: '2rem',
              }}
            >
              {currentUser?.displayName?.[0]?.toUpperCase() || currentUser?.email?.[0]?.toUpperCase() || 'U'}
            </Avatar>
            <Box>
              <Typography variant="body1" fontWeight="medium">
                {currentUser?.email}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {currentUser?.emailVerified ? '✅ Email doğrulandı' : '⚠️ Email doğrulanmamış'}
              </Typography>
            </Box>
          </Box>

          <Divider />

          {/* Display Name Update */}
          <Box component="form" onSubmit={profileFormik.handleSubmit}>
            <Typography variant="subtitle2" gutterBottom fontWeight="medium">
              İsim Güncelle
            </Typography>
            <TextField
              fullWidth
              label="İsim"
              name="displayName"
              value={profileFormik.values.displayName}
              onChange={profileFormik.handleChange}
              error={profileFormik.touched.displayName && Boolean(profileFormik.errors.displayName)}
              helperText={profileFormik.touched.displayName && profileFormik.errors.displayName}
              disabled={loading}
              margin="normal"
            />
            <Button
              type="submit"
              variant="contained"
              disabled={loading || profileFormik.values.displayName === currentUser?.displayName}
              fullWidth
              sx={{ mt: 1 }}
            >
              İsmi Güncelle
            </Button>
          </Box>

          {/* Password Update - Only for email/password users */}
          {isEmailProvider ? (
            <>
              <Divider />
              <Box component="form" onSubmit={passwordFormik.handleSubmit}>
                <Typography variant="subtitle2" gutterBottom fontWeight="medium">
                  Şifre Değiştir
                </Typography>
                <TextField
                  fullWidth
                  type="password"
                  label="Mevcut Şifre"
                  name="currentPassword"
                  value={passwordFormik.values.currentPassword}
                  onChange={passwordFormik.handleChange}
                  error={passwordFormik.touched.currentPassword && Boolean(passwordFormik.errors.currentPassword)}
                  helperText={passwordFormik.touched.currentPassword && passwordFormik.errors.currentPassword}
                  disabled={loading}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  type="password"
                  label="Yeni Şifre"
                  name="newPassword"
                  value={passwordFormik.values.newPassword}
                  onChange={passwordFormik.handleChange}
                  error={passwordFormik.touched.newPassword && Boolean(passwordFormik.errors.newPassword)}
                  helperText={passwordFormik.touched.newPassword && passwordFormik.errors.newPassword}
                  disabled={loading}
                  margin="normal"
                />
                <TextField
                  fullWidth
                  type="password"
                  label="Yeni Şifre (Tekrar)"
                  name="confirmPassword"
                  value={passwordFormik.values.confirmPassword}
                  onChange={passwordFormik.handleChange}
                  error={passwordFormik.touched.confirmPassword && Boolean(passwordFormik.errors.confirmPassword)}
                  helperText={passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword}
                  disabled={loading}
                  margin="normal"
                />
                
                {/* Firebase Hata Mesajı - Şifre alanlarının altında */}
                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}
                
                <Button
                  type="submit"
                  variant="outlined"
                  disabled={loading || !passwordFormik.values.currentPassword || !passwordFormik.values.newPassword || !passwordFormik.values.confirmPassword}
                  fullWidth
                  sx={{ mt: 1 }}
                >
                  Şifreyi Güncelle
                </Button>
              </Box>
            </>
          ) : (
            <Alert severity="info">
              Google ile giriş yaptınız. Şifre değiştiremezsiniz.
            </Alert>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
