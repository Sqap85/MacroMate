import type { DailyStats, Food, WeeklyStats } from '../types';

export const getDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateStringFromTimestamp = (timestamp: number): string => {
  return getDateString(new Date(timestamp));
};

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

export const getFoodsByDate = (foods: Food[], dateString: string): Food[] => {
  // Parse date string in local timezone
  const [year, month, day] = dateString.split('-').map(Number);
  const dateStart = new Date(year, month - 1, day, 0, 0, 0).getTime();
  const dateEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();

  return foods.filter(food =>
    food.timestamp >= dateStart && food.timestamp <= dateEnd
  );
};

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

export const calculateWeeklyStats = (foods: Food[], days: number = 7): WeeklyStats => {
  const dateRange = getDateRange(days);
  const dayMap = new Map<string, DailyStats>();

  // Build per-day totals in a single pass
  for (const food of foods) {
    const dateKey = getDateStringFromTimestamp(food.timestamp);
    const current = dayMap.get(dateKey);

    if (current) {
      current.totalCalories += food.calories;
      current.totalProtein += food.protein;
      current.totalCarbs += food.carbs;
      current.totalFat += food.fat;
      current.foods.push(food);
    } else {
      dayMap.set(dateKey, {
        totalCalories: food.calories,
        totalProtein: food.protein,
        totalCarbs: food.carbs,
        totalFat: food.fat,
        foods: [food],
        date: dateKey,
      });
    }
  }

  const dailyStats = dateRange.map((date) => {
    const stats = dayMap.get(date);
    if (stats) return stats;

    return {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      foods: [],
      date,
    };
  });

  // Count only days that have food entries
  const activeDays = dailyStats.filter(day => day.foods.length > 0);
  const activeDaysCount = activeDays.length || 1; // avoid division by zero

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

// Returns Turkish-formatted date string
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

export const getDayName = (dateString: string): string => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('tr-TR', { weekday: 'short' });
};
