import { useState } from 'react';
import {
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Box,
  Stack,
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
import RestaurantIcon from '@mui/icons-material/Restaurant';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import type { FoodFormData, MealType, FoodTemplate } from '../types';
import { formatGrams } from '../utils/numberUtils';
import { BarcodeScanner } from './BarcodeScanner';

// Öğün renk tanımları - tüm bileşenlerle tutarlı
const MEAL_COLORS = {
  breakfast: '#d97706',
  lunch: '#0284c7',
  dinner: '#7c3aed',
  snack: '#16a34a',
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
      <Card elevation={2}>
        <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
          <Box sx={{ mb: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 32, height: 32, borderRadius: '9px',
                  background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(24,24,27,0.35)',
                }}
              >
                <RestaurantIcon sx={{ fontSize: 17, color: '#fff' }} />
              </Box>
              <Typography variant="subtitle1" fontWeight={700}>Yemek Ekle</Typography>
            </Box>
            <Button
              size="small"
              variant="outlined"
              onClick={onOpenTemplates}
              startIcon={<RestaurantMenuIcon />}
              sx={{
                borderRadius: 8,
                borderColor: 'rgba(24,24,27,0.35)',
                color: 'primary.main',
                '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(24,24,27,0.06)' },
              }}
            >
              Besinlerim
            </Button>
          </Box>

          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{
              mb: 2.5,
              '& .MuiTabs-indicator': {
                background: 'linear-gradient(90deg, #18181b, #3f3f46)',
                borderRadius: 2,
                height: 3,
              },
              '& .Mui-selected': { color: 'primary.main !important' },
            }}
          >
            <Tab label="Kayıtlı Besinler" />
            <Tab label="Manuel Giriş" />
          </Tabs>

          <Divider sx={{ mb: 2.5, borderColor: 'rgba(0,0,0,0.06)' }} />

          {/* TAB 0: Şablon Seçimi */}
          {tabValue === 0 && (
            <Box component="form" onSubmit={handleTemplateSubmit}>
              <Stack spacing={2.5}>
                {/* Öğün Seçimi - Card style */}
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1} fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                    Öğün Türü
                  </Typography>
                  <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={1}>
                    {([
                      { value: 'breakfast', icon: LocalCafeIcon, label: 'Kahvaltı', color: MEAL_COLORS.breakfast },
                      { value: 'lunch', icon: LunchDiningIcon, label: 'Öğle', color: MEAL_COLORS.lunch },
                      { value: 'dinner', icon: DinnerDiningIcon, label: 'Akşam', color: MEAL_COLORS.dinner },
                      { value: 'snack', icon: CookieIcon, label: 'Atıştırma', color: MEAL_COLORS.snack },
                    ] as const).map(({ value, icon: Icon, label, color }) => {
                      const selected = templateMealType === value;
                      return (
                        <Box
                          key={value}
                          onClick={() => setTemplateMealType(selected ? undefined : value as MealType)}
                          sx={{
                            cursor: 'pointer',
                            borderRadius: 2.5,
                            p: 1,
                            border: '1.5px solid',
                            borderColor: selected ? color : 'rgba(0,0,0,0.1)',
                            bgcolor: selected ? `${color}14` : 'rgba(255,255,255,0.6)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3,
                            transition: 'all 0.18s ease',
                            '&:hover': { borderColor: color, bgcolor: `${color}0e` },
                          }}
                        >
                          <Icon sx={{ fontSize: 18, color: selected ? color : 'text.secondary' }} />
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: selected ? 700 : 500, color: selected ? color : 'text.secondary', lineHeight: 1.2, textAlign: 'center' }}>
                            {label}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
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
                      p: 1.5,
                      bgcolor: 'rgba(24,24,27,0.04)',
                      borderRadius: 2.5,
                      border: '1px solid rgba(24,24,27,0.15)',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                      {selectedTemplate?.unit === 'piece' 
                        ? `Toplam Değerler (${pieces} adet)`
                        : `Toplam Değerler (${grams}g)`
                      }
                    </Typography>
                    <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'nowrap' }}>
                      {[
                        { label: `${previewValues.calories} kcal`, color: '#18181b' },
                        { label: `${formatGrams(previewValues.protein)}g P`, color: '#0369a1' },
                        { label: `${formatGrams(previewValues.carbs)}g K`, color: '#15803d' },
                        { label: `${formatGrams(previewValues.fat)}g Y`, color: '#b45309' },
                      ].map(({ label, color }) => (
                        <Box key={label} sx={{
                          flex: 1, minWidth: 0, textAlign: 'center',
                          px: 0.75, py: 0.4, borderRadius: 1.5,
                          bgcolor: `${color}12`, border: `1px solid ${color}28`,
                        }}>
                          <Typography sx={{ fontSize: { xs: '0.6rem', sm: '0.68rem' }, fontWeight: 700, color, lineHeight: 1.2 }}>
                            {label}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                <Button
                  fullWidth
                  variant="contained"
                  type="submit"
                  startIcon={<AddIcon />}
                  size="large"
                  disabled={!selectedTemplate || (selectedTemplate.unit === 'piece' ? !pieces : !grams)}
                  sx={{
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)',
                    boxShadow: 'none',
                    '&:hover': { boxShadow: '0 4px 12px rgba(24,24,27,0.35)' },
                    '&.Mui-disabled': { background: 'rgba(0,0,0,0.12)' },
                  }}
                >
                  Ekle
                </Button>
              </Stack>
            </Box>
          )}

          {/* TAB 1: Manuel Giriş */}
          {tabValue === 1 && (
            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                {/* Öğün Seçimi - Card style */}
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1} fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                    Öğün Türü
                  </Typography>
                  <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={1}>
                    {([
                      { value: 'breakfast', icon: LocalCafeIcon, label: 'Kahvaltı', color: MEAL_COLORS.breakfast },
                      { value: 'lunch', icon: LunchDiningIcon, label: 'Öğle', color: MEAL_COLORS.lunch },
                      { value: 'dinner', icon: DinnerDiningIcon, label: 'Akşam', color: MEAL_COLORS.dinner },
                      { value: 'snack', icon: CookieIcon, label: 'Atıştırma', color: MEAL_COLORS.snack },
                    ] as const).map(({ value, icon: Icon, label, color }) => {
                      const selected = formData.mealType === value;
                      return (
                        <Box
                          key={value}
                          onClick={() => setFormData({ ...formData, mealType: selected ? undefined : value as MealType })}
                          sx={{
                            cursor: 'pointer',
                            borderRadius: 2.5,
                            p: 1,
                            border: '1.5px solid',
                            borderColor: selected ? color : 'rgba(0,0,0,0.1)',
                            bgcolor: selected ? `${color}14` : 'rgba(255,255,255,0.6)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3,
                            transition: 'all 0.18s ease',
                            '&:hover': { borderColor: color, bgcolor: `${color}0e` },
                          }}
                        >
                          <Icon sx={{ fontSize: 18, color: selected ? color : 'text.secondary' }} />
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: selected ? 700 : 500, color: selected ? color : 'text.secondary', lineHeight: 1.2, textAlign: 'center' }}>
                            {label}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
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
                  type="submit"
                  startIcon={<AddIcon />}
                  size="large"
                  sx={{
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)',
                    boxShadow: 'none',
                    '&:hover': { boxShadow: '0 4px 12px rgba(24,24,27,0.35)' },
                  }}
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