import type { DailyStats, Food, WeeklyStats } from '../types';

/**
 * Tarih ve geçmiş yönetimi için yardımcı fonksiyonlar
 */

// Tarih string'ini al (YYYY-MM-DD)
export const getDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Tarih range'i oluştur
export const getDateRange = (days: number): string[] => {
  const dates: string[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(getDateString(date));
  }
  
  return dates;
};

// Belirli bir güne ait yemekleri filtrele
export const getFoodsByDate = (foods: Food[], dateString: string): Food[] => {
  // Tarih string'ini local timezone'da Date objesine çevir
  const [year, month, day] = dateString.split('-').map(Number);
  const dateStart = new Date(year, month - 1, day, 0, 0, 0).getTime();
  const dateEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
  
  return foods.filter(food => 
    food.timestamp >= dateStart && food.timestamp <= dateEnd
  );
};

// Günlük istatistik hesapla
export const calculateDailyStats = (foods: Food[], dateString: string): DailyStats => {
  const dayFoods = getFoodsByDate(foods, dateString);
  
  const stats = dayFoods.reduce(
    (acc, food) => ({
      totalCalories: acc.totalCalories + food.calories,
      totalProtein: acc.totalProtein + food.protein,
      totalCarbs: acc.totalCarbs + food.carbs,
      totalFat: acc.totalFat + food.fat,
    }),
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
  );
  
  return {
    ...stats,
    foods: dayFoods,
    date: dateString,
  };
};

// Haftalık istatistik hesapla
export const calculateWeeklyStats = (foods: Food[], days: number = 7): WeeklyStats => {
  const dateRange = getDateRange(days);
  const dailyStats = dateRange.map(date => calculateDailyStats(foods, date));
  
  // Sadece yemek olan günleri say (aktif günler)
  const activeDays = dailyStats.filter(day => day.foods.length > 0);
  const activeDaysCount = activeDays.length || 1; // 0'a bölme hatası önlemek için
  
  const totalCalories = dailyStats.reduce((sum, day) => sum + day.totalCalories, 0);
  const totalProtein = dailyStats.reduce((sum, day) => sum + day.totalProtein, 0);
  const totalCarbs = dailyStats.reduce((sum, day) => sum + day.totalCarbs, 0);
  const totalFat = dailyStats.reduce((sum, day) => sum + day.totalFat, 0);
  
  return {
    days: dailyStats,
    averageCalories: Math.round(totalCalories / activeDaysCount),
    averageProtein: Math.round(totalProtein / activeDaysCount),
    averageCarbs: Math.round(totalCarbs / activeDaysCount),
    averageFat: Math.round(totalFat / activeDaysCount),
    totalDays: days,
  };
};

// Tarih formatla (Türkçe)
export const formatDate = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const todayStr = getDateString(today);
  const yesterdayStr = getDateString(yesterday);
  
  if (dateString === todayStr) {
    return 'Bugün';
  } else if (dateString === yesterdayStr) {
    return 'Dün';
  } else {
    return date.toLocaleDateString('tr-TR', { 
      day: 'numeric', 
      month: 'long',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }
};

// Gün adı al
export const getDayName = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('tr-TR', { weekday: 'short' });
};
