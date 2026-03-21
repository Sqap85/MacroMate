/**
 * OpenFoodFacts API Service
 * Barkod ile ürün bilgisi çeker
 * Ücretsiz, API key gerektirmez
 */

export interface OpenFoodFactsProduct {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  barcode: string;
}

export interface BarcodeSearchResult {
  found: boolean;
  product?: OpenFoodFactsProduct;
  error?: string;
}

/**
 * Barkod ile ürün ara
 */
export const searchByBarcode = async (barcode: string): Promise<BarcodeSearchResult> => {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );

    if (!response.ok) {
      return { found: false, error: 'API isteği başarısız' };
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return { found: false, error: 'Ürün bulunamadı' };
    }

    const p = data.product;
    const nutrients = p.nutriments || {};

    // Ürün adı - Türkçe önce, yoksa İngilizce, yoksa genel
    const name =
      p.product_name_tr ||
      p.product_name_en ||
      p.product_name ||
      p.generic_name ||
      'Bilinmeyen Ürün';

    // 100g başına değerler
    const calories = Math.round(nutrients['energy-kcal_100g'] || nutrients['energy_100g'] / 4.184 || 0);
    const protein = Math.round((nutrients['proteins_100g'] || 0) * 10) / 10;
    const carbs = Math.round((nutrients['carbohydrates_100g'] || 0) * 10) / 10;
    const fat = Math.round((nutrients['fat_100g'] || 0) * 10) / 10;

    if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
      return { found: false, error: 'Ürün besin değerleri eksik' };
    }

    return {
      found: true,
      product: { name, calories, protein, carbs, fat, barcode },
    };
  } catch (error) {
    console.error('OpenFoodFacts API hatası:', error);
    return { found: false, error: 'Bağlantı hatası' };
  }
};