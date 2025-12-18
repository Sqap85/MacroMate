import { useState, useEffect } from 'react';
import type { Food, DailyGoal, DailyStats, FoodTemplate } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLocalStorage } from './useLocalStorage';
import * as firestoreService from '../services/firestoreService';

/**
 * Kalori takibi için ana hook
 * - Kayıtlı kullanıcılar: Firestore kullanır
 * - Misafir kullanıcılar: LocalStorage kullanır
 */
export function useFoodTracker() {
    // Besin şablonlarını toplu sil
    const deleteFoodTemplatesBulk = async (ids: string[]) => {
      if (isGuest) {
        const updated = localTemplates.filter(t => !ids.includes(t.id));
        setLocalTemplates(updated);
        setFoodTemplates(updated);
        return;
      }
      if (!currentUser) throw new Error('Lütfen önce giriş yapın');
      try {
        await firestoreService.deleteTemplatesBulk(ids);
      } catch (error) {
        console.error('Toplu şablon silme hatası:', error);
        throw error;
      }
    };
  const { currentUser, isGuest } = useAuth();
  
  // Misafir kullanıcılar için LocalStorage
  const [localFoods, setLocalFoods] = useLocalStorage<Food[]>('macromate-foods', []);
  const [localGoal, setLocalGoal] = useLocalStorage<DailyGoal>('macromate-goal', {
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65,
  });
  const [localTemplates, setLocalTemplates] = useLocalStorage<FoodTemplate[]>('macromate-templates', []);
  
  // Varsayılan günlük hedefler
  const defaultGoal: DailyGoal = {
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65,
  };

  const [foods, setFoods] = useState<Food[]>([]);
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(defaultGoal);
  const [foodTemplates, setFoodTemplates] = useState<FoodTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Firestore'dan verileri dinle (realtime updates) - Sadece kayıtlı kullanıcılar için
  useEffect(() => {
    // Misafir modunda LocalStorage kullan, loading'i kapat
    if (isGuest) {
      setFoods(localFoods);
      setDailyGoal(localGoal);
      setFoodTemplates(localTemplates);
      setLoading(false);
      return;
    }

    if (!currentUser) {
      // Kullanıcı yoksa temizle ve loading'i kapat
      setFoods([]);
      setDailyGoal(defaultGoal);
      setFoodTemplates([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let hasLoadedFoods = false;
    let hasLoadedGoal = false;
    let hasLoadedTemplates = false;

    const checkAllLoaded = () => {
      if (hasLoadedFoods && hasLoadedGoal && hasLoadedTemplates) {
        setLoading(false);
      }
    };

    // Foods listener
    const unsubFoods = firestoreService.listenToUserFoods(currentUser.uid, (newFoods) => {
      setFoods(newFoods);
      hasLoadedFoods = true;
      checkAllLoaded();
    });

    // Goal listener  
    const unsubGoal = firestoreService.listenToUserGoal(currentUser.uid, (newGoal) => {
      if (newGoal) {
        setDailyGoal(newGoal);
      } else {
        setDailyGoal(defaultGoal);
      }
      hasLoadedGoal = true;
      checkAllLoaded();
    });

    // Templates listener
    const unsubTemplates = firestoreService.listenToUserTemplates(currentUser.uid, (newTemplates) => {
      setFoodTemplates(newTemplates);
      hasLoadedTemplates = true;
      checkAllLoaded();
    });

    // Timeout fallback - 10 saniye sonra zorla yükle
    const timeout = setTimeout(() => {
      if (!hasLoadedFoods || !hasLoadedGoal || !hasLoadedTemplates) {
        console.warn('[Loading] Timeout - forcing completion');
        setLoading(false);
      }
    }, 10000);

    // Cleanup listeners
    return () => {
      clearTimeout(timeout);
      unsubFoods();
      unsubGoal();
      unsubTemplates();
    };
  }, [currentUser, isGuest, localFoods, localGoal, localTemplates]);

  // Bugünün tarihini al (YYYY-MM-DD formatında)
  const getTodayString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Bugünün yemeklerini ve planlarını filtrele
  const getTodayFoods = (): Food[] => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).getTime();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();

    const activeFoods = isGuest ? localFoods : foods;
    return activeFoods.filter(food => 
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
  const addFood = async (food: Omit<Food, 'id' | 'timestamp'>, customTimestamp?: number) => {
    const newFood: Omit<Food, 'id'> = {
      ...food,
      timestamp: customTimestamp || Date.now(),
    };

    // Misafir modu
    if (isGuest) {
      const newFoodWithId = { ...newFood, id: Date.now().toString() };
      setLocalFoods([...localFoods, newFoodWithId]);
      setFoods([...foods, newFoodWithId]);
      return;
    }

    // Kayıtlı kullanıcı
    if (!currentUser) {
      throw new Error('Lütfen önce giriş yapın');
    }
    
    try {
      await firestoreService.addFood(currentUser.uid, newFood);
    } catch (error) {
      console.error('Yemek ekleme hatası:', error);
      throw error;
    }
  };

  // Yemek sil
  const deleteFood = async (id: string) => {
    // Misafir modu
    if (isGuest) {
      const updated = localFoods.filter(f => f.id !== id);
      setLocalFoods(updated);
      setFoods(updated);
      return;
    }

    // Kayıtlı kullanıcı
    if (!currentUser) {
      throw new Error('Lütfen önce giriş yapın');
    }
    try {
      await firestoreService.deleteFood(id);
    } catch (error) {
      console.error('Yemek silme hatası:', error);
      throw error;
    }
  };

  // Yemek düzenle
  const editFood = async (id: string, updatedFood: Partial<Food>) => {
    // Misafir modu
    if (isGuest) {
      const updated = localFoods.map(f => 
        f.id === id ? { ...f, ...updatedFood } : f
      );
      setLocalFoods(updated);
      setFoods(updated);
      return;
    }

    // Kayıtlı kullanıcı
    if (!currentUser) {
      throw new Error('Lütfen önce giriş yapın');
    }
    try {
      await firestoreService.updateFood(id, updatedFood);
    } catch (error) {
      console.error('Yemek güncelleme hatası:', error);
      throw error;
    }
  };

  // Hedefleri güncelle
  const updateGoal = async (newGoal: DailyGoal) => {
    // Misafir modu
    if (isGuest) {
      setLocalGoal(newGoal);
      setDailyGoal(newGoal);
      return;
    }

    // Kayıtlı kullanıcı
    if (!currentUser) {
      throw new Error('Lütfen önce giriş yapın');
    }
    try {
      await firestoreService.saveUserGoal(currentUser.uid, newGoal);
    } catch (error) {
      console.error('Hedef güncelleme hatası:', error);
      throw error;
    }
  };

  // Besin şablonu ekle
  const addFoodTemplate = async (template: Omit<FoodTemplate, 'id'>) => {
    // Misafir modu
    if (isGuest) {
      const newTemplate = { ...template, id: Date.now().toString() };
      setLocalTemplates([...localTemplates, newTemplate]);
      setFoodTemplates([...foodTemplates, newTemplate]);
      return;
    }

    // Kayıtlı kullanıcı
    if (!currentUser) {
      throw new Error('Lütfen önce giriş yapın');
    }
    try {
      await firestoreService.addTemplate(currentUser.uid, template);
    } catch (error) {
      console.error('Şablon ekleme hatası:', error);
      throw error;
    }
  };

  // Besin şablonu sil
  const deleteFoodTemplate = async (id: string) => {
    // Misafir modu
    if (isGuest) {
      const updated = localTemplates.filter(t => t.id !== id);
      setLocalTemplates(updated);
      setFoodTemplates(updated);
      return;
    }

    // Kayıtlı kullanıcı
    if (!currentUser) {
      throw new Error('Lütfen önce giriş yapın');
    }
    try {
      await firestoreService.deleteTemplate(id);
    } catch (error) {
      console.error('Şablon silme hatası:', error);
      throw error;
    }
  };

  // Besin şablonu düzenle
  const editFoodTemplate = async (id: string, updatedTemplate: Omit<FoodTemplate, 'id'>) => {
    // Misafir modu
    if (isGuest) {
      const updated = localTemplates.map(t => 
        t.id === id ? { ...updatedTemplate, id } : t
      );
      setLocalTemplates(updated);
      setFoodTemplates(updated);
      return;
    }

    // Kayıtlı kullanıcı
    if (!currentUser) {
      throw new Error('Lütfen önce giriş yapın');
    }
    try {
      await firestoreService.updateTemplate(id, updatedTemplate);
    } catch (error) {
      console.error('Şablon güncelleme hatası:', error);
      throw error;
    }
  };

  // Şablondan yemek ekle (miktar ile çarparak)
  const addFoodFromTemplate = async (templateId: string, amount: number, mealType?: string) => {
    // currentUser veya isGuest kontrolü
    if (!currentUser && !isGuest) return;
    
    const template = foodTemplates.find(t => t.id === templateId);
    if (!template) return;

    // İsim formatı
    let displayName: string;
    let calories: number;
    let protein: number;
    let carbs: number;
    let fat: number;
    
    if (template.unit === 'piece') {
      // Adet bazında: değerler zaten adet başına, direkt çarp
      displayName = `${template.name} (${amount} adet)`;
      calories = Math.round(template.calories * amount);
      protein = Math.round(template.protein * amount * 10) / 10;
      carbs = Math.round(template.carbs * amount * 10) / 10;
      fat = Math.round(template.fat * amount * 10) / 10;
    } else {
      // Gram bazında: 100g'a göre hesapla
      displayName = `${template.name} (${amount}g)`;
      const multiplier = amount / 100;
      calories = Math.round(template.calories * multiplier);
      protein = Math.round(template.protein * multiplier * 10) / 10;
      carbs = Math.round(template.carbs * multiplier * 10) / 10;
      fat = Math.round(template.fat * multiplier * 10) / 10;
    }

    const newFood: Omit<Food, 'id'> = {
      timestamp: Date.now(),
      name: displayName,
      calories,
      protein,
      carbs,
      fat,
      mealType: mealType as any,
      fromTemplate: true,
      templateId: template.id,
      originalAmount: amount,
      originalUnit: template.unit,
    };
    
    // Misafir modu
    if (isGuest) {
      const newFoodWithId = { ...newFood, id: Date.now().toString() };
      setLocalFoods([...localFoods, newFoodWithId]);
      setFoods([...foods, newFoodWithId]);
      return;
    }

    // Kayıtlı kullanıcı
    if (!currentUser) return;
    await firestoreService.addFood(currentUser.uid, newFood);
  };

  return {
    foods: getTodayFoods(),
    allFoods: isGuest ? localFoods : foods, // Tüm geçmiş için - misafirde localFoods, kayıtlı kullanıcıda foods
    dailyGoal,
    dailyStats: getDailyStats(),
    loading,
    addFood,
    deleteFood,
    editFood,
    updateGoal,
    foodTemplates,
    addFoodTemplate,
    deleteFoodTemplate,
    editFoodTemplate,
    addFoodFromTemplate,
    deleteFoodTemplatesBulk,
  };
}
