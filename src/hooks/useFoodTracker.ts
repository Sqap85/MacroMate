import { useLocalStorage } from './useLocalStorage';
import type { Food, DailyGoal, DailyStats, FoodTemplate } from '../types';

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
  const [foodTemplates, setFoodTemplates] = useLocalStorage<FoodTemplate[]>('macromate-templates', []);

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

  // Yemek düzenle
  const editFood = (id: string, updatedFood: Partial<Food>) => {
    setFoods(foods.map(food => 
      food.id === id ? { ...food, ...updatedFood } : food
    ));
  };

  // Hedefleri güncelle
  const updateGoal = (newGoal: DailyGoal) => {
    setDailyGoal(newGoal);
  };

  // Besin şablonu ekle
  const addFoodTemplate = (template: Omit<FoodTemplate, 'id'>) => {
    const newTemplate: FoodTemplate = {
      ...template,
      id: crypto.randomUUID(),
    };
    setFoodTemplates([...foodTemplates, newTemplate]);
  };

  // Besin şablonu sil
  const deleteFoodTemplate = (id: string) => {
    setFoodTemplates(foodTemplates.filter(template => template.id !== id));
  };

  // Besin şablonu düzenle
  const editFoodTemplate = (id: string, updatedTemplate: Omit<FoodTemplate, 'id'>) => {
    setFoodTemplates(foodTemplates.map(template =>
      template.id === id ? { ...template, ...updatedTemplate } : template
    ));
  };

  // Şablondan yemek ekle (miktar ile çarparak)
  const addFoodFromTemplate = (templateId: string, amount: number, mealType?: string) => {
    const template = foodTemplates.find(t => t.id === templateId);
    if (!template) return;

    // Gram cinsinden hesapla
    let grams: number;
    if (template.unit === 'piece') {
      grams = amount * (template.servingSize || 0);
    } else {
      grams = amount;
    }

    const multiplier = grams / 100;
    
    // İsim formatı
    let displayName: string;
    if (template.unit === 'piece') {
      displayName = `${template.name} (${amount} adet)`;
    } else {
      displayName = `${template.name} (${amount}g)`;
    }

    const newFood: Food = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      name: displayName,
      calories: Math.round(template.caloriesPer100g * multiplier),
      protein: Math.round(template.proteinPer100g * multiplier * 10) / 10,
      carbs: Math.round(template.carbsPer100g * multiplier * 10) / 10,
      fat: Math.round(template.fatPer100g * multiplier * 10) / 10,
      mealType: mealType as any,
      fromTemplate: true,
      templateId: template.id,
      originalAmount: amount,
      originalUnit: template.unit,
    };
    setFoods([...foods, newFood]);
  };

  return {
    foods: getTodayFoods(),
    allFoods: foods, // Tüm geçmiş için
    dailyGoal,
    dailyStats: getDailyStats(),
    addFood,
    deleteFood,
    editFood,
    updateGoal,
    foodTemplates,
    addFoodTemplate,
    deleteFoodTemplate,
    editFoodTemplate,
    addFoodFromTemplate,
  };
}
