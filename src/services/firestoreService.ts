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

const COLLECTIONS = {
  FOODS: 'foods',
  GOALS: 'goals',
  TEMPLATES: 'templates',
};

// Firestore rejects documents that contain undefined values
const removeUndefined = (obj: any): any => {
  const cleaned: any = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined) cleaned[key] = obj[key];
  });
  return cleaned;
};

// ── FOOD OPERATIONS ──────────────────────────────────────────────────────────

export const getUserFoods = async (userId: string): Promise<Food[]> => {
  const foodsRef = collection(db, COLLECTIONS.FOODS);
  const q = query(foodsRef, where('userId', '==', userId), orderBy('timestamp', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Food[];
};

export const listenToUserFoods = (userId: string, callback: (foods: Food[]) => void) => {
  const foodsRef = collection(db, COLLECTIONS.FOODS);
  const q = query(foodsRef, where('userId', '==', userId), orderBy('timestamp', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Food[]),
    (error) => { console.error('Error listening to foods:', error); callback([]); }
  );
};

export const listenToUserFoodsLimited = (userId: string, maxCount: number, callback: (foods: Food[]) => void) => {
  const foodsRef = collection(db, COLLECTIONS.FOODS);
  const q = query(foodsRef, where('userId', '==', userId), orderBy('timestamp', 'desc'), limit(maxCount));
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Food[]),
    (error) => { console.error('Error listening to limited foods:', error); callback([]); }
  );
};

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
    (snapshot) => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Food[]),
    (error) => { console.error('Error listening to foods in range:', error); callback([]); }
  );
};

export const addFood = async (userId: string, food: Omit<Food, 'id'>): Promise<string> => {
  const foodsRef = collection(db, COLLECTIONS.FOODS);
  const docRef = await addDoc(foodsRef, removeUndefined({ ...food, userId, timestamp: food.timestamp || Date.now() }));
  return docRef.id;
};

export const updateFood = async (foodId: string, updates: Partial<Food>): Promise<void> => {
  const foodRef = doc(db, COLLECTIONS.FOODS, foodId);
  await updateDoc(foodRef, removeUndefined({ ...updates }));
};

export const deleteFood = async (foodId: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTIONS.FOODS, foodId));
};

// ── GOAL OPERATIONS ──────────────────────────────────────────────────────────

export const getUserGoal = async (userId: string): Promise<DailyGoal | null> => {
  const q = query(collection(db, COLLECTIONS.GOALS), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return { ...snapshot.docs[0].data() } as DailyGoal;
};

export const listenToUserGoal = (userId: string, callback: (goal: DailyGoal | null) => void) => {
  const q = query(collection(db, COLLECTIONS.GOALS), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) { callback(null); return; }
      callback(snapshot.docs[0].data() as DailyGoal);
    },
    (error) => { console.error('Error listening to goal:', error); callback(null); }
  );
};

export const saveUserGoal = async (userId: string, goal: DailyGoal): Promise<void> => {
  const goalsRef = collection(db, COLLECTIONS.GOALS);
  const snapshot = await getDocs(query(goalsRef, where('userId', '==', userId)));
  if (snapshot.empty) {
    await addDoc(goalsRef, removeUndefined({ ...goal, userId }));
  } else {
    await updateDoc(doc(db, COLLECTIONS.GOALS, snapshot.docs[0].id), removeUndefined({ ...goal }));
  }
};

// ── TEMPLATE OPERATIONS ──────────────────────────────────────────────────────

