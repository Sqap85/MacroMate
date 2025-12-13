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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import BarChartIcon from '@mui/icons-material/BarChart';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import LunchDiningIcon from '@mui/icons-material/LunchDining';
import DinnerDiningIcon from '@mui/icons-material/DinnerDining';
import CookieIcon from '@mui/icons-material/Cookie';
import AddIcon from '@mui/icons-material/Add';
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
}

export function HistoryModal({ open, onClose, foods, goal, onDeleteFood, onEditFood, onAddFood, foodTemplates }: HistoryModalProps) {
  const [tabValue, setTabValue] = useState(0);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [addingToDate, setAddingToDate] = useState<string | null>(null);
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
        calories = Math.round(template.caloriesPer100g * newAmount);
        protein = Math.round(template.proteinPer100g * newAmount * 10) / 10;
        carbs = Math.round(template.carbsPer100g * newAmount * 10) / 10;
        fat = Math.round(template.fatPer100g * newAmount * 10) / 10;
      } else {
        displayName = `${template.name} (${newAmount}g)`;
        const multiplier = newAmount / 100;
        calories = Math.round(template.caloriesPer100g * multiplier);
        protein = Math.round(template.proteinPer100g * multiplier * 10) / 10;
        carbs = Math.round(template.carbsPer100g * multiplier * 10) / 10;
        fat = Math.round(template.fatPer100g * multiplier * 10) / 10;
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
  const handleDeleteFood = (id: string, foodName: string) => {
    if (confirm(`"${foodName}" geçmişten silinsin mi?`)) {
      onDeleteFood(id);
    }
  };

  // Geçmiş güne yemek ekle
  const handleAddToDate = (dateString: string) => {
    setAddingToDate(dateString);
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

    // Tarihi timestamp'e çevir (o günün öğle saati olarak)
    const dateParts = addingToDate.split('-');
    const targetDate = new Date(
      parseInt(dateParts[0]),
      parseInt(dateParts[1]) - 1,
      parseInt(dateParts[2]),
      12, 0, 0 // Öğle saati
    );

    const customTimestamp = targetDate.getTime();

    // Yemek verisini oluştur
    const newFood = {
      name: editFormData.name,
      calories: Number(editFormData.calories),
      protein: Number(editFormData.protein),
      carbs: Number(editFormData.carbs),
      fat: Number(editFormData.fat),
      mealType: editFormData.mealType,
    };

    onAddFood(newFood, customTimestamp);
    setAddingToDate(null);
  };
  
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
  const weeklyStats = calculateWeeklyStats(foods, 7);
  const monthlyStats = calculateWeeklyStats(foods, 30);
  const quarterlyStats = calculateWeeklyStats(foods, 90);
  
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
  
  const statsOptions = [weeklyStats, monthlyStats, quarterlyStats, allTimeStats];
  const currentStats = statsOptions[tabValue];
  const activeDays = currentStats.days.filter(d => d.foods.length > 0).length;
  const hasAnyData = activeDays > 0;

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
              <BarChartIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
              <Typography variant={isMobile ? 'subtitle1' : 'h6'}>
                Geçmiş & İstatistikler
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
            sx={{ mb: isMobile ? 2 : 3 }}
            variant={isMobile ? 'scrollable' : 'fullWidth'}
            scrollButtons={isMobile ? 'auto' : false}
            allowScrollButtonsMobile
          >
            <Tab label={isMobile ? '7 Gün' : 'Son 7 Gün'} />
            <Tab label={isMobile ? '30 Gün' : 'Son 30 Gün'} />
            <Tab label={isMobile ? '90 Gün' : 'Son 90 Gün'} />
            <Tab 
              label={
                <Box>
                  <Typography variant="caption" display="block">
                    {isMobile ? 'Tümü' : 'Tüm Geçmiş'}
                  </Typography>
                  {foods.length > 0 && (
                    <Typography variant="caption" fontSize="0.65rem" color="text.secondary">
                      {allTimeStats.totalDays} gün
                    </Typography>
                  )}
                </Box>
              }
            />
          </Tabs>

          {hasAnyData ? (
            <>
              {/* Özet İstatistikler */}
              <Card sx={{ mb: isMobile ? 2 : 3, bgcolor: 'primary.light' }}>
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
                      <TrendingUpIcon sx={{ fontSize: isMobile ? 20 : 24 }} />
                      <Typography variant={isMobile ? 'subtitle2' : 'h6'}>
                        {tabValue === 3 ? 'Genel İstatistikler' : isMobile ? 'Ortalama' : 'Ortalama Günlük Değerler'}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      <Chip 
                        label={`${activeDays} aktif gün`}
                        size="small"
                        color="primary"
                      />
                      {tabValue === 3 && foods.length > 0 && (
                        <Chip 
                          label={`${Math.round((activeDays / currentStats.totalDays) * 100)}% tutarlılık`}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Box>
              
                  <Stack spacing={isMobile ? 1.5 : 2}>
                    {/* Kalori */}
                    <Box>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" fontWeight="bold" fontSize={isMobile ? '0.8rem' : undefined}>
                          Kalori
                        </Typography>
                        <Typography variant="body2" fontSize={isMobile ? '0.8rem' : undefined}>
                          {currentStats.averageCalories} / {goal.calories} kcal
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={getPercentage(currentStats.averageCalories, goal.calories)}
                        color={getColor(getPercentage(currentStats.averageCalories, goal.calories))}
                        sx={{ height: isMobile ? 6 : 8, borderRadius: 4 }}
                      />
                    </Box>

                    {/* Makrolar */}
                    <Stack direction="row" spacing={isMobile ? 1 : 2}>
                      <Box flex={1}>
                        <Chip 
                          label={isMobile ? `P: ${currentStats.averageProtein}g` : `Protein: ${currentStats.averageProtein}g`}
                          color="info" 
                          size="small" 
                          sx={{ width: '100%', fontSize: isMobile ? '0.7rem' : undefined }}
                        />
                      </Box>
                      <Box flex={1}>
                        <Chip 
                          label={isMobile ? `K: ${currentStats.averageCarbs}g` : `Karb: ${currentStats.averageCarbs}g`}
                          color="success" 
                          size="small" 
                          sx={{ width: '100%', fontSize: isMobile ? '0.7rem' : undefined }}
                        />
                      </Box>
                      <Box flex={1}>
                        <Chip 
                          label={isMobile ? `Y: ${currentStats.averageFat}g` : `Yağ: ${currentStats.averageFat}g`}
                          color="warning" 
                          size="small" 
                          sx={{ width: '100%', fontSize: isMobile ? '0.7rem' : undefined }}
                        />
                      </Box>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              {/* Günlük Detaylar */}
              <Box mb={isMobile ? 1.5 : 2}>
                <Typography variant={isMobile ? 'subtitle2' : 'h6'} gutterBottom>
                  Günlük Detaylar
                </Typography>
                <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.7rem' : undefined}>
                  {currentStats.days.filter(d => d.foods.length > 0).length} / {currentStats.totalDays} gün aktif
                </Typography>
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
                {currentStats.days.slice().reverse().map((day) => {
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
                        borderLeftColor: hasData ? 'primary.main' : 'grey.400',
                        overflow: 'visible',
                        ...(!hasData && { minHeight: isMobile ? 110 : 120 }),
                      }}
                    >
                      <CardContent sx={{ 
                        p: isMobile ? 1 : 1.25, 
                        '&:last-child': { pb: isMobile ? 1 : 1.25 },
                        ...((!hasData) && { 
                          p: isMobile ? 0.75 : 1, 
                          '&:last-child': { pb: isMobile ? 0.75 : 1 },
                          height: '100%',
                          display: 'flex',
                          flexDirection: 'column'
                        })
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
                            >
                              {formatDate(day.date)}
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
                            {/* Yemek ekle butonu - sadece geçmiş günler için */}
                            {!isToday(day.date) && (
                              <Tooltip title="Bu güne yemek ekle">
                                <IconButton
                                  size="small"
                                  color="primary"
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
                                color={getColor(percentage)}
                                size="small"
                                sx={{ fontSize: isMobile ? '0.7rem' : undefined }}
                              />
                            ) : (
                              <Chip
                                label="Veri yok"
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
                          <>
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
                                                  onClick={() => handleDeleteFood(food.id, food.name)}
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
                          </>
                        ) : (
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            flex: 1,
                            gap: 0.5,
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
                                  textTransform: 'none',
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
                      const servingInfo = template.servingSize ? ` (1 adet = ${template.servingSize}g)` : '';
                      return `Adet${servingInfo}`;
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
        <DialogActions>
          <Button onClick={() => setEditingFood(null)}>İptal</Button>
          <Button onClick={handleEditSave} variant="contained">Kaydet</Button>
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
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Yemek Adı"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              fullWidth
              size="small"
              autoFocus
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
        <DialogActions>
          <Button onClick={() => setAddingToDate(null)}>İptal</Button>
          <Button onClick={handleAddToDateSave} variant="contained">Ekle</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
