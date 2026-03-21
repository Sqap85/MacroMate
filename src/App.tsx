import { useState, useEffect, lazy, Suspense } from 'react';
import { Container, Typography, Box, AppBar, Toolbar, Stack, Link as MuiLink, Fade, IconButton, Tooltip, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import { FoodForm } from './components/FoodForm';
import { StatsCard } from './components/StatsCard';
import { FoodList } from './components/FoodList';
import { EmailVerificationScreen } from './components/EmailVerificationScreen';
import { Toast } from './components/Toast';
import { useFoodTracker } from './hooks/useFoodTracker';
import { useAuth } from './contexts/AuthContext';
import { migrateFromLocalStorage } from './services/firestoreService';
import type { AlertColor } from '@mui/material';
import type { FoodTemplate, MealType } from './types';
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
  const { currentUser, logout, isGuest } = useAuth();
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

  const handleAddFood = async (food: any, customTimestamp?: number) => {
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

  const handleEditFood = async (id: string, updatedFood: any) => {
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

  const handleSaveGoal = async (goal: any) => {
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

  const handleAddTemplate = async (template: Omit<any, 'id'>, suppressToast?: boolean) => {
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

  const handleEditTemplate = async (id: string, template: Omit<any, 'id'>) => {
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
        window.location.reload();
      }
      await logout();
      setToast({
        open: true,
        message: isGuest ? 'Veriler silindi ve çıkış yapıldı' : 'Çıkış yapıldı',
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
    setHistoryOpen(true); // ✅ önce aç
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
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
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
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h5" component="h1" fontWeight="bold">
            MacroMate
          </Typography>
          <Typography 
            variant="subtitle1" 
            sx={{ 
              ml: 2, 
              opacity: 0.9,
              display: { xs: 'none', sm: 'block' } 
            }}
          >
            Kalori Takip Uygulaması
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          
          {currentUser || isGuest ? (
            <>
              <Typography 
                variant="body2" 
                sx={{ 
                  mr: 2, 
                  opacity: 0.9,
                  display: { xs: 'none', sm: 'block' }
                }}
              >
                {isGuest ? (
                  '👤 Misafir'
                ) : (
                  `Merhaba, ${currentUser?.displayName || currentUser?.email}`
                )}
              </Typography>
              {isGuest ? (
                <>
                  <Tooltip title="Kayıtlar & Planlama sadece kayıtlı kullanıcılar için">
                    <span>
                      <IconButton color="inherit" disabled sx={{ opacity: 0.5 }}>
                        <CalendarMonthIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Hesap Oluştur">
                    <IconButton color="inherit" onClick={() => setAuthOpen(true)}>
                      <PersonAddIcon />
                    </IconButton>
                  </Tooltip>
                </>
              ) : (
                <>
                  <Tooltip title="Kayıtlar & Planlama">
                    <IconButton color="inherit" onClick={handleOpenHistory} disabled={allFoodsLoading}>
                      <CalendarMonthIcon />
                    </IconButton>
                  </Tooltip>
                  {!isGuest && (
                    <Tooltip title="Profil Ayarları">
                      <IconButton color="inherit" onClick={() => setProfileOpen(true)}>
                        <AccountCircleIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </>
              )}
              <Tooltip title={isGuest ? "Misafir Modundan Çık" : "Çıkış Yap"}>
                <IconButton color="inherit" onClick={handleLogoutClick}>
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </>
          ) : null}
        </Toolbar>
      </AppBar>

      {/* Ana İçerik */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {currentUser || isGuest ? (
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
        ) : (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            minHeight="70vh"
            textAlign="center"
          >
            <Typography 
              variant="h2" 
              fontWeight="bold" 
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                mb: 2,
              }}
            >
               MacroMate
            </Typography>
            
            <Typography 
              variant="h6" 
              color="text.secondary" 
              maxWidth="500px"
              sx={{ 
                fontWeight: 400,
                mb: 5,
                px: 2,
              }}
            >
              Kalori ve makrolarınızı takip edin
            </Typography>

            <Button 
              variant="contained" 
              size="large"
              onClick={() => setAuthOpen(true)}
              sx={{ 
                px: 5, 
                py: 1.8, 
                fontSize: '1.1rem',
                fontWeight: 600,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                boxShadow: '0 4px 14px rgba(102, 126, 234, 0.4)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a4190 100%)',
                  transform: 'translateY(-1px)',
                  boxShadow: '0 6px 18px rgba(102, 126, 234, 0.5)',
                }
              }}
            >
              Hemen Başla
            </Button>
          </Box>
        )}
      </Container>
        
      {/* Footer */}
      <Box 
        component="footer"
        mt={6}
        py={3}
        bgcolor="primary.main"
        display="flex" 
        alignItems="center" 
        justifyContent="center"
      >
        <Typography sx={{ color: 'primary.contrastText' }}>
          85 Company © {new Date().getFullYear()} - MIT License
        </Typography>
        <MuiLink
          href="https://github.com/Sqap85/MacroMate"
          target="_blank"
          rel="noopener noreferrer"
        >
          <GitHubIcon
            sx={{
              color: "primary.contrastText",
              marginLeft: "10px",
              ":hover": { opacity: 0.8 },
            }}
          />
        </MuiLink>
      </Box>

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
      >
        <DialogTitle id="logout-dialog-title">
          {isGuest ? "Misafir Modundan Çık" : "Çıkış Yap"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {isGuest ? (
              <>
                Misafir modundan çıkmak istediğinize emin misiniz?
                <br /><br />
                <strong>Uyarı:</strong> Tüm verileriniz silinecektir. Verilerinizi kaydetmek için lütfen hesap oluşturun.
              </>
            ) : (
              "Çıkış yapmak istediğinize emin misiniz?"
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelLogout} color="primary">
            İptal
          </Button>
          <Button 
            onClick={handleLogout} 
            color={isGuest ? "error" : "primary"}
            variant="contained"
            autoFocus
          >
            {isGuest ? "Çık ve Verileri Sil" : "Çıkış Yap"}
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