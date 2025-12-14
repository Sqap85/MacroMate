import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
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

/**
 * Password Reset Action Code Settings
 * Şifre sıfırlama linki ayarları
 */
export const passwordResetSettings: ActionCodeSettings = {
  // Sıfırlama sonrası yönlendirilecek URL
  url: window.location.origin,
  // Web'de handle etmek için
  handleCodeInApp: false,
};

// Firebase'i initialize et
const app = initializeApp(firebaseConfig);

// Authentication servisini al
export const auth = getAuth(app);

// Firestore servisini yeni cache API ile initialize et
// Offline persistence ve multi-tab desteği
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export default app;
