// Besin bilgisi için tip tanımı
export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: number;
  mealType?: MealType; // Öğün türü opsiyonel
}

// Öğün türleri
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// Günlük hedefler
export interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// Günlük istatistikler
export interface DailyStats {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  foods: Food[];
  date: string; // YYYY-MM-DD formatında
}

// Form input state
export interface FoodFormData {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  mealType?: MealType;
}

// Haftalık istatistikler
export interface WeeklyStats {
  days: DailyStats[];
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
  totalDays: number;
}

// Kilo kaydı
export interface WeightEntry {
  id: string;
  weight: number;
  date: string;
  note?: string;
}