export const getUserTemplates = async (userId: string): Promise<FoodTemplate[]> => {
  const q = query(collection(db, COLLECTIONS.TEMPLATES), where('userId', '==', userId), orderBy('name', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FoodTemplate[];
};

export const listenToUserTemplates = (userId: string, callback: (templates: FoodTemplate[]) => void) => {
  const q = query(collection(db, COLLECTIONS.TEMPLATES), where('userId', '==', userId), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FoodTemplate[]),
    (error) => { console.error('Error listening to templates:', error); callback([]); }
  );
};

export const addTemplate = async (userId: string, template: Omit<FoodTemplate, 'id'>): Promise<string> => {
  const templatesRef = collection(db, COLLECTIONS.TEMPLATES);
  const docRef = await addDoc(templatesRef, removeUndefined({ ...template, userId }));
  return docRef.id;
};

// Batch write for CSV import — avoids concurrent addDoc race conditions
export const addTemplatesBatch = async (userId: string, templates: Omit<FoodTemplate, 'id'>[]): Promise<void> => {
  if (templates.length === 0) return;
  const templatesRef = collection(db, COLLECTIONS.TEMPLATES);
  const batch = writeBatch(db);
  for (const template of templates) {
    batch.set(doc(templatesRef), removeUndefined({ ...template, userId }));
  }
  await batch.commit();
};

export const updateTemplate = async (templateId: string, updates: Partial<FoodTemplate>): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.TEMPLATES, templateId), removeUndefined({ ...updates }));
};

export const deleteTemplate = async (templateId: string): Promise<void> => {
  await deleteDoc(doc(db, COLLECTIONS.TEMPLATES, templateId));
};

// ── BULK DELETION ─────────────────────────────────────────────────────────────

// Firestore batch limit is 500 writes — chunk to stay under it
const deleteInBatches = async (refs: any[]): Promise<void> => {
  const BATCH_SIZE = 490;
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    refs.slice(i, i + BATCH_SIZE).forEach((ref: any) => batch.delete(ref));
    await batch.commit();
  }
};

export const deleteAllUserData = async (userId: string): Promise<void> => {
  const [foodsSnap, goalsSnap, templatesSnap] = await Promise.all([
    getDocs(query(collection(db, COLLECTIONS.FOODS), where('userId', '==', userId))),
    getDocs(query(collection(db, COLLECTIONS.GOALS), where('userId', '==', userId))),
    getDocs(query(collection(db, COLLECTIONS.TEMPLATES), where('userId', '==', userId))),
  ]);
  await deleteInBatches([
    ...foodsSnap.docs.map(d => d.ref),
    ...goalsSnap.docs.map(d => d.ref),
    ...templatesSnap.docs.map(d => d.ref),
  ]);
};

export const deleteFoodsBulk = async (ids: string[]): Promise<void> => {
  if (!ids || ids.length === 0) return;
  await deleteInBatches(ids.map(id => doc(db, COLLECTIONS.FOODS, id)));
};

export const deleteTemplatesBulk = async (ids: string[]): Promise<void> => {
  if (!ids || ids.length === 0) return;
  await deleteInBatches(ids.map(id => doc(db, COLLECTIONS.TEMPLATES, id)));
};

// ── MIGRATION ─────────────────────────────────────────────────────────────────

export const migrateFromLocalStorage = async (userId: string): Promise<void> => {
  const batch = writeBatch(db);

  const safeParse = <T>(key: string): T | null => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try { return JSON.parse(raw) as T; } catch { return null; }
  };

  try {
    const foods = safeParse<Food[]>('macromate-foods');
    if (Array.isArray(foods)) {
      const foodsRef = collection(db, COLLECTIONS.FOODS);
      foods.forEach((food) => {
        batch.set(doc(foodsRef), removeUndefined({ ...food, userId }));
      });
    }

    const goal = safeParse<DailyGoal>('macromate-goal');
    if (goal && typeof goal === 'object') {
      batch.set(doc(collection(db, COLLECTIONS.GOALS)), removeUndefined({ ...goal, userId }));
    }

    const templates = safeParse<FoodTemplate[]>('macromate-templates');
    if (Array.isArray(templates)) {
      const templatesRef = collection(db, COLLECTIONS.TEMPLATES);
      templates.forEach((template) => {
        batch.set(doc(templatesRef), removeUndefined({ ...template, userId }));
      });
    }

    await batch.commit();

    localStorage.removeItem('macromate-foods');
    localStorage.removeItem('macromate-goal');
    localStorage.removeItem('macromate-templates');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
};
