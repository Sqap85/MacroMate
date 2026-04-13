import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchByBarcode } from '../services/openFoodFactsService'

function makeResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response)
}

const VALID_PRODUCT = {
  status: 1,
  product: {
    product_name_tr: 'Yoğurt',
    nutriments: {
      'energy-kcal_100g': 61,
      proteins_100g: 3.5,
      carbohydrates_100g: 4.7,
      fat_100g: 3.3,
    },
  },
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('searchByBarcode', () => {
  it('returns product data on a successful lookup', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(makeResponse(VALID_PRODUCT))

    const result = await searchByBarcode('8690632009933')
    expect(result.found).toBe(true)
    expect(result.product?.name).toBe('Yoğurt')
    expect(result.product?.calories).toBe(61)
    expect(result.product?.protein).toBe(3.5)
    expect(result.product?.barcode).toBe('8690632009933')
  })

  it('prefers Turkish name, falls back to English, then generic', async () => {
    const body = {
      status: 1,
      product: {
        product_name_tr: undefined,
        product_name_en: 'Yogurt',
        nutriments: { 'energy-kcal_100g': 61, proteins_100g: 3.5, carbohydrates_100g: 4.7, fat_100g: 3.3 },
      },
    }
    vi.spyOn(globalThis, 'fetch').mockReturnValue(makeResponse(body))
    const result = await searchByBarcode('123')
    expect(result.product?.name).toBe('Yogurt')
  })

  it('falls back to "Bilinmeyen Ürün" when no name fields are present', async () => {
    const body = {
      status: 1,
      product: {
        nutriments: { 'energy-kcal_100g': 61, proteins_100g: 3.5, carbohydrates_100g: 4.7, fat_100g: 3.3 },
      },
    }
    vi.spyOn(globalThis, 'fetch').mockReturnValue(makeResponse(body))
    const result = await searchByBarcode('123')
    expect(result.product?.name).toBe('Bilinmeyen Ürün')
  })

  it('returns error when product status is not 1', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(makeResponse({ status: 0, product: null }))
    const result = await searchByBarcode('000')
    expect(result.found).toBe(false)
    expect(result.error).toBe('Ürün bulunamadı')
  })

  it('returns error when HTTP response is not ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockReturnValue(makeResponse({}, false, 500))
    const result = await searchByBarcode('000')
    expect(result.found).toBe(false)
    expect(result.error).toBe('API isteği başarısız')
  })

  it('returns error when all nutriment values are zero', async () => {
    const body = {
      status: 1,
      product: {
        product_name: 'Empty',
        nutriments: { 'energy-kcal_100g': 0, proteins_100g: 0, carbohydrates_100g: 0, fat_100g: 0 },
      },
    }
    vi.spyOn(globalThis, 'fetch').mockReturnValue(makeResponse(body))
    const result = await searchByBarcode('000')
    expect(result.found).toBe(false)
    expect(result.error).toBe('Ürün besin değerleri eksik')
  })

  it('handles network errors gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))
    const result = await searchByBarcode('000')
    expect(result.found).toBe(false)
    expect(result.error).toBe('Bağlantı hatası')
  })
})
