import { useState, useEffect } from 'react';
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
  TextField,
  InputAdornment,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import type { DailyGoal } from '../types';

interface GoalSettingsModalProps {
  open: boolean;
  onClose: () => void;
  currentGoal: DailyGoal;
  onSave: (goal: DailyGoal) => void;
}

const FIELDS = [
  { key: 'calories' as keyof DailyGoal, label: 'Günlük Kalori', unit: 'kcal', color: '#52525b', min: 500, max: 10000, step: 5 },
  { key: 'protein' as keyof DailyGoal, label: 'Protein', unit: 'g', color: '#0369a1', min: 10, max: 1250, step: 1 },
  { key: 'carbs' as keyof DailyGoal, label: 'Karbonhidrat', unit: 'g', color: '#15803d', min: 10, max: 2500, step: 1 },
  { key: 'fat' as keyof DailyGoal, label: 'Yağ', unit: 'g', color: '#b45309', min: 5, max: 600, step: 1 },
] as const;

// Standard 25% protein / 50% carbs / 25% fat split
function recommendMacros(calories: number) {
  return {
    protein: Math.max(10,  Math.round(calories * 0.25 / 4)),
    carbs:   Math.max(10,  Math.round(calories * 0.50 / 4)),
    fat:     Math.max(5,   Math.round(calories * 0.25 / 9)),
  };
}

function toInputs(g: DailyGoal): Record<keyof DailyGoal, string> {
  return { calories: String(g.calories), protein: String(g.protein), carbs: String(g.carbs), fat: String(g.fat) };
}

export function GoalSettingsModal({ open, onClose, currentGoal, onSave }: Readonly<GoalSettingsModalProps>) {
  const [goal, setGoal] = useState<DailyGoal>(currentGoal);
  const [inputValues, setInputValues] = useState<Record<keyof DailyGoal, string>>(toInputs(currentGoal));

  // Sync with currentGoal whenever modal opens
  useEffect(() => {
    if (open) {
      setGoal(currentGoal);
      setInputValues(toInputs(currentGoal));
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyGoal = (next: DailyGoal) => {
    setGoal(next);
    setInputValues(toInputs(next));
  };

  const handleSave = () => {
    onSave(goal);
    onClose();
  };

  const handleSlider = (field: keyof DailyGoal, value: number) => {
    if (field === 'calories') {
      applyGoal({ calories: value, ...recommendMacros(value) });
    } else {
      setGoal(prev => ({ ...prev, [field]: value }));
      setInputValues(prev => ({ ...prev, [field]: String(value) }));
    }
  };

  const handleInput = (field: keyof DailyGoal, raw: string, min: number, max: number) => {
    setInputValues(prev => ({ ...prev, [field]: raw }));
    const n = Number(raw);
    if (raw !== '' && !Number.isNaN(n) && n >= min) {
      setGoal(prev => ({ ...prev, [field]: Math.min(max, Math.round(n)) }));
    }
  };

  const handleInputBlur = (field: keyof DailyGoal, min: number, max: number) => {
    const n = Number(inputValues[field]);
    const clamped = Number.isNaN(n) || inputValues[field] === '' ? min : Math.min(max, Math.max(min, Math.round(n)));
    if (field === 'calories') {
      applyGoal({ calories: clamped, ...recommendMacros(clamped) });
    } else {
      setGoal(prev => ({ ...prev, [field]: clamped }));
      setInputValues(prev => ({ ...prev, [field]: String(clamped) }));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="goal-settings-dialog-title"
      PaperProps={{ sx: { borderRadius: 3, overflow: 'hidden' } }}
    >
      <DialogTitle id="goal-settings-dialog-title" sx={{ pb: 1.5, pt: 2.5, px: 3 }}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box sx={{
            width: 40, height: 40, borderRadius: 2,
            background: 'linear-gradient(135deg, rgba(24,24,27,0.08) 0%, rgba(63,63,70,0.08) 100%)',
            border: '1.5px solid rgba(24,24,27,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <SettingsIcon sx={{ fontSize: 20, color: 'text.primary' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Günlük Hedefler</Typography>
            <Typography variant="caption" color="text.secondary">Kalori ve makro hedeflerinizi ayarlayın</Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 1 }}>
        <Stack spacing={3} mt={1}>
          {FIELDS.map(({ key, label, unit, color, min, max, step }) => (
            <Box key={key}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" fontWeight={600}>{label}</Typography>
                <TextField
                  type="number"
                  value={inputValues[key]}
                  onChange={(e) => handleInput(key, e.target.value, min, max)}
                  onBlur={() => handleInputBlur(key, min, max)}
                  size="small"
                  slotProps={{
                    input: {
                      endAdornment: <InputAdornment position="end"><Typography variant="caption" color="text.secondary">{unit}</Typography></InputAdornment>,
                      inputProps: { min, max, step },
                    },
                  }}
                  sx={{
                    width: 130,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: color, borderWidth: 2 },
                    },
                    '& input': { fontWeight: 700, color, textAlign: 'right', py: 0.75 },
                  }}
                />
              </Box>
              <Slider
                value={goal[key]}
                onChange={(_, value) => handleSlider(key, value as number)}
                min={min}
                max={max}
                step={step}
                sx={{
                  color,
                  '& .MuiSlider-thumb': { width: 16, height: 16 },
                  '& .MuiSlider-track': { height: 4 },
                  '& .MuiSlider-rail': { height: 4, opacity: 0.2 },
                }}
              />
            </Box>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" sx={{ borderRadius: 2, flex: 1 }}>İptal</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          startIcon={<SaveIcon />}
          sx={{
            borderRadius: 2, flex: 1,
            background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)',
            boxShadow: 'none',
            '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.2)' },
          }}
        >
          Kaydet
        </Button>
      </DialogActions>
    </Dialog>
  );
}
