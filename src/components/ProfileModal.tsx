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

export function ProfileModal({ open, onClose, onSuccess, onStartPasswordAdd }: Readonly<ProfileModalProps>) {
  const { currentUser, addPasswordToAccount, deleteAccount, updateUserPassword } = useAuth();
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
        .matches(/[a-zA-Z]/, 'En az bir harf içermelidir')
        .matches(/\d/, 'En az bir rakam içermelidir'),
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
        .matches(/[a-zA-Z]/, 'En az bir harf içermelidir')
        .matches(/\d/, 'En az bir rakam içermelidir'),
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
    addPasswordFormik.resetForm();
    passwordFormik.resetForm();
    setError('');
    setShowAddPassword(false);
    onClose();
  };

  const isEmailProvider = currentUser?.providerData.some(
    (provider) => provider.providerId === 'password'
  );
  const isGoogleProvider = currentUser?.providerData.some(
    (provider) => provider.providerId === 'google.com'
  );
  const hasBothProviders = isEmailProvider && isGoogleProvider;

  const providersList = currentUser?.providerData.map(p => p.providerId) || [];

  const deleteButtonLabel = deleteLoading ? 'Siliniyor...' : 'Hesabı Sil';

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
      <DialogTitle id="profile-dialog-title" sx={{ pb: 1.5, pt: 2.5, px: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{
              width: 40, height: 40, borderRadius: 2,
              background: 'linear-gradient(135deg, rgba(24,24,27,0.08) 0%, rgba(63,63,70,0.08) 100%)',
              border: '1.5px solid rgba(24,24,27,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <PersonIcon sx={{ fontSize: 20, color: 'text.primary' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>Profil Ayarları</Typography>
              <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
                {currentUser?.email}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} size="small" aria-label="Kapat" disabled={isClosing} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3 }}>
        <Stack spacing={2.5} mt={1}>

          {/* Email doğrulama durumu */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderRadius: 2,
            bgcolor: currentUser?.emailVerified ? 'rgba(21,128,61,0.06)' : 'rgba(180,83,9,0.06)',
            border: `1px solid ${currentUser?.emailVerified ? 'rgba(21,128,61,0.2)' : 'rgba(180,83,9,0.2)'}`,
          }}>
            {currentUser?.emailVerified
              ? <CheckCircleIcon sx={{ fontSize: 16, color: '#15803d' }} />
              : <WarningIcon sx={{ fontSize: 16, color: '#b45309' }} />}
            <Typography variant="caption" fontWeight={600} color={currentUser?.emailVerified ? '#15803d' : '#b45309'}>
              {currentUser?.emailVerified ? 'E-posta doğrulandı' : 'E-posta doğrulanmamış'}
            </Typography>
          </Box>

          <Divider />

          {/* Login Methods / Providers */}
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={1} fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
              Giriş Metodları
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {providersList.some(id => id === 'google.com') && (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: 1.5, bgcolor: 'rgba(24,24,27,0.06)', border: '1px solid rgba(24,24,27,0.15)' }}>
                  <GoogleIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" fontWeight={600} color="text.secondary">Google</Typography>
                </Box>
              )}
              {providersList.some(id => id === 'password') && (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: 1.5, bgcolor: 'rgba(24,24,27,0.06)', border: '1px solid rgba(24,24,27,0.15)' }}>
                  <EmailIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" fontWeight={600} color="text.secondary">E-posta & Şifre</Typography>
                </Box>
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
                sx={{ mt: 1, borderRadius: 2, background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)', boxShadow: 'none', '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }, '&.Mui-disabled': { background: 'rgba(0,0,0,0.12)' } }}
              >
                Şifre Ekle
              </Button>
            </Box>
          )}

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
                  sx={{ mt: 1, borderRadius: 2, background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)', boxShadow: 'none', '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }, '&.Mui-disabled': { background: 'rgba(0,0,0,0.12)' } }}
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
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      <DialogTitle sx={{ pb: 1.5, pt: 2.5, px: 3 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2, flexShrink: 0,
            bgcolor: 'rgba(220,38,38,0.08)',
            border: '1.5px solid rgba(220,38,38,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <DeleteForeverIcon sx={{ fontSize: 20, color: '#dc2626' }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={700} lineHeight={1.2}>Hesabı Sil</Typography>
            <Typography variant="caption" color="error">Bu işlem geri alınamaz</Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pb: 1 }}>
        <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(220,38,38,0.05)', border: '1px solid rgba(220,38,38,0.15)', mb: 2 }}>
          <Typography variant="body2" color="text.secondary" lineHeight={1.6} mb={1}>
            Hesabınız silindiğinde aşağıdaki veriler <strong>kalıcı olarak</strong> kaldırılır:
          </Typography>
          <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 0, color: 'text.secondary' }}>
            <li>Tüm yemek kayıtları</li>
            <li>Günlük hedefler</li>
            <li>Besin şablonları</li>
            <li>Hesap bilgileri</li>
          </Typography>
        </Box>

        {/* Her iki provider'a da sahip kullanıcılar için yöntem seçimi */}
        {hasBothProviders && (
          <Box mb={1}>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.75} fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
              Doğrulama Yöntemi
            </Typography>
            <ToggleButtonGroup
              value={deleteMethod}
              exclusive
              onChange={(_, val) => { if (val) { setDeleteMethod(val); setDeletePassword(''); setDeleteError(''); } }}
              fullWidth
              size="small"
              sx={{
                '& .MuiToggleButton-root': {
                  textTransform: 'none', fontWeight: 600, fontSize: '0.8rem',
                  borderColor: 'rgba(0,0,0,0.12)',
                  '&.Mui-selected': { bgcolor: 'rgba(24,24,27,0.08)', color: 'text.primary', borderColor: 'rgba(24,24,27,0.25)' },
                },
              }}
            >
              <ToggleButton value="password">
                <EmailIcon sx={{ mr: 0.75, fontSize: 16 }} />
                Şifre ile
              </ToggleButton>
              <ToggleButton value="google">
                <GoogleIcon sx={{ mr: 0.75, fontSize: 16 }} />
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
            size="small"
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowDeletePassword(!showDeletePassword)} edge="end" size="small">
                      {showDeletePassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />
        )}

        {/* Google ile doğrulama */}
        {(!isEmailProvider || (hasBothProviders && deleteMethod === 'google')) && (
          <Box sx={{ mt: 1.5, px: 1.5, py: 1.25, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}>
            <Typography variant="body2" color="text.secondary" fontSize="0.8rem">
              Google hesabınızla bir doğrulama adımı açılacak.
            </Typography>
          </Box>
        )}

        {deleteError && (
          <Box sx={{ mt: 1.5, px: 1.5, py: 1.25, borderRadius: 2, bgcolor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <Typography variant="body2" color="error" fontSize="0.8rem">{deleteError}</Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
        <Button
          onClick={() => {
            setDeleteDialogOpen(false);
            setDeletePassword('');
            setDeleteError('');
          }}
          variant="outlined"
          disabled={deleteLoading}
          sx={{ borderRadius: 2, flex: 1, borderColor: 'rgba(0,0,0,0.18)', color: 'text.secondary' }}
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
          disabled={deleteLoading || ((hasBothProviders ? deleteMethod === 'password' : !!isEmailProvider) && !deletePassword)}
          sx={{
            borderRadius: 2, flex: 1,
            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
            boxShadow: 'none',
            '&:hover': { boxShadow: '0 4px 12px rgba(220,38,38,0.3)' },
            '&.Mui-disabled': { background: 'rgba(0,0,0,0.12)' },
          }}
        >
          {deleteButtonLabel}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  );
}
