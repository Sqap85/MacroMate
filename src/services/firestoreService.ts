import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Food, DailyGoal, FoodTemplate } from '../types';

/**
 * Firestore Service
 * 
 * Tüm database operasyonları burada
 * Her kullanıcının verileri kendi user ID'si altında
 */

// Collection isimleri
const COLLECTIONS = {
  FOODS: 'foods',
  GOALS: 'goals',
  TEMPLATES: 'templates',
};

/**
 * Undefined değerleri temizle (Firestore kabul etmiyor)
 */
const removeUndefined = (obj: any): any => {
  const cleaned: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  });
  return cleaned;
};

// ============================================
// FOOD OPERATIONS (Yemekler)
// ============================================

/**
 * Kullanıcının tüm yemeklerini getir
 */
export const getUserFoods = async (userId: string): Promise<Food[]> => {
  const foodsRef = collection(db, COLLECTIONS.FOODS);
  const q = query(
    foodsRef,
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Food[];
};

/**
 * Yemekleri realtime dinle (auto-update)
 */
export const listenToUserFoods = (
  userId: string,
  callback: (foods: Food[]) => void
) => {
  const foodsRef = collection(db, COLLECTIONS.FOODS);
  const q = query(
    foodsRef,
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  );
  
  return onSnapshot(q, 
    (snapshot) => {
      const foods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Food[];
      callback(foods);
    },
    (error) => {
      console.error('Error listening to foods:', error);
      callback([]);
    }
  );
};

/**
 * Yemekleri limitli realtime dinle (performans için)
 */
export const listenToUserFoodsLimited = (
  userId: string,
  maxCount: number,
  callback: (foods: Food[]) => void
) => {
  const foodsRef = collection(db, COLLECTIONS.FOODS);
  const q = query(
    foodsRef,
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(maxCount)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const foods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Food[];
      callback(foods);
    },
    (error) => {
      console.error('Error listening to limited foods:', error);
      callback([]);
    }
  );
};

/**
 * Belirli zaman aralığındaki yemekleri realtime dinle
 */
export const listenToUserFoodsInRange = (
  userId: string,
  startTimestamp: number,
  endTimestamp: number,
  callback: (foods: Food[]) => void
) => {
  const foodsRef = collection(db, COLLECTIONS.FOODS);
  const q = query(
    foodsRef,
    where('userId', '==', userId),
    where('timestamp', '>=', startTimestamp),
    where('timestamp', '<=', endTimestamp),
    orderBy('timestamp', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const foods = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Food[];
      callback(foods);
    },
    (error) => {
      console.error('Error listening to foods in range:', error);
      callback([]);
    }
  );
};

/**
 * Yeni yemek ekle
 */
export const addFood = async (userId: string, food: Omit<Food, 'id'>): Promise<string> => {
  const foodsRef = collection(db, COLLECTIONS.FOODS);
  const docRef = await addDoc(foodsRef, removeUndefined({
    ...food,
    userId,
    timestamp: food.timestamp || Date.now(),
  }));
  return docRef.id;
};

/**
 * Yemek güncelle
 */
export const updateFood = async (foodId: string, updates: Partial<Food>): Promise<void> => {
  const foodRef = doc(db, COLLECTIONS.FOODS, foodId);
  await updateDoc(foodRef, removeUndefined({ ...updates }));
};

/**
 * Yemek sil
 */
export const deleteFood = async (foodId: string): Promise<void> => {
  const foodRef = doc(db, COLLECTIONS.FOODS, foodId);
  await deleteDoc(foodRef);
};

// ============================================
// GOAL OPERATIONS (Hedefler)
// ============================================

/**
 * Kullanıcının hedefini getir
 */
export const getUserGoal = async (userId: string): Promise<DailyGoal | null> => {
  const goalsRef = collection(db, COLLECTIONS.GOALS);
  const q = query(goalsRef, where('userId', '==', userId));
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  
  const docData = snapshot.docs[0];
  return {
    ...docData.data(),
  } as DailyGoal;
};

/**
 * Hedefi dinle (realtime)
 */
export const listenToUserGoal = (
  userId: string,
  callback: (goal: DailyGoal | null) => void
) => {
  const goalsRef = collection(db, COLLECTIONS.GOALS);
  const q = query(goalsRef, where('userId', '==', userId));
  
  return onSnapshot(q, 
    (snapshot) => {
      if (snapshot.empty) {
        callback(null);
        return;
      }
      const docData = snapshot.docs[0];
      callback(docData.data() as DailyGoal);
    },
    (error) => {
      console.error('Error listening to goal:', error);
      callback(null);
    }
  );
};

/**
 * Hedef kaydet veya güncelle
 */
export const saveUserGoal = async (userId: string, goal: DailyGoal): Promise<void> => {
  const goalsRef = collection(db, COLLECTIONS.GOALS);
  const q = query(goalsRef, where('userId', '==', userId));
  
  const snapshot = await getDocs(q);
  
  if (snapshot.empty) {
    // Yeni hedef oluştur
    await addDoc(goalsRef, removeUndefined({
      ...goal,
      userId,
    }));
  } else {
    // Mevcut hedefi güncelle
    const docRef = doc(db, COLLECTIONS.GOALS, snapshot.docs[0].id);
    await updateDoc(docRef, removeUndefined({ ...goal }));
  }
};

// ============================================
// TEMPLATE OPERATIONS (Besin Şablonları)
// ============================================

/**
 * Kullanıcının şablonlarını getir
 */
