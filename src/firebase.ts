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
  getDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

console.log('✅ Firebase Config:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  apiKeyExists: !!firebaseConfig.apiKey
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
  imageUrl?: string;
  editedAt?: number;
  replyTo?: {
    messageId: string;
    text: string;
    fromId: string;
    fromName?: string;
  };
}

// Создание профиля
export const createUserProfile = async (userId: string, email: string, name: string) => {
  try {
    await setDoc(doc(db, 'users', userId), {
      uid: userId,
      email,
      name,
      createdAt: Date.now(),
    });
    console.log('✅ Profile created');
  } catch (error) {
    console.error('Error creating profile:', error);
  }
};

// Поиск пользователей
export const searchUsers = async (email: string): Promise<User[]> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '>=', email), where('email', '<=', email + '\uf8ff'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

// Получить всех пользователей
export const getAllUsers = async (): Promise<User[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
  } catch (error) {
    console.error('Get users error:', error);
    return [];
  }
};

// Отправить сообщение
export const sendMessage = async (
  fromId: string,
  toId: string,
  text: string,
  replyTo?: {
    messageId: string;
    text: string;
    fromId: string;
    fromName?: string;
  }
) => {
  try {
    const chatId = [fromId, toId].sort().join('_');
    const messageData: any = {
      text,
      fromId,
      toId,
      timestamp: Date.now()
    };
    
    if (replyTo) {
      messageData.replyTo = replyTo;
    }
    
    await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

    // Обновляем localStorage для отправителя
    const toUser = await getUserById(toId);
    updateChatInStorage(
      fromId,
      toId,
      toUser?.email || toId,
      toUser?.name,
      text,
      true
    );

    // Обновляем localStorage для получателя (увеличиваем счётчик непрочитанных)
    const fromUser = await getUserById(fromId);
    updateChatInStorage(
      toId,
      fromId,
      fromUser?.email || fromId,
      fromUser?.name,
      text,
      false
    );
  } catch (error) {
    console.error('Send error:', error);
  }
};

// Слушать сообщения
export const listenMessages = (
  userId: string,
  otherUserId: string,
  callback: (messages: Message[]) => void
) => {
  const chatId = [userId, otherUserId].sort().join('_');
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp'));
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
    callback(messages);
  });
};

// Проверить существование пользователя
export const checkUserExists = async (userId: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    return userDoc.exists();
  } catch (error) {
    console.error('Check user error:', error);
    return false;
  }
};

// Получить пользователя по ID
export const getUserById = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return { uid: userDoc.id, ...userDoc.data() } as User;
    }
    return null;
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
};

// Интерфейс для активного чата
export interface ActiveChat {
  id: string;
  otherUserId: string;
  otherUserName?: string;
  otherUserEmail: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
}

// Получить все ID чатов пользователя
export const getUserChatIds = async (userId: string): Promise<string[]> => {
  try {
    const chatsSnapshot = await getDocs(collection(db, 'chats'));
    const chatIds: string[] = [];
    chatsSnapshot.docs.forEach(doc => {
      const [user1, user2] = doc.id.split('_');
      if (user1 === userId || user2 === userId) {
        chatIds.push(doc.id);
      }
    });
    return chatIds;
  } catch (error) {
    console.error('Get chat ids error:', error);
    return [];
  }
};

// Получить последний сообщение в чате
export const getLastMessage = async (chatId: string): Promise<Message | null> => {
  try {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Message;
    }
    return null;
  } catch (error) {
    console.error('Get last message error:', error);
    return null;
  }
};

// Получить активные чаты пользователя
export const getActiveChats = async (userId: string): Promise<ActiveChat[]> => {
  try {
    const chatIds = await getUserChatIds(userId);
    const activeChats: ActiveChat[] = [];

    for (const chatId of chatIds) {
      const [user1, user2] = chatId.split('_');
      const otherUserId = user1 === userId ? user2 : user1;
      const otherUser = await getUserById(otherUserId);

      if (otherUser) {
        const lastMessage = await getLastMessage(chatId);
        activeChats.push({
          id: chatId,
          otherUserId,
          otherUserName: otherUser.name,
          otherUserEmail: otherUser.email,
          lastMessage: lastMessage?.text,
          lastMessageTime: lastMessage?.timestamp,
          unreadCount: 0
        });
      }
    }

    return activeChats.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
  } catch (error) {
    console.error('Get active chats error:', error);
    return [];
  }
};

