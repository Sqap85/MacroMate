import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Stack,
  Chip,
  Divider,
  Tabs,
  Tab,
  Paper,
  useMediaQuery,
  useTheme,
  Button,
  Tooltip,
  Collapse,
  TextField,
  DialogActions,
  ToggleButtonGroup,
  ToggleButton,
  Autocomplete,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import DinnerDiningIcon from '@mui/icons-material/DinnerDining';
import CookieIcon from '@mui/icons-material/Cookie';
import AddIcon from '@mui/icons-material/Add';
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { useState } from 'react';
import type { Food, DailyGoal, MealType, FoodTemplate } from '../types';
import { calculateWeeklyStats, formatDate, getDayName } from '../utils/dateUtils';

// Öğün renk tanımları - tüm uygulamada tutarlı
const MEAL_COLORS = {
  breakfast: '#FF6B35', // Turuncu
  lunch: '#F7931E',     // Altın sarısı
  dinner: '#9D4EDD',    // Mor
  snack: '#06A77D',     // Yeşil
} as const;

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  foods: Food[];
  goal: DailyGoal;
  onDeleteFood: (id: string) => void;
  onEditFood: (id: string, updatedFood: Partial<Food>) => void;
  onAddFood: (food: Omit<Food, 'id' | 'timestamp'>, customTimestamp?: number) => void;
  foodTemplates: FoodTemplate[];
  onOpenTemplates: () => void;
}

