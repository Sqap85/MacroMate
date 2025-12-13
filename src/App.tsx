import { useState, useEffect } from 'react';
import { Container, Typography, Box, AppBar, Toolbar, Stack, Link as MuiLink, Fade, IconButton, Tooltip, CircularProgress, Button } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { FoodForm } from './components/FoodForm';
import { StatsCard } from './components/StatsCard';
import { FoodList } from './components/FoodList';
import { GoalSettingsModal } from './components/GoalSettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { FoodTemplatesModal } from './components/FoodTemplatesModal';
import { AuthModal } from './components/AuthModal';
import { Toast } from './components/Toast';
import { useFoodTracker } from './hooks/useFoodTracker';
import { useAuth } from './contexts/AuthContext';
import { migrateFromLocalStorage } from './services/firestoreService';
import type { AlertColor } from '@mui/material';
import './App.css';

function App() {
  const { currentUser, logout, isGuest } = useAuth();
  const { 
    foods, 
    allFoods, 
    dailyGoal, 
    dailyStats,
    loading: dataLoading,
    addFood, 
    deleteFood, 
    editFood,
    updateGoal,
    foodTemplates,
    addFoodTemplate,
    deleteFoodTemplate,
    editFoodTemplate,
    addFoodFromTemplate,
  } = useFoodTracker();
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: AlertColor }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Kullanıcı giriş yaptığında LocalStorage'dan migrate et (sadece misafir modundan gelenler için)
  useEffect(() => {
    if (currentUser) {
      // Sadece misafir modundan gelen kullanıcılar için migration yap
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
                message: '✅ Verileriniz başarıyla hesabınıza aktarıldı!',
                severity: 'success',
              });
              // Migration sonrası LocalStorage'ı temizle
              localStorage.removeItem('macromate-foods');
              localStorage.removeItem('macromate-goal');
              localStorage.removeItem('macromate-templates');
            })
            .catch((error) => {
              console.error('Migration error:', error);
              setToast({
                open: true,
                message: '⚠️ Veriler aktarılırken bir sorun oluştu',
                severity: 'warning',
              });
            })
            .finally(() => {
              // Migration flag'ini temizle
              sessionStorage.removeItem('migrateFromGuest');
            });
        } else {
          sessionStorage.removeItem('migrateFromGuest');
        }
      }
    }
  }, [currentUser]);

  // Auth modal'ı otomatik açma (kullanıcı butona tıklayarak açacak)

  const handleAddFood = async (food: any) => {
    try {
      await addFood(food);
      setToast({
        open: true,
        message: `✅ ${food.name} eklendi!`,
        severity: 'success',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || '❌ Yemek eklenirken hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleAddFromTemplate = async (templateId: string, grams: number, mealType?: string) => {
    try {
      await addFoodFromTemplate(templateId, grams, mealType);
      const template = foodTemplates.find(t => t.id === templateId);
      setToast({
        open: true,
        message: `✅ ${template?.name} (${grams}g) eklendi!`,
        severity: 'success',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || '❌ Şablondan yemek eklenirken hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleDeleteFood = async (id: string) => {
    try {
      const foodName = foods.find(f => f.id === id)?.name;
      await deleteFood(id);
      setToast({
        open: true,
        message: `🗑️ ${foodName} silindi!`,
        severity: 'info',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || '❌ Yemek silinirken hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleEditFood = async (id: string, updatedFood: any) => {
    try {
      await editFood(id, updatedFood);
      setToast({
        open: true,
        message: `✏️ ${updatedFood.name} güncellendi!`,
        severity: 'success',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || '❌ Yemek güncellenirken hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleSaveGoal = async (goal: any) => {
    try {
      await updateGoal(goal);
      setToast({
        open: true,
        message: '🎯 Hedefler güncellendi!',
        severity: 'success',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || '❌ Hedefler güncellenirken hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleAddTemplate = async (template: Omit<any, 'id'>) => {
    try {
      await addFoodTemplate(template);
      setToast({
        open: true,
        message: `✅ ${template.name} şablonu eklendi!`,
        severity: 'success',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || '❌ Şablon eklenirken hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      await deleteFoodTemplate(id);
      setToast({
        open: true,
        message: '🗑️ Şablon silindi!',
        severity: 'info',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || '❌ Şablon silinirken hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleEditTemplate = async (id: string, template: Omit<any, 'id'>) => {
    try {
      await editFoodTemplate(id, template);
      setToast({
        open: true,
        message: `✏️ ${template.name} güncellendi!`,
        severity: 'success',
      });
    } catch (error: any) {
      setToast({
        open: true,
        message: error.message || '❌ Şablon güncellenirken hata oluştu',
        severity: 'error',
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setToast({
        open: true,
        message: '👋 Çıkış yapıldı',
        severity: 'info',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Veri yüklenirken loading göster (sadece kullanıcı giriş yaptıysa, misafir değilse)
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

  return (
    <>
      {/* Header */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Typography variant="h5" component="h1" fontWeight="bold">
            MacroMate
          </Typography>
          <Typography variant="subtitle1" sx={{ ml: 2, opacity: 0.9 }}>
            Kalori Takip Uygulaması
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          
          {currentUser || isGuest ? (
            <>
              <Typography variant="body2" sx={{ mr: 2, opacity: 0.9 }}>
                {isGuest ? (
                  '👤 Misafir'
                ) : (
                  `Merhaba, ${currentUser?.displayName || currentUser?.email}`
                )}
              </Typography>
              {isGuest ? (
                <>
                  <Tooltip title="Geçmiş sadece kayıtlı kullanıcılar için">
                    <span>
                      <IconButton color="inherit" disabled sx={{ opacity: 0.5 }}>
                        <HistoryIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Hesap Oluştur">
                    <IconButton 
                      color="inherit" 
                      onClick={() => setAuthOpen(true)}
                    
                    >
                      <PersonAddIcon />
                    </IconButton>
                  </Tooltip>
                </>
              ) : (
                <Tooltip title="Geçmiş & İstatistikler">
                  <IconButton color="inherit" onClick={() => setHistoryOpen(true)}>
                    <HistoryIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={isGuest ? "Misafir Modundan Çık" : "Çıkış Yap"}>
                <IconButton color="inherit" onClick={handleLogout}>
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
            {/* Ana Başlık */}
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

            {/* CTA Button */}
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
                textTransform: 'none',
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
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
      />
      
      <GoalSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentGoal={dailyGoal}
        onSave={handleSaveGoal}
      />

      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        foods={allFoods}
        goal={dailyGoal}
      />

      <FoodTemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        templates={foodTemplates}
        onAddTemplate={handleAddTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onEditTemplate={handleEditTemplate}
      />
      
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast({ ...toast, open: false })}
      />
    </>
  );
}

export default App;
