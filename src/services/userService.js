import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';

export function formatUserName(user) {
  if (!user) return '';
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;
  if (user.name?.trim()) return user.name.trim();
  return user.email || '';
}

export function toChatUser(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    name: formatUserName(user),
    photoURL: user.photoURL || ''
  };
}

export const createUserProfile = async (userId, email, profileData = {}) => {
  try {
    const data = typeof profileData === 'string' ? { name: profileData } : profileData;
    const firstName = (data.firstName || '').trim();
    const lastName = (data.lastName || '').trim();
    const name =
      [firstName, lastName].filter(Boolean).join(' ').trim() || (data.name || '').trim();

    await setDoc(doc(db, 'users', userId), {
      uid: userId,
      email,
      firstName,
      lastName,
      name,
      phone: data.phone || '',
      createdAt: Date.now()
    });
  } catch (error) {
    console.error('Error creating profile:', error);
  }
};

export const searchUsers = async (email) => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '>=', email), where('email', '<=', email + '\uf8ff'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }));
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

export const getAllUsers = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }));
  } catch (error) {
    console.error('Get users error:', error);
    return [];
  }
};

export const checkUserExists = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists();
  } catch (error) {
    console.error('Check user error:', error);
    return false;
  }
};

export const getUserById = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { uid: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
};

export const updateUserProfile = async (userId, data) => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      ...data,
      updatedAt: Date.now()
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
};
