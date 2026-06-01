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
import { db } from '../firebase/config';

export const createUserProfile = async (userId, email, name) => {
  try {
    await setDoc(doc(db, 'users', userId), {
      uid: userId,
      email,
      name,
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