// Слушать активные чаты в реальном времени
export const listenActiveChats = (
  userId: string,
  callback: (chats: ActiveChat[]) => void
) => {
  console.log('[listenActiveChats] Подписка для пользователя:', userId);
  
  // Сначала получаем все чаты
  const loadChats = async () => {
    console.log('[listenActiveChats] Загрузка чатов...');
    const chatIds = await getUserChatIds(userId);
    console.log('[listenActiveChats] Найдены chatIds:', chatIds);
    const activeChats: ActiveChat[] = [];

    for (const chatId of chatIds) {
      const [user1, user2] = chatId.split('_');
      const otherUserId = user1 === userId ? user2 : user1;
      const otherUser = await getUserById(otherUserId);
      console.log('[listenActiveChats] Другой пользователь:', otherUser);

      if (otherUser) {
        const lastMessage = await getLastMessage(chatId);
        console.log('[listenActiveChats] Последнее сообщение:', lastMessage);
        activeChats.push({
          id: chatId,
          otherUserId,
          otherUserName: otherUser.name,
          otherUserEmail: otherUser.email,
          lastMessage: lastMessage?.text,
          lastMessageTime: lastMessage?.timestamp,
          unreadCount: 0
        });
      }
    }

    const sorted = activeChats.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));
    console.log('[listenActiveChats] Итоговые чаты:', sorted);
    callback(sorted);
  };

  // Загружаем чаты при подписке
  loadChats();

  // Создаем unsubscribe функции для всех чатов
  const unsubscribers: (() => void)[] = [];
  
  getUserChatIds(userId).then(chatIds => {
    console.log('[listenActiveChats] Создание подписок на сообщения для чатов:', chatIds);
    chatIds.forEach(chatId => {
      const messagesRef = collection(db, 'chats', chatId, 'messages');
      const unsubscribe = onSnapshot(messagesRef, () => {
        console.log('[listenActiveChats] Изменения в чате:', chatId);
        loadChats();
      });
      unsubscribers.push(unsubscribe);
    });
  });

  // Возвращаем функцию отписки
  return () => {
    console.log('[listenActiveChats] Отписка от всех чатов');
    unsubscribers.forEach(unsub => unsub());
  };
};

