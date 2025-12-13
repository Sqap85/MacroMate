import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Box,
  Slider,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import type { DailyGoal } from '../types';

interface GoalSettingsModalProps {
  open: boolean;
  onClose: () => void;
  currentGoal: DailyGoal;
  onSave: (goal: DailyGoal) => void;
}

export function GoalSettingsModal({ open, onClose, currentGoal, onSave }: GoalSettingsModalProps) {
  const [goal, setGoal] = useState<DailyGoal>(currentGoal);

  const handleSave = () => {
    // Validasyon
    if (goal.calories < 500 || goal.calories > 5000) {
      alert('Kalori hedefi 500-5000 arasında olmalıdır');
      return;
    }
    onSave(goal);
    onClose();
  };

  const handleChange = (field: keyof DailyGoal, value: number) => {
    setGoal({ ...goal, [field]: value });
  };

  // Makro dağılımı hesapla
  const totalMacros = goal.protein * 4 + goal.carbs * 4 + goal.fat * 9;
  const proteinPercent = Math.round((goal.protein * 4 / totalMacros) * 100) || 0;
  const carbsPercent = Math.round((goal.carbs * 4 / totalMacros) * 100) || 0;
  const fatPercent = Math.round((goal.fat * 9 / totalMacros) * 100) || 0;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      aria-labelledby="goal-settings-dialog-title"
    >
      <DialogTitle id="goal-settings-dialog-title">
        <Box display="flex" alignItems="center" gap={1}>
          <SettingsIcon />
          <Typography variant="h6">Günlük Hedefler</Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3} mt={2}>
          {/* Kalori Hedefi */}
          <Box>
            <Typography gutterBottom>
              Günlük Kalori Hedefi: <strong>{goal.calories} kcal</strong>
            </Typography>
            <Slider
              value={goal.calories}
              onChange={(_, value) => handleChange('calories', value as number)}
              min={500}
              max={5000}
              step={50}
              marks={[
                { value: 1000, label: '1000' },
                { value: 2000, label: '2000' },
                { value: 3000, label: '3000' },
                { value: 4000, label: '4000' },
              ]}
              color="error"
            />
          </Box>

          {/* Protein */}
          <Box>
            <Typography gutterBottom>
              Protein: <strong>{goal.protein}g</strong> ({proteinPercent}%)
            </Typography>
            <Slider
              value={goal.protein}
              onChange={(_, value) => handleChange('protein', value as number)}
              min={30}
              max={400}
              step={5}
              color="info"
            />
          </Box>

          {/* Karbonhidrat */}
          <Box>
            <Typography gutterBottom>
              Karbonhidrat: <strong>{goal.carbs}g</strong> ({carbsPercent}%)
            </Typography>
            <Slider
              value={goal.carbs}
              onChange={(_, value) => handleChange('carbs', value as number)}
              min={30}
              max={600}
              step={5}
              color="success"
            />
          </Box>

          {/* Yağ */}
          <Box>
            <Typography gutterBottom>
              Yağ: <strong>{goal.fat}g</strong> ({fatPercent}%)
            </Typography>
            <Slider
              value={goal.fat}
              onChange={(_, value) => handleChange('fat', value as number)}
              min={20}
              max={200}
              step={5}
              color="warning"
            />
          </Box>

        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>İptal</Button>
        <Button onClick={handleSave} variant="contained">
          Kaydet
        </Button>
      </DialogActions>
    </Dialog>
  );
}
