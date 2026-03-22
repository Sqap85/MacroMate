import type { DailyGoal, Food } from '../types';

export interface StatsStreak {
  current: number;
  longest: number;
  thisMonth: number;
  totalActiveDays: number;
}

export interface StatsRecords {
  bestDay: { date: string; calories: number } | null;
  highestProtein: { date: string; protein: number } | null;
}

export interface MonthlyBarData {
  month: string;
  percentage: number;
  daysOnTarget: number;
  totalDays: number;
}

export interface CalculatedStats {
  streak: StatsStreak;
  records: StatsRecords;
  monthlyBars: MonthlyBarData[];
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
}

interface DayAggregate {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

function getDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function buildDayMap(foods: Food[]): Map<string, DayAggregate> {
  const map = new Map<string, DayAggregate>();

  for (const food of foods) {
    const key = getDateKey(food.timestamp);
    const existing = map.get(key);

    if (existing) {
      existing.calories += food.calories;
      existing.protein += food.protein;
      existing.carbs += food.carbs;
      existing.fat += food.fat;
    } else {
      map.set(key, {
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
      });
    }
  }

  return map;
}

function getCurrentStreak(activeDateKeys: string[]): number {
  if (activeDateKeys.length === 0) return 0;

  const activeSet = new Set(activeDateKeys);
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  let streak = 0;
  while (true) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;

    if (!activeSet.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function getLongestStreak(sortedDateKeys: string[]): number {
  if (sortedDateKeys.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < sortedDateKeys.length; i += 1) {
    const prev = parseDateKey(sortedDateKeys[i - 1]);
    const next = parseDateKey(sortedDateKeys[i]);
    const diffDays = Math.round((next.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      current += 1;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('tr-TR', { month: 'short' });
}

export function calculateStats(foods: Food[], goal: DailyGoal): CalculatedStats {
  const dayMap = buildDayMap(foods);
  const activeDateKeys = Array.from(dayMap.keys()).sort((a, b) => a.localeCompare(b));
  const totalActiveDays = activeDateKeys.length;
  const divisor = totalActiveDays || 1;

  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  let bestDay: { date: string; calories: number } | null = null;
  let highestProtein: { date: string; protein: number } | null = null;

  for (const dateKey of activeDateKeys) {
    const day = dayMap.get(dateKey)!;

    totalCalories += day.calories;
    totalProtein += day.protein;
    totalCarbs += day.carbs;
    totalFat += day.fat;

    if (!bestDay || Math.abs(day.calories - goal.calories) < Math.abs(bestDay.calories - goal.calories)) {
      bestDay = { date: dateKey, calories: day.calories };
    }

    if (!highestProtein || day.protein > highestProtein.protein) {
      highestProtein = { date: dateKey, protein: day.protein };
    }
  }

  const now = new Date();
  const thisMonth = activeDateKeys.filter((key) => {
    const d = parseDateKey(key);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;

  const streak: StatsStreak = {
    current: getCurrentStreak(activeDateKeys),
    longest: getLongestStreak(activeDateKeys),
    thisMonth,
    totalActiveDays,
  };

  const monthlyBars: MonthlyBarData[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    let daysOnTarget = 0;
    let totalDays = 0;

    for (const dateKey of activeDateKeys) {
      const d = parseDateKey(dateKey);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;

      totalDays += 1;
      const day = dayMap.get(dateKey)!;
      if (Math.abs(day.calories - goal.calories) <= goal.calories * 0.1) {
        daysOnTarget += 1;
      }
    }

    const percentage = totalDays > 0 ? Math.round((daysOnTarget / totalDays) * 100) : 0;
    monthlyBars.push({
      month: getMonthLabel(monthDate),
      percentage,
      daysOnTarget,
      totalDays,
    });
  }

  return {
    streak,
    records: {
      bestDay,
      highestProtein,
    },
    monthlyBars,
    averageCalories: Math.round(totalCalories / divisor),
    averageProtein: Math.round(totalProtein / divisor),
    averageCarbs: Math.round(totalCarbs / divisor),
    averageFat: Math.round(totalFat / divisor),
  };
}
