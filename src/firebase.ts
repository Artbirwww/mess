import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  orderBy, 
  onSnapshot,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log('🔧 Firebase Config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKey: firebaseConfig.apiKey ? '✅ Установлен' : '❌ Не установлен',
});

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export interface User {
  uid: string;
  email: string;
  name?: string;
  createdAt?: number;
}

export interface Message {
  id?: string;
  text: string;
  fromId: string;
  toId: string;
  timestamp: number;
}

export const createUserProfile = async (userId: string, email: string, name: string): Promise<void> => {
  try {
    console.log('📝 Создание профиля пользователя:', { userId, email, name });
    
    const userRef = doc(db, 'users', userId);
    const userData = {
      uid: userId,
      email: email,
      name: name,
      createdAt: Date.now(),
    };
    
    await setDoc(userRef, userData);
    console.log('✅ Профиль пользователя успешно создан:', userId);
    
    const checkUser = await getDoc(userRef);
    if (checkUser.exists()) {
      console.log('✅ Проверка: профиль существует в Firestore');
    } else {
      console.error('❌ Проверка: профиль НЕ существует в Firestore');
    }
  } catch (error) {
    console.error('❌ Ошибка создания профиля:', error);
    throw error;
  }
};

export const searchUsers = async (email: string): Promise<User[]> => {
  try {
    console.log('🔍 Поиск пользователей с email:', email);
    
    if (!email.trim()) {
      console.log('⚠️ Пустой поисковый запрос');
      return [];
    }
    
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef, 
      where('email', '>=', email.toLowerCase()), 
      where('email', '<=', email.toLowerCase() + '\uf8ff')
    );
    
    const snapshot = await getDocs(q);
    
    console.log(`📊 Найдено пользователей: ${snapshot.docs.length}`);
    
    if (snapshot.docs.length === 0) {
      console.log('⚠️ Пользователи не найдены. Получаем всех пользователей для отладки...');
      const allUsersSnapshot = await getDocs(collection(db, 'users'));
      console.log(`📋 Всего пользователей в базе: ${allUsersSnapshot.docs.length}`);
      allUsersSnapshot.docs.forEach(doc => {
        console.log(`   - ${doc.data().email} (${doc.id})`);
      });
    }
    
    const users = snapshot.docs.map(doc => ({ 
      uid: doc.id, 
      ...doc.data() 
    } as User));
    
    return users;
    
  } catch (error) {
    console.error('❌ Ошибка поиска пользователей:', error);
    return [];
  }
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  } catch (error) {
    console.error('Ошибка получения всех пользователей:', error);
    return [];
  }
};

export const sendMessage = async (fromId: string, toId: string, text: string): Promise<void> => {
  try {
    if (!text.trim()) {
      console.log('⚠️ Пустое сообщение не отправлено');
      return;
    }
    
    const chatId = [fromId, toId].sort().join('_');
    const messageData = {
      text: text.trim(),
      fromId,
      toId,
      timestamp: Date.now(),
    };
    
    console.log('📨 Отправка сообщения:', { chatId, ...messageData });
    
    await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);
    console.log('✅ Сообщение отправлено');
    
  } catch (error) {
    console.error('❌ Ошибка отправки сообщения:', error);
    throw error;
  }
};

export const listenMessages = (
  userId: string, 
  otherUserId: string, 
  callback: (messages: Message[]) => void
) => {
  const chatId = [userId, otherUserId].sort().join('_');
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp'));
  
  console.log(`👂 Начинаем прослушивание сообщений для чата: ${chatId}`);
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    } as Message));
    
    console.log(`💬 Получено сообщений: ${messages.length}`);
    callback(messages);
  }, (error) => {
    console.error('❌ Ошибка при прослушивании сообщений:', error);
  });
};

export const checkUserExists = async (userId: string): Promise<boolean> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    return userDoc.exists();
  } catch (error) {
    console.error('Ошибка проверки пользователя:', error);
    return false;
  }
};

export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      return { uid: userDoc.id, ...userDoc.data() } as User;
    }
    return null;
  } catch (error) {
    console.error('Ошибка получения пользователя:', error);
    return null;
  }
};

auth.onAuthStateChanged(async (user) => {
  if (user) {
    console.log('🔥 Пользователь авторизован:', user.email);
    const exists = await checkUserExists(user.uid);
    if (!exists) {
      console.warn('⚠️ Пользователь есть в Authentication, но НЕ в Firestore!');
      console.log('🔄 Создаем профиль автоматически...');
      const displayName = user.displayName || user.email?.split('@')[0] || 'User';
      await createUserProfile(user.uid, user.email || '', displayName);
    } else {
      console.log('✅ Пользователь найден в Firestore');
    }
  } else {
    console.log('🔒 Пользователь не авторизован');
  }
});

export const debugFirestore = async () => {
  console.log('🐛 Отладка Firestore:');
  console.log('   - Проект:', firebaseConfig.projectId);
  
  try {
    const users = await getAllUsers();
    console.log(`   - Всего пользователей: ${users.length}`);
    users.forEach(user => {
      console.log(`     • ${user.email} (${user.uid})`);
    });
  } catch (error) {
    console.error('   ❌ Ошибка получения пользователей:', error);
  }
};