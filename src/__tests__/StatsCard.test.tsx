import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithTheme } from './test-utils'
import { StatsCard } from '../components/StatsCard'
import type { DailyStats, DailyGoal } from '../types'

const goal: DailyGoal = { calories: 2000, protein: 150, carbs: 250, fat: 70 }

const baseStats: DailyStats = {
  totalCalories: 0,
  totalProtein: 0,
  totalCarbs: 0,
  totalFat: 0,
  foods: [],
  date: '2026-04-13',
}

describe('StatsCard — calorie display', () => {
  it('shows current and goal calories', () => {
    renderWithTheme(<StatsCard stats={{ ...baseStats, totalCalories: 1200 }} goal={goal} />)
    expect(screen.getByText('1200')).toBeInTheDocument()
    expect(screen.getByText('/ 2000')).toBeInTheDocument()
  })

  it('shows remaining calories when under goal', () => {
    renderWithTheme(<StatsCard stats={{ ...baseStats, totalCalories: 1500 }} goal={goal} />)
    expect(screen.getByText('500 kcal kalan')).toBeInTheDocument()
  })

  it('shows "Hedef Tamamlandı!" when exactly at goal', () => {
    renderWithTheme(<StatsCard stats={{ ...baseStats, totalCalories: 2000 }} goal={goal} />)
    expect(screen.getByText('Hedef Tamamlandı!')).toBeInTheDocument()
  })

  it('shows exceeded message when over goal', () => {
    renderWithTheme(<StatsCard stats={{ ...baseStats, totalCalories: 2500 }} goal={goal} />)
    expect(screen.getByText(/Hedef Aşıldı/)).toBeInTheDocument()
    expect(screen.getByText(/500 kcal/)).toBeInTheDocument()
  })
})

describe('StatsCard — macro bars', () => {
  it('renders all three macro sections', () => {
    renderWithTheme(<StatsCard stats={baseStats} goal={goal} />)
    expect(screen.getByText('Protein')).toBeInTheDocument()
    expect(screen.getByText('Karbonhidrat')).toBeInTheDocument()
    expect(screen.getByText('Yağ')).toBeInTheDocument()
  })

  it('shows "kalan" label when under goal', () => {
    renderWithTheme(<StatsCard stats={{ ...baseStats, totalProtein: 50 }} goal={goal} />)
    expect(screen.getByText('100g kalan')).toBeInTheDocument()
  })

  it('shows "fazla" label when over goal', () => {
    renderWithTheme(<StatsCard stats={{ ...baseStats, totalProtein: 200 }} goal={goal} />)
    expect(screen.getByText('+50g fazla')).toBeInTheDocument()
  })

  it('shows "Hedefte ✓" when exactly at macro goal', () => {
    renderWithTheme(<StatsCard stats={{ ...baseStats, totalProtein: 150 }} goal={goal} />)
    expect(screen.getByText('Hedefte ✓')).toBeInTheDocument()
  })
})

describe('StatsCard — settings button', () => {
  it('renders settings button when onOpenSettings is provided', () => {
    renderWithTheme(<StatsCard stats={baseStats} goal={goal} onOpenSettings={vi.fn()} />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('calls onOpenSettings when settings button is clicked', () => {
    const onOpenSettings = vi.fn()
    renderWithTheme(<StatsCard stats={baseStats} goal={goal} onOpenSettings={onOpenSettings} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it('does not render settings button when onOpenSettings is omitted', () => {
    renderWithTheme(<StatsCard stats={baseStats} goal={goal} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('StatsCard — zero goal edge case', () => {
  it('does not crash when goal calories is 0', () => {
    const zeroGoal = { ...goal, calories: 0 }
    expect(() =>
      renderWithTheme(<StatsCard stats={baseStats} goal={zeroGoal} />)
    ).not.toThrow()
  })
})
