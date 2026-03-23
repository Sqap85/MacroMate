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
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import DinnerDiningIcon from '@mui/icons-material/DinnerDining';
import CookieIcon from '@mui/icons-material/Cookie';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import type { FoodFormData, MealType, FoodTemplate } from '../types';
import { formatGrams } from '../utils/numberUtils';
import { BarcodeScanner } from './BarcodeScanner';

// Öğün renk tanımları - tüm bileşenlerle tutarlı
const MEAL_COLORS = {
  breakfast: '#FF6B35',
  lunch: '#F7931E',
  dinner: '#9D4EDD',
  snack: '#06A77D',
} as const;

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
  onSaveTemplateAndAdd: (
    template: Omit<FoodTemplate, 'id'>,
    amount: number,
    mealType?: MealType
  ) => void;
}

export function FoodForm({ onAddFood, foodTemplates, onAddFromTemplate, onOpenTemplates, onSaveTemplateAndAdd }: Readonly<FoodFormProps>) {
  const [tabValue, setTabValue] = useState(0);
  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
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
    
    if (!formData.name || !formData.calories) {
      return;
    }

    onAddFood({
      name: formData.name,
      calories: Number(formData.calories),
      protein: Number(formData.protein) || 0,
      carbs: Number(formData.carbs) || 0,
      fat: Number(formData.fat) || 0,
      mealType: formData.mealType,
    });

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
      return;
    }

    let amountToAdd: number;
    
    if (selectedTemplate.unit === 'piece') {
      if (!pieces) return;
      amountToAdd = Number(pieces);
    } else {
      if (!grams) return;
      amountToAdd = Number(grams);
    }

    onAddFromTemplate(selectedTemplate.id, amountToAdd, templateMealType);

    setSelectedTemplate(null);
    setGrams('');
    setPieces('');
    setTemplateMealType(undefined);
  };

  const getPreviewValues = () => {
    if (!selectedTemplate) return null;
    if (selectedTemplate.unit === 'piece') {
      if (!pieces) return null;
      const numberOfPieces = Number(pieces);
      return {
        pieces: numberOfPieces,
        calories: Math.round(selectedTemplate.calories * numberOfPieces),
        protein: Math.round(selectedTemplate.protein * numberOfPieces * 10) / 10,
        carbs: Math.round(selectedTemplate.carbs * numberOfPieces * 10) / 10,
        fat: Math.round(selectedTemplate.fat * numberOfPieces * 10) / 10,
      };
    } else {
      if (!grams) return null;
      const gramsToCalculate = Number(grams);
      const multiplier = gramsToCalculate / 100;
      return {
        grams: gramsToCalculate,
        calories: Math.round(selectedTemplate.calories * multiplier),
        protein: Math.round(selectedTemplate.protein * multiplier * 10) / 10,
        carbs: Math.round(selectedTemplate.carbs * multiplier * 10) / 10,
        fat: Math.round(selectedTemplate.fat * multiplier * 10) / 10,
      };
    }
  };

  const previewValues = getPreviewValues();

  return (
    <>
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
            <Box display="flex" alignItems="center" gap={1}>
              <RestaurantIcon color="primary" />
              <Typography variant="h6">
                Yemek Ekle
              </Typography>
            </Box>
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
                    <ToggleButton
                      value="breakfast"
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: `${MEAL_COLORS.breakfast}22`,
                          color: MEAL_COLORS.breakfast,
                          borderColor: MEAL_COLORS.breakfast,
                        },
                        '&:hover': { bgcolor: `${MEAL_COLORS.breakfast}11` },
                      }}
                    >
                      <LocalCafeIcon fontSize="small" sx={{ mr: 0.5, color: MEAL_COLORS.breakfast }} />
                      Kahvaltı
                    </ToggleButton>
                    <ToggleButton
                      value="lunch"
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: `${MEAL_COLORS.lunch}22`,
                          color: MEAL_COLORS.lunch,
                          borderColor: MEAL_COLORS.lunch,
                        },
                        '&:hover': { bgcolor: `${MEAL_COLORS.lunch}11` },
                      }}
                    >
                      <LunchDiningIcon fontSize="small" sx={{ mr: 0.5, color: MEAL_COLORS.lunch }} />
                      Öğle
                    </ToggleButton>
                    <ToggleButton
                      value="dinner"
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: `${MEAL_COLORS.dinner}22`,
                          color: MEAL_COLORS.dinner,
                          borderColor: MEAL_COLORS.dinner,
                        },
                        '&:hover': { bgcolor: `${MEAL_COLORS.dinner}11` },
                      }}
                    >
                      <DinnerDiningIcon fontSize="small" sx={{ mr: 0.5, color: MEAL_COLORS.dinner }} />
                      Akşam
                    </ToggleButton>
                    <ToggleButton
                      value="snack"
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: `${MEAL_COLORS.snack}22`,
                          color: MEAL_COLORS.snack,
                          borderColor: MEAL_COLORS.snack,
                        },
                        '&:hover': { bgcolor: `${MEAL_COLORS.snack}11` },
                      }}
                    >
                      <CookieIcon fontSize="small" sx={{ mr: 0.5, color: MEAL_COLORS.snack }} />
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
                    if (newValue) {
                      if (newValue.unit === 'piece') {
                        setPieces('1');
                        setGrams('');
                      } else {
                        setGrams('');
                        setPieces('');
                      }
                    } else {
                      setGrams('');
                      setPieces('');
                    }
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
                              (Adet)
                            </Typography>
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {option.unit === 'piece' 
                            ? `1 adet: ${option.calories} kcal | P: ${formatGrams(option.protein)}g`
                            : `100g: ${option.calories} kcal | P: ${formatGrams(option.protein)}g`
                          }
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

                {/* Miktar Girişi */}
                {selectedTemplate && (
                  selectedTemplate.unit === 'piece' ? (
                    <TextField
                      fullWidth
                      label={`Kaç Adet ${selectedTemplate.name}?`}
                      type="number"
                      value={pieces}
                      onChange={(e) => setPieces(e.target.value)}
                      inputProps={{ min: 0, step: 0.01 }}
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
                        ? `Toplam Değerler (${pieces} adet)`
                        : `Toplam Değerler (${grams}g)`
                      }
                    </Typography>
                    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'nowrap' }}>
                      <Chip
                        label={`${previewValues.calories} kcal`}
                        size="small"
                        color="error"
                        variant="outlined"
                        sx={{
                          flex: { xs: 1, sm: '0 0 auto' },
                          minWidth: { xs: 0, sm: 'auto' },
                          height: { xs: 20, sm: 24 },
                          fontSize: { xs: '0.62rem', sm: '0.72rem' },
                          '& .MuiChip-label': { px: { xs: 0.6, sm: 1 } },
                        }}
                      />
                      <Chip
                        label={`${formatGrams(previewValues.protein)}g protein`}
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{
                          flex: { xs: 1, sm: '0 0 auto' },
                          minWidth: { xs: 0, sm: 'auto' },
                          height: { xs: 20, sm: 24 },
                          fontSize: { xs: '0.62rem', sm: '0.72rem' },
                          '& .MuiChip-label': { px: { xs: 0.6, sm: 1 } },
                        }}
                      />
                      <Chip
                        label={`${formatGrams(previewValues.carbs)}g karb.`}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{
                          flex: { xs: 1, sm: '0 0 auto' },
                          minWidth: { xs: 0, sm: 'auto' },
                          height: { xs: 20, sm: 24 },
                          fontSize: { xs: '0.62rem', sm: '0.72rem' },
                          '& .MuiChip-label': { px: { xs: 0.6, sm: 1 } },
                        }}
                      />
                      <Chip
                        label={`${formatGrams(previewValues.fat)}g yağ`}
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{
                          flex: { xs: 1, sm: '0 0 auto' },
                          minWidth: { xs: 0, sm: 'auto' },
                          height: { xs: 20, sm: 24 },
                          fontSize: { xs: '0.62rem', sm: '0.72rem' },
                          '& .MuiChip-label': { px: { xs: 0.6, sm: 1 } },
                        }}
                      />
                    </Stack>
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
                    <ToggleButton
                      value="breakfast"
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: `${MEAL_COLORS.breakfast}22`,
                          color: MEAL_COLORS.breakfast,
                          borderColor: MEAL_COLORS.breakfast,
                        },
                        '&:hover': { bgcolor: `${MEAL_COLORS.breakfast}11` },
                      }}
                    >
                      <LocalCafeIcon fontSize="small" sx={{ mr: 0.5, color: MEAL_COLORS.breakfast }} />
                      Kahvaltı
                    </ToggleButton>
                    <ToggleButton
                      value="lunch"
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: `${MEAL_COLORS.lunch}22`,
                          color: MEAL_COLORS.lunch,
                          borderColor: MEAL_COLORS.lunch,
                        },
                        '&:hover': { bgcolor: `${MEAL_COLORS.lunch}11` },
                      }}
                    >
                      <LunchDiningIcon fontSize="small" sx={{ mr: 0.5, color: MEAL_COLORS.lunch }} />
                      Öğle
                    </ToggleButton>
                    <ToggleButton
                      value="dinner"
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: `${MEAL_COLORS.dinner}22`,
                          color: MEAL_COLORS.dinner,
                          borderColor: MEAL_COLORS.dinner,
                        },
                        '&:hover': { bgcolor: `${MEAL_COLORS.dinner}11` },
                      }}
                    >
                      <DinnerDiningIcon fontSize="small" sx={{ mr: 0.5, color: MEAL_COLORS.dinner }} />
                      Akşam
                    </ToggleButton>
                    <ToggleButton
                      value="snack"
                      sx={{
                        '&.Mui-selected': {
                          bgcolor: `${MEAL_COLORS.snack}22`,
                          color: MEAL_COLORS.snack,
                          borderColor: MEAL_COLORS.snack,
                        },
                        '&:hover': { bgcolor: `${MEAL_COLORS.snack}11` },
                      }}
                    >
                      <CookieIcon fontSize="small" sx={{ mr: 0.5, color: MEAL_COLORS.snack }} />
                      Atıştırma
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {/* Barkod Tara Butonu */}
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<QrCodeScannerIcon />}
                  onClick={() => setBarcodeScannerOpen(true)}
                  color="secondary"
                  sx={{
                    minHeight: 56,
                  }}
                >
                  Barkod Tara
                </Button>

                <Divider>
                  <Typography variant="caption" color="text.secondary">
                    veya elle gir
                  </Typography>
                </Divider>

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

      {/* Barkod Scanner Modal */}
      <BarcodeScanner
        open={barcodeScannerOpen}
        onClose={() => setBarcodeScannerOpen(false)}
        existingTemplates={foodTemplates}
        onAddFood={(food) => {
          onAddFood(food);
          setBarcodeScannerOpen(false);
        }}
        onSaveAndAdd={(template, amount, mealType) => {
          onSaveTemplateAndAdd(template, amount, mealType);
          setBarcodeScannerOpen(false);
        }}
        onAddFromTemplate={(templateId, amount, mealType) => {
          onAddFromTemplate(templateId, amount, mealType);
          setBarcodeScannerOpen(false);
        }}
      />
    </>
  );
}