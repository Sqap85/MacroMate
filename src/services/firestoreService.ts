/**
 * Çoklu şablon sil (batch)
 */
export const deleteTemplatesBulk = async (ids: string[]): Promise<void> => {
  if (!ids || ids.length === 0) return;
  const batch = writeBatch(db);
  ids.forEach(id => {
    const ref = doc(db, COLLECTIONS.TEMPLATES, id);
    batch.delete(ref);
  });
  await batch.commit();
};
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
      // Index eksikse boş array döndür
      if (error.code === 'failed-precondition') {
        console.warn('[Firestore] Index gerekli. Boş veri dönüyorum.');
        callback([]);
      } else {
        callback([]);
      }
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
      // Index eksikse boş array döndür
      if (error.code === 'failed-precondition') {
        console.warn('[Firestore] Index gerekli. Boş veri dönüyorum.');
        callback([]);
      } else {
        callback([]);
      }
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
// MIGRATION OPERATIONS (LocalStorage → Firestore)
// ============================================

/**
 * LocalStorage'daki verileri Firestore'a taşı
 */
export const migrateFromLocalStorage = async (userId: string): Promise<void> => {
  const batch = writeBatch(db);
  
  try {
    // Foods migrate et
    const localFoods = localStorage.getItem('macromate-foods');
    if (localFoods) {
      const foods: Food[] = JSON.parse(localFoods);
      const foodsRef = collection(db, COLLECTIONS.FOODS);
      
      foods.forEach((food) => {
        const newFoodRef = doc(foodsRef);
        batch.set(newFoodRef, removeUndefined({
          ...food,
          userId,
        }));
      });
    }
    
    // Goal migrate et
    const localGoal = localStorage.getItem('macromate-goal');
    if (localGoal) {
      const goal: DailyGoal = JSON.parse(localGoal);
      const goalsRef = collection(db, COLLECTIONS.GOALS);
      const newGoalRef = doc(goalsRef);
      batch.set(newGoalRef, removeUndefined({
        ...goal,
        userId,
      }));
    }
    
    // Templates migrate et
    const localTemplates = localStorage.getItem('macromate-templates');
    if (localTemplates) {
      const templates: FoodTemplate[] = JSON.parse(localTemplates);
      const templatesRef = collection(db, COLLECTIONS.TEMPLATES);
      
      templates.forEach((template) => {
        const newTemplateRef = doc(templatesRef);
        batch.set(newTemplateRef, removeUndefined({
          ...template,
          userId,
        }));
      });
    }
    
    await batch.commit();
    
    // Migration başarılı - LocalStorage'ı temizle
    localStorage.removeItem('macromate-foods');
    localStorage.removeItem('macromate-goal');
    localStorage.removeItem('macromate-templates');
    
    console.log('[Migration] LocalStorage veriler Firestore\'a taşındı!');
  } catch (error) {
    console.error('Migration hatası:', error);
    throw error;
  }
};
