import { useState } from 'react';
import { Container, Typography, Box, AppBar, Toolbar, Stack, Link as MuiLink, Fade, IconButton, Tooltip } from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import HistoryIcon from '@mui/icons-material/History';
import { FoodForm } from './components/FoodForm';
import { StatsCard } from './components/StatsCard';
import { FoodList } from './components/FoodList';
import { GoalSettingsModal } from './components/GoalSettingsModal';
import { HistoryModal } from './components/HistoryModal';
import { Toast } from './components/Toast';
import { useFoodTracker } from './hooks/useFoodTracker';
import type { AlertColor } from '@mui/material';
import './App.css';

function App() {
  const { foods, allFoods, dailyGoal, dailyStats, addFood, deleteFood, updateGoal } = useFoodTracker();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: AlertColor }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleAddFood = (food: any) => {
    addFood(food);
    setToast({
      open: true,
      message: `✅ ${food.name} eklendi!`,
      severity: 'success',
    });
  };

  const handleDeleteFood = (id: string) => {
    const foodName = foods.find(f => f.id === id)?.name;
    deleteFood(id);
    setToast({
      open: true,
      message: `🗑️ ${foodName} silindi!`,
      severity: 'info',
    });
  };

  const handleSaveGoal = (goal: any) => {
    updateGoal(goal);
    setToast({
      open: true,
      message: '🎯 Hedefler güncellendi!',
      severity: 'success',
    });
  };

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
          <Tooltip title="Geçmiş & İstatistikler">
            <IconButton color="inherit" onClick={() => setHistoryOpen(true)}>
              <HistoryIcon />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Ana İçerik */}
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
              <FoodForm onAddFood={handleAddFood} />
            </Box>
          </Fade>
          
          {/* Yemek Listesi */}
          <Fade in timeout={900}>
            <Box>
              <FoodList foods={foods} onDeleteFood={handleDeleteFood} />
            </Box>
          </Fade>
        </Stack>
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
