import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
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
  reauthenticateWithPopup,
  EmailAuthProvider,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  deleteUser,
} from 'firebase/auth';
import { deleteAllUserData } from '../services/firestoreService';
import { auth, emailVerificationSettings, passwordResetSettings } from '../config/firebase';

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
  resetPassword: (email: string) => Promise<void>;
  checkSignInMethods: (email: string) => Promise<string[]>;
  addPasswordToAccount: (password: string) => Promise<void>;
  deleteAccount: (password?: string) => Promise<void>;
  emailVerificationDismissed: boolean;
  setEmailVerificationDismissed: (dismissed: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
  const [emailVerificationDismissed, setEmailVerificationDismissed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    if (currentUser) {
      setEmailVerificationDismissed(false);
    }
  }, [currentUser]);

  const signup = async (email: string, password: string, displayName: string) => {
    if (isGuest) {
      setIsGuest(false);
      localStorage.removeItem('guestMode');
      sessionStorage.setItem('migrateFromGuest', 'true');
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
      await sendEmailVerification(userCredential.user, emailVerificationSettings);
      setCurrentUser({ ...userCredential.user, displayName } as User);
    }
  };

  const login = async (email: string, password: string) => {
    if (isGuest) {
      setIsGuest(false);
      localStorage.removeItem('guestMode');
      sessionStorage.setItem('migrateFromGuest', 'true');
    }
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    try {
      if (isGuest) {
        setIsGuest(false);
        localStorage.removeItem('guestMode');
        sessionStorage.setItem('migrateFromGuest', 'true');
      }
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Google giriş hatası:', error);
      throw error;
    }
  };

  const logout = async () => {
    setIsGuest(false);
    setEmailVerificationDismissed(true);
    localStorage.removeItem('guestMode');
    if (currentUser) {
      await signOut(auth);
    } else {
      setCurrentUser(null);
      setLoading(false);
    }
  };

  const continueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem('guestMode', 'true');
    setLoading(false);
  };

  const resendVerificationEmail = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Giriş yapılmamış');
    if (user.emailVerified) throw new Error('Email zaten doğrulanmış');
    await sendEmailVerification(user, emailVerificationSettings);
  };

  const refreshUser = useCallback(async () => {
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        const wasVerified = currentUser?.emailVerified || false;
        const isNowVerified = auth.currentUser.emailVerified;
        if (wasVerified !== isNowVerified) {
          setCurrentUser({ ...auth.currentUser });
        }
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  }, [currentUser?.emailVerified]);

  const updateUserProfile = async (displayName: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Giriş yapılmamış');
    await updateProfile(user, { displayName });
    setCurrentUser({ ...user, displayName } as User);
  };

  const updateUserPassword = async (currentPassword: string, newPassword: string) => {
    const user = auth.currentUser;
    if (!user?.email) throw new Error('Giriş yapılmamış');
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email, passwordResetSettings);
  };

  const checkSignInMethods = async (email: string): Promise<string[]> => {
    try {
      return await fetchSignInMethodsForEmail(auth, email);
    } catch (error) {
      console.error('Error checking sign-in methods:', error);
      return [];
    }
  };

  const addPasswordToAccount = async (password: string) => {
    const user = auth.currentUser;
    if (!user?.email) throw new Error('Giriş yapılmamış');
    const credential = EmailAuthProvider.credential(user.email, password);
    await linkWithCredential(user, credential);
    await user.reload();
    setCurrentUser({ ...auth.currentUser } as User);
  };

  const deleteAccount = async (password?: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error('Giriş yapılmamış');
    if (password && user.email) {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
    } else {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await reauthenticateWithPopup(user, provider);
    }
    await deleteAllUserData(user.uid);
    await deleteUser(user);
    setCurrentUser(null);
    setIsGuest(false);
    localStorage.removeItem('guestMode');
  };

  useEffect(() => {
    const guestMode = localStorage.getItem('guestMode');
    if (guestMode === 'true') {
      setIsGuest(true);
      setCurrentUser(null);
      setLoading(false);
      return;
    }
    setIsGuest(false);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ✅ value objesi her render'da yeniden oluşturulmuyor
  const value = useMemo<AuthContextType>(() => ({
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
    resetPassword,
    checkSignInMethods,
    addPasswordToAccount,
    deleteAccount,
    emailVerificationDismissed,
    setEmailVerificationDismissed,
  }), [
    currentUser,
    loading,
    isGuest,
    emailVerificationDismissed,
    refreshUser,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};