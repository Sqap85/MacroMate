import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Container,
  Paper,
  Alert,
  CircularProgress,
  Stack,
  Divider,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../config/firebase';
import { unlink } from 'firebase/auth';

export function EmailVerificationScreen({ onCancelPasswordAdd }: Readonly<{ onCancelPasswordAdd?: () => void }>) {
  const {
    currentUser,
    logout,
    resendVerificationEmail,
    refreshUser,
    loading,
    emailVerificationDismissed,
    setEmailVerificationDismissed,
  } = useAuth();

  // ✅ Tüm hook'lar erken return'lerden ÖNCE
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [verified, setVerified] = useState(false);
  const initialMailSentRef = useRef(false);

  const isEmailProvider = currentUser?.providerData.some(p => p.providerId === 'password') ?? false;
  const shouldShow = !loading && currentUser && !emailVerificationDismissed && isEmailProvider && !currentUser.emailVerified;

  // İlk yüklemede otomatik email gönder
  useEffect(() => {
    if (!shouldShow) return;
    if (initialMailSentRef.current || countdown > 0) return;

    initialMailSentRef.current = true;
    const send = async () => {
      setResending(true);
      try {
        await refreshUser();
        await resendVerificationEmail();
        setSuccess('Doğrulama emaili gönderildi!');
        setCountdown(60);
      } catch {
        initialMailSentRef.current = false;
      } finally {
        setResending(false);
      }
    };
    send();
  }, [shouldShow, resendVerificationEmail, countdown, refreshUser]);

  const handleCheckVerification = useCallback(async (silent = false) => {
    if (!silent) setChecking(true);
    setError('');
    try {
      await refreshUser();
      const isVerified = auth.currentUser?.emailVerified ?? false;
      if (isVerified) {
        setVerified(true);
        setSuccess('Email adresiniz başarıyla doğrulandı!');
        setTimeout(() => { globalThis.location.reload(); }, 2000);
      } else if (!silent) {
        setError('Email henüz doğrulanmamış. Lütfen email kutunuzu kontrol edin.');
      }
    } catch (err: any) {
      if (!silent) {
        setError(`Kontrol edilirken bir hata oluştu: ${err.message || 'Bilinmeyen hata'}`);
      }
    } finally {
      if (!silent) setChecking(false);
    }
  }, [refreshUser]);

  // Otomatik kontrol her 10 saniyede bir
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!verified) await handleCheckVerification(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [verified, handleCheckVerification]);

  // Sayfa focus olduğunda kontrol et
  useEffect(() => {
    const handleFocus = () => { if (!verified) handleCheckVerification(true); };
    globalThis.addEventListener('focus', handleFocus);
    return () => globalThis.removeEventListener('focus', handleFocus);
  }, [verified, handleCheckVerification]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // ✅ Erken return'ler hook'lardan SONRA
  if (loading) return null;
  if (!currentUser) return null;
  if (emailVerificationDismissed) return null;
  if (!isEmailProvider || currentUser.emailVerified) return null;

  const handleResendEmail = async () => {
    setResending(true);
    setError('');
    setSuccess('');
    try {
      await refreshUser();
      await resendVerificationEmail();
      setSuccess('Doğrulama emaili tekrar gönderildi!');
      setCountdown(60);
    } catch (err: any) {
      const errorMessages: Record<string, string> = {
        'Email zaten doğrulanmış': 'Email adresiniz zaten doğrulanmış!',
        'Giriş yapılmamış': 'Lütfen tekrar giriş yapın.',
        'auth/too-many-requests': 'Çok fazla deneme. Lütfen birkaç dakika bekleyin.',
      };
      setError(errorMessages[err.message] || 'Email gönderilemedi. Lütfen tekrar deneyin.');
    } finally {
      setResending(false);
    }
  };

  const handleLogout = async () => {
    try {
      const user = auth.currentUser;
      let didUnlink = false;
      if (
        user &&
        !user.emailVerified &&
        user.providerData.some(p => p.providerId === 'google.com') &&
        user.providerData.some(p => p.providerId === 'password')
      ) {
        await unlink(user, 'password');
        await user.reload();
        didUnlink = true;
      }
      setEmailVerificationDismissed(true);
      if (didUnlink && onCancelPasswordAdd) onCancelPasswordAdd();
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (verified) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5' }}>
        <Container maxWidth="xs">
          <Paper elevation={2} sx={{ p: 5, textAlign: 'center', borderRadius: 4 }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: '18px', mx: 'auto', mb: 2.5,
              bgcolor: 'rgba(21,128,61,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircleIcon sx={{ fontSize: 32, color: '#15803d' }} />
            </Box>
            <Typography variant="h5" fontWeight={800} gutterBottom>Email Doğrulandı!</Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Uygulamaya yönlendiriliyorsunuz...
            </Typography>
            <CircularProgress size={28} sx={{ color: '#15803d' }} />
          </Paper>
        </Container>
      </Box>
    );
  }

  const resendLabel = (() => {
    if (countdown > 0) return `Tekrar Gönder (${countdown}s)`;
    if (resending) return 'Gönderiliyor...';
    return 'Tekrar Gönder';
  })();

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', py: 4 }}>
      <Container maxWidth="xs">
        <Paper elevation={2} sx={{ p: 4, borderRadius: 4 }}>

          {/* Header */}
          <Box textAlign="center" mb={3}>
            <Box sx={{
              width: 56, height: 56, borderRadius: '16px', mx: 'auto', mb: 2,
              bgcolor: 'rgba(2,132,199,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <EmailIcon sx={{ fontSize: 28, color: '#0284c7' }} />
            </Box>
            <Typography variant="h6" fontWeight={800} gutterBottom>
              Email Adresinizi Doğrulayın
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Doğrulama bağlantısı şu adrese gönderildi:
            </Typography>
            <Box sx={{ mt: 1.5, px: 2, py: 1, borderRadius: 2, bgcolor: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}>
              <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                {currentUser.email}
              </Typography>
            </Box>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert>}

          <Stack spacing={1.5} mb={3}>
            <Button
              variant="contained"
              size="large"
              startIcon={checking ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
              onClick={() => handleCheckVerification(false)}
              disabled={checking}
              fullWidth
              sx={{
                py: 1.4, fontWeight: 700, borderRadius: 2,
                background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)',
                boxShadow: 'none',
                '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
              }}
            >
              {checking ? 'Kontrol Ediliyor...' : 'Doğrulamayı Kontrol Et'}
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={resending ? <CircularProgress size={18} color="inherit" /> : <EmailIcon />}
              onClick={handleResendEmail}
              disabled={resending || countdown > 0}
              fullWidth
              sx={{ py: 1.4, borderRadius: 2, fontWeight: 600, borderColor: 'rgba(0,0,0,0.18)', color: 'text.secondary' }}
            >
              {resendLabel}
            </Button>
          </Stack>

          <Divider sx={{ mb: 2.5 }} />

          {/* Tips */}
          <Box sx={{ px: 1.5, py: 1.5, borderRadius: 2, bgcolor: 'rgba(2,132,199,0.06)', border: '1px solid rgba(2,132,199,0.15)', mb: 2.5 }}>
            <Typography variant="caption" fontWeight={700} color="#0284c7" display="block" mb={0.75}>
              İpucu
            </Typography>
            <Typography variant="caption" color="text.secondary" component="ul" sx={{ pl: 2, mb: 0 }}>
              <li>Spam / gereksiz klasörünü kontrol edin</li>
              <li>Email 5–10 dakika içinde gelebilir</li>
              <li>Doğru email adresini girdiğinizden emin olun</li>
            </Typography>
          </Box>

          <Button
            variant="text"
            startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
            onClick={handleLogout}
            fullWidth
            size="small"
            sx={{ color: 'text.disabled', fontSize: '0.75rem', '&:hover': { color: 'text.secondary' } }}
          >
            Çıkış Yap
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}