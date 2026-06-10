import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth } from '../config/firebase';
import { checkUserExists, createUserProfile, formatUserName, getUserById, updateUserProfile } from '../services/userService';

const AuthContext = createContext(null);

async function buildUserState(firebaseUser) {
  const profile = (await getUserById(firebaseUser.uid)) || {};
  const name = formatUserName({ ...profile, email: firebaseUser.email });

  return {
    ...profile,
    uid: firebaseUser.uid,
    email: firebaseUser.email || profile.email || '',
    displayName: firebaseUser.displayName || undefined,
    name,
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    birthday: profile.birthday || '',
    bio: profile.bio || '',
    phone: profile.phone || '',
    photoURL: profile.photoURL || firebaseUser.photoURL || ''
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    const userData = await buildUserState(firebaseUser);
    setUser(userData);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const exists = await checkUserExists(firebaseUser.uid);
        if (!exists) {
          const displayName =
            firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
          await createUserProfile(firebaseUser.uid, firebaseUser.email || '', { name: displayName });
        }
        const userData = await buildUserState(firebaseUser);
        if (userData.email !== firebaseUser.email && firebaseUser.email) {
          await updateUserProfile(firebaseUser.uid, { email: firebaseUser.email });
          userData.email = firebaseUser.email;
        }
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const logout = async () => {
    await auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, setUser, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
