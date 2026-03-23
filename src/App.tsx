import { useState, useEffect, lazy, Suspense } from 'react';
import { Container, Typography, Box, AppBar, Toolbar, Stack, Link as MuiLink, Fade, IconButton, Tooltip, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, Chip } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { FoodForm } from './components/FoodForm';
import { StatsCard } from './components/StatsCard';
import { FoodList } from './components/FoodList';
import { EmailVerificationScreen } from './components/EmailVerificationScreen';
import { Toast } from './components/Toast';
import { useFoodTracker } from './hooks/useFoodTracker';
import { useAuth } from './contexts/AuthContext';
import { migrateFromLocalStorage } from './services/firestoreService';
import type { AlertColor } from '@mui/material';
import type { Food, FoodTemplate, MealType, DailyGoal } from './types';
type FoodInput = Omit<Food, 'id' | 'timestamp'>;
import './App.css';
import { formatDate } from './utils/dateUtils';

const HistoryModal = lazy(() =>
  import('./components/HistoryModal').then((module) => ({ default: module.HistoryModal }))
);
const GoalSettingsModal = lazy(() =>
  import('./components/GoalSettingsModal').then((module) => ({ default: module.GoalSettingsModal }))
);
const FoodTemplatesModal = lazy(() =>
  import('./components/FoodTemplatesModal').then((module) => ({ default: module.FoodTemplatesModal }))
);
const AuthModal = lazy(() =>
  import('./components/AuthModal').then((module) => ({ default: module.AuthModal }))
);
const ProfileModal = lazy(() =>
  import('./components/ProfileModal').then((module) => ({ default: module.ProfileModal }))
);

