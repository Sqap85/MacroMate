import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getDateString,
  getDateRange,
  getFoodsByDate,
  calculateDailyStats,
  calculateWeeklyStats,
  formatDate,
  getDayName,
} from '../utils/dateUtils';
import type { Food } from '../types';

// Fixed date: 2026-04-13 (Monday)
const FIXED_DATE = new Date(2026, 3, 13, 12, 0, 0);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_DATE);
});

afterEach(() => {
  vi.useRealTimers();
});

const makeFood = (dateStr: string, calories: number, overrides: Partial<Food> = {}): Food => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return {
    id: `food-${Math.random()}`,
    name: 'Test',
    calories,
    protein: 10,
    carbs: 20,
    fat: 5,
    timestamp: new Date(y, m - 1, d, 12, 0, 0).getTime(),
    ...overrides,
  };
};

describe('getDateString', () => {
  it('formats today correctly', () => {
    expect(getDateString()).toBe('2026-04-13');
  });

  it('pads month and day with zeros', () => {
    expect(getDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('getDateRange', () => {
  it('returns correct number of dates', () => {
    expect(getDateRange(7)).toHaveLength(7);
  });

  it('ends with today', () => {
    const range = getDateRange(3);
    expect(range[range.length - 1]).toBe('2026-04-13');
  });

  it('starts N-1 days ago', () => {
    const range = getDateRange(3);
    expect(range[0]).toBe('2026-04-11');
  });
});

describe('getFoodsByDate', () => {
  it('returns only foods matching the given date', () => {
    const foods = [
      makeFood('2026-04-13', 500),
      makeFood('2026-04-12', 300),
      makeFood('2026-04-13', 200),
    ];
    const result = getFoodsByDate(foods, '2026-04-13');
    expect(result).toHaveLength(2);
    expect(result.every(f => f.calories !== 300)).toBe(true);
  });

  it('handles midnight timestamps correctly (start and end of day)', () => {
    const [y, m, d] = [2026, 3, 13]; // April 13
    const atMidnight = new Date(y, m, d, 0, 0, 0).getTime();
    const atEndOfDay = new Date(y, m, d, 23, 59, 59).getTime();
    const foods: Food[] = [
      { ...makeFood('2026-04-13', 100), timestamp: atMidnight },
      { ...makeFood('2026-04-13', 200), timestamp: atEndOfDay },
    ];
    expect(getFoodsByDate(foods, '2026-04-13')).toHaveLength(2);
  });
});

describe('calculateDailyStats', () => {
  it('sums macros correctly', () => {
    const foods = [
      makeFood('2026-04-13', 300),
      makeFood('2026-04-13', 200),
    ];
    const stats = calculateDailyStats(foods, '2026-04-13');
    expect(stats.totalCalories).toBe(500);
    expect(stats.totalProtein).toBe(20);
    expect(stats.totalCarbs).toBe(40);
    expect(stats.totalFat).toBe(10);
  });

  it('returns zeros for a day with no foods', () => {
    const stats = calculateDailyStats([], '2026-04-13');
    expect(stats.totalCalories).toBe(0);
    expect(stats.foods).toHaveLength(0);
  });

  it('only includes foods for the specified date', () => {
    const foods = [
      makeFood('2026-04-13', 400),
      makeFood('2026-04-12', 999),
    ];
    const stats = calculateDailyStats(foods, '2026-04-13');
    expect(stats.totalCalories).toBe(400);
  });
});

describe('calculateWeeklyStats', () => {
  it('averages over active days only (ignores empty days)', () => {
    // Only one day has food — average should equal that day's total
    const foods = [makeFood('2026-04-13', 600)];
    const stats = calculateWeeklyStats(foods, 7);
    expect(stats.averageCalories).toBe(600);
  });

  it('returns correct number of day slots', () => {
    const stats = calculateWeeklyStats([], 7);
    expect(stats.days).toHaveLength(7);
    expect(stats.totalDays).toBe(7);
  });

  it('does not divide by zero when no foods exist', () => {
    const stats = calculateWeeklyStats([], 7);
    expect(stats.averageCalories).toBe(0);
  });
});

describe('formatDate', () => {
  it('returns "Bugün" for today', () => {
    expect(formatDate('2026-04-13')).toBe('Bugün');
  });

  it('returns "Dün" for yesterday', () => {
    expect(formatDate('2026-04-12')).toBe('Dün');
  });

  it('returns a locale string for older dates', () => {
    const result = formatDate('2026-03-01');
    expect(result).not.toBe('Bugün');
    expect(result).not.toBe('Dün');
    expect(typeof result).toBe('string');
  });
});

describe('getDayName', () => {
  it('returns a non-empty string', () => {
    expect(getDayName('2026-04-13').length).toBeGreaterThan(0);
  });
});
