import { useLocalStorage } from './useLocalStorage';
import type { Food, DailyGoal, DailyStats } from '../types';

/**
 * Kalori takibi için ana hook
 * State yönetimi ve iş mantığı burada
 */
export function useFoodTracker() {
  // Varsayılan günlük hedefler
  const defaultGoal: DailyGoal = {
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65,
  };

  const [foods, setFoods] = useLocalStorage<Food[]>('macromate-foods', []);
  const [dailyGoal, setDailyGoal] = useLocalStorage<DailyGoal>('macromate-goal', defaultGoal);

  // Bugünün tarihini al (YYYY-MM-DD formatında)
  const getTodayString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Bugünün yemeklerini filtrele
  const getTodayFoods = (): Food[] => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).getTime();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();

    return foods.filter(food => 
      food.timestamp >= todayStart && food.timestamp <= todayEnd
    );
  };

  // Günlük istatistikleri hesapla
  const getDailyStats = (): DailyStats => {
    const todayFoods = getTodayFoods();
    
    const stats = todayFoods.reduce(
      (acc, food) => ({
        totalCalories: acc.totalCalories + food.calories,
        totalProtein: acc.totalProtein + food.protein,
        totalCarbs: acc.totalCarbs + food.carbs,
        totalFat: acc.totalFat + food.fat,
      }),
      { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }
    );

    return {
      ...stats,
      foods: todayFoods,
      date: getTodayString(),
    };
  };

  // Yeni yemek ekle
  const addFood = (food: Omit<Food, 'id' | 'timestamp'>) => {
    const newFood: Food = {
      ...food,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    setFoods([...foods, newFood]);
  };

  // Yemek sil
  const deleteFood = (id: string) => {
    setFoods(foods.filter(food => food.id !== id));
  };

  // Hedefleri güncelle
  const updateGoal = (newGoal: DailyGoal) => {
    setDailyGoal(newGoal);
  };

  return {
    foods: getTodayFoods(),
    allFoods: foods, // Tüm geçmiş için
    dailyGoal,
    dailyStats: getDailyStats(),
    addFood,
    deleteFood,
    updateGoal,
  };
}
