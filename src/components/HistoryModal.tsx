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
  Autocomplete,
  CircularProgress,
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
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Food, DailyGoal, MealType, FoodTemplate } from '../types';
import { calculateWeeklyStats, formatDate, getDayName } from '../utils/dateUtils';
import { formatGrams } from '../utils/numberUtils';
import { StatsTab } from './StatsTab';

// Öğün renk tanımları - tüm uygulamada tutarlı
const MEAL_COLORS = {
  breakfast: '#d97706', // amber-600
  lunch: '#0284c7',     // sky-600
  dinner: '#7c3aed',    // violet-600
  snack: '#16a34a',     // green-600
} as const;

interface HistoryModalProps {
  open: boolean;
  onClose: () => void;
  isLoading?: boolean;
  foods: Food[];
  goal: DailyGoal;
  onDeleteFood: (id: string) => void;
  onEditFood: (id: string, updatedFood: Partial<Food>) => void;
  onAddFood: (food: Omit<Food, 'id' | 'timestamp'>, customTimestamp?: number) => void;
  onDeleteAllDayFoods: (dateString: string) => void;
  foodTemplates: FoodTemplate[];
  onOpenTemplates: () => void;
}

interface MealInfo {
  label: string;
  icon: ReactNode;
  color: string;
}

interface HistoryFoodRowProps {
  food: Food;
  isMobile: boolean;
  onEdit: (food: Food) => void;
  onDelete: (food: Food) => void;
}

interface HistoryMealSectionProps {
  mealType: string;
  mealFoods: Food[];
  isMobile: boolean;
  onEdit: (food: Food) => void;
  onDelete: (food: Food) => void;
}

interface MealTypeSelectorProps {
  value: MealType | undefined;
  onChange: (mealType: MealType | undefined) => void;
  label?: string;
}

function getMealInfoForHistory(mealType: string): MealInfo {
  switch (mealType) {
    case 'breakfast':
      return { label: 'Kahvaltı', icon: <LocalCafeIcon sx={{ color: MEAL_COLORS.breakfast, fontSize: 'inherit' }} />, color: MEAL_COLORS.breakfast };
    case 'lunch':
      return { label: 'Öğle Yemeği', icon: <LunchDiningIcon sx={{ color: MEAL_COLORS.lunch, fontSize: 'inherit' }} />, color: MEAL_COLORS.lunch };
    case 'dinner':
      return { label: 'Akşam Yemeği', icon: <DinnerDiningIcon sx={{ color: MEAL_COLORS.dinner, fontSize: 'inherit' }} />, color: MEAL_COLORS.dinner };
    case 'snack':
      return { label: 'Atıştırmalık', icon: <CookieIcon sx={{ color: MEAL_COLORS.snack, fontSize: 'inherit' }} />, color: MEAL_COLORS.snack };
    default:
      return { label: 'Diğer', icon: <RestaurantMenuIcon sx={{ color: '#95a5a6', fontSize: 'inherit' }} />, color: '#95a5a6' };
  }
}

