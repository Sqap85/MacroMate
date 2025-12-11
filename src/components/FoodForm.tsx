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
  Autocomplete,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import DinnerDiningIcon from '@mui/icons-material/DinnerDining';
import CookieIcon from '@mui/icons-material/Cookie';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import type { FoodFormData, MealType, FoodTemplate } from '../types';

interface FoodFormProps {
  onAddFood: (food: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealType?: MealType;
  }) => void;
  foodTemplates: FoodTemplate[];
  onAddFromTemplate: (templateId: string, grams: number, mealType?: string) => void;
  onOpenTemplates: () => void;
}

export function FoodForm({ onAddFood, foodTemplates, onAddFromTemplate, onOpenTemplates }: FoodFormProps) {
  const [tabValue, setTabValue] = useState(0);
  const [formData, setFormData] = useState<FoodFormData>({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    mealType: undefined,
  });

  // Şablon modunda kullanılacak state'ler
  const [selectedTemplate, setSelectedTemplate] = useState<FoodTemplate | null>(null);
  const [grams, setGrams] = useState('');
  const [pieces, setPieces] = useState('');
  const [templateMealType, setTemplateMealType] = useState<MealType | undefined>(undefined);

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

  const handleTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTemplate) {
      alert('Lütfen bir besin seçiniz');
      return;
    }

    let amountToAdd: number;
    
    if (selectedTemplate.unit === 'piece') {
      if (!pieces) {
        alert('Lütfen kaç adet yediğinizi giriniz');
        return;
      }
      // Adet bazında: direk adet sayısını gönder
      amountToAdd = Number(pieces);
    } else {
      if (!grams) {
        alert('Lütfen kaç gram yediğinizi giriniz');
        return;
      }
      // Gram bazında: gram miktarını gönder
      amountToAdd = Number(grams);
    }

    onAddFromTemplate(selectedTemplate.id, amountToAdd, templateMealType);

    // Formu temizle
    setSelectedTemplate(null);
    setGrams('');
    setPieces('');
    setTemplateMealType(undefined);
  };

  // Seçili şablonun önizleme değerlerini hesapla
  const getPreviewValues = () => {
    if (!selectedTemplate) return null;
    
    let gramsToCalculate: number;
    
    if (selectedTemplate.unit === 'piece') {
      if (!pieces) return null;
      gramsToCalculate = Number(pieces) * (selectedTemplate.servingSize || 0);
    } else {
      if (!grams) return null;
      gramsToCalculate = Number(grams);
    }
    
    const multiplier = gramsToCalculate / 100;
    return {
      grams: gramsToCalculate,
      calories: Math.round(selectedTemplate.caloriesPer100g * multiplier),
      protein: Math.round(selectedTemplate.proteinPer100g * multiplier * 10) / 10,
      carbs: Math.round(selectedTemplate.carbsPer100g * multiplier * 10) / 10,
      fat: Math.round(selectedTemplate.fatPer100g * multiplier * 10) / 10,
    };
  };

  const previewValues = getPreviewValues();

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
        <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            🍽️ Yemek Ekle
          </Typography>
          <Button
            size="small"
            variant="outlined"
            onClick={onOpenTemplates}
            startIcon={<RestaurantMenuIcon />}
          >
            Besinlerim
          </Button>
        </Box>

        <Tabs 
          value={tabValue} 
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ mb: 2 }}
        >
          <Tab label="Kayıtlı Besinler" />
          <Tab label="Manuel Giriş" />
        </Tabs>

        <Divider sx={{ mb: 2 }} />

        {/* TAB 0: Şablon Seçimi */}
        {tabValue === 0 && (
          <Box component="form" onSubmit={handleTemplateSubmit}>
            <Stack spacing={2}>
              {/* Öğün Seçimi */}
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  Öğün Türü
                </Typography>
                <ToggleButtonGroup
                  value={templateMealType}
                  exclusive
                  onChange={(_, value) => setTemplateMealType(value as MealType)}
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

              <Autocomplete
                options={foodTemplates}
                getOptionLabel={(option) => option.name}
                value={selectedTemplate}
                onChange={(_, newValue) => {
                  setSelectedTemplate(newValue);
                  // Şablon değişince miktar alanlarını temizle
                  setGrams('');
                  setPieces('');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Besin Seç"
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props}>
                    <Box sx={{ width: '100%' }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2">{option.name}</Typography>
                        {option.unit === 'piece' && (
                          <Typography variant="caption" color="primary">
                            ({option.servingSize}g/adet)
                          </Typography>
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        100g: {option.caloriesPer100g} kcal | P: {option.proteinPer100g}g
                      </Typography>
                    </Box>
                  </Box>
                )}
                noOptionsText={
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Henüz besin eklemediniz
                    </Typography>
                    <Button 
                      size="small" 
                      onClick={onOpenTemplates}
                      sx={{ mt: 1 }}
                    >
                      Besin Ekle
                    </Button>
                  </Box>
                }
              />

              {/* Miktar Girişi - Gram veya Adet */}
              {selectedTemplate && (
                selectedTemplate.unit === 'piece' ? (
                  <TextField
                    fullWidth
                    label={`Kaç Adet ${selectedTemplate.name}?`}
                    type="number"
                    value={pieces}
                    onChange={(e) => setPieces(e.target.value)}
                    inputProps={{ min: 0, step: 1 }}
                    helperText={`1 ${selectedTemplate.name} ≈ ${selectedTemplate.servingSize}g`}
                  />
                ) : (
                  <TextField
                    fullWidth
                    label="Miktar (gram)"
                    type="number"
                    value={grams}
                    onChange={(e) => setGrams(e.target.value)}
                    inputProps={{ min: 0, step: 1 }}
                  />
                )
              )}

              {/* Önizleme */}
              {previewValues && (
                <Box 
                  sx={{ 
                    p: 2, 
                    bgcolor: 'action.hover', 
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}
                >
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    {selectedTemplate?.unit === 'piece' 
                      ? `Toplam Değerler (${pieces} adet ≈ ${previewValues.grams}g)`
                      : `Toplam Değerler (${grams}g)`
                    }
                  </Typography>
                  <Box display="flex" gap={2} flexWrap="wrap">
                    <Typography variant="body2">
                      🔥 {previewValues.calories} kcal
                    </Typography>
                    <Typography variant="body2">
                      🥩 {previewValues.protein}g protein
                    </Typography>
                    <Typography variant="body2">
                      🍚 {previewValues.carbs}g karb.
                    </Typography>
                    <Typography variant="body2">
                      🧈 {previewValues.fat}g yağ
                    </Typography>
                  </Box>
                </Box>
              )}

              <Button
                fullWidth
                variant="contained"
                color="primary"
                type="submit"
                startIcon={<AddIcon />}
                size="large"
                disabled={!selectedTemplate || (selectedTemplate.unit === 'piece' ? !pieces : !grams)}
              >
                Ekle
              </Button>
            </Stack>
          </Box>
        )}

        {/* TAB 1: Manuel Giriş */}
        {tabValue === 1 && (
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
        )}
      </CardContent>
    </Card>
  );
}
