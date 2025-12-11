import { useState } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Box,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import DinnerDiningIcon from '@mui/icons-material/DinnerDining';
import CookieIcon from '@mui/icons-material/Cookie';
import type { FoodFormData, MealType } from '../types';

interface FoodFormProps {
  onAddFood: (food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealType?: MealType;
  }) => void;
}

export function FoodForm({ onAddFood }: FoodFormProps) {
  const [formData, setFormData] = useState<FoodFormData>({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    mealType: undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validasyonu
    if (!formData.name || !formData.calories) {
      alert('Lütfen en az yemek adı ve kalori giriniz');
      return;
    }

    // String'leri number'a çevir
    onAddFood({
      name: formData.name,
      calories: Number(formData.calories),
      protein: Number(formData.protein) || 0,
      carbs: Number(formData.carbs) || 0,
      fat: Number(formData.fat) || 0,
      mealType: formData.mealType,
    });

    // Formu temizle
    setFormData({
      name: '',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      mealType: undefined,
    });
  };

  const handleChange = (field: keyof FoodFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  return (
    <Card 
      elevation={3}
      sx={{
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 6,
        },
      }}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom>
          🍽️ Yemek Ekle
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            {/* Öğün Seçimi */}
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                Öğün Türü
              </Typography>
              <ToggleButtonGroup
                value={formData.mealType}
                exclusive
                onChange={(_, value) => setFormData({ ...formData, mealType: value as MealType })}
                fullWidth
                size="small"
              >
                <ToggleButton value="breakfast">
                  <LocalCafeIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Kahvaltı
                </ToggleButton>
                <ToggleButton value="lunch">
                  <LunchDiningIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Öğle
                </ToggleButton>
                <ToggleButton value="dinner">
                  <DinnerDiningIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Akşam
                </ToggleButton>
                <ToggleButton value="snack">
                  <CookieIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Atıştırma
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <TextField
              fullWidth
              label="Yemek Adı"
              value={formData.name}
              onChange={handleChange('name')}
              required
            />
            
            <Box display="flex" gap={2}>
              <TextField
                fullWidth
                label="Kalori"
                type="number"
                value={formData.calories}
                onChange={handleChange('calories')}
                required
                inputProps={{ min: 0 }}
              />
              <TextField
                fullWidth
                label="Protein (g)"
                type="number"
                value={formData.protein}
                onChange={handleChange('protein')}
                inputProps={{ min: 0 }}
              />
            </Box>
            
            <Box display="flex" gap={2}>
              <TextField
                fullWidth
                label="Karbonhidrat (g)"
                type="number"
                value={formData.carbs}
                onChange={handleChange('carbs')}
                inputProps={{ min: 0 }}
              />
              <TextField
                fullWidth
                label="Yağ (g)"
                type="number"
                value={formData.fat}
                onChange={handleChange('fat')}
                inputProps={{ min: 0 }}
              />
            </Box>
            
            <Button
              fullWidth
              variant="contained"
              color="primary"
              type="submit"
              startIcon={<AddIcon />}
              size="large"
            >
              Ekle
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}
