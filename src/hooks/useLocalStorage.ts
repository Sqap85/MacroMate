import { useState, useEffect } from 'react';

/**
 * LocalStorage ile senkronize çalışan generic hook
 * TypeScript generic kullanımını öğrenmek için mükemmel örnek!
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // State'i localStorage'dan initialize et
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // State değiştiğinde localStorage'ı güncelle
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}
