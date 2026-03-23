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
      <Box sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}>
        <Container maxWidth="sm">
          <Paper elevation={6} sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" fontWeight="bold" color="success.main" gutterBottom>
              Başarılı!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Email adresiniz doğrulandı. Uygulamaya yönlendiriliyorsunuz...
            </Typography>
            <CircularProgress sx={{ mt: 3 }} />
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
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      py: 4,
    }}>
      <Container maxWidth="sm">
        <Paper elevation={6} sx={{ p: 5, borderRadius: 4 }}>
          <Box textAlign="center" mb={4}>
            <Typography variant="h3" fontWeight="bold" sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 1,
            }}>
              MacroMate
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Kalori ve Makro Takibi
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box textAlign="center" mb={4}>
            <EmailIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Email Adresinizi Doğrulayın
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 3 }}>
              Size gönderilen doğrulama linkine tıklayın:
            </Typography>
            <Paper sx={{ p: 2, backgroundColor: 'grey.100', borderRadius: 2, mb: 3 }}>
              <Typography variant="body1" fontWeight="medium" sx={{ wordBreak: 'break-word' }}>
                {currentUser.email}
              </Typography>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Stack spacing={2}>
              <Button
                variant="contained"
                size="large"
                startIcon={checking ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
                onClick={() => handleCheckVerification(false)}
                disabled={checking}
                fullWidth
                sx={{
                  py: 1.5,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #5568d3 0%, #63418d 100%)' },
                }}
              >
                {checking ? 'Kontrol Ediliyor...' : 'Email Doğrulandı mı? (Kontrol Et)'}
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={resending ? <CircularProgress size={20} color="inherit" /> : <EmailIcon />}
                onClick={handleResendEmail}
                disabled={resending || countdown > 0}
                fullWidth
                sx={{ py: 1.5 }}
              >
                {resendLabel}
              </Button>
            </Stack>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ backgroundColor: 'info.lighter', p: 2, borderRadius: 2, mb: 3 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>💡 İpuçları:</Typography>
            <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 0 }}>
              <li>Spam/gereksiz klasörünü kontrol edin</li>
              <li>Email 5-10 dakika içinde gelecektir</li>
              <li>Doğru email adresini girdiğinizden emin olun</li>
            </Typography>
          </Box>

          <Button variant="text" startIcon={<LogoutIcon />} onClick={handleLogout} fullWidth sx={{ color: 'text.secondary' }}>
            Çıkış Yap
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}