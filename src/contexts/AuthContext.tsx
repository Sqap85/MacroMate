import { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  sendEmailVerification,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth, emailVerificationSettings } from '../config/firebase';

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
  resendVerificationEmail: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
  updateUserPassword: (currentPassword: string, newPassword: string) => Promise<void>;
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
      
      // Email doğrulama gönder
      await sendEmailVerification(userCredential.user, emailVerificationSettings);
      
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

  // Email doğrulama emailini tekrar gönder
  const resendVerificationEmail = async () => {
    if (!currentUser) {
      throw new Error('Giriş yapılmamış');
    }
    
    if (currentUser.emailVerified) {
      throw new Error('Email zaten doğrulanmış');
    }

    await sendEmailVerification(currentUser, emailVerificationSettings);
  };

  // Kullanıcı bilgilerini yenile (email verified kontrolü için)
  const refreshUser = useCallback(async () => {
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        // Sadece emailVerified değiştiyse state'i güncelle (infinite loop önleme)
        const wasVerified = currentUser?.emailVerified || false;
        const isNowVerified = auth.currentUser.emailVerified;
        
        if (wasVerified !== isNowVerified) {
          setCurrentUser({ ...auth.currentUser });
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
      // Hata durumunda sessizce devam et
    }
  }, [currentUser?.emailVerified]);

  // Kullanıcı profil güncelleme (display name)
  const updateUserProfile = async (displayName: string) => {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Giriş yapılmamış');
    }

    await updateProfile(user, { displayName });
    // State'i güncelle
    setCurrentUser({ ...user, displayName } as User);
  };

  // Şifre güncelleme
  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('Giriş yapılmamış');
    }

    // Önce kullanıcıyı yeniden doğrula (güvenlik için)
    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword
    );
    await reauthenticateWithCredential(user, credential);

    // Şifreyi güncelle
    await updatePassword(user, newPassword);
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
    resendVerificationEmail,
    refreshUser,
    updateUserProfile,
    updateUserPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