function HistoryFoodRow({ food, isMobile, onEdit, onDelete }: Readonly<HistoryFoodRowProps>) {
  return (
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
            onClick={() => onEdit(food)}
            sx={{ padding: 0.25 }}
          >
            <EditIcon sx={{ fontSize: isMobile ? 14 : 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Sil">
          <IconButton
            size="small"
            color="error"
            onClick={() => onDelete(food)}
            sx={{ padding: 0.25 }}
          >
            <DeleteIcon sx={{ fontSize: isMobile ? 14 : 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

function HistoryMealSection({ mealType, mealFoods, isMobile, onEdit, onDelete }: Readonly<HistoryMealSectionProps>) {
  const mealInfo = getMealInfoForHistory(mealType);
  const [open, setOpen] = useState(false);
  const totalCal = mealFoods.reduce((sum, f) => sum + f.calories, 0);

  return (
    <Paper
      variant="outlined"
      sx={{ bgcolor: 'background.default', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 1.5, overflow: 'hidden' }}
    >
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.75,
          p: isMobile ? '6px 8px' : '7px 10px',
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Box sx={{
          width: isMobile ? 20 : 22,
          height: isMobile ? 20 : 22,
          borderRadius: '50%',
          bgcolor: `${mealInfo.color}15`,
          border: `1.5px solid ${mealInfo.color}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          fontSize: isMobile ? 11 : 12,
          color: mealInfo.color,
        }}>
          {mealInfo.icon}
        </Box>
        <Typography variant="caption" fontWeight={600} sx={{ color: mealInfo.color, fontSize: isMobile ? '0.65rem' : '0.72rem', flex: 1 }}>
          {mealInfo.label}
        </Typography>
        <Typography variant="caption" sx={{ fontSize: isMobile ? '0.6rem' : '0.65rem', fontWeight: 600, color: 'text.secondary', mr: 0.25 }}>
          {totalCal} kcal · {mealFoods.length} öğe
        </Typography>
        {open ? <ExpandLessIcon sx={{ fontSize: 14, color: 'text.secondary' }} /> : <ExpandMoreIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
      </Box>
      <Collapse in={open} timeout="auto">
        <Box sx={{ px: isMobile ? 0.75 : 1, pb: isMobile ? 0.5 : 0.75 }}>
          <Divider sx={{ mb: 0.5 }} />
          <Stack spacing={0.4}>
            {mealFoods.map((food) => (
              <HistoryFoodRow
                key={food.id}
                food={food}
                isMobile={isMobile}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
}

const MEAL_OPTIONS = [
  { value: 'breakfast' as MealType, icon: LocalCafeIcon, label: 'Kahvaltı', color: MEAL_COLORS.breakfast },
  { value: 'lunch' as MealType, icon: LunchDiningIcon, label: 'Öğle', color: MEAL_COLORS.lunch },
  { value: 'dinner' as MealType, icon: DinnerDiningIcon, label: 'Akşam', color: MEAL_COLORS.dinner },
  { value: 'snack' as MealType, icon: CookieIcon, label: 'Atıştırma', color: MEAL_COLORS.snack },
] as const;

function MealTypeSelector({ value, onChange, label = 'Öğün (opsiyonel)' }: Readonly<MealTypeSelectorProps>) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={1} fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
        {label}
      </Typography>
      <Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={1}>
        {MEAL_OPTIONS.map(({ value: opt, icon: Icon, label: optLabel, color }) => {
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
                borderColor: selected ? color : 'rgba(0,0,0,0.12)',
                bgcolor: selected ? `${color}14` : 'rgba(0,0,0,0.02)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.3,
                transition: 'all 0.15s ease',
                '&:hover': { borderColor: color, bgcolor: `${color}0e` },
              }}
            >
              <Icon sx={{ fontSize: 17, color: selected ? color : 'text.disabled' }} />
              <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: selected ? 700 : 500, color: selected ? color : 'text.secondary', lineHeight: 1.2, textAlign: 'center' }}>
                {optLabel}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function getPercentage(current: number, target: number) {
  return Math.min((current / target) * 100, 100);
}

function getCalorieProgressClass(rawPct: number): string {
  if (rawPct > 115) return 'progress-calories-error';
  if (rawPct > 100) return 'progress-calories-warning';
  return 'progress-calories';
}

function getFutureDaysStats(foods: Food[]) {
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

    futureDays.push({ ...stats, foods: plannedFoods, date: dateString });
  }

  return {
    days: futureDays,
    averageCalories: 0,
    averageProtein: 0,
    averageCarbs: 0,
    averageFat: 0,
    totalDays: 7,
  };
}

export function HistoryModal({ open, onClose, isLoading = false, foods, goal, onDeleteFood, onEditFood, onAddFood, onDeleteAllDayFoods, foodTemplates, onOpenTemplates }: Readonly<HistoryModalProps>) {
  const INITIAL_DAY_COUNT = 20;
  const DAY_INCREMENT = 20;
  const [tabValue, setTabValue] = useState(0);
  const [visibleDayCount, setVisibleDayCount] = useState(INITIAL_DAY_COUNT);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [addingToDate, setAddingToDate] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [foodToDelete, setFoodToDelete] = useState<Food | null>(null);
  const [deleteAllDayDialogOpen, setDeleteAllDayDialogOpen] = useState(false);
  const [dayToDeleteAll, setDayToDeleteAll] = useState<string | null>(null);
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

  // Günün tüm yemeklerini silme
  const handleDeleteAllDay = (dateString: string) => {
    setDayToDeleteAll(dateString);
    setDeleteAllDayDialogOpen(true);
  };

  const handleDeleteAllDayConfirm = () => {
    if (dayToDeleteAll) {
      onDeleteAllDayFoods(dayToDeleteAll);
      setDeleteAllDayDialogOpen(false);
      setDayToDeleteAll(null);
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
      Number.parseInt(dateParts[0], 10),
      Number.parseInt(dateParts[1], 10) - 1,
      Number.parseInt(dateParts[2], 10),
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
        displayName = `${selectedTemplate!.name} (${formatGrams(amount)}g)`;
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
  
  // Farklı zaman aralıkları
  const monthlyStats = useMemo(() => calculateWeeklyStats(foods, 30), [foods]);

  const futureStats = useMemo(() => getFutureDaysStats(foods), [foods]);

  const currentStats = tabValue === 2 ? futureStats : monthlyStats;
  const isFutureTab = tabValue === 2;
  const activeDays = currentStats.days.filter(d => d.foods.length > 0).length;
  const hasAnyData = isFutureTab ? true : activeDays > 0;
  const summaryTitle = isMobile ? 'Ortalama' : 'Ortalama Günlük Değerler';
  const orderedDays = useMemo(
    () => (isFutureTab ? currentStats.days : currentStats.days.slice().reverse()),
    [currentStats.days, isFutureTab]
  );
  const visibleDays = useMemo(
    () => (isFutureTab ? orderedDays : orderedDays.slice(0, visibleDayCount)),
    [isFutureTab, orderedDays, visibleDayCount]
  );
  const groupedFoodsByDay = useMemo(() => {
    const result: Record<string, Record<string, Food[]>> = {};
    visibleDays.forEach(day => {
      const groups: Record<string, Food[]> = {
        breakfast: [], lunch: [], dinner: [], snack: [], other: [],
      };
      day.foods.forEach(food => {
        const key = (food.mealType && food.mealType in groups) ? food.mealType : 'other';
        groups[key].push(food);
      });
      result[day.date] = groups;
    });
    return result;
  }, [visibleDays]);

  const summaryTotals = useMemo(() => {
    const totals = currentStats.days.reduce(
      (acc, day) => {
        acc.calories += day.totalCalories;
        acc.protein += day.totalProtein;
        acc.carbs += day.totalCarbs;
        acc.fat += day.totalFat;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const goals = {
      calories: goal.calories * currentStats.totalDays,
      protein: goal.protein * currentStats.totalDays,
      carbs: goal.carbs * currentStats.totalDays,
      fat: goal.fat * currentStats.totalDays,
    };

    return {
      totals,
      goals,
      caloriePercentage: Math.round(getPercentage(totals.calories, goals.calories)),
      proteinPercentage: getPercentage(totals.protein, goals.protein),
      carbsPercentage: getPercentage(totals.carbs, goals.carbs),
      fatPercentage: getPercentage(totals.fat, goals.fat),
    };
  }, [currentStats.days, currentStats.totalDays, goal]);

  // En iyi ve en kötü günleri bul
  const bestWorst = useMemo(() => {
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
  }, [currentStats.days, goal.calories]);

  // Trend hesaplama (önceki döneme göre değişim)
  const trend = useMemo(() => {
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
  }, [tabValue, activeDays, currentStats.days, goal.calories]);

  const getDeleteDaySummary = (dateString: string): string => {
    const dateParts = dateString.split('-');
    const dayStart = new Date(
      Number.parseInt(dateParts[0], 10),
      Number.parseInt(dateParts[1], 10) - 1,
      Number.parseInt(dateParts[2], 10),
      0,
      0,
      0
    ).getTime();
    const dayEnd = new Date(
      Number.parseInt(dateParts[0], 10),
      Number.parseInt(dateParts[1], 10) - 1,
      Number.parseInt(dateParts[2], 10),
      23,
      59,
      59,
      999
    ).getTime();
    const dayFoods = foods.filter(f => f.timestamp >= dayStart && f.timestamp <= dayEnd);
    const totalCal = dayFoods.reduce((sum, f) => sum + f.calories, 0);
    return `${dayFoods.length} yemek • ${totalCal} kcal`;
  };

  const getTemplateAmountLabel = (): string => {
    if (!editingFood?.templateId) return 'Miktar';
    const template = foodTemplates.find(t => t.id === editingFood.templateId);
    if (!template) return 'Miktar';
    return template.unit === 'piece' ? 'Adet' : 'Gram';
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
        slotProps={{
          paper: {
            sx: {
              maxHeight: isMobile ? '100%' : '90vh',
            }
          }
        }}
      >
        <DialogTitle id="history-dialog-title" sx={{ pb: isMobile ? 1 : 1.5, pt: isMobile ? 1.5 : 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{
                width: isMobile ? 30 : 36,
                height: isMobile ? 30 : 36,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #18181b22 0%, #3f3f4622 100%)',
                border: '1.5px solid rgba(24,24,27,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <CalendarMonthIcon sx={{ fontSize: isMobile ? 16 : 20, color: '#18181b' }} />
              </Box>
              <Box>
                <Typography variant={isMobile ? 'subtitle1' : 'h6'} sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                  Kayıtlar & Planlama
                </Typography>
              </Box>
            </Box>
            <IconButton
              onClick={onClose}
              size="small"
              aria-label="Kapat"
              sx={{ color: 'text.secondary' }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ px: isMobile ? 1.5 : 3, pb: isMobile ? 2 : 3 }}>
          {isLoading ? (
            <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={10} gap={2}>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary">
                Kayıtlar yükleniyor...
              </Typography>
            </Box>
          ) : (
            <>
          <Tabs
            value={tabValue}
            onChange={(_, newValue) => {
              setTabValue(newValue);
              setVisibleDayCount(INITIAL_DAY_COUNT);
            }}
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
              label="İstatistikler"
              disableRipple
              sx={{ flexGrow: 1, textAlign: 'center', fontSize: isMobile ? '0.85rem' : undefined }}
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

          {tabValue === 1 && <StatsTab foods={foods} goal={goal} />}

          {tabValue !== 1 && hasAnyData && (
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
                        {summaryTitle}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.3, borderRadius: 1.5, bgcolor: 'rgba(24,24,27,0.1)', border: '1px solid rgba(24,24,27,0.25)' }}>
                        <LocalFireDepartmentIcon sx={{ fontSize: 13, color: '#18181b' }} />
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#18181b' }}>{activeDays} aktif gün</Typography>
                      </Box>
                      {activeDays > 0 && (
                        <Box sx={{ px: 1, py: 0.3, borderRadius: 1.5, bgcolor: 'rgba(24,24,27,0.06)', border: '1px solid rgba(24,24,27,0.15)' }}>
                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }}>{currentStats.averageCalories} kcal/gün ort.</Typography>
                        </Box>
                      )}
                      {trend && (
                        <Tooltip title={trend.improving ? 'Hedefe yaklaşıyorsun!' : 'Hedeften uzaklaşıyorsun'}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.3, borderRadius: 1.5, bgcolor: trend.improving ? 'rgba(21,128,61,0.1)' : 'rgba(180,83,9,0.1)', border: trend.improving ? '1px solid rgba(21,128,61,0.3)' : '1px solid rgba(180,83,9,0.3)' }}>
                            {trend.improving ? <TrendingUpIcon sx={{ fontSize: 13, color: '#15803d' }} /> : <TrendingDownIcon sx={{ fontSize: 13, color: '#b45309' }} />}
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: trend.improving ? '#15803d' : '#b45309' }}>{trend.change > 0 ? '+' : ''}{trend.change}%</Typography>
                          </Box>
                        </Tooltip>
                      )}
                    </Stack>
                  </Box>

                  {/* İstatistik Özet Grid */}
                  <Stack direction="row" spacing={isMobile ? 1 : 1.5} mb={isMobile ? 1.5 : 2} flexWrap="wrap" useFlexGap>
                    {[
                      { label: 'Ort. Kalori', value: `${currentStats.averageCalories}`, sub: `/ ${goal.calories} kcal`, color: '#18181b' },
                      { label: 'Ort. Protein', value: `${currentStats.averageProtein}g`, sub: `/ ${goal.protein}g`, color: '#0369a1' },
                      { label: 'Ort. Karb', value: `${currentStats.averageCarbs}g`, sub: `/ ${goal.carbs}g`, color: '#15803d' },
                      { label: 'Ort. Yağ', value: `${currentStats.averageFat}g`, sub: `/ ${goal.fat}g`, color: '#b45309' },
                    ].map(({ label, value, sub, color }) => (
                      <Box key={label} sx={{ flex: { xs: '1 1 calc(50% - 8px)', sm: '1 1 calc(25% - 12px)' }, minWidth: 0 }}>
                        <Paper sx={{
                          p: isMobile ? 1 : 1.25,
                          textAlign: 'center',
                          bgcolor: `${color}0d`,
                          border: `1px solid ${color}25`,
                          borderRadius: 2,
                        }}>
                          <Typography variant="caption" display="block" fontSize={isMobile ? '0.62rem' : '0.7rem'} fontWeight="600" color="text.secondary">
                            {label}
                          </Typography>
                          <Typography variant="h6" fontWeight="800" fontSize={isMobile ? '1rem' : '1.2rem'} sx={{ color }}>
                            {value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.58rem' : '0.65rem'}>
                            {sub}
                          </Typography>
                        </Paper>
                      </Box>
                    ))}
                  </Stack>

                  {/* En İyi ve En Kötü Günler */}
                  {bestWorst && activeDays > 2 && (
                    <Stack direction="row" spacing={isMobile ? 1 : 1.5} mt={isMobile ? 1.5 : 2} flexWrap="wrap" useFlexGap>
                      <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 6px)' }, minWidth: 0 }}>
                        <Paper sx={{
                          p: 1.25,
                          bgcolor: 'rgba(21,128,61,0.06)',
                          border: '1px solid rgba(21,128,61,0.2)',
                          borderRadius: 2,
                        }}>
                          <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                            <EmojiEventsIcon sx={{ fontSize: 15, color: '#15803d' }} />
                            <Typography variant="caption" fontWeight="700" fontSize={isMobile ? '0.65rem' : '0.72rem'} sx={{ color: '#15803d' }}>
                              En İyi Gün
                            </Typography>
                          </Stack>
                          <Typography variant="body2" fontWeight="700" fontSize={isMobile ? '0.75rem' : '0.85rem'}>
                            {formatDate(bestWorst.bestDay.date)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.6rem' : '0.68rem'}>
                            {bestWorst.bestDay.totalCalories} kcal · hedef {goal.calories}
                          </Typography>
                        </Paper>
                      </Box>
                      <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 calc(50% - 6px)' }, minWidth: 0 }}>
                        <Paper sx={{
                          p: 1.25,
                          bgcolor: 'rgba(239,68,68,0.06)',
                          border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: 2,
                        }}>
                          <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
                            <TrendingDownIcon sx={{ fontSize: 15, color: '#dc2626' }} />
                            <Typography variant="caption" fontWeight="700" fontSize={isMobile ? '0.65rem' : '0.72rem'} sx={{ color: '#dc2626' }}>
                              En Uzak Gün
                            </Typography>
                          </Stack>
                          <Typography variant="body2" fontWeight="700" fontSize={isMobile ? '0.75rem' : '0.85rem'}>
                            {formatDate(bestWorst.worstDay.date)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.6rem' : '0.68rem'}>
                            {bestWorst.worstDay.totalCalories} kcal · hedef {goal.calories}
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
                          {`${summaryTotals.caloriePercentage}% tamamlandı`}
                        </Typography>
                      </Box>
                      <Box display="flex" justifyContent="space-between" mb={0.5}>
                        <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.7rem' : '0.75rem'}>
                          {summaryTotals.totals.calories.toLocaleString()} kcal
                        </Typography>
                        <Typography variant="caption" color="text.secondary" fontSize={isMobile ? '0.7rem' : '0.75rem'}>
                          Hedef: {summaryTotals.goals.calories.toLocaleString()} kcal
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={summaryTotals.caloriePercentage}
                        className={getCalorieProgressClass(summaryTotals.goals.calories > 0 ? (summaryTotals.totals.calories / summaryTotals.goals.calories) * 100 : 0)}
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
                          value={summaryTotals.proteinPercentage}
                          color="info"
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" display="block" textAlign="center" mt={0.5} fontSize={isMobile ? '0.6rem' : '0.7rem'} color="text.secondary">
                          {`${Math.round(summaryTotals.totals.protein)}g / ${Math.round(summaryTotals.goals.protein)}g`}
                        </Typography>
                      </Box>
                      <Box flex={1}>
                        <Typography variant="caption" display="block" textAlign="center" mb={0.5} fontSize={isMobile ? '0.65rem' : '0.75rem'}>
                          Karbonhidrat
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={summaryTotals.carbsPercentage}
                          color="success"
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" display="block" textAlign="center" mt={0.5} fontSize={isMobile ? '0.6rem' : '0.7rem'} color="text.secondary">
                          {`${Math.round(summaryTotals.totals.carbs)}g / ${Math.round(summaryTotals.goals.carbs)}g`}
                        </Typography>
                      </Box>
                      <Box flex={1}>
                        <Typography variant="caption" display="block" textAlign="center" mb={0.5} fontSize={isMobile ? '0.65rem' : '0.75rem'}>
                          Yağ
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={summaryTotals.fatPercentage}
                          color="warning"
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                        <Typography variant="caption" display="block" textAlign="center" mt={0.5} fontSize={isMobile ? '0.6rem' : '0.7rem'} color="text.secondary">
                          {`${Math.round(summaryTotals.totals.fat)}g / ${Math.round(summaryTotals.goals.fat)}g`}
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
                {visibleDays.map((day) => {
                  const percentage = getPercentage(day.totalCalories, goal.calories);
                  const rawCalPct = goal.calories > 0 ? (day.totalCalories / goal.calories) * 100 : 0;
                  const hasData = day.foods.length > 0;
                  const isExpanded = expandedDays[day.date];
                  const cardBgColor = (isFutureTab && hasData) ? 'success.50' : 'background.paper';
                  
                  return (
                    <Card
                      key={day.date}
                      variant="outlined"
                      sx={{
                        opacity: hasData ? 1 : 0.7,
                        border: '1px solid rgba(0,0,0,0.08)',
                        borderRadius: 2,
                        overflow: 'visible',
                        bgcolor: cardBgColor,
                        ...(hasData && isFutureTab && { bgcolor: 'rgba(21,128,61,0.04)', border: '1px solid rgba(21,128,61,0.18)' }),
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
                            
                            {/* Günün tüm yemeklerini sil butonu */}
                            {hasData && (isFutureTab || !isToday(day.date)) && (
                              <Tooltip title="Bu günün tüm yemeklerini sil">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteAllDay(day.date)}
                                  sx={{ padding: 0.5 }}
                                >
                                  <DeleteIcon fontSize="small" />
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
                              <Box sx={{
                                px: 1, py: 0.3, borderRadius: 1.5,
                                bgcolor: isFutureTab ? 'rgba(21,128,61,0.1)' : 'rgba(24,24,27,0.1)',
                                border: `1px solid ${isFutureTab ? 'rgba(21,128,61,0.3)' : 'rgba(24,24,27,0.25)'}`,
                              }}>
                                <Typography sx={{ fontSize: isMobile ? '0.68rem' : '0.75rem', fontWeight: 700, color: isFutureTab ? '#15803d' : '#18181b' }}>
                                  {day.totalCalories} kcal
                                </Typography>
                              </Box>
                            ) : (
                              <Box sx={{
                                px: 1, py: 0.3, borderRadius: 1.5,
                                bgcolor: 'rgba(0,0,0,0.04)',
                                border: '1px solid rgba(0,0,0,0.1)',
                              }}>
                                <Typography sx={{ fontSize: isMobile ? '0.65rem' : '0.72rem', fontWeight: 500, color: 'text.secondary' }}>
                                  {isFutureTab ? 'Plan yok' : 'Veri yok'}
                                </Typography>
                              </Box>
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
                                className={getCalorieProgressClass(rawCalPct)}
                                sx={{ height: isMobile ? 5 : 6, borderRadius: 4 }}
                              />
                            </Box>
                            
                            {/* Makro kutucuklar */}
                            <Box mb={isMobile ? 0.75 : 1}>
                              <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'nowrap' }}>
                                {[
                                  { label: `P: ${formatGrams(day.totalProtein)}g`, color: '#0369a1' },
                                  { label: `K: ${formatGrams(day.totalCarbs)}g`, color: '#15803d' },
                                  { label: `Y: ${formatGrams(day.totalFat)}g`, color: '#b45309' },
                                  { label: `${day.foods.length} öğe`, color: '#94a3b8' },
                                ].map(({ label, color }) => (
                                  <Box key={label} sx={{
                                    flex: 1, minWidth: 0, textAlign: 'center',
                                    px: 0.5, py: 0.3, borderRadius: 1,
                                    bgcolor: `${color}12`, border: `1px solid ${color}28`,
                                  }}>
                                    <Typography sx={{ fontSize: isMobile ? '0.6rem' : '0.68rem', fontWeight: 700, color, lineHeight: 1.3 }}>
                                      {label}
                                    </Typography>
                                  </Box>
                                ))}
                              </Stack>
                            </Box>

                            {/* Yemek listesi - Detaylı görünüm */}
                            <Collapse in={isExpanded} timeout="auto">
                              <Divider sx={{ mb: isMobile ? 0.75 : 1 }} />
                              <Stack spacing={isMobile ? 0.75 : 1}>
                                {Object.entries(groupedFoodsByDay[day.date] ?? {}).map(([mealType, mealFoods]) => {
                                  if (mealFoods.length === 0) return null;

                                  return (
                                    <HistoryMealSection
                                      key={mealType}
                                      mealType={mealType}
                                      mealFoods={mealFoods}
                                      isMobile={isMobile}
                                      onEdit={handleEditFood}
                                      onDelete={handleDeleteFood}
                                    />
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

              {!isFutureTab && orderedDays.length > visibleDays.length && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Button
                    variant="outlined"
                    onClick={() => setVisibleDayCount((prev) => prev + DAY_INCREMENT)}
                  >
                    Daha Fazla Gün Göster
                  </Button>
                </Box>
              )}
            </>
          )}

          {tabValue !== 1 && !hasAnyData && (
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
            </>
          )}
        </DialogContent>

      </Dialog>

      {/* Silme Onay Dialogu */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              m: 2,
            }
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DeleteIcon sx={{ fontSize: 16, color: '#dc2626' }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Yemeği Sil</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Bu yemeği geçmişten silmek istediğinizden emin misiniz?
          </Typography>
          {foodToDelete && (
            <Box sx={{
              mt: 1.5, p: 1.5,
              bgcolor: 'rgba(239,68,68,0.05)',
              borderRadius: 1.5,
              border: '1px solid rgba(239,68,68,0.18)',
            }}>
              <Typography variant="body2" fontWeight={600}>{foodToDelete.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {foodToDelete.calories} kcal · {new Date(foodToDelete.timestamp).toLocaleDateString('tr-TR')}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2, flex: 1 }}
          >
            İptal
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            startIcon={<DeleteIcon />}
            sx={{
              borderRadius: 2, flex: 1,
              bgcolor: '#dc2626',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#b91c1c', boxShadow: '0 4px 12px rgba(220,38,38,0.3)' },
            }}
          >
            Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Günün Tüm Yemeklerini Silme Onay Dialogu */}
      <Dialog
        open={deleteAllDayDialogOpen}
        onClose={() => setDeleteAllDayDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              m: 2,
            }
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DeleteIcon sx={{ fontSize: 16, color: '#dc2626' }} />
            </Box>
            <Typography variant="h6" fontWeight={700}>Günün Tüm Yemeklerini Sil</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Bu güne ait tüm yemekleri silmek istediğinizden emin misiniz?
          </Typography>
          {dayToDeleteAll && (
            <Box sx={{
              mt: 1.5, p: 1.5,
              bgcolor: 'rgba(239,68,68,0.05)',
              borderRadius: 1.5,
              border: '1px solid rgba(239,68,68,0.18)',
            }}>
              <Typography variant="body2" fontWeight={600}>
                {formatDate(dayToDeleteAll)} · {getDayName(dayToDeleteAll)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {getDeleteDaySummary(dayToDeleteAll)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
          <Button
            onClick={() => setDeleteAllDayDialogOpen(false)}
            variant="outlined"
            sx={{ borderRadius: 2, flex: 1 }}
          >
            İptal
          </Button>
          <Button
            onClick={handleDeleteAllDayConfirm}
            variant="contained"
            startIcon={<DeleteIcon />}
            sx={{
              borderRadius: 2, flex: 1,
              bgcolor: '#dc2626',
              boxShadow: 'none',
              '&:hover': { bgcolor: '#b91c1c', boxShadow: '0 4px 12px rgba(220,38,38,0.3)' },
            }}
          >
            Tümünü Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* Düzenleme Dialog'u */}
      <Dialog
        open={!!editingFood}
        onClose={() => setEditingFood(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1, pt: 2.5 }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg, #18181b22 0%, #3f3f4622 100%)', border: '1.5px solid rgba(24,24,27,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <EditIcon sx={{ fontSize: 18, color: '#18181b' }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>Yemek Düzenle</Typography>
              {editingFood && (
                <Typography variant="caption" color="text.secondary">{editingFood.name}</Typography>
              )}
            </Box>
          </Box>
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
                  label={getTemplateAmountLabel()}
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
            
            <MealTypeSelector
              value={editFormData.mealType}
              onChange={(mealType) => setEditFormData({ ...editFormData, mealType })}
              label="Öğün"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setEditingFood(null)} variant="outlined" sx={{ borderRadius: 2, flex: 1 }}>
            İptal
          </Button>
          <Button onClick={handleEditSave} variant="contained" startIcon={<EditIcon />} sx={{ borderRadius: 2, flex: 1, background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)', boxShadow: 'none', '&:hover': { boxShadow: '0 4px 12px rgba(24,24,27,0.35)' } }}>
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
        PaperProps={{ sx: { borderRadius: 3, maxHeight: '90vh' } }}
      >
        <DialogTitle sx={{ pb: 1, pt: 2.5 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg, #18181b22 0%, #3f3f4622 100%)', border: '1.5px solid rgba(24,24,27,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AddIcon sx={{ fontSize: 18, color: '#18181b' }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>Yemek Ekle</Typography>
                {addingToDate && (
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(addingToDate)} · {getDayName(addingToDate)}
                  </Typography>
                )}
              </Box>
            </Box>
            {addFoodTabValue === 0 && (
              <Button
                size="small"
                variant="outlined"
                onClick={onOpenTemplates}
                startIcon={<RestaurantMenuIcon />}
                sx={{ borderRadius: 1.5, flexShrink: 0 }}
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
              <MealTypeSelector
                value={editFormData.mealType}
                onChange={(mealType) => setEditFormData({ ...editFormData, mealType })}
                label="Öğün"
              />

              {/* Besin Seçimi */}
              <Autocomplete
                options={foodTemplates}
                getOptionLabel={(option) => option.name}
                value={selectedTemplate}
                onChange={(_, newValue) => {
                  setSelectedTemplate(newValue);
                  if (newValue) {
                    if (newValue.unit === 'piece') {
                      setTemplateAmount('1');
                    } else {
                      setTemplateAmount('');
                    }
                  } else {
                    setTemplateAmount('');
                  }
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
                <Box sx={{
                  p: 1.5,
                  bgcolor: 'rgba(24,24,27,0.04)',
                  borderRadius: 2,
                  border: '1px solid rgba(24,24,27,0.15)',
                }}>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                    Toplam Değerler ({templatePreview.amount} {templatePreview.unit})
                  </Typography>
                  <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'nowrap' }}>
                    {[
                      { label: `${templatePreview.calories} kcal`, color: '#18181b' },
                      { label: `${formatGrams(templatePreview.protein)}g P`, color: '#0369a1' },
                      { label: `${formatGrams(templatePreview.carbs)}g K`, color: '#15803d' },
                      { label: `${formatGrams(templatePreview.fat)}g Y`, color: '#b45309' },
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
            </Stack>
          )}

          {/* TAB 1: Manuel Giriş */}
          {addFoodTabValue === 1 && (
            <Stack spacing={2}>
              {/* Öğün Seçimi */}
              <MealTypeSelector
                value={editFormData.mealType}
                onChange={(mealType) => setEditFormData({ ...editFormData, mealType })}
                label="Öğün"
              />

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
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
          <Button onClick={() => setAddingToDate(null)} variant="outlined" sx={{ borderRadius: 2, flex: 1 }}>
            Kapat
          </Button>
          <Button
            type="submit"
            form="add-food-form"
            variant="contained"
            startIcon={<AddIcon />}
            disabled={addFoodTabValue === 0 && (!selectedTemplate || !templateAmount)}
            sx={{
              borderRadius: 2, flex: 1,
              background: 'linear-gradient(135deg, #18181b 0%, #3f3f46 100%)',
              boxShadow: 'none',
              '&:hover': { boxShadow: '0 4px 12px rgba(24,24,27,0.35)' },
              '&.Mui-disabled': { background: 'rgba(0,0,0,0.12)' },
            }}
          >
            Ekle
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