// Подсчитать непрочитанные сообщения в чате
export const getUnreadCount = async (
  userId: string,
  otherUserId: string,
  lastReadTime: number = 0
): Promise<number> => {
  try {
    const chatId = [userId, otherUserId].sort().join('_');
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(
      messagesRef,
      where('fromId', '==', otherUserId),
      where('timestamp', '>', lastReadTime)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Get unread count error:', error);
    return 0;
  }
};

// Обновить время последнего прочтения
export const updateLastReadTime = async (
  userId: string,
  otherUserId: string,
  timestamp: number
) => {
  try {
    const readTimeId = `${userId}_${otherUserId}`;
    await setDoc(doc(db, 'readTimes', readTimeId), {
      userId,
      otherUserId,
      lastReadTime: timestamp,
      updatedAt: Date.now()
    }, { merge: true });
  } catch (error) {
    console.error('Update read time error:', error);
  }
};

// Получить время последнего прочтения
export const getLastReadTime = async (
  userId: string,
  otherUserId: string
): Promise<number> => {
  try {
    const readTimeId = `${userId}_${otherUserId}`;
    const docRef = doc(db, 'readTimes', readTimeId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().lastReadTime || 0;
    }
    return 0;
  } catch (error) {
    console.error('Get last read time error:', error);
    return 0;
  }
};

// === Функции для работы с localStorage ===

// Интерфейс для чата в localStorage
export interface LocalChat {
  id: string;
  otherUserId: string;
  otherUserName?: string;
  otherUserEmail: string;
  lastMessage?: string;
  lastMessageTime: number;
  unreadCount: number;
}

// Ключ для localStorage
const getStorageKey = (userId: string) => `messenger_chats_${userId}`;

// Получить чаты из localStorage
export const getChatsFromStorage = (userId: string): LocalChat[] => {
  try {
    const key = getStorageKey(userId);
    const data = localStorage.getItem(key);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Get chats from storage error:', error);
  }
  return [];
};

// Сохранить чаты в localStorage
export const saveChatsToStorage = (userId: string, chats: LocalChat[]) => {
  try {
    const key = getStorageKey(userId);
    // Сортируем по времени последнего сообщения
    const sorted = chats.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    localStorage.setItem(key, JSON.stringify(sorted));
  } catch (error) {
    console.error('Save chats to storage error:', error);
  }
};

// Обновить или добавить чат в localStorage
export const updateChatInStorage = (
  userId: string,
  otherUserId: string,
  otherUserEmail: string,
  otherUserName?: string,
  lastMessage?: string,
  isFromMe: boolean = false
) => {
  try {
    const chats = getChatsFromStorage(userId);
    const chatId = [userId, otherUserId].sort().join('_');
    const existingChat = chats.find(c => c.otherUserId === otherUserId);

    if (existingChat) {
      // Обновляем существующий чат
      existingChat.lastMessage = lastMessage;
      existingChat.lastMessageTime = Date.now();
      if (otherUserName) existingChat.otherUserName = otherUserName;
      // Сбрасываем счётчик непрочитанных, если сообщение от нас
      if (isFromMe) {
        existingChat.unreadCount = 0;
      }
    } else {
      // Добавляем новый чат
      chats.push({
        id: chatId,
        otherUserId,
        otherUserEmail,
        otherUserName,
        lastMessage,
        lastMessageTime: Date.now(),
        unreadCount: isFromMe ? 0 : 1
      });
    }

    saveChatsToStorage(userId, chats);
    return chats;
  } catch (error) {
    console.error('Update chat in storage error:', error);
    return [];
  }
};

// Увеличить счётчик непрочитанных сообщений
export const incrementUnreadInStorage = (
  userId: string,
  otherUserId: string
) => {
  try {
    const chats = getChatsFromStorage(userId);
    const chat = chats.find(c => c.otherUserId === otherUserId);
    if (chat) {
      chat.unreadCount += 1;
      saveChatsToStorage(userId, chats);
    }
    return chats;
  } catch (error) {
    console.error('Increment unread in storage error:', error);
    return [];
  }
};

// Сбросить счётчик непрочитанных
export const resetUnreadInStorage = (userId: string, otherUserId: string) => {
  try {
    const chats = getChatsFromStorage(userId);
    const chat = chats.find(c => c.otherUserId === otherUserId);
    if (chat) {
      chat.unreadCount = 0;
      saveChatsToStorage(userId, chats);
    }
    return chats;
  } catch (error) {
    console.error('Reset unread in storage error:', error);
    return [];
  }
};

// Слушать изменения в localStorage (для синхронизации между вкладками)
export const listenStorageChanges = (
  userId: string,
  callback: (chats: LocalChat[]) => void
) => {
  const handleStorageChange = (e: StorageEvent) => {
    const key = getStorageKey(userId);
    if (e.key === key && e.newValue) {
      try {
        callback(JSON.parse(e.newValue));
      } catch (error) {
        console.error('Parse storage change error:', error);
      }
    }
  };

  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
};

// Загрузить изображение в Cloudinary
export const uploadImage = async (
  file: File,
  fromId: string,
  toId: string
): Promise<string> => {
  try {
    const { uploadImageToCloudinary } = await import('./lib/cloudinary');
    const imageUrl = await uploadImageToCloudinary(file, fromId, toId);
    return imageUrl;
  } catch (error) {
    console.error('Upload image error:', error);
    throw error;
  }
};

// Отправить сообщение с изображением
export const sendImageMessage = async (
  fromId: string,
  toId: string,
  imageUrl: string
) => {
  try {
    const chatId = [fromId, toId].sort().join('_');
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text: '',
      imageUrl,
      fromId,
      toId,
      timestamp: Date.now(),
    });

    // Обновляем localStorage для отправителя
    const toUser = await getUserById(toId);
    updateChatInStorage(
      fromId,
      toId,
      toUser?.email || toId,
      toUser?.name,
      '📷 Image',
      true
    );

    // Обновляем localStorage для получателя
    const fromUser = await getUserById(fromId);
    updateChatInStorage(
      toId,
      fromId,
      fromUser?.email || fromId,
      fromUser?.name,
      '📷 Image',
      false
    );
  } catch (error) {
    console.error('Send image error:', error);
  }
};

// Удалить сообщение
export const deleteMessage = async (
  chatId: string,
  messageId: string
) => {
  try {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    await deleteDoc(messageRef);
  } catch (error) {
    console.error('Delete message error:', error);
    throw error;
  }
};

// Редактировать сообщение
export const editMessage = async (
  chatId: string,
  messageId: string,
  newText: string
) => {
  try {
    const messageRef = doc(db, 'chats', chatId, 'messages', messageId);
    await updateDoc(messageRef, {
      text: newText,
      editedAt: Date.now()
    });
  } catch (error) {
    console.error('Edit message error:', error);
    throw error;
  }
};