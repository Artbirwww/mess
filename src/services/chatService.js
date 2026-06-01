import {
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
import { db } from '../firebase/config';
import { getUserById } from './userService';
import { uploadImageToCloudinary, uploadFileToCloudinary } from './cloudinaryService';

const getStorageKey = (userId) => `messenger_chats_${userId}`;

export const getChatsFromStorage = (userId) => {
  try {
    const data = localStorage.getItem(getStorageKey(userId));
    if (data) return JSON.parse(data);
  } catch (error) {
    console.error('Get chats from storage error:', error);
  }
  return [];
};

export const saveChatsToStorage = (userId, chats) => {
  try {
    const sorted = chats.sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    localStorage.setItem(getStorageKey(userId), JSON.stringify(sorted));
  } catch (error) {
    console.error('Save chats to storage error:', error);
  }
};

export const updateChatInStorage = (
  userId,
  otherUserId,
  otherUserEmail,
  otherUserName,
  lastMessage,
  isFromMe = false
) => {
  try {
    const chats = getChatsFromStorage(userId);
    const chatId = [userId, otherUserId].sort().join('_');
    const existingChat = chats.find((c) => c.otherUserId === otherUserId);

    if (existingChat) {
      existingChat.lastMessage = lastMessage;
      existingChat.lastMessageTime = Date.now();
      if (otherUserName) existingChat.otherUserName = otherUserName;
      if (isFromMe) existingChat.unreadCount = 0;
    } else {
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

export const incrementUnreadInStorage = (userId, otherUserId) => {
  try {
    const chats = getChatsFromStorage(userId);
    const chat = chats.find((c) => c.otherUserId === otherUserId);
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

export const resetUnreadInStorage = (userId, otherUserId) => {
  try {
    const chats = getChatsFromStorage(userId);
    const chat = chats.find((c) => c.otherUserId === otherUserId);
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

export const sendMessage = async (fromId, toId, text, replyTo) => {
  try {
    const chatId = [fromId, toId].sort().join('_');
    const messageData = { text, fromId, toId, timestamp: Date.now() };
    if (replyTo) messageData.replyTo = replyTo;

    await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

    const toUser = await getUserById(toId);
    updateChatInStorage(fromId, toId, toUser?.email || toId, toUser?.name, text, true);

    const fromUser = await getUserById(fromId);
    updateChatInStorage(toId, fromId, fromUser?.email || fromId, fromUser?.name, text, false);
  } catch (error) {
    console.error('Send error:', error);
  }
};

export const listenMessages = (userId, otherUserId, callback) => {
  const chatId = [userId, otherUserId].sort().join('_');
  const messagesRef = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesRef, orderBy('timestamp'));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(messages);
  });
};

export const uploadImage = (file, fromId, toId) =>
  uploadImageToCloudinary(file, fromId, toId);

export const uploadFile = (file, fromId, toId) =>
  uploadFileToCloudinary(file, fromId, toId);

export const sendImageMessage = async (fromId, toId, imageUrl) => {
  try {
    const chatId = [fromId, toId].sort().join('_');
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text: '',
      imageUrl,
      fromId,
      toId,
      timestamp: Date.now()
    });

    const toUser = await getUserById(toId);
    updateChatInStorage(fromId, toId, toUser?.email || toId, toUser?.name, '📷 Image', true);

    const fromUser = await getUserById(fromId);
    updateChatInStorage(toId, fromId, fromUser?.email || fromId, fromUser?.name, '📷 Image', false);
  } catch (error) {
    console.error('Send image error:', error);
  }
};

export const sendFileMessage = async (fromId, toId, fileUrl, fileName, fileType, fileSize) => {
  try {
    const chatId = [fromId, toId].sort().join('_');
    await addDoc(collection(db, 'chats', chatId, 'messages'), {
      text: '',
      fileUrl,
      fileName,
      fileType,
      fileSize,
      fromId,
      toId,
      timestamp: Date.now()
    });

    const toUser = await getUserById(toId);
    updateChatInStorage(fromId, toId, toUser?.email || toId, toUser?.name, `📎 ${fileName}`, true);

    const fromUser = await getUserById(fromId);
    updateChatInStorage(toId, fromId, fromUser?.email || fromId, fromUser?.name, `📎 ${fileName}`, false);
  } catch (error) {
    console.error('Send file error:', error);
  }
};

export const sendMultipleFilesMessage = async (fromId, toId, text, files, replyTo) => {
  try {
    const chatId = [fromId, toId].sort().join('_');
    const imageUrls = files.filter((f) => f.isImage).map((f) => f.url);
    const fileObjects = files.filter((f) => !f.isImage).map((f) => ({
      url: f.url,
      name: f.file.name,
      type: f.file.type || 'application/octet-stream',
      size: f.file.size
    }));

    const messageData = { text: text || '', fromId, toId, timestamp: Date.now() };
    if (imageUrls.length > 0) messageData.imageUrls = imageUrls;
    if (fileObjects.length > 0) messageData.files = fileObjects;
    if (replyTo) messageData.replyTo = replyTo;

    await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

    const toUser = await getUserById(toId);
    const fromUser = await getUserById(fromId);
    const summary = `${imageUrls.length > 0 ? `📷 ${imageUrls.length} image(s)` : ''}${fileObjects.length > 0 ? `${imageUrls.length > 0 ? ' + ' : ''}📎 ${fileObjects.length} file(s)` : ''}`;

    updateChatInStorage(fromId, toId, toUser?.email || toId, toUser?.name, text || summary, true);
    updateChatInStorage(toId, fromId, fromUser?.email || fromId, fromUser?.name, text || summary, false);
  } catch (error) {
    console.error('Send multiple files error:', error);
    throw error;
  }
};

export const getFileIcon = (fileType, fileName) => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎬';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType.includes('pdf')) return '📄';
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return '📄';
    if (ext === 'doc' || ext === 'docx') return '📝';
    if (ext === 'zip' || ext === 'rar') return '📦';
  }
  return '📎';
};

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
};

export const deleteMessage = async (chatId, messageId) => {
  await deleteDoc(doc(db, 'chats', chatId, 'messages', messageId));
};

export const deleteMessages = async (chatId, messageIds) => {
  await Promise.all(
    messageIds.map((messageId) => deleteDoc(doc(db, 'chats', chatId, 'messages', messageId)))
  );
};

export const editMessage = async (chatId, messageId, newText) => {
  await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
    text: newText,
    editedAt: Date.now()
  });
};

export const saveChatBackground = async (chatId, background) => {
  await setDoc(
    doc(db, 'chats', chatId),
    { background, updatedAt: Date.now() },
    { merge: true }
  );
};

export const listenChatBackground = (chatId, callback) => {
  const chatRef = doc(db, 'chats', chatId);
  return onSnapshot(chatRef, (docSnap) => {
    callback(docSnap.exists() ? docSnap.data().background || null : null);
  });
};
