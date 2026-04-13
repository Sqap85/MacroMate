import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Food, DailyGoal, DailyStats, FoodTemplate } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLocalStorage } from './useLocalStorage';
import * as firestoreService from '../services/firestoreService';

export function useFoodTracker() {
  const allFoodsLoadPromiseRef = useRef<Promise<void> | null>(null);
  const getTodayRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).getTime();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    return { start, end };
  };
  const { currentUser, isGuest } = useAuth();

  const [localFoods, setLocalFoods] = useLocalStorage<Food[]>('macromate-foods', []);
  const [localGoal, setLocalGoal] = useLocalStorage<DailyGoal>('macromate-goal', {
    calories: 2000,
    protein: 150,
    carbs: 250,
    fat: 65,
  });
  const [localTemplates, setLocalTemplates] = useLocalStorage<FoodTemplate[]>('macromate-templates', []);

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

  const deleteAllDayFoods = async (dateString: string) => {
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

    let activeFoods: Food[];
    if (isGuest) {
      activeFoods = localFoods;
    } else if (allFoodsLoaded) {
      activeFoods = historyFoods;
    } else {
      activeFoods = foods;
    }
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
      console.error('Delete day foods error:', error);
      throw error;
    }
  };

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
      console.error('Bulk delete templates error:', error);
      throw error;
    }
  };

  // Poll every minute to detect day change
  useEffect(() => {
    const interval = setInterval(() => {
      const next = new Date().toDateString();
      setTodayTick((prev) => (prev === next ? prev : next));
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Sync localStorage state for guest users
  useEffect(() => {
    if (!isGuest) return;
    setFoods(localFoods);
    setHistoryFoods(localFoods);
    setAllFoodsLoaded(true);
    setDailyGoal(localGoal);
    setFoodTemplates(localTemplates);
    setLoading(false);
  }, [isGuest, localFoods, localGoal, localTemplates]);

  // Subscribe to Firestore real-time updates (authenticated users only)
  useEffect(() => {
    if (isGuest) return;

    if (!currentUser) {
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
      if (hasLoadedFoods && hasLoadedGoal && hasLoadedTemplates) setLoading(false);
    };

    const unsubFoods = firestoreService.listenToUserFoodsInRange(currentUser.uid, todayStart, todayEnd, (newFoods) => {
      setFoods(newFoods);
      hasLoadedFoods = true;
      checkAllLoaded();
    });

    const unsubGoal = firestoreService.listenToUserGoal(currentUser.uid, (newGoal) => {
      setDailyGoal(newGoal ?? defaultGoal);
      hasLoadedGoal = true;
      checkAllLoaded();
    });

    const unsubTemplates = firestoreService.listenToUserTemplates(currentUser.uid, (newTemplates) => {
      setFoodTemplates(newTemplates);
      hasLoadedTemplates = true;
      checkAllLoaded();
    });

    // Force-unblock loading after 10 s if a listener never fires
    const timeout = setTimeout(() => {
      if (!hasLoadedFoods || !hasLoadedGoal || !hasLoadedTemplates) setLoading(false);
    }, 10000);

    return () => {
      clearTimeout(timeout);
      unsubFoods();
      unsubGoal();
      unsubTemplates();
    };
  }, [currentUser, isGuest, todayStart, todayEnd]);

  const getTodayString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const activeAllFoods = isGuest ? localFoods : historyFoods;

  const todayFoods = useMemo((): Food[] => {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).getTime();
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).getTime();
    return foods.filter(food => food.timestamp >= todayStart && food.timestamp <= todayEnd);
  }, [foods]);

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
    return { ...stats, foods: todayFoods, date: getTodayString() };
  }, [todayFoods]);

  const addFood = async (food: Omit<Food, 'id' | 'timestamp'>, customTimestamp?: number) => {
    const newFood: Omit<Food, 'id'> = {
      ...food,
      timestamp: customTimestamp || Date.now(),
    };

    if (isGuest) {
      const newFoodWithId = { ...newFood, id: Date.now().toString() };
      setLocalFoods([...localFoods, newFoodWithId]);
      setFoods([...foods, newFoodWithId]);
      setHistoryFoods([newFoodWithId, ...localFoods]);
      return;
    }

    if (!currentUser) throw new Error('Lütfen önce giriş yapın');
    try {
      const newFoodId = await firestoreService.addFood(currentUser.uid, newFood);
      if (allFoodsLoaded) {
        setHistoryFoods((prev) => [{ ...newFood, id: newFoodId }, ...prev]);
      }
    } catch (error) {
      console.error('Add food error:', error);
      throw error;
    }
  };

  const deleteFood = async (id: string) => {
    if (isGuest) {
      const updated = localFoods.filter(f => f.id !== id);
      setLocalFoods(updated);
      setFoods(updated);
      setHistoryFoods(updated);
      return;
    }

    if (!currentUser) throw new Error('Lütfen önce giriş yapın');
    try {
      await firestoreService.deleteFood(id);
      if (allFoodsLoaded) {
        setHistoryFoods((prev) => prev.filter((food) => food.id !== id));
      }
    } catch (error) {
      console.error('Delete food error:', error);
      throw error;
    }
  };

  const editFood = async (id: string, updatedFood: Partial<Food>) => {
    if (isGuest) {
      const updated = localFoods.map(f => f.id === id ? { ...f, ...updatedFood } : f);
      setLocalFoods(updated);
      setFoods(updated);
      setHistoryFoods(updated);
      return;
    }

    if (!currentUser) throw new Error('Lütfen önce giriş yapın');
    try {
      await firestoreService.updateFood(id, updatedFood);
      if (allFoodsLoaded) {
        setHistoryFoods((prev) => prev.map((food) => (food.id === id ? { ...food, ...updatedFood } : food)));
      }
    } catch (error) {
      console.error('Edit food error:', error);
      throw error;
    }
  };

  const updateGoal = async (newGoal: DailyGoal) => {
    if (isGuest) {
      setLocalGoal(newGoal);
      setDailyGoal(newGoal);
      return;
    }

    if (!currentUser) throw new Error('Lütfen önce giriş yapın');
    try {
      await firestoreService.saveUserGoal(currentUser.uid, newGoal);
    } catch (error) {
      console.error('Update goal error:', error);
      throw error;
    }
  };

  const addFoodTemplate = async (template: Omit<FoodTemplate, 'id'>) => {
    if (isGuest) {
      const newTemplate = { ...template, id: Date.now().toString() };
      setLocalTemplates(prev => [...prev, newTemplate]);
      setFoodTemplates(prev => [...prev, newTemplate]);
      return;
    }

    if (!currentUser) throw new Error('Lütfen önce giriş yapın');
    try {
      await firestoreService.addTemplate(currentUser.uid, template);
    } catch (error) {
      console.error('Add template error:', error);
      throw error;
    }
  };

  // Batch import: avoids stale-closure bug (guest) and concurrent write race (Firestore)
  const addFoodTemplatesBatch = async (templates: Omit<FoodTemplate, 'id'>[]) => {
    if (templates.length === 0) return;

    if (isGuest) {
      const now = Date.now();
      const newTemplates = templates.map((t, i) => ({ ...t, id: (now + i).toString() }));
      setLocalTemplates(prev => [...prev, ...newTemplates]);
      setFoodTemplates(prev => [...prev, ...newTemplates]);
      return;
    }

    if (!currentUser) throw new Error('Lütfen önce giriş yapın');
    try {
      await firestoreService.addTemplatesBatch(currentUser.uid, templates);
    } catch (error) {
      console.error('Batch add templates error:', error);
      throw error;
    }
  };

  const deleteFoodTemplate = async (id: string) => {
    if (isGuest) {
      const updated = localTemplates.filter(t => t.id !== id);
      setLocalTemplates(updated);
      setFoodTemplates(updated);
      return;
    }

    if (!currentUser) throw new Error('Lütfen önce giriş yapın');
    try {
      await firestoreService.deleteTemplate(id);
    } catch (error) {
      console.error('Delete template error:', error);
      throw error;
    }
  };

  const editFoodTemplate = async (id: string, updatedTemplate: Omit<FoodTemplate, 'id'>) => {
    if (isGuest) {
      const updated = localTemplates.map(t => t.id === id ? { ...updatedTemplate, id } : t);
      setLocalTemplates(updated);
      setFoodTemplates(updated);
      return;
    }

    if (!currentUser) throw new Error('Lütfen önce giriş yapın');
    try {
      await firestoreService.updateTemplate(id, updatedTemplate);
    } catch (error) {
      console.error('Edit template error:', error);
      throw error;
    }
  };

  const addFoodFromTemplate = async (templateId: string, amount: number, mealType?: string) => {
    if (!currentUser && !isGuest) return;

    const template = foodTemplates.find(t => t.id === templateId);
    if (!template) return;

    let displayName: string;
    let calories: number;
    let protein: number;
    let carbs: number;
    let fat: number;

    if (template.unit === 'piece') {
      displayName = `${template.name} (${amount} adet)`;
      calories = Math.round(template.calories * amount);
      protein = Math.round(template.protein * amount * 10) / 10;
      carbs = Math.round(template.carbs * amount * 10) / 10;
      fat = Math.round(template.fat * amount * 10) / 10;
    } else {
      // gram-based: values stored per 100 g
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

    if (isGuest) {
      const newFoodWithId = { ...newFood, id: Date.now().toString() };
      setLocalFoods([...localFoods, newFoodWithId]);
      setFoods([...foods, newFoodWithId]);
      setHistoryFoods([newFoodWithId, ...localFoods]);
      return;
    }

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

    if (!currentUser) throw new Error('Lütfen önce giriş yapın');
    if (allFoodsLoaded) return;

    // Deduplicate concurrent calls
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
    addFoodTemplatesBatch,
    deleteFoodTemplate,
    editFoodTemplate,
    addFoodFromTemplate,
    deleteFoodTemplatesBulk,
    deleteAllDayFoods,
  };
}
