import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Chip,
  Stack,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tooltip,
  Collapse,
  Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import TodayIcon from '@mui/icons-material/Today';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import DinnerDiningIcon from '@mui/icons-material/DinnerDining';
import CookieIcon from '@mui/icons-material/Cookie';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import type { Food, FoodTemplate, MealType } from '../types';
import { useMemo, useState } from 'react';
import { formatGrams } from '../utils/numberUtils';

// Öğün renk tanımları - HistoryModal ile aynı
const MEAL_COLORS = {
  breakfast: '#d97706', // amber-600
  lunch: '#0284c7',     // sky-600
  dinner: '#7c3aed',    // violet-600
  snack: '#16a34a',     // green-600
} as const;

const MEAL_OPTIONS = [
  { value: 'breakfast' as MealType, icon: LocalCafeIcon, label: 'Kahvaltı', color: MEAL_COLORS.breakfast },
  { value: 'lunch' as MealType, icon: LunchDiningIcon, label: 'Öğle', color: MEAL_COLORS.lunch },
  { value: 'dinner' as MealType, icon: DinnerDiningIcon, label: 'Akşam', color: MEAL_COLORS.dinner },
  { value: 'snack' as MealType, icon: CookieIcon, label: 'Atıştırma', color: MEAL_COLORS.snack },
] as const;

interface MealTypeSelectorProps {
  value: MealType | undefined;
  onChange: (mealType: MealType | undefined) => void;
}