function App() {
  const { currentUser, logout, isGuest, continueAsGuest } = useAuth();
  const { 
    foods, 
    allFoods, 
    allFoodsLoaded,
    allFoodsLoading,
    dailyGoal, 
    dailyStats,
    loading: dataLoading,
    ensureAllFoodsLoaded,
    addFood, 
    deleteFood, 
    editFood,
    updateGoal,
    foodTemplates,
    addFoodTemplate,
    deleteFoodTemplate,
    editFoodTemplate,
    addFoodFromTemplate,
    deleteFoodTemplatesBulk,
    deleteAllDayFoods,
  } = useFoodTracker();

  // Toplu silme fonksiyonu
  const handleBulkDeleteTemplates = async (ids: string[]) => {
    try {
      await deleteFoodTemplatesBulk(ids);
      setToast({
        open: true,
        message: `${ids.length} besin silindi!`,
        severity: 'info',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || 'Toplu silme sırasında hata oluştu',
        severity: 'error',
      });
    }
  };
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: AlertColor }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [pendingPasswordAdd, setPendingPasswordAdd] = useState(false);

  // Kullanıcı giriş yaptığında LocalStorage'dan migrate et
  useEffect(() => {
    if (currentUser) {
      const wasGuest = sessionStorage.getItem('migrateFromGuest');
      
      if (wasGuest === 'true') {
        const hasLocalData = 
          localStorage.getItem('macromate-foods') ||
          localStorage.getItem('macromate-goal') ||
          localStorage.getItem('macromate-templates');
        
        if (hasLocalData) {
          migrateFromLocalStorage(currentUser.uid)
            .then(() => {
              setToast({
                open: true,
                message: 'Verileriniz başarıyla hesabınıza aktarıldı!',
                severity: 'success',
              });
              localStorage.removeItem('macromate-foods');
              localStorage.removeItem('macromate-goal');
              localStorage.removeItem('macromate-templates');
            })
            .catch((error) => {
              console.error('Migration error:', error);
              setToast({
                open: true,
                message: 'Veriler aktarılırken bir sorun oluştu',
                severity: 'warning',
              });
            })
            .finally(() => {
              sessionStorage.removeItem('migrateFromGuest');
            });
        } else {
          sessionStorage.removeItem('migrateFromGuest');
        }
      }
    }
  }, [currentUser]);

  const handleAddFood = async (food: FoodInput, customTimestamp?: number) => {
    try {
      await addFood(food, customTimestamp);
      setToast({
        open: true,
        message: `${food.name} eklendi!`,
        severity: 'success',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || 'Yemek eklenirken hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleAddFromTemplate = async (templateId: string, grams: number, mealType?: string) => {
    try {
      await addFoodFromTemplate(templateId, grams, mealType);
      const template = foodTemplates.find(t => t.id === templateId);
      const miktarBirim = template?.unit === 'piece' ? 'adet' : 'g';
      setToast({
        open: true,
        message: `${template?.name} (${grams} ${miktarBirim}) eklendi!`,
        severity: 'success',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || 'Şablondan yemek eklenirken hata oluştu',
        severity: 'error',
      });
    }
  };

  // ✅ Barkoddan gelen ürünü besinlere kaydet ve yemeğe ekle
  const handleSaveTemplateAndAdd = async (
    template: Omit<FoodTemplate, 'id'>,
    amount: number,
    mealType?: MealType
  ) => {
    try {
      // Önce şablonu kaydet (toast gösterme)
      await addFoodTemplate(template);

      // Gram bazında değerleri hesapla ve yemeği ekle
      const multiplier = amount / 100;
      await addFood({
        name: `${template.name} (${amount}g)`,
        calories: Math.round(template.calories * multiplier),
        protein: Math.round(template.protein * multiplier * 10) / 10,
        carbs: Math.round(template.carbs * multiplier * 10) / 10,
        fat: Math.round(template.fat * multiplier * 10) / 10,
        mealType,
      });

      setToast({
        open: true,
        message: `${template.name} besinlere kaydedildi ve eklendi!`,
        severity: 'success',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || 'İşlem sırasında hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleDeleteFood = async (id: string) => {
    try {
      const foodName = allFoods.find(f => f.id === id)?.name || foods.find(f => f.id === id)?.name;
      await deleteFood(id);
      setToast({
        open: true,
        message: `${foodName} silindi!`,
        severity: 'info',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || 'Yemek silinirken hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleDeleteAllDayFoods = async (dateString: string) => {
    try {
      await deleteAllDayFoods(dateString);
      setToast({
        open: true,
        message: `${formatDate(dateString)} tarihine ait tüm yemekler silindi!`,
        severity: 'info',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || 'Yemekler silinirken hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleEditFood = async (id: string, updatedFood: Partial<Food>) => {
    try {
      await editFood(id, updatedFood);
      setToast({
        open: true,
        message: `${updatedFood.name} güncellendi!`,
        severity: 'success',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || 'Yemek güncellenirken hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleSaveGoal = async (goal: DailyGoal) => {
    try {
      await updateGoal(goal);
      setToast({
        open: true,
        message: 'Hedefler güncellendi!',
        severity: 'success',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || 'Hedefler güncellenirken hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleAddTemplate = async (template: Omit<FoodTemplate, 'id'>, suppressToast?: boolean) => {
    try {
      await addFoodTemplate(template);
      if (!suppressToast) {
        setToast({
          open: true,
          message: `${template.name} şablonu eklendi!`,
          severity: 'success',
        });
      }
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || 'Şablon eklenirken hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteFoodTemplate(id);
      setToast({
        open: true,
        message: 'Şablon silindi!',
        severity: 'info',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || 'Şablon silinirken hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleEditTemplate = async (id: string, template: Omit<FoodTemplate, 'id'>) => {
    try {
      await editFoodTemplate(id, template);
      setToast({
        open: true,
        message: `${template.name} güncellendi!`,
        severity: 'success',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || 'Şablon güncellenirken hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleLogout = async () => {
    setLogoutDialogOpen(false);
    try {
      if (isGuest) {
        localStorage.removeItem('macromate-foods');
        localStorage.removeItem('macromate-goal');
        localStorage.removeItem('macromate-templates');
        localStorage.removeItem('guestMode');
        await logout();
        setToast({
          open: true,
          message: 'Veriler silindi ve çıkış yapıldı',
          severity: 'info',
        });
        return;
      }
      await logout();
      setToast({
        open: true,
        message: 'Çıkış yapıldı',
        severity: 'info',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleLogoutClick = () => setLogoutDialogOpen(true);
  const handleCancelLogout = () => setLogoutDialogOpen(false);

  const handleOpenHistory = async () => {
    if (allFoodsLoading) return;
    setHistoryOpen(true);
    if (!allFoodsLoaded) {
      try {
        await ensureAllFoodsLoaded();
      } catch (error: any) {
        setToast({
          open: true,
          message: error?.message || 'Geçmiş kayıtlar yüklenirken hata oluştu',
          severity: 'error',
        });
      }
    }
  };

  if (currentUser && !isGuest && dataLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress size={36} sx={{ color: '#18181b' }} />
        <Typography variant="body1" color="text.secondary" fontWeight={500}>
          Veriler yükleniyor...
        </Typography>
      </Box>
    );
  }

  const showEmailVerification = (
    currentUser &&
    !currentUser.emailVerified &&
    !isGuest &&
    currentUser.providerData.some(p => p.providerId === 'password')
    && pendingPasswordAdd
  );

  if (showEmailVerification) {
    return <EmailVerificationScreen onCancelPasswordAdd={() => {
      setPendingPasswordAdd(false);
      setProfileOpen(false);
    }} />;
  }

  return (
    <>
      {/* Header */}
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ minHeight: { xs: 60, sm: 68 } }}>
          {/* Logo */}
          <Typography
            variant="h6"
            component="h1"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '1.2rem', sm: '1.35rem' },
              background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              letterSpacing: '-0.5px',
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            MacroMate
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          {currentUser || isGuest ? (
            <Box display="flex" alignItems="center" gap={0.5}>
              {isGuest ? (
                <>
                  <Tooltip title="Kayıtlar sadece kayıtlı kullanıcılar için">
                    <span>
                      <IconButton size="small" disabled sx={{ opacity: 0.35, color: 'text.secondary' }}>
                        <CalendarMonthIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Hesap Oluştur">
                    <IconButton
                      size="small"
                      onClick={() => setAuthOpen(true)}
                      sx={{
                        color: 'primary.main',
                        bgcolor: 'rgba(24,24,27,0.1)',
                        '&:hover': { bgcolor: 'rgba(24,24,27,0.2)' },
                      }}
                    >
                      <PersonAddIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Tooltip title="Kayıtlar & Planlama">
                    <IconButton
                      size="small"
                      onClick={handleOpenHistory}
                      disabled={allFoodsLoading}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'rgba(24,24,27,0.08)' } }}
                    >
                      <CalendarMonthIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Profil Ayarları">
                    <IconButton
                      size="small"
                      onClick={() => setProfileOpen(true)}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'rgba(24,24,27,0.08)' } }}
                    >
                      <AccountCircleIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              <Tooltip title={isGuest ? 'Misafir Modundan Çık' : 'Çıkış Yap'}>
                <IconButton
                  size="small"
                  onClick={handleLogoutClick}
                  sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'rgba(239,68,68,0.08)' } }}
                >
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ) : null}
        </Toolbar>
      </AppBar>

      {/* Ana İçerik */}
      {currentUser || isGuest ? (
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Stack spacing={3}>
            {/* İstatistikler */}
            <Fade in timeout={500}>
              <Box>
                <StatsCard
                  stats={dailyStats}
                  goal={dailyGoal}
                  onOpenSettings={() => setSettingsOpen(true)}
                />
              </Box>
            </Fade>

            {/* Yemek Ekleme Formu */}
            <Fade in timeout={700}>
              <Box>
                <FoodForm
                  onAddFood={handleAddFood}
                  foodTemplates={foodTemplates}
                  onAddFromTemplate={handleAddFromTemplate}
                  onOpenTemplates={() => setTemplatesOpen(true)}
                  onSaveTemplateAndAdd={handleSaveTemplateAndAdd}
                />
              </Box>
            </Fade>

            {/* Yemek Listesi */}
            <Fade in timeout={900}>
              <Box>
                <FoodList
                  foods={foods}
                  onDeleteFood={handleDeleteFood}
                  onEditFood={handleEditFood}
                  foodTemplates={foodTemplates}
                />
              </Box>
            </Fade>
          </Stack>
        </Container>
      ) : (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          sx={{
            height: 'calc(100vh - 60px)',
            textAlign: 'center',
            px: 2,
            pb: 6,
          }}
        >
          {/* App Icon */}
          <Fade in timeout={400}>
            <Box
              sx={{
                width: 72, height: 72, borderRadius: '22px',
                background: 'linear-gradient(135deg, #d97706 0%, #fbbf24 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(217,119,6,0.30)',
                mb: 3,
              }}
            >
              <LocalFireDepartmentIcon sx={{ fontSize: 36, color: '#fff' }} />
            </Box>
          </Fade>

          {/* Tagline */}
          <Fade in timeout={550}>
            <Box>
              <Typography
                variant="h3"
                fontWeight={800}
                sx={{
                  fontSize: { xs: '1.85rem', sm: '2.5rem', md: '3rem' },
                  letterSpacing: '-0.5px',
                  lineHeight: 1.15,
                  mb: 1.5,
                  maxWidth: 500,
                }}
              >
                Sağlıklı beslenmenin
                <Box
                  component="span"
                  sx={{
                    display: 'block',
                    background: 'linear-gradient(135deg, #d97706 0%, #0284c7 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  akıllı takipçisi
                </Box>
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ mb: 3, maxWidth: 380, mx: 'auto', lineHeight: 1.6 }}
              >
                Günlük kalori ve makrolarınızı öğün bazında takip edin, hedeflerinize ulaşın.
              </Typography>
            </Box>
          </Fade>

          {/* Feature chips */}
          <Fade in timeout={700}>
            <Box display="flex" gap={1} flexWrap="wrap" justifyContent="center" mb={4}>
              {['Öğün Takibi', 'Makro Hesaplama', 'Kişisel Hedefler', 'Barkod Tarama'].map((feat) => (
                <Chip
                  key={feat}
                  label={feat}
                  size="small"
                  sx={{
                    borderRadius: '20px',
                    bgcolor: 'rgba(0,0,0,0.06)',
                    border: '1px solid rgba(0,0,0,0.08)',
                    fontWeight: 500,
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                  }}
                />
              ))}
            </Box>
          </Fade>

          {/* CTAs */}
          <Fade in timeout={850}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
              <Button
                variant="contained"
                size="large"
                onClick={() => setAuthOpen(true)}
                sx={{
                  px: 5, py: 1.6,
                  fontSize: '1rem', fontWeight: 700, borderRadius: 3,
                  background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.18)',
                  '&:hover': { boxShadow: '0 6px 24px rgba(0,0,0,0.28)' },
                  minWidth: 180,
                }}
              >
                Giriş Yap / Kayıt Ol
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={continueAsGuest}
                sx={{
                  px: 4, py: 1.6,
                  fontSize: '1rem', fontWeight: 600, borderRadius: 3,
                  borderColor: 'rgba(0,0,0,0.18)',
                  color: 'text.secondary',
                  '&:hover': { borderColor: 'rgba(0,0,0,0.35)', bgcolor: 'rgba(0,0,0,0.04)', color: 'text.primary' },
                  minWidth: 180,
                }}
              >
                Misafir Olarak Dene
              </Button>
            </Stack>
          </Fade>
        </Box>
      )}
        
      {/* Footer — only shown when logged in */}
      {(currentUser || isGuest) && <Box
        component="footer"
        py={2.5}
        display="flex"
        alignItems="center"
        justifyContent="center"
        gap={1.5}
        sx={{
          borderTop: '1px solid rgba(24,24,27,0.12)',
          mt: 4,
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <Typography variant="caption" color="text.secondary" fontWeight={500}>
          85 Company © {new Date().getFullYear()}
        </Typography>
        <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled' }} />
        <Typography variant="caption" color="text.secondary">MIT License</Typography>
        <MuiLink
          href="https://github.com/Sqap85/MacroMate"
          target="_blank"
          rel="noopener noreferrer"
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <GitHubIcon sx={{ fontSize: 16, color: 'text.secondary', ':hover': { color: 'primary.main' }, transition: 'color 0.2s' }} />
        </MuiLink>
      </Box>}

      {/* Modals & Notifications */}
      <Suspense fallback={null}>
        <AuthModal
          open={authOpen}
          onClose={() => setAuthOpen(false)}
        />
      </Suspense>
      
      <Suspense fallback={null}>
        <GoalSettingsModal
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          currentGoal={dailyGoal}
          onSave={handleSaveGoal}
        />
      </Suspense>

      {historyOpen && (
        <Suspense fallback={null}>
          <HistoryModal
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            isLoading={allFoodsLoading}
            foods={allFoods}
            goal={dailyGoal}
            onDeleteFood={handleDeleteFood}
            onEditFood={handleEditFood}
            onAddFood={handleAddFood}
            onDeleteAllDayFoods={handleDeleteAllDayFoods}
            foodTemplates={foodTemplates}
            onOpenTemplates={() => setTemplatesOpen(true)}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <FoodTemplatesModal
          open={templatesOpen}
          onClose={() => setTemplatesOpen(false)}
          templates={foodTemplates}
          onAddTemplate={handleAddTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onEditTemplate={handleEditTemplate}
          onBulkDelete={handleBulkDeleteTemplates}
        />
      </Suspense>
      
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast({ ...toast, open: false })}
      />

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={handleCancelLogout}
        maxWidth="xs"
        fullWidth
        aria-labelledby="logout-dialog-title"
        slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}
      >
        <DialogTitle id="logout-dialog-title" sx={{ pb: 1.5, pt: 2.5, px: 3 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{
              width: 40, height: 40, borderRadius: 2, flexShrink: 0,
              background: isGuest ? 'rgba(220,38,38,0.08)' : 'rgba(24,24,27,0.06)',
              border: `1.5px solid ${isGuest ? 'rgba(220,38,38,0.2)' : 'rgba(24,24,27,0.12)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isGuest
                ? <WarningAmberIcon sx={{ fontSize: 20, color: '#dc2626' }} />
                : <LogoutIcon sx={{ fontSize: 20, color: 'text.primary' }} />}
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                {isGuest ? 'Misafir Modundan Çık' : 'Çıkış Yap'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {isGuest ? 'Verileriniz silinecek' : 'Hesabınızdan çıkış yapılacak'}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: 3, pb: 1 }}>
          {isGuest ? (
            <Box sx={{
              p: 2, borderRadius: 2,
              bgcolor: 'rgba(220,38,38,0.05)',
              border: '1px solid rgba(220,38,38,0.15)',
            }}>
              <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                Misafir modundan çıktığınızda <strong>tüm verileriniz kalıcı olarak silinir.</strong>
                {' '}Verilerinizi korumak için önce hesap oluşturabilirsiniz.
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Çıkış yapmak istediğinize emin misiniz?
            </Typography>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
          <Button
            onClick={handleCancelLogout}
            variant="outlined"
            sx={{ borderRadius: 2, flex: 1, borderColor: 'rgba(0,0,0,0.18)', color: 'text.secondary' }}
          >
            İptal
          </Button>
          <Button
            onClick={handleLogout}
            variant="contained"
            autoFocus
            startIcon={isGuest ? <WarningAmberIcon /> : <LogoutIcon />}
            sx={{
              borderRadius: 2, flex: 1,
              background: isGuest
                ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)'
                : 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)',
              boxShadow: 'none',
              '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
            }}
          >
            {isGuest ? 'Çık ve Sil' : 'Çıkış Yap'}
          </Button>
        </DialogActions>
      </Dialog>

      {!showEmailVerification && (
        <Suspense fallback={null}>
          <ProfileModal 
            open={profileOpen}
            onClose={() => {
              setProfileOpen(false);
              setPendingPasswordAdd(false);
            }}
            onSuccess={(message) => {
              if (message === 'Şifre başarıyla güncellendi!') {
                setToast({ open: true, message, severity: 'success' });
              } else if (message === 'Hesabınız başarıyla silindi.') {
                setToast({ open: true, message, severity: 'info' });
              } else if (pendingPasswordAdd) {
                setToast({ open: true, message, severity: 'success' });
                setPendingPasswordAdd(false);
              } else if (message === 'İsim başarıyla güncellendi!') {
                setToast({ open: true, message, severity: 'success' });
              }
            }}
            onStartPasswordAdd={() => setPendingPasswordAdd(true)}
          />
        </Suspense>
      )}
      {showEmailVerification && (
        <EmailVerificationScreen onCancelPasswordAdd={() => {
          setPendingPasswordAdd(false);
          setProfileOpen(false);
        }} />
      )}
    </>
  );
}

export default App;