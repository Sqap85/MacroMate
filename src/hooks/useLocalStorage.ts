import { useState, useEffect } from 'react';

 // LocalStorage ile senkronize çalışan generic hook
 
export function useLocalStorage<T>(key: string, initialValue: T) {
  // State'i localStorage'dan initialize et
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = globalThis.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // State değiştiğinde localStorage'ı güncelle
  useEffect(() => {
    try {
      globalThis.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue] as const;
}
