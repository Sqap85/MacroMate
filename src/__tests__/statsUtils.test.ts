import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { calculateStats } from '../utils/statsUtils'
import type { Food, DailyGoal } from '../types'

// Fixed "today": 2026-04-13 (Monday)
const TODAY = new Date(2026, 3, 13, 12, 0, 0)

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
})

afterEach(() => {
  vi.useRealTimers()
})

const GOAL: DailyGoal = { calories: 2000, protein: 150, carbs: 250, fat: 70 }

let _id = 0
function food(dateStr: string, overrides: Partial<Food> = {}): Food {
  const [y, m, d] = dateStr.split('-').map(Number)
  return {
    id: `f${++_id}`,
    name: 'Test',
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 70,
    timestamp: new Date(y, m - 1, d, 12, 0, 0).getTime(),
    ...overrides,
  }
}

// ── Empty state ────────────────────────────────────────────────────────────────

describe('calculateStats — empty foods', () => {
  it('returns all zeros', () => {
    const s = calculateStats([], GOAL)
    expect(s.averageCalories).toBe(0)
    expect(s.averageProtein).toBe(0)
    expect(s.averageCarbs).toBe(0)
    expect(s.averageFat).toBe(0)
    expect(s.streak.current).toBe(0)
    expect(s.streak.longest).toBe(0)
    expect(s.streak.thisMonth).toBe(0)
    expect(s.streak.totalActiveDays).toBe(0)
    expect(s.records.bestDay).toBeNull()
    expect(s.records.highestProtein).toBeNull()
  })

  it('always returns 6 monthly bar slots', () => {
    expect(calculateStats([], GOAL).monthlyBars).toHaveLength(6)
  })
})

// ── Averages ────────────────────────────────────────────────────────────────────

describe('calculateStats — averages', () => {
  it('averages over active days only', () => {
    // Two different days, 1000 kcal each → avg should be 1000
    const foods = [
      food('2026-04-13', { calories: 1000, protein: 50, carbs: 100, fat: 30 }),
      food('2026-04-12', { calories: 1000, protein: 50, carbs: 100, fat: 30 }),
    ]
    const s = calculateStats(foods, GOAL)
    expect(s.averageCalories).toBe(1000)
    expect(s.averageProtein).toBe(50)
  })

  it('aggregates multiple foods on the same day', () => {
    const foods = [
      food('2026-04-13', { calories: 800, protein: 60, carbs: 100, fat: 30 }),
      food('2026-04-13', { calories: 1200, protein: 90, carbs: 150, fat: 40 }),
    ]
    const s = calculateStats(foods, GOAL)
    expect(s.averageCalories).toBe(2000) // both same day → 1 active day
    expect(s.averageProtein).toBe(150)
  })
})

// ── Current streak ──────────────────────────────────────────────────────────────

describe('calculateStats — current streak', () => {
  it('counts consecutive days ending today', () => {
    const foods = [
      food('2026-04-13'),
      food('2026-04-12'),
      food('2026-04-11'),
    ]
    expect(calculateStats(foods, GOAL).streak.current).toBe(3)
  })

  it('is 0 when today has no food', () => {
    const foods = [
      food('2026-04-12'),
      food('2026-04-11'),
    ]
    expect(calculateStats(foods, GOAL).streak.current).toBe(0)
  })

  it('breaks at a gap', () => {
    // today + 3 days ago (gap on the 11th and 12th)
    const foods = [
      food('2026-04-13'),
      food('2026-04-10'),
    ]
    expect(calculateStats(foods, GOAL).streak.current).toBe(1)
  })
})

// ── Longest streak ──────────────────────────────────────────────────────────────

