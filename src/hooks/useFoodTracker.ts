import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  const allFoodsLoadPromiseRef = useRef<Promise<void> | null>(null);
  const getTodayRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    return { start, end };
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
  const [historyFoods, setHistoryFoods] = useState<Food[]>([]);
  const [allFoodsLoaded, setAllFoodsLoaded] = useState(false);
  const [allFoodsLoading, setAllFoodsLoading] = useState(false);
  const [dailyGoal, setDailyGoal] = useState<DailyGoal>(defaultGoal);
  const [foodTemplates, setFoodTemplates] = useState<FoodTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayTick, setTodayTick] = useState(() => new Date().toDateString());

  const { start: todayStart, end: todayEnd } = useMemo(() => getTodayRange(), [todayTick]);

  // Bir güne ait tüm yemekleri sil
  const deleteAllDayFoods = async (dateString: string) => {
    // Tarihi parse et
    const dateParts = dateString.split('-');
    const dayStart = new Date(
      Number.parseInt(dateParts[0], 10),
      Number.parseInt(dateParts[1], 10) - 1,
      Number.parseInt(dateParts[2], 10),
      0, 0, 0
    ).getTime();
    const dayEnd = new Date(
      Number.parseInt(dateParts[0], 10),
      Number.parseInt(dateParts[1], 10) - 1,
      Number.parseInt(dateParts[2], 10),
      23, 59, 59, 999
    ).getTime();

    const activeFoods = isGuest
      ? localFoods
      : (allFoodsLoaded ? historyFoods : foods);
    const dayFoods = activeFoods.filter(f => f.timestamp >= dayStart && f.timestamp <= dayEnd);

    if (dayFoods.length === 0) return;

    if (isGuest) {
      const dayFoodIds = new Set(dayFoods.map(f => f.id));
      const updated = localFoods.filter(f => !dayFoodIds.has(f.id));
      setLocalFoods(updated);
      setFoods(updated);
      setHistoryFoods(updated);
      return;
    }

    if (!currentUser) throw new Error('Lütfen önce giriş yapın');
    try {
      const ids = dayFoods.map(f => f.id);
      await firestoreService.deleteFoodsBulk(ids);
      if (allFoodsLoaded) {
        const idSet = new Set(ids);
        setHistoryFoods((prev) => prev.filter((food) => !idSet.has(food.id)));
      }
    } catch (error) {
      console.error('Günlük yemek silme hatası:', error);
      throw error;
    }
  };

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

  useEffect(() => {
    const interval = setInterval(() => {
      const next = new Date().toDateString();
      setTodayTick((prev) => (prev === next ? prev : next));
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  // Misafir modunda LocalStorage verilerini state'e yansıt
  useEffect(() => {
    if (!isGuest) return;

    setFoods(localFoods);
    setHistoryFoods(localFoods);
    setAllFoodsLoaded(true);
    setDailyGoal(localGoal);
    setFoodTemplates(localTemplates);
    setLoading(false);
  }, [isGuest, localFoods, localGoal, localTemplates]);

  // Firestore'dan verileri dinle (realtime updates) - Sadece kayıtlı kullanıcılar için
  useEffect(() => {
    if (isGuest) return;

    if (!currentUser) {
      // Kullanıcı yoksa temizle ve loading'i kapat
      setFoods([]);
      setHistoryFoods([]);
      setAllFoodsLoaded(false);
      setAllFoodsLoading(false);
      allFoodsLoadPromiseRef.current = null;
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
    const unsubFoods = firestoreService.listenToUserFoodsInRange(currentUser.uid, todayStart, todayEnd, (newFoods) => {
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
  }, [currentUser, isGuest, todayStart, todayEnd]);

  // Bugünün tarihini al (YYYY-MM-DD formatında)
  const getTodayString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const activeAllFoods = isGuest ? localFoods : historyFoods;

  // Bugünün yemeklerini ve planlarını filtrele
  const todayFoods = useMemo((): Food[] => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).getTime();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();

    return foods.filter(food => 
      food.timestamp >= todayStart && food.timestamp <= todayEnd
    );
  }, [foods]);

  // Günlük istatistikleri hesapla
  const dailyStats = useMemo((): DailyStats => {
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
  }, [todayFoods]);

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
      setHistoryFoods([newFoodWithId, ...localFoods]);
      return;
    }

    // Kayıtlı kullanıcı
    if (!currentUser) {
      throw new Error('Lütfen önce giriş yapın');
    }
    
    try {
      const newFoodId = await firestoreService.addFood(currentUser.uid, newFood);
      if (allFoodsLoaded) {
        setHistoryFoods((prev) => [{ ...newFood, id: newFoodId }, ...prev]);
      }
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
      setHistoryFoods(updated);
      return;
    }

    // Kayıtlı kullanıcı
    if (!currentUser) {
      throw new Error('Lütfen önce giriş yapın');
    }
    try {
      await firestoreService.deleteFood(id);
      if (allFoodsLoaded) {
        setHistoryFoods((prev) => prev.filter((food) => food.id !== id));
      }
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
      setHistoryFoods(updated);
      return;
    }

    // Kayıtlı kullanıcı
    if (!currentUser) {
      throw new Error('Lütfen önce giriş yapın');
    }
    try {
      await firestoreService.updateFood(id, updatedFood);
      if (allFoodsLoaded) {
        setHistoryFoods((prev) =>
          prev.map((food) => (food.id === id ? { ...food, ...updatedFood } : food))
        );
      }
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
      setHistoryFoods([newFoodWithId, ...localFoods]);
      return;
    }

    // Kayıtlı kullanıcı
    if (!currentUser) return;
    const newFoodId = await firestoreService.addFood(currentUser.uid, newFood);
    if (allFoodsLoaded) {
      setHistoryFoods((prev) => [{ ...newFood, id: newFoodId }, ...prev]);
    }
  };

  const ensureAllFoodsLoaded = useCallback(async () => {
    if (isGuest) {
      setHistoryFoods(localFoods);
      setAllFoodsLoaded(true);
      return;
    }

    if (!currentUser) {
      throw new Error('Lütfen önce giriş yapın');
    }

    if (allFoodsLoaded) return;

    if (allFoodsLoadPromiseRef.current) {
      await allFoodsLoadPromiseRef.current;
      return;
    }

    setAllFoodsLoading(true);

    const loadPromise = (async () => {
      const userFoods = await firestoreService.getUserFoods(currentUser.uid);
      setHistoryFoods(userFoods);
      setAllFoodsLoaded(true);
    })();

    allFoodsLoadPromiseRef.current = loadPromise;

    try {
      await loadPromise;
    } finally {
      allFoodsLoadPromiseRef.current = null;
      setAllFoodsLoading(false);
    }
  }, [currentUser, isGuest, localFoods, allFoodsLoaded]);

  return {
    foods: todayFoods,
    allFoods: activeAllFoods,
    allFoodsLoaded,
    allFoodsLoading,
    dailyGoal,
    dailyStats,
    loading,
    ensureAllFoodsLoaded,
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
    deleteAllDayFoods,
  };
}