export function HistoryModal({ open, onClose, foods, goal, onDeleteFood, onEditFood, onAddFood, foodTemplates, onOpenTemplates }: HistoryModalProps) {
  const [tabValue, setTabValue] = useState(0);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [addingToDate, setAddingToDate] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [foodToDelete, setFoodToDelete] = useState<Food | null>(null);
  const [addFoodTabValue, setAddFoodTabValue] = useState(0); // 0: Template, 1: Manuel
  const [selectedTemplate, setSelectedTemplate] = useState<FoodTemplate | null>(null);
  const [templateAmount, setTemplateAmount] = useState('');
  const [editFormData, setEditFormData] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    amount: '',
    mealType: undefined as MealType | undefined,
  });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Günü genişlet/daralt
  const toggleDay = (date: string) => {
    setExpandedDays(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  // Bugünün tarihini kontrol et
  const isToday = (dateString: string): boolean => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return dateString === todayStr;
  };

  // Yarının tarihini kontrol et
  const isTomorrow = (dateString: string): boolean => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    return dateString === tomorrowStr;
  };

  // Gelecek günler için tarih formatı
  const formatFutureDate = (dateString: string): string => {
    if (isTomorrow(dateString)) {
      return 'Yarın';
    }
    return formatDate(dateString);
  };

  // Yemek düzenle başlat
  const handleEditFood = (food: Food) => {
    setEditingFood(food);
    
    if (food.fromTemplate) {
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
  };

  // Düzenlemeyi kaydet
  const handleEditSave = () => {
    if (!editingFood) return;

    if (editingFood.fromTemplate) {
      const template = foodTemplates.find(t => t.id === editingFood.templateId);
      if (!template) return;

      const newAmount = Number(editFormData.amount);
      
      let displayName: string;
      let calories: number;
      let protein: number;
      let carbs: number;
      let fat: number;
      
      if (template.unit === 'piece') {
        displayName = `${template.name} (${newAmount} adet)`;
        calories = Math.round(template.calories * newAmount);
        protein = Math.round(template.protein * newAmount * 10) / 10;
        carbs = Math.round(template.carbs * newAmount * 10) / 10;
        fat = Math.round(template.fat * newAmount * 10) / 10;
      } else {
        displayName = `${template.name} (${newAmount}g)`;
        const multiplier = newAmount / 100;
        calories = Math.round(template.calories * multiplier);
        protein = Math.round(template.protein * multiplier * 10) / 10;
        carbs = Math.round(template.carbs * multiplier * 10) / 10;
        fat = Math.round(template.fat * multiplier * 10) / 10;
      }

      onEditFood(editingFood.id, {
        name: displayName,
        calories,
        protein,
        carbs,
        fat,
        originalAmount: newAmount,
        mealType: editFormData.mealType,
      });
    } else {
      onEditFood(editingFood.id, {
        name: editFormData.name,
        calories: Number(editFormData.calories),
        protein: Number(editFormData.protein),
        carbs: Number(editFormData.carbs),
        fat: Number(editFormData.fat),
        mealType: editFormData.mealType,
      });
    }
    
    setEditingFood(null);
  };

  // Yemek sil
  const handleDeleteFood = (food: Food) => {
    setFoodToDelete(food);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (foodToDelete) {
      onDeleteFood(foodToDelete.id);
      setDeleteDialogOpen(false);
      setFoodToDelete(null);
    }
  };

  // Geçmiş güne yemek ekle
  const handleAddToDate = (dateString: string) => {
    setAddingToDate(dateString);
    setAddFoodTabValue(0); // Varsayılan olarak template sekmesini aç
    setSelectedTemplate(null);
    setTemplateAmount('');
    // Form'u sıfırla
    setEditFormData({
      name: '',
      calories: '',
      protein: '',
      carbs: '',
      fat: '',
      amount: '',
      mealType: undefined,
    });
  };

  // Geçmiş güne ekleme kaydet
  const handleAddToDateSave = () => {
    if (!addingToDate) return;

    // Tarihi timestamp'e çevir (o günün başı - 00:00)
    const dateParts = addingToDate.split('-');
    const targetDate = new Date(
      parseInt(dateParts[0]),
      parseInt(dateParts[1]) - 1,
      parseInt(dateParts[2]),
      0, 0, 0 // Günün başı
    );

    const customTimestamp = targetDate.getTime();

    if (addFoodTabValue === 0) {
      // Template modunda - tarayıcının native validasyonunu kullan
      if (!selectedTemplate || !templateAmount) {
        return;
      }
      
      const amount = Number(templateAmount);
      let calories: number;
      let protein: number;
      let carbs: number;
      let fat: number;
      let displayName: string;
      if (selectedTemplate!.unit === 'piece') {
        displayName = `${selectedTemplate!.name} (${amount} adet)`;
        calories = Math.round(selectedTemplate!.calories * amount);
        protein = Math.round(selectedTemplate!.protein * amount * 10) / 10;
        carbs = Math.round(selectedTemplate!.carbs * amount * 10) / 10;
        fat = Math.round(selectedTemplate!.fat * amount * 10) / 10;
      } else {
        displayName = `${selectedTemplate!.name} (${amount}g)`;
        const multiplier = amount / 100;
        calories = Math.round(selectedTemplate!.calories * multiplier);
        protein = Math.round(selectedTemplate!.protein * multiplier * 10) / 10;
        carbs = Math.round(selectedTemplate!.carbs * multiplier * 10) / 10;
        fat = Math.round(selectedTemplate!.fat * multiplier * 10) / 10;
      }
      const newFood = {
        name: displayName,
        calories,
        protein,
        carbs,
        fat,
        mealType: editFormData.mealType,
        fromTemplate: true,
        templateId: selectedTemplate!.id,
        originalAmount: amount,
      };
      onAddFood(newFood, customTimestamp);
    } else {
      // Manuel modunda - tarayıcının native validasyonunu kullan
      if (!editFormData.name || !editFormData.calories) {
        return;
      }
      
      const newFood = {
        name: editFormData.name,
        calories: Number(editFormData.calories),
        protein: Number(editFormData.protein),
        carbs: Number(editFormData.carbs),
        fat: Number(editFormData.fat),
        mealType: editFormData.mealType,
      };
      onAddFood(newFood, customTimestamp);
    }
    setAddingToDate(null);
    setSelectedTemplate(null);
    setTemplateAmount('');
  };
  
  // Template önizleme değerlerini hesapla
  const getTemplatePreviewValues = () => {
    if (!selectedTemplate || !templateAmount) return null;
    const amount = Number(templateAmount);
    if (selectedTemplate.unit === 'piece') {
      return {
        amount,
        unit: 'adet',
        calories: Math.round(selectedTemplate.calories * amount),
        protein: Math.round(selectedTemplate.protein * amount * 10) / 10,
        carbs: Math.round(selectedTemplate.carbs * amount * 10) / 10,
        fat: Math.round(selectedTemplate.fat * amount * 10) / 10,
      };
    } else {
      const multiplier = amount / 100;
      return {
        amount,
        unit: 'g',
        calories: Math.round(selectedTemplate.calories * multiplier),
        protein: Math.round(selectedTemplate.protein * multiplier * 10) / 10,
        carbs: Math.round(selectedTemplate.carbs * multiplier * 10) / 10,
        fat: Math.round(selectedTemplate.fat * multiplier * 10) / 10,
      };
    }
  };

  const templatePreview = getTemplatePreviewValues();
  
  // Öğün bilgilerini getir
  const getMealInfo = (mealType: MealType) => {
    const mealConfig = {
      breakfast: { label: 'Kahvaltı', icon: <LocalCafeIcon sx={{ color: MEAL_COLORS.breakfast }} />, color: MEAL_COLORS.breakfast },
      lunch: { label: 'Öğle Yemeği', icon: <LunchDiningIcon sx={{ color: MEAL_COLORS.lunch }} />, color: MEAL_COLORS.lunch },
      dinner: { label: 'Akşam Yemeği', icon: <DinnerDiningIcon sx={{ color: MEAL_COLORS.dinner }} />, color: MEAL_COLORS.dinner },
      snack: { label: 'Atıştırmalık', icon: <CookieIcon sx={{ color: MEAL_COLORS.snack }} />, color: MEAL_COLORS.snack },
    };
    return mealConfig[mealType];
  };

  // Yemekleri öğün türüne göre grupla
  const groupFoodsByMeal = (foods: Food[]) => {
    const groups: Record<MealType | 'other', Food[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
      other: [],
    };

    foods.forEach(food => {
      if (food.mealType && food.mealType in groups) {
        groups[food.mealType as MealType].push(food);
      } else {
        groups.other.push(food);
      }
    });

    return groups;
  };
  
  // Farklı zaman aralıkları
  const monthlyStats = calculateWeeklyStats(foods, 30);
  
  const allTimeStats = (() => {
    if (foods.length === 0) return calculateWeeklyStats(foods, 0);
    
    const oldestFood = foods.reduce((oldest, food) => 
      food.timestamp < oldest.timestamp ? food : oldest
    );
    
    const oldestDate = new Date(oldestFood.timestamp);
    oldestDate.setHours(0, 0, 0, 0);
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const daysDiff = Math.round((today.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return calculateWeeklyStats(foods, daysDiff);
  })();

  // Gelecek 7 gün için istatistikler (yarından başlayarak)
  const getFutureDaysStats = () => {
    const futureDays = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 1; i <= 7; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);
      const dateString = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;
      
      const dayStart = futureDate.getTime();
      const dayEnd = new Date(futureDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      // Bu güne planlanan yemekleri filtrele (timestamp gelecekte olanlar)
      const plannedFoods = foods.filter(f => 
        f.timestamp >= dayStart && f.timestamp <= dayEnd.getTime()
      );

      const stats = plannedFoods.reduce(
        (acc, food) => ({
          totalCalories: acc.totalCalories + food.calories,
          totalProtein: acc.totalProtein + food.protein,
          totalCarbs: acc.totalCarbs + food.carbs,
          totalFat: acc.totalFat + food.fat,
        }),
        { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
      );

      futureDays.push({
        ...stats,
        foods: plannedFoods,
        date: dateString,
      });
    }

    return {
      days: futureDays,
      averageCalories: 0,
      averageProtein: 0,
      averageCarbs: 0,
      averageFat: 0,
      totalDays: 7,
    };
  };

  const futureStats = getFutureDaysStats();
  
  const statsOptions = [monthlyStats, allTimeStats, futureStats];
  const currentStats = statsOptions[tabValue];
  const isFutureTab = tabValue === 2;
  const activeDays = currentStats.days.filter(d => d.foods.length > 0).length;
  const hasAnyData = isFutureTab ? true : activeDays > 0;

  // En iyi ve en kötü günleri bul
  const getBestAndWorstDays = () => {
    const activeDaysData = currentStats.days.filter(d => d.foods.length > 0);
    if (activeDaysData.length === 0) return null;

    let bestDay = activeDaysData[0];
    let worstDay = activeDaysData[0];

    activeDaysData.forEach(day => {
      // Hedefe yakınlık hesapla
      const dayScore = Math.abs(day.totalCalories - goal.calories);
      const bestScore = Math.abs(bestDay.totalCalories - goal.calories);
      const worstScore = Math.abs(worstDay.totalCalories - goal.calories);

      if (dayScore < bestScore) bestDay = day;
      if (dayScore > worstScore) worstDay = day;
    });

    return { bestDay, worstDay };
  };

  const bestWorst = getBestAndWorstDays();

  // Trend hesaplama (önceki döneme göre değişim)
  const calculateTrend = () => {
    if (tabValue === 1 || activeDays < 3) return null; // Tüm zamanlar için trend gösterme
    
    const periodDays = 30;
    const currentPeriodDays = currentStats.days.slice(-periodDays);
    const previousPeriodStart = Math.max(0, currentStats.days.length - (periodDays * 2));
    const previousPeriodEnd = currentStats.days.length - periodDays;
    const previousPeriodDays = currentStats.days.slice(previousPeriodStart, previousPeriodEnd);
    
    const currentActiveDays = currentPeriodDays.filter(d => d.foods.length > 0);
    const previousActiveDays = previousPeriodDays.filter(d => d.foods.length > 0);
    
    if (currentActiveDays.length === 0 || previousActiveDays.length === 0) return null;
    
    const currentAvg = currentActiveDays.reduce((sum, d) => sum + d.totalCalories, 0) / currentActiveDays.length;
    const previousAvg = previousActiveDays.reduce((sum, d) => sum + d.totalCalories, 0) / previousActiveDays.length;
    
    const change = ((currentAvg - previousAvg) / previousAvg) * 100;
    
    return {
      change: Math.round(change),
      improving: Math.abs(currentAvg - goal.calories) < Math.abs(previousAvg - goal.calories)
    };
  };

  const trend = calculateTrend();

  const getPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getColor = (percentage: number): "primary" | "success" | "warning" | "error" => {
    if (percentage < 70) return "primary";
    if (percentage < 90) return "success";
    if (percentage < 110) return "warning";
    return "error";
  };

  return (
    <>
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="md" 
        fullWidth
        fullScreen={isMobile}
        aria-labelledby="history-dialog-title"
        PaperProps={{
          sx: {
            maxHeight: isMobile ? '100%' : '90vh',
          }
        }}
      >
        <DialogTitle id="history-dialog-title" sx={{ pb: isMobile ? 1 : 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <CalendarMonthIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
              <Typography variant={isMobile ? 'subtitle1' : 'h6'}>
                Kayıtlar & Planlama
              </Typography>
            </Box>
            <IconButton 
              onClick={onClose} 
              size="small"
              aria-label="Kapat"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: isMobile ? 1.5 : 3, pb: isMobile ? 2 : 3 }}>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{
              mb: isMobile ? 2 : 3,
              px: isMobile ? 0.5 : 0,
              minHeight: isMobile ? 36 : undefined,
              width: '100%',
              justifyContent: 'center',
            }}
            variant="fullWidth"
          >
            <Tab
              label={isMobile ? '30 Gün' : 'Son 30 Gün'}
              disableRipple
              sx={{ flexGrow: 1, textAlign: 'center', fontSize: isMobile ? '0.85rem' : undefined }}
            />
            <Tab
              label={
                <Box>
                  <Typography variant="caption" display="block" sx={isMobile ? { fontSize: '0.85rem' } : {}}>
                    {isMobile ? 'Tümü' : 'Tüm Geçmiş'}
                  </Typography>
                  {foods.length > 0 && (
                    <Typography variant="caption" fontSize={isMobile ? '0.65rem' : '0.75rem'} color="text.secondary">
                      {allTimeStats.totalDays} gün
                    </Typography>
                  )}
                </Box>
              }
              disableRipple
              sx={{ flexGrow: 1, textAlign: 'center' }}
            />
            <Tab
              icon={<CalendarMonthIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={
                <Typography variant="caption" display="block" sx={isMobile ? { fontSize: '0.85rem' } : {}} color="success.main" fontWeight="600">
                  {isMobile ? 'Planlar' : 'Gelecek 7 Gün'}
                </Typography>
              }
              disableRipple
              sx={{ flexGrow: 1, textAlign: 'center' }}
            />
          </Tabs>

          {hasAnyData ? (
            <>
              {/* Gelecek planları için özel başlık */}
              {isFutureTab && (
                <Box mb={2}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <CalendarMonthIcon color="success" sx={{ fontSize: isMobile ? 24 : 28 }} />
                    <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight="bold" color="success.main">
                      Gelecek 7 Günün Planı
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    Gelecek günler için yemek planlaması yapın. Her gün için + butonuna tıklayarak plan ekleyin.
                  </Typography>
                </Box>
              )}

              {/* Özet İstatistikler - Gelecek tab'ında gizle */}
              {!isFutureTab && (
              <Card sx={{ mb: isMobile ? 2 : 3, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider' }}>
                <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
                  <Box 
                    display="flex" 
                    alignItems="center" 
                    justifyContent="space-between" 
                    mb={isMobile ? 1.5 : 2} 
                    flexWrap="wrap" 
                    gap={1}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <TrendingUpIcon color="primary" sx={{ fontSize: isMobile ? 20 : 24 }} />
                      <Typography variant={isMobile ? 'subtitle2' : 'h6'} fontWeight="bold">
                        {tabValue === 1 ? 'Genel İstatistikler' : isMobile ? 'Ortalama' : 'Ortalama Günlük Değerler'}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      <Chip 
                        icon={<LocalFireDepartmentIcon />}
                        label={`${activeDays} aktif gün`}
                        size="small"
                        color="primary"
                        variant="filled"
                      />

                      {activeDays > 0 && (
                        <Chip 
                          label={`${currentStats.averageCalories} kcal/gün ort.`}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      )}
                      {trend && (
                        <Tooltip title={trend.improving ? 'Hedefe yaklaşıyorsun!' : 'Hedeften uzaklaşıyorsun'}>
                          <Chip 
                            icon={trend.improving ? <TrendingUpIcon /> : <TrendingDownIcon />}
                            label={`${trend.change > 0 ? '+' : ''}${trend.change}%`}
                            size="small"
                            sx={{
                              bgcolor: trend.improving ? 'success.main' : 'warning.main',
                              color: 'white',
                              '& .MuiChip-icon': {
                                color: 'white'
                              }
                            }}
                          />
                        </Tooltip>
                      )}
                    </Stack>
                  </Box>

                  {/* İstatistik Özet Grid */}
                  <Stack direction="row" spacing={isMobile ? 1 : 1.5} mb={isMobile ? 1.5 : 2} flexWrap="wrap" useFlexGap>
                    <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' }, minWidth: 0 }}>
                      <Paper sx={{ 
                        p: 1, 
                        textAlign: 'center', 
                        bgcolor: 'error.light',
                        border: '2px solid',
                        borderColor: 'error.main'
                      }}>
                        <Typography variant="caption" display="block" fontSize={isMobile ? '0.65rem' : '0.75rem'} fontWeight="700" sx={{ color: '#b71c1c' }}>
                          Ort. Kalori
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" fontSize={isMobile ? '1rem' : '1.25rem'}>
                          {currentStats.averageCalories}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.6rem' : '0.7rem'}>
                          / {goal.calories} kcal
                        </Typography>
                      </Paper>
                    </Box>
                    <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' }, minWidth: 0 }}>
                      <Paper sx={{ 
                        p: 1, 
                        textAlign: 'center', 
                        bgcolor: 'info.light',
                        border: '2px solid',
                        borderColor: 'info.main'
                      }}>
                        <Typography variant="caption" display="block" fontSize={isMobile ? '0.65rem' : '0.75rem'} fontWeight="700" sx={{ color: '#01579b' }}>
                          Ort. Protein
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" fontSize={isMobile ? '1rem' : '1.25rem'}>
                          {currentStats.averageProtein}g
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.6rem' : '0.7rem'}>
                          / {goal.protein}g
                        </Typography>
                      </Paper>
                    </Box>
                    <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' }, minWidth: 0 }}>
                      <Paper sx={{ 
                        p: 1, 
                        textAlign: 'center', 
                        bgcolor: 'success.light',
                        border: '2px solid',
                        borderColor: 'success.main'
                      }}>
                        <Typography variant="caption" display="block" fontSize={isMobile ? '0.65rem' : '0.75rem'} fontWeight="700" sx={{ color: '#1b5e20' }}>
                          Ort. Karb
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" fontSize={isMobile ? '1rem' : '1.25rem'}>
                          {currentStats.averageCarbs}g
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.6rem' : '0.7rem'}>
                          / {goal.carbs}g
                        </Typography>
                      </Paper>
                    </Box>
                    <Box sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' }, minWidth: 0 }}>
                      <Paper sx={{ 
                        p: 1, 
                        textAlign: 'center', 
                        bgcolor: 'warning.light',
                        border: '2px solid',
                        borderColor: 'warning.main'
                      }}>
                        <Typography variant="caption" display="block" fontSize={isMobile ? '0.65rem' : '0.75rem'} fontWeight="700" sx={{ color: '#e65100' }}>
                          Ort. Yağ
                        </Typography>
                        <Typography variant="h6" fontWeight="bold" fontSize={isMobile ? '1rem' : '1.25rem'}>
                          {currentStats.averageFat}g
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.6rem' : '0.7rem'}>
                          / {goal.fat}g
                        </Typography>
                      </Paper>
                    </Box>
                  </Stack>

                  {/* En İyi ve En Kötü Günler */}
                  {bestWorst && activeDays > 2 && (
                    <Stack direction="row" spacing={isMobile ? 1 : 1.5} mt={isMobile ? 1.5 : 2} flexWrap="wrap" useFlexGap>
                      <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 6px)' }, minWidth: 0 }}>
                        <Paper sx={{ 
                          p: 1, 
                          bgcolor: 'success.light',
                          border: '1px solid',
                          borderColor: 'success.main'
                        }}>
                          <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                            <EmojiEventsIcon sx={{ fontSize: 16, color: 'success.dark' }} />
                            <Typography variant="caption" color="success.dark" fontWeight="600" fontSize={isMobile ? '0.65rem' : '0.75rem'}>
                              En İyi Gün
                            </Typography>
                          </Stack>
                          <Typography variant="body2" fontWeight="bold" fontSize={isMobile ? '0.75rem' : '0.85rem'}>
                            {formatDate(bestWorst.bestDay.date)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.6rem' : '0.7rem'}>
                            {bestWorst.bestDay.totalCalories} kcal (hedef: {goal.calories})
                          </Typography>
                        </Paper>
                      </Box>
                      <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 6px)' }, minWidth: 0 }}>
                        <Paper sx={{ 
                          p: 1, 
                          bgcolor: 'error.light',
                          border: '1px solid',
                          borderColor: 'error.main'
                        }}>
                          <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                            <TrendingDownIcon sx={{ fontSize: 16, color: 'error.dark' }} />
                            <Typography variant="caption" color="error.dark" fontWeight="600" fontSize={isMobile ? '0.65rem' : '0.75rem'}>
                              En Uzak Gün
                            </Typography>
                          </Stack>
                          <Typography variant="body2" fontWeight="bold" fontSize={isMobile ? '0.75rem' : '0.85rem'}>
                            {formatDate(bestWorst.worstDay.date)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.6rem' : '0.7rem'}>
                            {bestWorst.worstDay.totalCalories} kcal (hedef: {goal.calories})
                          </Typography>
                        </Paper>
                      </Box>
                    </Stack>
                  )}
              
                  <Stack spacing={isMobile ? 1.5 : 2} mt={isMobile ? 2 : 3}>
                    {/* Kalori İlerleme */}
                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" fontWeight="bold" fontSize={isMobile ? '0.8rem' : undefined}>
                          Toplam Kalori Hedefi
                        </Typography>
                        <Typography variant="body2" fontSize={isMobile ? '0.8rem' : undefined}>
                          {(() => {
                            const totalCalories = currentStats.days.reduce((sum, d) => sum + d.totalCalories, 0);
                            const totalGoal = goal.calories * currentStats.totalDays;
                            const percentage = Math.round(getPercentage(totalCalories, totalGoal));
                            return `${percentage}% tamamlandı`;
                          })()}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.7rem' : '0.75rem'}>
                          {currentStats.days.reduce((sum, d) => sum + d.totalCalories, 0).toLocaleString()} kcal
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.7rem' : '0.75rem'}>
                          Hedef: {(goal.calories * currentStats.totalDays).toLocaleString()} kcal
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(() => {
                          const totalCalories = currentStats.days.reduce((sum, d) => sum + d.totalCalories, 0);
                          const totalGoal = goal.calories * currentStats.totalDays;
                          return getPercentage(totalCalories, totalGoal);
                        })()}
                        color={(() => {
                          const totalCalories = currentStats.days.reduce((sum, d) => sum + d.totalCalories, 0);
                          const totalGoal = goal.calories * currentStats.totalDays;
                          return getColor(getPercentage(totalCalories, totalGoal));
                        })()}
                        sx={{ height: isMobile ? 6 : 8, borderRadius: 4 }}
                      />
                    </Box>

                    {/* Makro Progress */}
                    <Stack direction="row" spacing={isMobile ? 1 : 2}>
                      <Box flex={1}>
                        <Typography variant="caption" display="block" textAlign="center" mb={0.5} fontSize={isMobile ? '0.65rem' : '0.75rem'}>
                          Protein
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={(() => {
                            const totalProtein = currentStats.days.reduce((sum, d) => sum + d.totalProtein, 0);
                            const totalGoal = goal.protein * currentStats.totalDays;
                            return getPercentage(totalProtein, totalGoal);
                          })()}
                          color="info"
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" display="block" textAlign="center" mt={0.5} fontSize={isMobile ? '0.6rem' : '0.7rem'} color="text.secondary">
                          {(() => {
                            const totalProtein = currentStats.days.reduce((sum, d) => sum + d.totalProtein, 0);
                            const totalGoal = goal.protein * currentStats.totalDays;
                            return `${Math.round(totalProtein)}g / ${Math.round(totalGoal)}g`;
                          })()}
                        </Typography>
                      </Box>
                      <Box flex={1}>
                        <Typography variant="caption" display="block" textAlign="center" mb={0.5} fontSize={isMobile ? '0.65rem' : '0.75rem'}>
                          Karbonhidrat
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={(() => {
                            const totalCarbs = currentStats.days.reduce((sum, d) => sum + d.totalCarbs, 0);
                            const totalGoal = goal.carbs * currentStats.totalDays;
                            return getPercentage(totalCarbs, totalGoal);
                          })()}
                          color="success"
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" display="block" textAlign="center" mt={0.5} fontSize={isMobile ? '0.6rem' : '0.7rem'} color="text.secondary">
                          {(() => {
                            const totalCarbs = currentStats.days.reduce((sum, d) => sum + d.totalCarbs, 0);
                            const totalGoal = goal.carbs * currentStats.totalDays;
                            return `${Math.round(totalCarbs)}g / ${Math.round(totalGoal)}g`;
                          })()}
                        </Typography>
                      </Box>
                      <Box flex={1}>
                        <Typography variant="caption" display="block" textAlign="center" mb={0.5} fontSize={isMobile ? '0.65rem' : '0.75rem'}>
                          Yağ
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={(() => {
                            const totalFat = currentStats.days.reduce((sum, d) => sum + d.totalFat, 0);
                            const totalGoal = goal.fat * currentStats.totalDays;
                            return getPercentage(totalFat, totalGoal);
                          })()}
                          color="warning"
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" display="block" textAlign="center" mt={0.5} fontSize={isMobile ? '0.6rem' : '0.7rem'} color="text.secondary">
                          {(() => {
                            const totalFat = currentStats.days.reduce((sum, d) => sum + d.totalFat, 0);
                            const totalGoal = goal.fat * currentStats.totalDays;
                            return `${Math.round(totalFat)}g / ${Math.round(totalGoal)}g`;
                          })()}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
              )}

              {/* Günlük Detaylar */}
              <Box mb={isMobile ? 1.5 : 2}>
                <Typography variant={isMobile ? 'subtitle2' : 'h6'} gutterBottom>
                  {isFutureTab ? 'Günlere Göre Planlar' : 'Günlük Detaylar'}
                </Typography>
                {!isFutureTab && (
                  <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.7rem' : undefined}>
                    {currentStats.days.filter(d => d.foods.length > 0).length} / {currentStats.totalDays} gün aktif
                  </Typography>
                )}
              </Box>
              
              <Stack 
                spacing={isMobile ? 1.5 : 2} 
                sx={{ 
                  maxHeight: isMobile ? 'calc(100vh - 280px)' : 500, 
                  overflow: 'auto', 
                  pr: isMobile ? 0.5 : 1, 
                  pb: 1 
                }}
              >
                {(isFutureTab ? currentStats.days : currentStats.days.slice().reverse()).map((day) => {
                  const percentage = getPercentage(day.totalCalories, goal.calories);
                  const hasData = day.foods.length > 0;
                  const isExpanded = expandedDays[day.date];
                  
                  return (
                    <Card 
                      key={day.date} 
                      variant="outlined"
                      sx={{
                        opacity: hasData ? 1 : 0.7,
                        borderLeft: 3,
                        borderLeftColor: isFutureTab ? (hasData ? 'success.main' : 'grey.300') : (hasData ? 'primary.main' : 'grey.400'),
                        overflow: 'visible',
                        bgcolor: isFutureTab ? (hasData ? 'success.50' : 'background.paper') : 'background.paper',
                      }}
                    >
                      <CardContent sx={{ 
                        p: isMobile ? 1 : 1.25, 
                        '&:last-child': { pb: isMobile ? 1 : 1.25 },
                      }}>
                        {/* Başlık */}
                        <Box 
                          display="flex" 
                          justifyContent="space-between" 
                          alignItems="center" 
                          mb={isMobile ? 0.75 : 1}
                          flexWrap="wrap"
                          gap={0.5}
                        >
                          <Box minWidth={0} flex="1 1 auto">
                            <Typography 
                              variant="subtitle2" 
                              fontWeight="bold" 
                              noWrap
                              fontSize={isMobile ? '0.8rem' : '0.875rem'}
                              color={isFutureTab ? 'success.dark' : 'text.primary'}
                            >
                              {isFutureTab ? formatFutureDate(day.date) : formatDate(day.date)}
                            </Typography>
                            <Typography 
                              variant="caption" 
                              color="text.secondary" 
                              noWrap
                              fontSize={isMobile ? '0.65rem' : undefined}
                            >
                              {getDayName(day.date).toUpperCase()}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            {/* Yemek ekle butonu - geçmiş günler ve gelecek tab'ında */}
                            {(isFutureTab || !isToday(day.date)) && (
                              <Tooltip title={isFutureTab ? "Bu güne plan ekle" : "Bu güne yemek ekle"}>
                                <IconButton
                                  size="small"
                                  color={isFutureTab ? "success" : "primary"}
                                  onClick={() => handleAddToDate(day.date)}
                                  sx={{ padding: 0.5 }}
                                >
                                  <AddIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                            
                            {hasData && (
                              <Tooltip title={isExpanded ? "Daralt" : "Genişlet"}>
                                <IconButton
                                  size="small"
                                  onClick={() => toggleDay(day.date)}
                                  sx={{ padding: 0.5 }}
                                >
                                  {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                </IconButton>
                              </Tooltip>
                            )}
                            {hasData ? (
                              <Chip
                                label={`${day.totalCalories} kcal`}
                                color={isFutureTab ? "success" : getColor(percentage)}
                                size="small"
                                sx={{ fontSize: isMobile ? '0.7rem' : undefined }}
                              />
                            ) : (
                              <Chip
                                label={isFutureTab ? "Plan yok" : "Veri yok"}
                                size="small"
                                variant="outlined"
                                color="default"
                                sx={{ fontSize: isMobile ? '0.7rem' : undefined }}
                              />
                            )}
                          </Stack>
                        </Box>

                        {/* İçerik */}
                        {hasData ? (
                          <Box sx={{ minHeight: isMobile ? 60 : 70 }}>
                            {/* Progress bar */}
                            <Box mb={isMobile ? 0.75 : 1}>
                              <LinearProgress
                                variant="determinate"
                                value={percentage}
                                color={getColor(percentage)}
                                sx={{ height: isMobile ? 5 : 6, borderRadius: 4 }}
                              />
                            </Box>
                            
                            {/* Makro chipler */}
                            <Box mb={isMobile ? 0.75 : 1}>
                              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                                <Chip 
                                  label={`P: ${day.totalProtein}g`} 
                                  size="small" 
                                  variant="outlined"
                                  color="info"
                                  sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem', height: 20 }}
                                />
                                <Chip 
                                  label={`K: ${day.totalCarbs}g`} 
                                  size="small" 
                                  variant="outlined"
                                  color="success"
                                  sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem', height: 20 }}
                                />
                                <Chip 
                                  label={`Y: ${day.totalFat}g`} 
                                  size="small" 
                                  variant="outlined"
                                  color="warning"
                                  sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem', height: 20 }}
                                />
                                <Chip 
                                  label={`${day.foods.length} öğe`} 
                                  size="small" 
                                  variant="outlined"
                                  sx={{ fontSize: isMobile ? '0.65rem' : '0.75rem', height: 20 }}
                                />
                              </Stack>
                            </Box>

                            {/* Yemek listesi - Detaylı görünüm */}
                            <Collapse in={isExpanded} timeout="auto">
                              <Divider sx={{ mb: isMobile ? 0.75 : 1 }} />
                              <Stack spacing={isMobile ? 0.75 : 1}>
                                {Object.entries(groupFoodsByMeal(day.foods)).map(([mealType, mealFoods]) => {
                                  if (mealFoods.length === 0) return null;
                                  
                                  let mealInfo;
                                  if (mealType === 'other') {
                                    mealInfo = { label: 'Diğer', icon: '🍴', color: '#95a5a6' };
                                  } else {
                                    mealInfo = getMealInfo(mealType as MealType);
                                  }
                                  
                                  return (
                                    <Paper
                                      key={mealType}
                                      variant="outlined"
                                      sx={{
                                        p: isMobile ? 0.75 : 1,
                                        bgcolor: 'background.default',
                                        borderLeft: 3,
                                        borderColor: mealInfo.color,
                                      }}
                                    >
                                      <Box display="flex" alignItems="center" gap={0.5} mb={isMobile ? 0.4 : 0.5}>
                                        <Box sx={{ color: mealInfo.color, display: 'flex', fontSize: isMobile ? 14 : 16 }}>
                                          {typeof mealInfo.icon === 'string' ? mealInfo.icon : mealInfo.icon}
                                        </Box>
                                        <Typography
                                          variant="caption"
                                          fontWeight="600"
                                          sx={{ 
                                            color: mealInfo.color,
                                            fontSize: isMobile ? '0.65rem' : '0.75rem',
                                          }}
                                        >
                                          {mealInfo.label}
                                        </Typography>
                                      </Box>
                                      <Stack spacing={0.4}>
                                        {mealFoods.map((food) => (
                                          <Box
                                            key={food.id}
                                            sx={{
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: 0.5,
                                              minWidth: 0,
                                              p: 0.5,
                                              borderRadius: 1,
                                              '&:hover': {
                                                bgcolor: 'action.hover',
                                              },
                                              '&:hover .food-actions': {
                                                opacity: 1,
                                              },
                                            }}
                                          >
                                            <Typography 
                                              variant="body2" 
                                              color="text.secondary"
                                              sx={{ 
                                                flexShrink: 0, 
                                                fontSize: isMobile ? '0.65rem' : '0.75rem' 
                                              }}
                                            >
                                              •
                                            </Typography>
                                            <Typography 
                                              variant="body2" 
                                              color="text.primary"
                                              sx={{ 
                                                wordBreak: 'break-word',
                                                overflow: 'hidden',
                                                flex: 1,
                                                minWidth: 0,
                                                fontSize: isMobile ? '0.7rem' : '0.8rem',
                                              }}
                                            >
                                              {food.name}
                                            </Typography>
                                            <Typography 
                                              variant="caption" 
                                              color="text.secondary"
                                              sx={{ 
                                                fontWeight: 600,
                                                whiteSpace: 'nowrap',
                                                fontSize: isMobile ? '0.6rem' : '0.7rem',
                                              }}
                                            >
                                              {food.calories} kcal
                                            </Typography>
                                            <Box 
                                              className="food-actions"
                                              sx={{ 
                                                display: 'flex',
                                                gap: 0.25,
                                                opacity: isMobile ? 1 : 0,
                                                transition: 'opacity 0.2s',
                                              }}
                                            >
                                              <Tooltip title="Düzenle">
                                                <IconButton
                                                  size="small"
                                                  onClick={() => handleEditFood(food)}
                                                  sx={{ padding: 0.25 }}
                                                >
                                                  <EditIcon sx={{ fontSize: isMobile ? 14 : 16 }} />
                                                </IconButton>
                                              </Tooltip>
                                              <Tooltip title="Sil">
                                                <IconButton
                                                  size="small"
                                                  color="error"
                                                  onClick={() => handleDeleteFood(food)}
                                                  sx={{ padding: 0.25 }}
                                                >
                                                  <DeleteIcon sx={{ fontSize: isMobile ? 14 : 16 }} />
                                                </IconButton>
                                              </Tooltip>
                                            </Box>
                                          </Box>
                                        ))}
                                      </Stack>
                                    </Paper>
                                  );
                                })}
                              </Stack>
                            </Collapse>
                          </Box>
                        ) : (
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            gap: 0.5,
                            pt: 0.5,
                            minHeight: isMobile ? 60 : 70,
                          }}>
                            <Typography
                              variant="caption" 
                              color="text.secondary" 
                              fontStyle="italic"
                              fontSize={isMobile ? '0.7rem' : '0.8rem'}
                            >
                              {isToday(day.date) ? 'Henüz yemek eklemediniz' : 'Bu gün için veri yok'}
                            </Typography>
                            {!isToday(day.date) && (
                              <Button
                                size="small"
                                variant="text"
                                startIcon={<AddIcon />}
                                onClick={() => handleAddToDate(day.date)}
                                sx={{ 
                                  py: 0.25, 
                                  fontSize: '0.7rem',
                                }}
                              >
                                Yemek Ekle
                              </Button>
                            )}
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </>
          ) : (
            <Box textAlign="center" py={isMobile ? 4 : 8}>
              <CalendarMonthIcon sx={{ fontSize: isMobile ? 60 : 80, color: 'text.secondary', mb: isMobile ? 1.5 : 2 }} />
              <Typography variant={isMobile ? 'subtitle1' : 'h6'} color="text.secondary" gutterBottom>
                Henüz veri yok
              </Typography>
              <Typography variant="body2" color="text.secondary" fontSize={isMobile ? '0.8rem' : undefined} px={isMobile ? 2 : 0}>
                Yemek eklemeye başladığınızda burada geçmiş verilerinizi ve istatistiklerinizi görebileceksiniz
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

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
            Bu yemeği geçmişten silmek istediğinizden emin misiniz?
          </Typography>
          
          {foodToDelete && (
            <Box sx={{ 
              mt: 2,
              p: 1.5,
              bgcolor: 'error.50',
              borderRadius: 1,
              borderLeft: 3,
              borderColor: 'error.main'
            }}>
              <Typography variant="body2" fontWeight="medium">
                {foodToDelete.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {foodToDelete.calories} kcal • {new Date(foodToDelete.timestamp).toLocaleDateString('tr-TR')}
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

      {/* Düzenleme Dialog'u */}
      <Dialog 
        open={!!editingFood} 
        onClose={() => setEditingFood(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Yemek Düzenle
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {editingFood?.fromTemplate ? (
              <>
                <TextField
                  label="Yemek Adı"
                  value={editFormData.name}
                  disabled
                  fullWidth
                  size="small"
                />
                <TextField
                  label={(() => {
                    const template = foodTemplates.find(t => t.id === editingFood.templateId);
                    if (!template) return 'Miktar';
                    if (template.unit === 'piece') {
                      return 'Adet';
                    }
                    return 'Gram';
                  })()}
                  type="number"
                  value={editFormData.amount}
                  onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
                  fullWidth
                  size="small"
                  autoFocus
                />
              </>
            ) : (
              <>
                <TextField
                  label="Yemek Adı"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  fullWidth
                  size="small"
                />
                <Stack direction="row" spacing={1}>
                  <TextField
                    label="Kalori"
                    type="number"
                    value={editFormData.calories}
                    onChange={(e) => setEditFormData({ ...editFormData, calories: e.target.value })}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Protein (g)"
                    type="number"
                    value={editFormData.protein}
                    onChange={(e) => setEditFormData({ ...editFormData, protein: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Stack>
                <Stack direction="row" spacing={1}>
                  <TextField
                    label="Karbonhidrat (g)"
                    type="number"
                    value={editFormData.carbs}
                    onChange={(e) => setEditFormData({ ...editFormData, carbs: e.target.value })}
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="Yağ (g)"
                    type="number"
                    value={editFormData.fat}
                    onChange={(e) => setEditFormData({ ...editFormData, fat: e.target.value })}
                    fullWidth
                    size="small"
                  />
                </Stack>
              </>
            )}
            
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Öğün
              </Typography>
              <ToggleButtonGroup
                value={editFormData.mealType}
                exclusive
                onChange={(_, value) => setEditFormData({ ...editFormData, mealType: value })}
                size="small"
                fullWidth
                sx={{
                  '& .MuiToggleButton-root': {
                    fontSize: isMobile ? '0.7rem' : '0.8rem',
                    py: 0.5,
                  }
                }}
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
                  <CookieIcon sx={{ fontSize: 16, mr: 0.5, color: MEAL_COLORS.snack }} /> Atıştırmalık
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditingFood(null)} variant="outlined">
            İptal
          </Button>
          <Button onClick={handleEditSave} color="primary" variant="contained" startIcon={<EditIcon />}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>

      {/* Geçmiş Güne Yemek Ekleme Dialog'u */}
      <Dialog 
        open={!!addingToDate} 
        onClose={() => setAddingToDate(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="h6">
                Geçmiş Güne Yemek Ekle
              </Typography>
              {addingToDate && (
                <Typography variant="caption" color="text.secondary">
                  Tarih: {formatDate(addingToDate)} - {getDayName(addingToDate)}
                </Typography>
              )}
            </Box>
            {addFoodTabValue === 0 && (
              <Button
                size="small"
                variant="outlined"
                onClick={onOpenTemplates}
                startIcon={<RestaurantMenuIcon />}
              >
                Besinlerim
              </Button>
            )}
          </Box>
        </DialogTitle>
        <DialogContent>
          <Tabs 
            value={addFoodTabValue} 
            onChange={(_, newValue) => setAddFoodTabValue(newValue)}
            sx={{ mb: 2, mt: 1 }}
          >
            <Tab label="Kayıtlı Besinler" />
            <Tab label="Manuel Giriş" />
          </Tabs>

          <Divider sx={{ mb: 2 }} />

          <Box component="form" id="add-food-form" onSubmit={(e) => { e.preventDefault(); handleAddToDateSave(); }}>

          {/* TAB 0: Template/Kayıtlı Besinler */}
          {addFoodTabValue === 0 && (
            <Stack spacing={2}>
              {/* Öğün Seçimi */}
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Öğün
                </Typography>
                <ToggleButtonGroup
                  value={editFormData.mealType}
                  exclusive
                  onChange={(_, value) => setEditFormData({ ...editFormData, mealType: value })}
                  size="small"
                  fullWidth
                  sx={{
                    '& .MuiToggleButton-root': {
                      fontSize: isMobile ? '0.7rem' : '0.8rem',
                      py: 0.5,
                    }
                  }}
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
                    <CookieIcon sx={{ fontSize: 16, mr: 0.5, color: MEAL_COLORS.snack }} /> Atıştırmalık
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {/* Besin Seçimi */}
              <Autocomplete
                options={foodTemplates}
                getOptionLabel={(option) => option.name}
                value={selectedTemplate}
                onChange={(_, newValue) => {
                  setSelectedTemplate(newValue);
                  setTemplateAmount('');
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Besin Seç"
                    size="small"
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
                          ? `1 adet: ${option.calories} kcal | P: ${option.protein}g`
                          : `100g: ${option.calories} kcal | P: ${option.protein}g`
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
                <TextField
                  fullWidth
                  label={selectedTemplate.unit === 'piece' ? `Kaç Adet ${selectedTemplate.name}?` : 'Miktar (gram)'}
                  type="number"
                  value={templateAmount}
                  onChange={(e) => setTemplateAmount(e.target.value)}
                  inputProps={{ min: 0, step: selectedTemplate.unit === 'piece' ? 0.01 : 1 }}
                  size="small"
                  required
                />
              )}

              {/* Önizleme */}
              {templatePreview && (
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
                    Toplam Değerler ({templatePreview.amount} {templatePreview.unit})
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip 
                      label={`${templatePreview.calories} kcal`}
                      size="small"
                      color="error"
                      variant="outlined"
                    />
                    <Chip 
                      label={`${templatePreview.protein}g protein`}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                    <Chip 
                      label={`${templatePreview.carbs}g karb.`}
                      size="small"
                      color="success"
                      variant="outlined"
                    />
                    <Chip 
                      label={`${templatePreview.fat}g yağ`}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  </Box>
                </Box>
              )}
            </Stack>
          )}

          {/* TAB 1: Manuel Giriş */}
          {addFoodTabValue === 1 && (
            <Stack spacing={2}>
              {/* Öğün Seçimi */}
              <Box>
                <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                  Öğün
                </Typography>
                <ToggleButtonGroup
                  value={editFormData.mealType}
                  exclusive
                  onChange={(_, value) => setEditFormData({ ...editFormData, mealType: value })}
                  size="small"
                  fullWidth
                  sx={{
                    '& .MuiToggleButton-root': {
                      fontSize: isMobile ? '0.7rem' : '0.8rem',
                      py: 0.5,
                    }
                  }}
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
                    <CookieIcon sx={{ fontSize: 16, mr: 0.5, color: MEAL_COLORS.snack }} /> Atıştırmalık
                  </ToggleButton>
                </ToggleButtonGroup>
              </Box>

              <TextField
                label="Yemek Adı"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                fullWidth
                size="small"
                autoFocus
                required
              />
              <Stack direction="row" spacing={1}>
                <TextField
                  label="Kalori"
                  type="number"
                  value={editFormData.calories}
                  onChange={(e) => setEditFormData({ ...editFormData, calories: e.target.value })}
                  fullWidth
                  size="small"
                  required
                />
                <TextField
                  label="Protein (g)"
                  type="number"
                  value={editFormData.protein}
                  onChange={(e) => setEditFormData({ ...editFormData, protein: e.target.value })}
                  fullWidth
                  size="small"
                />
              </Stack>
              <Stack direction="row" spacing={1}>
                <TextField
                  label="Karbonhidrat (g)"
                  type="number"
                  value={editFormData.carbs}
                  onChange={(e) => setEditFormData({ ...editFormData, carbs: e.target.value })}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="Yağ (g)"
                  type="number"
                  value={editFormData.fat}
                  onChange={(e) => setEditFormData({ ...editFormData, fat: e.target.value })}
                  fullWidth
                  size="small"
                />
              </Stack>
            </Stack>
          )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddingToDate(null)} variant="outlined">
            İptal
          </Button>
          <Button 
            type="submit"
            form="add-food-form"
            color="primary" 
            variant="contained" 
            startIcon={<AddIcon />}
            disabled={addFoodTabValue === 0 && (!selectedTemplate || !templateAmount)}
          >
            Ekle
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