export const getUserTemplates = async (userId: string): Promise<FoodTemplate[]> => {
  const templatesRef = collection(db, COLLECTIONS.TEMPLATES);
  const q = query(
    templatesRef,
    where('userId', '==', userId),
    orderBy('name', 'asc')
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as FoodTemplate[];
};

/**
 * Şablonları dinle (realtime)
 */
export const listenToUserTemplates = (
  userId: string,
  callback: (templates: FoodTemplate[]) => void
) => {
  const templatesRef = collection(db, COLLECTIONS.TEMPLATES);
  const q = query(
    templatesRef,
    where('userId', '==', userId),
    orderBy('name', 'asc')
  );
  
  return onSnapshot(q, 
    (snapshot) => {
      const templates = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FoodTemplate[];
      callback(templates);
    },
    (error) => {
      console.error('Error listening to templates:', error);
      callback([]);
    }
  );
};

/**
 * Yeni şablon ekle
 */
export const addTemplate = async (
  userId: string,
  template: Omit<FoodTemplate, 'id'>
): Promise<string> => {
  const templatesRef = collection(db, COLLECTIONS.TEMPLATES);
  const docRef = await addDoc(templatesRef, removeUndefined({
    ...template,
    userId,
  }));
  return docRef.id;
};

/**
 * Şablon güncelle
 */
export const updateTemplate = async (
  templateId: string,
  updates: Partial<FoodTemplate>
): Promise<void> => {
  const templateRef = doc(db, COLLECTIONS.TEMPLATES, templateId);
  await updateDoc(templateRef, removeUndefined({ ...updates }));
};

/**
 * Şablon sil
 */
export const deleteTemplate = async (templateId: string): Promise<void> => {
  const templateRef = doc(db, COLLECTIONS.TEMPLATES, templateId);
  await deleteDoc(templateRef);
};

// ============================================
// USER DATA DELETION (Hesap Silme)
// ============================================

/**
 * Dökümanları 500'lük chunk'lar halinde sil (Firestore batch limiti)
 */
const deleteInBatches = async (refs: any[]): Promise<void> => {
  const BATCH_SIZE = 490;
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    refs.slice(i, i + BATCH_SIZE).forEach((ref: any) => batch.delete(ref));
    await batch.commit();
  }
};

/**
 * Kullanıcının tüm verilerini sil (hesap silme öncesi)
 */
export const deleteAllUserData = async (userId: string): Promise<void> => {
  const foodsRef = collection(db, COLLECTIONS.FOODS);
  const goalsRef = collection(db, COLLECTIONS.GOALS);
  const templatesRef = collection(db, COLLECTIONS.TEMPLATES);

  const [foodsSnap, goalsSnap, templatesSnap] = await Promise.all([
    getDocs(query(foodsRef, where('userId', '==', userId))),
    getDocs(query(goalsRef, where('userId', '==', userId))),
    getDocs(query(templatesRef, where('userId', '==', userId))),
  ]);

  const allRefs = [
    ...foodsSnap.docs.map(d => d.ref),
    ...goalsSnap.docs.map(d => d.ref),
    ...templatesSnap.docs.map(d => d.ref),
  ];

  await deleteInBatches(allRefs);
};

/**
 * Çoklu yemek sil (batch, 500 limit korumalı)
 */
export const deleteFoodsBulk = async (ids: string[]): Promise<void> => {
  if (!ids || ids.length === 0) return;
  const refs = ids.map(id => doc(db, COLLECTIONS.FOODS, id));
  await deleteInBatches(refs);
};

/**
 * Çoklu şablon sil (batch, 500 limit korumalı)
 */
export const deleteTemplatesBulk = async (ids: string[]): Promise<void> => {
  if (!ids || ids.length === 0) return;
  const refs = ids.map(id => doc(db, COLLECTIONS.TEMPLATES, id));
  await deleteInBatches(refs);
};

// ============================================
// MIGRATION OPERATIONS (LocalStorage → Firestore)
// ============================================

/**
 * LocalStorage'daki verileri Firestore'a taşı
 */
export const migrateFromLocalStorage = async (userId: string): Promise<void> => {
  const batch = writeBatch(db);
  
  const safeParse = <T>(key: string): T | null => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  };

  try {
    // Foods migrate et
    const foods = safeParse<Food[]>('macromate-foods');
    if (Array.isArray(foods)) {
      const foodsRef = collection(db, COLLECTIONS.FOODS);
      foods.forEach((food) => {
        const newFoodRef = doc(foodsRef);
        batch.set(newFoodRef, removeUndefined({ ...food, userId }));
      });
    }

    // Goal migrate et
    const goal = safeParse<DailyGoal>('macromate-goal');
    if (goal && typeof goal === 'object') {
      const goalsRef = collection(db, COLLECTIONS.GOALS);
      batch.set(doc(goalsRef), removeUndefined({ ...goal, userId }));
    }

    // Templates migrate et
    const templates = safeParse<FoodTemplate[]>('macromate-templates');
    if (Array.isArray(templates)) {
      const templatesRef = collection(db, COLLECTIONS.TEMPLATES);
      templates.forEach((template) => {
        const newTemplateRef = doc(templatesRef);
        batch.set(newTemplateRef, removeUndefined({ ...template, userId }));
      });
    }

    await batch.commit();

    // Migration başarılı - LocalStorage'ı temizle
    localStorage.removeItem('macromate-foods');
    localStorage.removeItem('macromate-goal');
    localStorage.removeItem('macromate-templates');
  } catch (error) {
    console.error('Migration hatası:', error);
    throw error;
  }
};
