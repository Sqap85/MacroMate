import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import type { ActionCodeSettings } from 'firebase/auth';

/**
 * Firebase Configuration
 * Environment variables'dan alınıyor (.env dosyası)
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

/**
 * Email Verification Action Code Settings
 * Email doğrulama linki ayarları
 */
export const emailVerificationSettings: ActionCodeSettings = {
  // Doğrulama sonrası yönlendirilecek URL
  url: window.location.origin,
  // Web'de handle etmek için
  handleCodeInApp: false,
};

// Firebase'i initialize et
const app = initializeApp(firebaseConfig);

// Authentication servisini al
export const auth = getAuth(app);

// Firestore servisini al
export const db = getFirestore(app);

// Offline persistence aktifleştir
// Kullanıcı offline olduğunda da veri okuyabilir/yazabilir
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Birden fazla tab açıksa offline persistence çalışmaz
    console.warn('Firebase: Multiple tabs open, persistence disabled.');
  } else if (err.code === 'unimplemented') {
    // Browser desteklemiyor
    console.warn('Firebase: Persistence not available in this browser.');
  }
});

export default app;