describe('calculateStats — longest streak', () => {
  it('is 1 for a single day', () => {
    expect(calculateStats([food('2026-04-13')], GOAL).streak.longest).toBe(1)
  })

  it('finds the longest run across gaps', () => {
    const foods = [
      // 3-day run
      food('2026-04-11'),
      food('2026-04-12'),
      food('2026-04-13'),
      // gap
      // 2-day run
      food('2026-04-01'),
      food('2026-04-02'),
    ]
    expect(calculateStats(foods, GOAL).streak.longest).toBe(3)
  })

  it('counts all days when fully sequential', () => {
    const foods = [
      food('2026-04-10'),
      food('2026-04-11'),
      food('2026-04-12'),
      food('2026-04-13'),
    ]
    expect(calculateStats(foods, GOAL).streak.longest).toBe(4)
  })
})

// ── thisMonth + totalActiveDays ─────────────────────────────────────────────────

describe('calculateStats — thisMonth and totalActiveDays', () => {
  it('counts only days in the current month', () => {
    const foods = [
      food('2026-04-13'),
      food('2026-04-12'),
      food('2026-03-31'), // previous month
    ]
    const s = calculateStats(foods, GOAL)
    expect(s.streak.thisMonth).toBe(2)
    expect(s.streak.totalActiveDays).toBe(3)
  })
})

// ── Records ─────────────────────────────────────────────────────────────────────

describe('calculateStats — records', () => {
  it('bestDay picks the day closest to the calorie goal', () => {
    // Goal = 2000
    // day A = 1900 (off by 100), day B = 2200 (off by 200)
    const foods = [
      food('2026-04-12', { calories: 1900, protein: 100, carbs: 200, fat: 60 }),
      food('2026-04-13', { calories: 2200, protein: 100, carbs: 200, fat: 60 }),
    ]
    const s = calculateStats(foods, GOAL)
    expect(s.records.bestDay?.date).toBe('2026-04-12')
    expect(s.records.bestDay?.calories).toBe(1900)
  })

  it('highestProtein picks the day with most protein', () => {
    const foods = [
      food('2026-04-12', { calories: 2000, protein: 200, carbs: 200, fat: 60 }),
      food('2026-04-13', { calories: 2000, protein: 100, carbs: 200, fat: 60 }),
    ]
    const s = calculateStats(foods, GOAL)
    expect(s.records.highestProtein?.date).toBe('2026-04-12')
    expect(s.records.highestProtein?.protein).toBe(200)
  })
})

// ── Monthly bars ────────────────────────────────────────────────────────────────

describe('calculateStats — monthlyBars', () => {
  it('always returns exactly 6 bars', () => {
    expect(calculateStats([food('2026-04-13')], GOAL).monthlyBars).toHaveLength(6)
  })

  it('last bar corresponds to current month', () => {
    const bars = calculateStats([food('2026-04-13')], GOAL).monthlyBars
    // The last bar should have at least 1 active day (April 13 is in current month)
    expect(bars[bars.length - 1].totalDays).toBeGreaterThan(0)
  })

  it('percentage is 0 for months with no food', () => {
    const bars = calculateStats([], GOAL).monthlyBars
    bars.forEach(bar => expect(bar.percentage).toBe(0))
  })

  it('a day within ±10% of calorie goal counts as on-target', () => {
    // Goal = 2000. On-target window: 1800–2200
    const onTarget = food('2026-04-13', { calories: 2000, protein: 150, carbs: 250, fat: 70 })
    const offTarget = food('2026-04-12', { calories: 1000, protein: 150, carbs: 250, fat: 70 })
    const bars = calculateStats([onTarget, offTarget], GOAL).monthlyBars
    const aprilBar = bars[bars.length - 1]
    expect(aprilBar.daysOnTarget).toBe(1)
    expect(aprilBar.totalDays).toBe(2)
    expect(aprilBar.percentage).toBe(50)
  })

  it('boundary: exactly 10% over goal still counts as on-target', () => {
    // 2000 * 0.1 = 200, so 2200 is exactly on the boundary
    const boundary = food('2026-04-13', { calories: 2200, protein: 150, carbs: 250, fat: 70 })
    const bars = calculateStats([boundary], GOAL).monthlyBars
    expect(bars[bars.length - 1].daysOnTarget).toBe(1)
  })
})
