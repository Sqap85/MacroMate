import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '../hooks/useLocalStorage'

// jsdom's globalThis.localStorage is not fully functional in all worker configs.
// We stub it explicitly so the hook's globalThis.localStorage calls resolve correctly.
function makeLocalStorageMock() {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
    get length() { return Object.keys(store).length },
    key: (i: number) => Object.keys(store)[i] ?? null,
  }
}

let mockStorage: ReturnType<typeof makeLocalStorageMock>

beforeEach(() => {
  mockStorage = makeLocalStorageMock()
  vi.stubGlobal('localStorage', mockStorage)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useLocalStorage', () => {
  it('returns initialValue when key does not exist', () => {
    const { result } = renderHook(() => useLocalStorage('missing-key', 42))
    expect(result.current[0]).toBe(42)
  })

  it('reads an existing value from localStorage', () => {
    mockStorage.setItem('my-key', JSON.stringify('hello'))
    const { result } = renderHook(() => useLocalStorage('my-key', 'default'))
    expect(result.current[0]).toBe('hello')
  })

  it('persists updated value to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('num-key', 0))
    act(() => result.current[1](99))
    expect(mockStorage.getItem('num-key')).toBe('99')
  })

  it('reflects the updated value in state', () => {
    const { result } = renderHook(() => useLocalStorage<string[]>('arr-key', []))
    act(() => result.current[1](['a', 'b']))
    expect(result.current[0]).toEqual(['a', 'b'])
  })

  it('returns initialValue when stored JSON is malformed', () => {
    mockStorage.setItem('bad-key', '{invalid json}')
    const { result } = renderHook(() => useLocalStorage('bad-key', 'fallback'))
    expect(result.current[0]).toBe('fallback')
  })

  it('works with complex objects', () => {
    const obj = { calories: 2000, protein: 150 }
    const { result } = renderHook(() => useLocalStorage('obj-key', null as typeof obj | null))
    act(() => result.current[1](obj))
    expect(result.current[0]).toEqual(obj)
    expect(JSON.parse(mockStorage.getItem('obj-key')!)).toEqual(obj)
  })

  it('supports functional updater pattern', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0))
    act(() => result.current[1](prev => prev + 1))
    expect(result.current[0]).toBe(1)
  })
})