function MealTypeSelector({ value, onChange }: Readonly<MealTypeSelectorProps>) {
  return (
    <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={1}>
      {MEAL_OPTIONS.map(({ value: opt, icon: Icon, label, color }) => {
        const selected = value === opt;
        return (
          <Box
            key={opt}
            onClick={() => onChange(selected ? undefined : opt)}
            sx={{
              cursor: 'pointer',
              borderRadius: 2,
              p: 1,
              border: '1.5px solid',
              borderColor: selected ? color : 'rgba(0,0,0,0.1)',
              bgcolor: selected ? `${color}14` : 'rgba(255,255,255,0.6)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3,
              transition: 'all 0.15s ease',
              '&:hover': { borderColor: color, bgcolor: `${color}0e` },
            }}
          >
            <Icon sx={{ fontSize: 17, color: selected ? color : 'text.secondary' }} />
            <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: selected ? 700 : 500, color: selected ? color : 'text.secondary', lineHeight: 1.2, textAlign: 'center' }}>
              {label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}

interface FoodListProps {
  foods: Food[];
  onDeleteFood: (id: string) => void;
  onEditFood: (id: string, updatedFood: Partial<Food>) => void;
  foodTemplates: FoodTemplate[];
}

export function FoodList({ foods, onDeleteFood, onEditFood, foodTemplates }: Readonly<FoodListProps>) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    amount: '', // Şablondan geliyorsa miktar
    mealType: undefined as MealType | undefined,
  });
  
  // Öğün açılır-kapanır durumları
  const [expandedMeals, setExpandedMeals] = useState({
    breakfast: false,
    lunch: false,
    dinner: false,
    snack: false,
    other: false, // Öğün belirtilmemiş yemekler için
  });

  const toggleMeal = (meal: string) => {
    setExpandedMeals(prev => ({
      ...prev,
      [meal]: !prev[meal as keyof typeof prev]
    }));
  };

  const handleDeleteClick = (food: Food) => {
    setSelectedFood(food);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedFood) {
      onDeleteFood(selectedFood.id);
      setDeleteDialogOpen(false);
      setSelectedFood(null);
    }
  };

  const handleEditClick = (food: Food) => {
    setSelectedFood(food);
    
    if (food.fromTemplate) {
      // Şablondan geldiyse sadece miktarı göster
      setEditFormData({
        name: food.name,
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        amount: food.originalAmount?.toString() || '',
        mealType: food.mealType,
      });
    } else {
      // Manuel girdiyse tüm alanları göster
      setEditFormData({
        name: food.name,
        calories: food.calories.toString(),
        protein: food.protein.toString(),
        carbs: food.carbs.toString(),
        fat: food.fat.toString(),
        amount: '',
        mealType: food.mealType,
      });
    }
    setEditDialogOpen(true);
  };

  const handleEditSave = () => {
    if (!selectedFood) return;

    if (selectedFood.fromTemplate) {
      // Şablondan geldiyse sadece miktarı güncelle
      const template = foodTemplates.find(t => t.id === selectedFood.templateId);
      if (!template) return;

      const newAmount = Number(editFormData.amount);
      
      let displayName: string;
      let calories: number;
      let protein: number;
      let carbs: number;
      let fat: number;
      
      if (template.unit === 'piece') {
        // Adet bazında: değerler zaten adet başına, direkt çarp
        displayName = `${template.name} (${newAmount} adet)`;
        calories = Math.round(template.calories * newAmount);
        protein = Math.round(template.protein * newAmount * 10) / 10;
        carbs = Math.round(template.carbs * newAmount * 10) / 10;
        fat = Math.round(template.fat * newAmount * 10) / 10;
      } else {
        // Gram bazında: 100g'a göre hesapla
        displayName = `${template.name} (${formatGrams(newAmount)}g)`;
        const multiplier = newAmount / 100;
        calories = Math.round(template.calories * multiplier);
        protein = Math.round(template.protein * multiplier * 10) / 10;
        carbs = Math.round(template.carbs * multiplier * 10) / 10;
        fat = Math.round(template.fat * multiplier * 10) / 10;
      }

      onEditFood(selectedFood.id, {
        name: displayName,
        calories,
        protein,
        carbs,
        fat,
        originalAmount: newAmount,
        mealType: editFormData.mealType,
      });
    } else {
      // Manuel girdiyse tüm alanları güncelle
      onEditFood(selectedFood.id, {
        name: editFormData.name,
        calories: Number(editFormData.calories),
        protein: Number(editFormData.protein),
        carbs: Number(editFormData.carbs),
        fat: Number(editFormData.fat),
        mealType: editFormData.mealType,
      });
    }
    
    setEditDialogOpen(false);
    setSelectedFood(null);
  };

  const groupedFoods = useMemo(() => {
    const groups: { [key: string]: Food[] } = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
      other: [],
    };

    foods.forEach(food => {
      if (food.mealType) {
        groups[food.mealType].push(food);
      } else {
        groups.other.push(food);
      }
    });

    return groups;
  }, [foods]);

  const todayDateOnly = useMemo(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  }, []);
  
  if (foods.length === 0) {
    return (
      <Card elevation={2}>
        <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
          <Box textAlign="center" py={2.5} display="flex" alignItems="center" gap={2} justifyContent="center">
            <Box
              sx={{
                width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                background: 'rgba(0,0,0,0.06)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <RestaurantIcon sx={{ fontSize: 22, color: 'text.disabled' }} />
            </Box>
            <Box textAlign="left">
              <Typography variant="body2" fontWeight={600} color="text.primary">
                Henüz yemek eklenmedi
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Yukarıdaki formdan ekleyerek başlayın
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const getMealInfo = (mealType: string) => {
    switch (mealType) {
      case 'breakfast':
        return { icon: LocalCafeIcon, label: 'Kahvaltı', color: MEAL_COLORS.breakfast };
      case 'lunch':
        return { icon: LunchDiningIcon, label: 'Öğle Yemeği', color: MEAL_COLORS.lunch };
      case 'dinner':
        return { icon: DinnerDiningIcon, label: 'Akşam Yemeği', color: MEAL_COLORS.dinner };
      case 'snack':
        return { icon: CookieIcon, label: 'Atıştırmalık', color: MEAL_COLORS.snack };
      default:
        return { icon: RestaurantIcon, label: 'Diğer', color: '#9E9E9E' };
    }
  };

  const isPlannedTimestamp = (timestamp: number) => {
    const foodDate = new Date(timestamp);
    const foodDateOnly = new Date(foodDate.getFullYear(), foodDate.getMonth(), foodDate.getDate()).getTime();
    return foodDateOnly > todayDateOnly;
  };

  return (
    <Card elevation={2}>
      <CardContent sx={{ p: { xs: 2, sm: 3 }, '&:last-child': { pb: { xs: 2, sm: 3 } } }}>
        <Box display="flex" alignItems="center" gap={1} mb={2.5}>
          <Box
            sx={{
              width: 32, height: 32, borderRadius: '9px',
              background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(24,24,27,0.35)',
            }}
          >
            <TodayIcon sx={{ fontSize: 17, color: '#fff' }} />
          </Box>
          <Typography variant="subtitle1" fontWeight={700}>
            Bugünün Yemekleri
          </Typography>
          <Box
            sx={{
              ml: 0.5, px: 1, py: 0.2, borderRadius: 10,
              bgcolor: 'rgba(24,24,27,0.1)',
            }}
          >
            <Typography variant="caption" fontWeight={700} color="primary.main">{foods.length}</Typography>
          </Box>
        </Box>

        <Stack spacing={1.5}>
          {Object.entries(groupedFoods).map(([mealType, mealFoods]) => {
            if (mealFoods.length === 0) return null;

            const mealInfo = getMealInfo(mealType);
            const MealIcon = mealInfo.icon;
            const isExpanded = expandedMeals[mealType as keyof typeof expandedMeals];
            const totalCalories = mealFoods.reduce((sum, food) => sum + food.calories, 0);

            return (
              <Paper
                key={mealType}
                elevation={0}
                sx={{
                  overflow: 'hidden',
                  border: '1px solid rgba(0,0,0,0.07)',
                  borderRadius: 3,
                }}
              >
                {/* Öğün Başlığı - Tıklanabilir */}
                <Box
                  onClick={() => toggleMeal(mealType)}
                  sx={{
                    px: 2, py: 1.4,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderRadius: 3,
                    '&:hover': { bgcolor: `${mealInfo.color}08` },
                    transition: 'background-color 0.15s',
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5}>
                    {/* Icon circle inspired by 21st.dev accordion pattern */}
                    <Box
                      sx={{
                        width: 34, height: 34, borderRadius: '50%',
                        bgcolor: `${mealInfo.color}15`,
                        border: `1.5px solid ${mealInfo.color}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <MealIcon sx={{ color: mealInfo.color, fontSize: 17 }} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                        {mealInfo.label}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1 }}>
                        {mealFoods.length} öğün · {totalCalories} kcal
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton size="small" sx={{ color: 'text.secondary', opacity: 0.6 }}>
                    {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  </IconButton>
                </Box>

                {/* Yemekler Listesi - Açılır Kapanır */}
                <Collapse
                  in={isExpanded}
                  timeout={220}
                  mountOnEnter
                  unmountOnExit
                >
                  <Box sx={{ p: 2, pt: 0 }}>
                    <Stack spacing={0} divider={<Divider sx={{ mx: 1, borderColor: 'rgba(0,0,0,0.05)' }} />}>
                      {mealFoods.map((food) => (
                        <Box
                          key={food.id}
                          className="food-row"
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 1.5,
                            py: 1.25,
                            borderRadius: 1.5,
                            transition: 'background-color 0.15s',
                            '&:hover': { bgcolor: 'rgba(24,24,27,0.04)' },
                            '&:hover .food-actions': { opacity: 1 },
                          }}
                        >
                          {/* Sol: isim + makro chipler */}
                          <Box flex={1} minWidth={0}>
                            <Box display="flex" alignItems="center" gap={0.75} mb={0.6} flexWrap="wrap">
                              <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
                                {food.name}
                              </Typography>
                              {isPlannedTimestamp(food.timestamp) && (
                                <Chip
                                  icon={<EventAvailableIcon sx={{ fontSize: '12px !important' }} />}
                                  label="Plan"
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                  sx={{ height: 18, fontSize: '0.62rem', '& .MuiChip-label': { px: 0.6 } }}
                                />
                              )}
                            </Box>
                            <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                              {[
                                { label: `${food.calories} kcal`, color: '#18181b', bg: 'rgba(24,24,27,0.08)', border: 'rgba(24,24,27,0.18)', show: true },
                                { label: `P ${formatGrams(food.protein)}g`, color: '#0369a1', bg: 'rgba(3,105,161,0.08)', border: 'rgba(3,105,161,0.18)', show: food.protein > 0 },
                                { label: `K ${formatGrams(food.carbs)}g`, color: '#15803d', bg: 'rgba(21,128,61,0.08)', border: 'rgba(21,128,61,0.18)', show: food.carbs > 0 },
                                { label: `Y ${formatGrams(food.fat)}g`, color: '#b45309', bg: 'rgba(180,83,9,0.08)', border: 'rgba(180,83,9,0.18)', show: food.fat > 0 },
                              ].filter(item => item.show).map(({ label, color, bg, border }) => (
                                <Box key={label} sx={{ display: 'inline-flex', alignItems: 'center', px: 0.75, py: 0.25, borderRadius: 1, bgcolor: bg, border: `1px solid ${border}` }}>
                                  <Typography sx={{ fontSize: '0.65rem', fontWeight: 700, color, whiteSpace: 'nowrap', lineHeight: 1 }}>
                                    {label}
                                  </Typography>
                                </Box>
                              ))}
                            </Stack>
                          </Box>

                          {/* Sağ: edit/delete - mobilde her zaman, desktop'ta hover'da */}
                          <Stack
                            className="food-actions"
                            direction="row"
                            spacing={0.25}
                            sx={{ opacity: { xs: 1, sm: 0 }, transition: 'opacity 0.15s', flexShrink: 0 }}
                          >
                            <Tooltip title="Düzenle">
                              <IconButton
                                size="small"
                                onClick={() => handleEditClick(food)}
                                sx={{ color: '#18181b', p: 0.5, '&:hover': { bgcolor: 'rgba(24,24,27,0.1)' } }}
                              >
                                <EditIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Sil">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteClick(food)}
                                sx={{ color: '#dc2626', p: 0.5, '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}
                              >
                                <DeleteIcon sx={{ fontSize: 15 }} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Collapse>
              </Paper>
            );
          })}
        </Stack>
      </CardContent>

      {/* Silme Onay Dialogu */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, m: 2 } }}
      >
        <DialogTitle sx={{ pb: 1, pt: 2.5 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DeleteIcon sx={{ fontSize: 18, color: '#dc2626' }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Yemeği Sil</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Bu yemeği silmek istediğinizden emin misiniz?
          </Typography>
          {selectedFood && (
            <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'rgba(239,68,68,0.05)', borderRadius: 1.5, border: '1px solid rgba(239,68,68,0.18)' }}>
              <Typography variant="body2" fontWeight={600}>{selectedFood.name}</Typography>
              <Typography variant="caption" color="text.secondary">{selectedFood.calories} kcal</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2, flex: 1 }}>
            İptal
          </Button>
          <Button onClick={handleDeleteConfirm} variant="contained" startIcon={<DeleteIcon />} sx={{ borderRadius: 2, flex: 1, bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}>
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Düzenleme Dialogu */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, m: 2 } }}
      >
        <DialogTitle sx={{ pb: 1, pt: 2.5 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg, #18181b22 0%, #3f3f4622 100%)', border: '1.5px solid rgba(24,24,27,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <EditIcon sx={{ fontSize: 18, color: '#18181b' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                {selectedFood?.fromTemplate ? 'Miktar Düzenle' : 'Yemek Düzenle'}
              </Typography>
              {selectedFood && (
                <Typography variant="caption" color="text.secondary">
                  {selectedFood.fromTemplate
                    ? (foodTemplates.find(t => t.id === selectedFood.templateId)?.name ?? selectedFood.name)
                    : selectedFood.name}
                </Typography>
              )}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2, pb: 1, px: { xs: 2, sm: 3 }, overflow: 'visible' }}>
          {selectedFood?.fromTemplate ? (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={1} fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                  Öğün Türü
                </Typography>
                <MealTypeSelector
                  value={editFormData.mealType}
                  onChange={(mealType) => setEditFormData({ ...editFormData, mealType })}
                />
              </Box>
              <TextField
                fullWidth
                label={selectedFood.originalUnit === 'piece' ? 'Adet' : 'Miktar (gram)'}
                type="number"
                value={editFormData.amount}
                onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                required
                inputProps={{ min: 0, step: selectedFood.originalUnit === 'piece' ? 1 : 0.1 }}
                autoFocus
                size="small"
              />
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={1} fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                  Öğün Türü
                </Typography>
                <MealTypeSelector
                  value={editFormData.mealType}
                  onChange={(mealType) => setEditFormData({ ...editFormData, mealType })}
                />
              </Box>
              <TextField
                fullWidth
                label="Yemek Adı"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                required
                size="small"
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField fullWidth label="Kalori" type="number" value={editFormData.calories}
                  onChange={(e) => setEditFormData({ ...editFormData, calories: e.target.value })}
                  required inputProps={{ min: 0 }} size="small" />
                <TextField fullWidth label="Protein (g)" type="number" value={editFormData.protein}
                  onChange={(e) => setEditFormData({ ...editFormData, protein: e.target.value })}
                  inputProps={{ min: 0 }} size="small" />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField fullWidth label="Karbonhidrat (g)" type="number" value={editFormData.carbs}
                  onChange={(e) => setEditFormData({ ...editFormData, carbs: e.target.value })}
                  inputProps={{ min: 0 }} size="small" />
                <TextField fullWidth label="Yağ (g)" type="number" value={editFormData.fat}
                  onChange={(e) => setEditFormData({ ...editFormData, fat: e.target.value })}
                  inputProps={{ min: 0 }} size="small" />
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
          <Button onClick={() => setEditDialogOpen(false)} variant="outlined" sx={{ borderRadius: 2, flex: 1 }}>
            İptal
          </Button>
          <Button onClick={handleEditSave} variant="contained" startIcon={<EditIcon />} sx={{ borderRadius: 2, flex: 1, background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)', boxShadow: 'none', '&:hover': { boxShadow: '0 4px 12px rgba(24,24,27,0.35)' } }}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
