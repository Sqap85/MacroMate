import { describe, it, expect } from 'vitest'
import { formatNumber, formatGrams } from '../utils/numberUtils'

describe('formatNumber', () => {
  it('rounds to 1 decimal place by default', () => {
    expect(formatNumber(3.14159)).toBe('3.1')
  })

  it('removes trailing zeros from whole numbers', () => {
    expect(formatNumber(5.0)).toBe('5')
    expect(formatNumber(100)).toBe('100')
  })

  it('rounds 0.5 up', () => {
    expect(formatNumber(2.5)).toBe('2.5')
    expect(formatNumber(2.05)).toBe('2.1')
  })

  it('accepts custom fractionDigits', () => {
    expect(formatNumber(3.14159, 2)).toBe('3.14')
    expect(formatNumber(3.14159, 0)).toBe('3')
  })

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0')
  })

  it('returns "0" for Infinity', () => {
    expect(formatNumber(Infinity)).toBe('0')
    expect(formatNumber(-Infinity)).toBe('0')
  })

  it('returns "0" for NaN', () => {
    expect(formatNumber(NaN)).toBe('0')
  })

  it('handles negative values', () => {
    expect(formatNumber(-3.7)).toBe('-3.7')
    expect(formatNumber(-3.0)).toBe('-3')
  })
})

describe('formatGrams', () => {
  it('delegates to formatNumber with 1 decimal', () => {
    expect(formatGrams(31.45)).toBe('31.5')
    expect(formatGrams(100)).toBe('100')
    expect(formatGrams(0)).toBe('0')
  })
})
