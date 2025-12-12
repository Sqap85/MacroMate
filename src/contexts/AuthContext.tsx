import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../config/firebase';

/**
 * Authentication Context
 * 
 * Kullanıcı authentication state'ini tüm uygulamada paylaşır
 */

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  isGuest: boolean;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook - Authentication context'i kullanmak için
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Email/Password ile kayıt
  const signup = async (email: string, password: string, displayName: string) => {
    // Misafir modundan çıkış - veriler LocalStorage'da kalacak ve migrate edilecek
    if (isGuest) {
      setIsGuest(false);
      localStorage.removeItem('guestMode');
      // Migration flag'ini set et
      sessionStorage.setItem('migrateFromGuest', 'true');
    }
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Kullanıcı adını güncelle
    if (userCredential.user) {
      await updateProfile(userCredential.user, {
        displayName: displayName,
      });
      // State'i güncelle
      setCurrentUser({...userCredential.user, displayName} as User);
    }
  };

  // Email/Password ile giriş
  const login = async (email: string, password: string) => {
    // Misafir modundan çıkış
    if (isGuest) {
      setIsGuest(false);
      localStorage.removeItem('guestMode');
      // Migration flag'ini set et
      sessionStorage.setItem('migrateFromGuest', 'true');
    }
    
    await signInWithEmailAndPassword(auth, email, password);
  };

  // Google ile giriş
  const loginWithGoogle = async () => {
    // Misafir modundan çıkış
    if (isGuest) {
      setIsGuest(false);
      localStorage.removeItem('guestMode');
      // Migration flag'ini set et
      sessionStorage.setItem('migrateFromGuest', 'true');
    }
    
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    await signInWithPopup(auth, provider);
  };

  // Çıkış
  const logout = async () => {
    setIsGuest(false);
    localStorage.removeItem('guestMode');
    
    // Eğer Firebase kullanıcısı varsa çıkış yap
    if (currentUser) {
      await signOut(auth);
    } else {
      // Misafir modundan çıkış - state'i temizle
      setCurrentUser(null);
      setLoading(false);
    }
  };

  // Misafir olarak devam et
  const continueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem('guestMode', 'true');
    setLoading(false);
  };

  // Auth state değişikliklerini dinle
  useEffect(() => {
    // Misafir modunu kontrol et
    const guestMode = localStorage.getItem('guestMode');
    if (guestMode === 'true') {
      setIsGuest(true);
      setCurrentUser(null);
      setLoading(false);
      return;
    }

    // Misafir modu kapalıysa normal auth listener'ı çalıştır
    setIsGuest(false);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    loading,
    isGuest,
    signup,
    login,
    logout,
    loginWithGoogle,
    continueAsGuest,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
