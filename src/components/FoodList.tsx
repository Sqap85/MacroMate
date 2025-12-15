import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Chip,
  Stack,
  Divider,
  Grow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tooltip,
  Collapse,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
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
import ScaleIcon from '@mui/icons-material/Scale';
import type { Food, FoodTemplate, MealType } from '../types';
import { useState } from 'react';

// Öğün renk tanımları - HistoryModal ile aynı
const MEAL_COLORS = {
  breakfast: '#FF6B35', // Turuncu
  lunch: '#F7931E',     // Altın sarısı
  dinner: '#9D4EDD',    // Mor
  snack: '#06A77D',     // Yeşil
} as const;

interface FoodListProps {
  foods: Food[];
  onDeleteFood: (id: string) => void;
  onEditFood: (id: string, updatedFood: Partial<Food>) => void;
  foodTemplates: FoodTemplate[];
}

export function FoodList({ foods, onDeleteFood, onEditFood, foodTemplates }: FoodListProps) {
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
        displayName = `${template.name} (${newAmount}g)`;
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
  
  if (foods.length === 0) {
    return (
      <Card elevation={3}>
        <CardContent>
          <Box textAlign="center" py={4}>
            <RestaurantIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              Henüz yemek eklenmedi
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Yukarıdaki formdan yemek ekleyerek başlayın
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Zamanı formatla
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Yemekleri öğünlere göre grupla
  const groupFoodsByMeal = () => {
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
  };

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

  const groupedFoods = groupFoodsByMeal();

  // Toplam kalori hesapla (öğün bazında)
  const getMealCalories = (mealFoods: Food[]) => {
    return mealFoods.reduce((sum, food) => sum + food.calories, 0);
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
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <TodayIcon color="primary" />
          <Typography variant="h6">
            Bugünün Yemekleri ({foods.length})
          </Typography>
        </Box>
        
        <Stack spacing={2} mt={2}>
          {Object.entries(groupedFoods).map(([mealType, mealFoods]) => {
            if (mealFoods.length === 0) return null;
            
            const mealInfo = getMealInfo(mealType);
            const MealIcon = mealInfo.icon;
            const isExpanded = expandedMeals[mealType as keyof typeof expandedMeals];
            const totalCalories = getMealCalories(mealFoods);

            return (
              <Paper 
                key={mealType} 
                elevation={2}
                sx={{ 
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                  '&:hover': {
                    elevation: 4,
                  }
                }}
              >
                {/* Öğün Başlığı - Tıklanabilir */}
                <Box
                  onClick={() => toggleMeal(mealType)}
                  sx={{
                    p: 2,
                    bgcolor: 'background.default',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                    transition: 'background-color 0.2s',
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <MealIcon sx={{ color: mealInfo.color }} />
                    <Typography variant="subtitle1" fontWeight="bold">
                      {mealInfo.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ({totalCalories} kcal)
                    </Typography>
                  </Box>
                  <IconButton size="small">
                    {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Box>

                {/* Yemekler Listesi - Açılır Kapanır */}
                <Collapse in={isExpanded}>
                  <Box sx={{ p: 2, pt: 0 }}>
                    <Stack spacing={2}>
                      {mealFoods.map((food, index) => (
                        <Grow in timeout={300 + index * 100} key={food.id}>
                          <Box>
                            <Box 
                              display="flex" 
                              justifyContent="space-between" 
                              alignItems="flex-start"
                              gap={2}
                              sx={{
                                p: 1.5,
                                borderRadius: 1,
                                '&:hover': {
                                  bgcolor: 'action.hover',
                                }
                              }}
                            >
                              <Box flex={1}>
                                <Box display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
                                  <Typography variant="subtitle1" fontWeight="bold">
                                    {food.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {formatTime(food.timestamp)}
                                  </Typography>
                                </Box>
                                
                                <Stack direction="row" spacing={1} flexWrap="wrap">
                                  <Chip 
                                    label={`${food.calories} kcal`} 
                                    size="small" 
                                    color="error"
                                    variant="outlined"
                                  />
                                  {food.protein > 0 && (
                                    <Chip 
                                      label={`P: ${food.protein}g`} 
                                      size="small" 
                                      color="info"
                                      variant="outlined"
                                    />
                                  )}
                                  {food.carbs > 0 && (
                                    <Chip 
                                      label={`K: ${food.carbs}g`} 
                                      size="small" 
                                      color="success"
                                      variant="outlined"
                                    />
                                  )}
                                  {food.fat > 0 && (
                                    <Chip 
                                      label={`Y: ${food.fat}g`} 
                                      size="small" 
                                      color="warning"
                                      variant="outlined"
                                    />
                                  )}
                                </Stack>
                              </Box>
                              
                              <Stack direction="row" spacing={0.5}>
                                <Tooltip title="Düzenle">
                                  <IconButton 
                                    color="primary" 
                                    onClick={() => handleEditClick(food)}
                                    size="small"
                                    sx={{
                                      transition: 'all 0.2s',
                                      '&:hover': {
                                        transform: 'scale(1.1)',
                                      },
                                    }}
                                  >
                                    <EditIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                
                                <Tooltip title="Sil">
                                  <IconButton 
                                    color="error" 
                                    onClick={() => handleDeleteClick(food)}
                                    size="small"
                                    sx={{
                                      transition: 'all 0.2s',
                                      '&:hover': {
                                        transform: 'scale(1.1)',
                                      },
                                    }}
                                  >
                                    <DeleteIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </Box>
                            
                            {index !== mealFoods.length - 1 && (
                              <Divider sx={{ mt: 1 }} />
                            )}
                          </Box>
                        </Grow>
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
        PaperProps={{
          sx: {
            borderRadius: 2,
            m: 2,
          }
        }}
      >
        <DialogTitle>
          <Typography variant="h6">
            Yemeği Sil
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Bu yemeği silmek istediğinizden emin misiniz?
          </Typography>
          
          {selectedFood && (
            <Box sx={{ 
              mt: 2,
              p: 1.5,
              bgcolor: 'error.50',
              borderRadius: 1,
              borderLeft: 3,
              borderColor: 'error.main'
            }}>
              <Typography variant="body2" fontWeight="medium">
                {selectedFood.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {selectedFood.calories} kcal
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button 
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
          >
            İptal
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
          >
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
        PaperProps={{
          sx: {
            borderRadius: 2,
            m: 2,
          }
        }}
      >
        <DialogTitle sx={{ pb: 3 }}>
          {selectedFood?.fromTemplate ? (
            <Box display="flex" alignItems="center" gap={1}>
              <ScaleIcon color="primary" />
              <Typography variant="h6">
                Miktar Düzenle - {foodTemplates.find(t => t.id === selectedFood.templateId)?.name}
              </Typography>
            </Box>
          ) : (
            <Box display="flex" alignItems="center" gap={1}>
              <EditIcon color="primary" />
              <Typography variant="h6">
                Yemek Düzenle
              </Typography>
            </Box>
          )}
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 1, px: { xs: 2, sm: 3 }, overflow: 'visible' }}>
          {selectedFood?.fromTemplate ? (
            // Şablondan geldiyse sadece miktar
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Öğün Türü
                </Typography>
                <ToggleButtonGroup
                  value={editFormData.mealType}
                  exclusive
                  onChange={(_, value) => {
                    if (value) setEditFormData({ ...editFormData, mealType: value });
                  }}
                  fullWidth
                  size="small"
                >
                  <ToggleButton value="breakfast">
                    <LocalCafeIcon sx={{ fontSize: 16, mr: 0.5, color: MEAL_COLORS.breakfast }} /> Kahvaltı
                  </ToggleButton>
                  <ToggleButton value="lunch">
                    <LunchDiningIcon sx={{ fontSize: 16, mr: 0.5, color: MEAL_COLORS.lunch }} /> Öğle
                  </ToggleButton>
                  <ToggleButton value="dinner">
                    <DinnerDiningIcon sx={{ fontSize: 16, mr: 0.5, color: MEAL_COLORS.dinner }} /> Akşam
                  </ToggleButton>
                  <ToggleButton value="snack">
                    <CookieIcon sx={{ fontSize: 16, mr: 0.5, color: MEAL_COLORS.snack }} /> Atıştırma
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>
              
              <TextField
                fullWidth
                label={selectedFood.originalUnit === 'piece' ? 'Adet' : 'Miktar (gram)'}
                type="number"
                value={editFormData.amount}
                onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                required
                inputProps={{ min: 0, step: selectedFood.originalUnit === 'piece' ? 1 : 0.1 }}
                helperText={
                  selectedFood.originalUnit === 'piece' 
                    ? (() => {
                        return '';
                      })()
                    : ''
                }
                autoFocus
              />
            </Stack>
          ) : (
            // Manuel girdiyse tüm alanlar
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Öğün Türü
                </Typography>
                <ToggleButtonGroup
                  value={editFormData.mealType}
                  exclusive
                  onChange={(_, value) => {
                    if (value) setEditFormData({ ...editFormData, mealType: value });
                  }}
                  fullWidth
                  size="small"
                >
                  <ToggleButton value="breakfast">
                    <LocalCafeIcon sx={{ fontSize: 16, mr: 0.5, color: MEAL_COLORS.breakfast }} /> Kahvaltı
                  </ToggleButton>
                  <ToggleButton value="lunch">
                    <LunchDiningIcon sx={{ fontSize: 16, mr: 0.5, color: MEAL_COLORS.lunch }} /> Öğle
                  </ToggleButton>
                  <ToggleButton value="dinner">
                    <DinnerDiningIcon sx={{ fontSize: 16, mr: 0.5, color: MEAL_COLORS.dinner }} /> Akşam
                  </ToggleButton>
                  <ToggleButton value="snack">
                    <CookieIcon sx={{ fontSize: 16, mr: 0.5, color: MEAL_COLORS.snack }} /> Atıştırma
                  </ToggleButton>
                </ToggleButtonGroup>
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
                <TextField
                  fullWidth
                  label="Kalori"
                  type="number"
                  value={editFormData.calories}
                  onChange={(e) => setEditFormData({ ...editFormData, calories: e.target.value })}
                  required
                  inputProps={{ min: 0 }}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Protein (g)"
                  type="number"
                  value={editFormData.protein}
                  onChange={(e) => setEditFormData({ ...editFormData, protein: e.target.value })}
                  inputProps={{ min: 0 }}
                  size="small"
                />
              </Stack>
              
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                <TextField
                  fullWidth
                  label="Karbonhidrat (g)"
                  type="number"
                  value={editFormData.carbs}
                  onChange={(e) => setEditFormData({ ...editFormData, carbs: e.target.value })}
                  inputProps={{ min: 0 }}
                  size="small"
                />
                <TextField
                  fullWidth
                  label="Yağ (g)"
                  type="number"
                  value={editFormData.fat}
                  onChange={(e) => setEditFormData({ ...editFormData, fat: e.target.value })}
                  inputProps={{ min: 0 }}
                  size="small"
                />
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditDialogOpen(false)} variant="outlined">
            İptal
          </Button>
          <Button onClick={handleEditSave} color="primary" variant="contained" startIcon={<EditIcon />}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
