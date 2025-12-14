import { useState, useEffect, useCallback } from 'react';
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

/**
 * Email Verification Screen
 * Landing page tarzı modern email doğrulama ekranı
 */

export function EmailVerificationScreen() {
  const { currentUser, logout, resendVerificationEmail, refreshUser } = useAuth();
  const [checking, setChecking] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [verified, setVerified] = useState(false);

  // Fonksiyonu önce tanımla
  const handleCheckVerification = useCallback(async (silent = false) => {
    if (!silent) setChecking(true);
    setError('');

    try {
      await refreshUser();
      
      // Auth'dan direkt kontrol et (state güncellemesi async olabilir)
      const isVerified = auth.currentUser?.emailVerified || false;
      
      if (isVerified) {
        setVerified(true);
        setSuccess('Email adresiniz başarıyla doğrulandı!');
        
        // 2 saniye sonra sayfayı yenile (ana uygulamaya geçiş)
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else if (!silent) {
        setError('Email henüz doğrulanmamış. Lütfen email kutunuzu kontrol edin.');
      }
    } catch (err: any) {
      console.error('Verification check error:', err);
      if (!silent) {
        setError(`Kontrol edilirken bir hata oluştu: ${err.message || 'Bilinmeyen hata'}`);
      }
    } finally {
      if (!silent) setChecking(false);
    }
  }, [refreshUser]);

  // SADECE periyodik kontrol - ilk yüklenme kontrolünü kaldırdık (infinite loop önleme)

  // Otomatik kontrol her 10 saniyede bir
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!verified) {
        await handleCheckVerification(true);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [verified, handleCheckVerification]);

  // Sayfa focus olduğunda kontrol et
  useEffect(() => {
    const handleFocus = () => {
      if (!verified) {
        handleCheckVerification(true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [verified, handleCheckVerification]);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResendEmail = async () => {
    setResending(true);
    setError('');
    setSuccess('');

    try {
      await resendVerificationEmail();
      setSuccess('Doğrulama emaili tekrar gönderildi!');
      setCountdown(60); // 60 saniye cooldown
    } catch (err: any) {
      console.error('Resend email error:', err);
      
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
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (verified) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Container maxWidth="sm">
          <Paper
            elevation={6}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 4,
            }}
          >
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

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: 5,
            borderRadius: 4,
          }}
        >
          {/* Header */}
          <Box textAlign="center" mb={4}>
            <Typography
              variant="h3"
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
              Kalori ve Makro Takibi
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Main Content */}
          <Box textAlign="center" mb={4}>
            <EmailIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              Email Adresinizi Doğrulayın
            </Typography>
            
            <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 3 }}>
              Size gönderilen doğrulama linkine tıklayın:
            </Typography>

            <Paper
              sx={{
                p: 2,
                backgroundColor: 'grey.100',
                borderRadius: 2,
                mb: 3,
              }}
            >
              <Typography
                variant="body1"
                fontWeight="medium"
                sx={{ wordBreak: 'break-word' }}
              >
                {currentUser?.email}
              </Typography>
            </Paper>

            {/* Error/Success Messages */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            {success && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {success}
              </Alert>
            )}

            {/* Action Buttons */}
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
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #63418d 100%)',
                  },
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
                {countdown > 0 
                  ? `Tekrar Gönder (${countdown}s)` 
                  : resending 
                  ? 'Gönderiliyor...' 
                  : 'Tekrar Gönder'
                }
              </Button>
            </Stack>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Tips */}
          <Box sx={{ backgroundColor: 'info.lighter', p: 2, borderRadius: 2, mb: 3 }}>
            <Typography variant="body2" fontWeight="bold" gutterBottom>
              💡 İpuçları:
            </Typography>
            <Typography variant="body2" component="ul" sx={{ pl: 2, mb: 0 }}>
              <li>Spam/gereksiz klasörünü kontrol edin</li>
              <li>Email 5-10 dakika içinde gelecektir</li>
              <li>Doğru email adresini girdiğinizden emin olun</li>
            </Typography>
          </Box>

          {/* Logout */}
          <Button
            variant="text"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            fullWidth
            sx={{ color: 'text.secondary' }}
          >
            Çıkış Yap
          </Button>
        </Paper>
      </Container>
    </Box>
  );
}
