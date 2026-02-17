import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  IconButton,
  Stack,
  Alert,
  Divider,
  Typography,
  Avatar,
  Chip,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../config/firebase';
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
  onStartPasswordAdd?: () => void;
}

export function ProfileModal({ open, onClose, onSuccess, onStartPasswordAdd }: ProfileModalProps) {
  const { currentUser, updateUserProfile, addPasswordToAccount, deleteAccount, updateUserPassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteMethod, setDeleteMethod] = useState<'password' | 'google'>('password');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Formik for display name
  const profileFormik = useFormik({
    initialValues: {
      displayName: currentUser?.displayName || '',
    },
    validationSchema: Yup.object({
      displayName: Yup.string()
        .required('İsim boş olamaz')
        .max(30, 'İsim en fazla 30 karakter olabilir'),
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
          onSuccess('İsim başarıyla güncellendi!');
        }
        
      } catch (err: any) {
        console.error('Profile update error:', err);
        setError(err.message || 'Profil güncellenirken hata oluştu');
        setLoading(false);
      }
    },
  });

  // Formik for adding password (for Google users)
  const addPasswordFormik = useFormik({
    initialValues: {
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema: Yup.object({
      newPassword: Yup.string()
        .required('Şifre zorunlu')
        .min(8, 'Şifre en az 8 karakter olmalı')
        .max(128, 'Şifre en fazla 128 karakter olabilir')
        .matches(/[a-z]/, 'En az bir küçük harf içermelidir')
        .matches(/[A-Z]/, 'En az bir büyük harf içermelidir')
        .matches(/[0-9]/, 'En az bir rakam içermelidir')
        .matches(/[@$!%*?&#.]/, 'En az bir özel karakter içermelidir (@$!%*?&#.)'),
      confirmPassword: Yup.string()
        .required('Şifre tekrarı zorunlu')
        .oneOf([Yup.ref('newPassword')], 'Şifreler eşleşmiyor'),
    }),
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: async (values) => {
      setLoading(true);
      setError('');

      // Kullanıcı çıkış yaptıysa işlemi iptal et
      if (!currentUser) {
        setLoading(false);
        setShowAddPassword(false);
        addPasswordFormik.resetForm();
        return;
      }

      try {
        await addPasswordToAccount(values.newPassword);
        await new Promise(r => setTimeout(r, 300)); // state güncellensin
  // Kullanıcıyı tekrar çek (güncel state)
  const user = auth.currentUser || currentUser;
  if (user && !user.emailVerified) {
          setError('Şifre eklendi, ancak giriş yapabilmek için önce emailinizi doğrulamanız gerekir. Lütfen emailinizi kontrol edin.');
          setLoading(false);
          addPasswordFormik.resetForm();
          setShowAddPassword(false);
          return;
        }
        setLoading(false);
        if (onSuccess) {
          onSuccess('Şifre başarıyla eklendi! Artık e-posta ve şifre ile de giriş yapabilirsiniz.');
        }
        addPasswordFormik.resetForm();
        setShowAddPassword(false);
      } catch (err: any) {
        console.error('Add password error:', err);
        if (err.code === 'auth/requires-recent-login') {
          setError('Güvenlik nedeniyle çıkış yapıp tekrar giriş yapmanız gerekiyor.');
        } else if (err.code === 'auth/provider-already-linked') {
          setError('Bu hesaba zaten şifre eklenmiş.');
        } else {
          setError('Şifre eklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        }
        setLoading(false);
      }
    },
  });

  // Formik for password change (for email/password users)
  const passwordFormik = useFormik({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validationSchema: Yup.object({
      currentPassword: Yup.string().required('Mevcut şifre zorunlu'),
      newPassword: Yup.string()
        .required('Yeni şifre zorunlu')
        .min(8, 'Şifre en az 8 karakter olmalı')
        .max(128, 'Şifre en fazla 128 karakter olabilir')
        .matches(/[a-z]/, 'En az bir küçük harf içermelidir')
        .matches(/[A-Z]/, 'En az bir büyük harf içermelidir')
        .matches(/[0-9]/, 'En az bir rakam içermelidir')
        .matches(/[@$!%*?&#.]/, 'En az bir özel karakter içermelidir (@$!%*?&#.)'),
      confirmPassword: Yup.string()
        .required('Şifre tekrarı zorunlu')
        .oneOf([Yup.ref('newPassword')], 'Şifreler eşleşmiyor'),
    }),
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: async (values) => {
      setLoading(true);
      setError('');
      try {
        await updateUserPassword(values.currentPassword, values.newPassword);
        setLoading(false);
        passwordFormik.resetForm();
        if (onSuccess) {
          onSuccess('Şifre başarıyla güncellendi!');
        }
      } catch (err: any) {
        console.error('Password update error:', err);
        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
          setError('Mevcut şifre hatalı.');
        } else if (err.code === 'auth/requires-recent-login') {
          setError('Güvenlik nedeniyle çıkış yapıp tekrar giriş yapmanız gerekiyor.');
        } else if (err.code === 'auth/too-many-requests') {
          setError('Çok fazla deneme. Lütfen birkaç dakika sonra tekrar deneyin.');
        } else {
          setError('Şifre güncellenirken bir hata oluştu.');
        }
        setLoading(false);
      }
    },
  });

  // Modal açıldığında state'leri reset et
  useEffect(() => {
    if (open) {
      profileFormik.resetForm();
      addPasswordFormik.resetForm();
      passwordFormik.resetForm();
      setError('');
      setLoading(false);
      setIsClosing(false);
      setShowAddPassword(false);
      setDeleteDialogOpen(false);
      setDeletePassword('');
      setDeleteError('');
      setDeleteLoading(false);
      setShowDeletePassword(false);
      setDeleteMethod('password');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmNewPassword(false);
    }
  }, [open]);

  const handleClose = () => {
    if (isClosing) return;
    profileFormik.resetForm();
    addPasswordFormik.resetForm();
    passwordFormik.resetForm();
    setError('');
    setShowAddPassword(false);
    onClose();
  };

  // Email provider check (Google login kullanıcıları şifre değiştiremez)
  const isEmailProvider = currentUser?.providerData.some(
    (provider) => provider.providerId === 'password'
  );
  const isGoogleProvider = currentUser?.providerData.some(
    (provider) => provider.providerId === 'google.com'
  );
  const hasBothProviders = isEmailProvider && isGoogleProvider;

  // Provider bilgilerini al
  const providersList = currentUser?.providerData.map(p => p.providerId) || [];

  return (
    <>
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
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                {currentUser?.emailVerified ? (
                  <>
                    <CheckCircleIcon fontSize="inherit" color="success" />
                    Email doğrulandı
                  </>
                ) : (
                  <>
                    <WarningIcon fontSize="inherit" color="warning" />
                    Email doğrulanmamış
                  </>
                )}
              </Typography>
            </Box>
          </Box>

          <Divider />

          {/* Login Methods / Providers */}
          <Box>
            <Typography variant="subtitle2" gutterBottom fontWeight="medium">
              Giriş Metodları
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {providersList.includes('google.com') && (
                <Chip
                  icon={<GoogleIcon />}
                  label="Google"
                  color="primary"
                  variant="outlined"
                />
              )}
              {providersList.includes('password') && (
                <Chip
                  icon={<EmailIcon />}
                  label="E-posta & Şifre"
                  color="success"
                  variant="outlined"
                />
              )}
            </Stack>
            
            {/* Google kullanıcısı ve şifresi yoksa, şifre ekle seçeneği göster */}
            {!isEmailProvider && providersList.length > 0 && (
              <Box mt={2}>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  E-posta ve şifre ile de giriş yapabilmek için hesabınıza şifre ekleyebilirsiniz.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    if (!showAddPassword && onStartPasswordAdd) onStartPasswordAdd();
                    setShowAddPassword(!showAddPassword);
                  }}
                  disabled={loading}
                >
                  {showAddPassword ? 'İptal' : '+ Şifre Ekle'}
                </Button>
              </Box>
            )}
          </Box>

          {/* Add Password Form (for Google users) */}
          {showAddPassword && !isEmailProvider && (
            <Box component="form" onSubmit={addPasswordFormik.handleSubmit}>
              <Typography variant="subtitle2" gutterBottom fontWeight="medium" color="primary">
                Hesaba Şifre Ekle
              </Typography>
              <TextField
                fullWidth
                type="password"
                label="Yeni Şifre"
                name="newPassword"
                value={addPasswordFormik.values.newPassword}
                onChange={addPasswordFormik.handleChange}
                error={addPasswordFormik.touched.newPassword && Boolean(addPasswordFormik.errors.newPassword)}
                helperText={addPasswordFormik.touched.newPassword && addPasswordFormik.errors.newPassword}
                disabled={loading}
                margin="normal"
              />
              <TextField
                fullWidth
                type="password"
                label="Şifre Tekrar"
                name="confirmPassword"
                value={addPasswordFormik.values.confirmPassword}
                onChange={addPasswordFormik.handleChange}
                error={addPasswordFormik.touched.confirmPassword && Boolean(addPasswordFormik.errors.confirmPassword)}
                helperText={addPasswordFormik.touched.confirmPassword && addPasswordFormik.errors.confirmPassword}
                disabled={loading}
                margin="normal"
              />
              <Button
                type="submit"
                variant="contained"
                disabled={loading || !addPasswordFormik.values.newPassword || !addPasswordFormik.values.confirmPassword}
                fullWidth
                sx={{ mt: 1 }}
              >
                Şifre Ekle
              </Button>
            </Box>
          )}

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
          {isEmailProvider && (
            <>
              <Divider />
              <Box component="form" onSubmit={passwordFormik.handleSubmit}>
                <Typography variant="subtitle2" gutterBottom fontWeight="medium">
                  Şifre Değiştir
                </Typography>
                <TextField
                  fullWidth
                  type={showCurrentPassword ? 'text' : 'password'}
                  label="Mevcut Şifre"
                  name="currentPassword"
                  value={passwordFormik.values.currentPassword}
                  onChange={passwordFormik.handleChange}
                  error={passwordFormik.touched.currentPassword && Boolean(passwordFormik.errors.currentPassword)}
                  helperText={passwordFormik.touched.currentPassword && passwordFormik.errors.currentPassword}
                  disabled={loading}
                  margin="normal"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowCurrentPassword(!showCurrentPassword)} edge="end" size="small">
                          {showCurrentPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  type={showNewPassword ? 'text' : 'password'}
                  label="Yeni Şifre"
                  name="newPassword"
                  value={passwordFormik.values.newPassword}
                  onChange={passwordFormik.handleChange}
                  error={passwordFormik.touched.newPassword && Boolean(passwordFormik.errors.newPassword)}
                  helperText={passwordFormik.touched.newPassword && passwordFormik.errors.newPassword}
                  disabled={loading}
                  margin="normal"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end" size="small">
                          {showNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  label="Yeni Şifre Tekrar"
                  name="confirmPassword"
                  value={passwordFormik.values.confirmPassword}
                  onChange={passwordFormik.handleChange}
                  error={passwordFormik.touched.confirmPassword && Boolean(passwordFormik.errors.confirmPassword)}
                  helperText={passwordFormik.touched.confirmPassword && passwordFormik.errors.confirmPassword}
                  disabled={loading}
                  margin="normal"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)} edge="end" size="small">
                          {showConfirmNewPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                {error && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {error}
                  </Alert>
                )}
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !passwordFormik.values.currentPassword || !passwordFormik.values.newPassword || !passwordFormik.values.confirmPassword}
                  fullWidth
                  sx={{ mt: 1 }}
                >
                  {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                </Button>
              </Box>
            </>
          )}

          <Divider />

          {/* Hesap Silme */}
          <Box>
            <Typography variant="subtitle2" gutterBottom fontWeight="medium" color="error">
              Tehlikeli Bölge
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              Hesabınızı sildiğinizde tüm verileriniz (yemek kayıtları, hedefler, besin şablonları) kalıcı olarak silinir. Bu işlem geri alınamaz.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteForeverIcon />}
              onClick={() => setDeleteDialogOpen(true)}
              disabled={loading}
            >
              Hesabı Sil
            </Button>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>

    {/* Hesap Silme Onay Dialogu */}
    <Dialog
      open={deleteDialogOpen}
      onClose={() => {
        if (!deleteLoading) {
          setDeleteDialogOpen(false);
          setDeletePassword('');
          setDeleteError('');
        }
      }}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <DeleteForeverIcon color="error" />
          <Typography variant="h6" color="error">
            Hesabı Sil
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          Bu işlem geri alınamaz! Hesabınız ve tüm verileriniz kalıcı olarak silinecektir.
        </Alert>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Silinecek veriler:
        </Typography>
        <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 2, color: 'text.secondary' }}>
          <li>Tüm yemek kayıtları</li>
          <li>Günlük hedefler</li>
          <li>Besin şablonları</li>
          <li>Hesap bilgileri</li>
        </Typography>

        {/* Her iki provider'a da sahip kullanıcılar için yöntem seçimi */}
        {hasBothProviders && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Doğrulama yöntemi seçin:
            </Typography>
            <ToggleButtonGroup
              value={deleteMethod}
              exclusive
              onChange={(_, val) => { if (val) { setDeleteMethod(val); setDeletePassword(''); setDeleteError(''); } }}
              fullWidth
              size="small"
              sx={{ mb: 1 }}
            >
              <ToggleButton value="password" sx={{ textTransform: 'none' }}>
                <EmailIcon sx={{ mr: 0.5 }} fontSize="small" />
                Şifre ile
              </ToggleButton>
              <ToggleButton value="google" sx={{ textTransform: 'none' }}>
                <GoogleIcon sx={{ mr: 0.5 }} fontSize="small" />
                Google ile
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {/* Şifre ile doğrulama */}
        {((isEmailProvider && !hasBothProviders) || (hasBothProviders && deleteMethod === 'password')) && (
          <TextField
            fullWidth
            type={showDeletePassword ? 'text' : 'password'}
            label="Şifrenizi girin"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            disabled={deleteLoading}
            helperText="Güvenlik için mevcut şifrenizi girin"
            margin="normal"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    edge="end"
                    size="small"
                  >
                    {showDeletePassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        )}

        {/* Google ile doğrulama */}
        {(!isEmailProvider || (hasBothProviders && deleteMethod === 'google')) && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Devam etmek için Google hesabınızla doğrulama yapmanız gerekecektir.
          </Typography>
        )}

        {deleteError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {deleteError}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={() => {
            setDeleteDialogOpen(false);
            setDeletePassword('');
            setDeleteError('');
          }}
          variant="outlined"
          disabled={deleteLoading}
        >
          İptal
        </Button>
        <Button
          onClick={async () => {
            const usePassword = hasBothProviders ? deleteMethod === 'password' : isEmailProvider;
            if (usePassword && !deletePassword) {
              setDeleteError('Lütfen şifrenizi girin.');
              return;
            }
            setDeleteLoading(true);
            setDeleteError('');
            try {
              await deleteAccount(usePassword ? deletePassword : undefined);
              setDeleteDialogOpen(false);
              onClose();
              if (onSuccess) {
                onSuccess('Hesabınız başarıyla silindi.');
              }
            } catch (err: any) {
              console.error('Account delete error:', err);
              if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
                setDeleteError('Şifre hatalı. Lütfen tekrar deneyin.');
              } else if (err.code === 'auth/user-mismatch') {
                setDeleteError('Farklı bir hesap seçtiniz. Lütfen mevcut hesabınızı seçin.');
              } else if (err.code === 'auth/popup-closed-by-user') {
                setDeleteError('Doğrulama penceresi kapatıldı. İşlem iptal edildi.');
              } else if (err.code === 'auth/requires-recent-login') {
                setDeleteError('Güvenlik nedeniyle çıkış yapıp tekrar giriş yapmanız gerekiyor.');
              } else if (err.code === 'auth/too-many-requests') {
                setDeleteError('Çok fazla deneme. Lütfen birkaç dakika sonra tekrar deneyin.');
              } else {
                setDeleteError('Hesap silinirken bir hata oluştu. Lütfen tekrar deneyin.');
              }
            } finally {
              setDeleteLoading(false);
            }
          }}
          variant="contained"
          color="error"
          startIcon={<DeleteForeverIcon />}
          disabled={deleteLoading || ((hasBothProviders ? deleteMethod === 'password' : !!isEmailProvider) && !deletePassword)}
        >
          {deleteLoading ? 'Siliniyor...' : (
            (hasBothProviders && deleteMethod === 'google') || (!isEmailProvider && !hasBothProviders)
              ? 'Google ile Doğrula ve Sil'
              : 'Hesabı Kalıcı Olarak Sil'
          )}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
