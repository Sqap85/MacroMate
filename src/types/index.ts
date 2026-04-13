export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: number;
  mealType?: MealType;
  fromTemplate?: boolean;
  templateId?: string;
  originalAmount?: number; // grams or pieces
  originalUnit?: MeasurementUnit;
}

export type MeasurementUnit = 'gram' | 'piece';

// Values stored per 100g or per piece
export interface FoodTemplate {
  id: string;
  name: string;
  unit: MeasurementUnit;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  barcode?: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface DailyGoal {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyStats {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  foods: Food[];
  date: string; // YYYY-MM-DD
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

export interface WeeklyStats {
  days: DailyStats[];
  averageCalories: number;
  averageProtein: number;
  averageCarbs: number;
  averageFat: number;
  totalDays: number;
}

export interface WeightEntry {
  id: string;
  weight: number;
  date: string;
  note?: string;
}
