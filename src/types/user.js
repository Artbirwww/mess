export interface User {
  uid: string;
  email: string;
  name?: string;
  displayName?: string;
  phone?: string;
  photoURL?: string;
  firstName?: string;
  lastName?: string;
  birthday?: string;
  bio?: string;
  createdAt?: number;
}

export interface ChatBackground {
  type: 'color' | 'gradient' | 'image';
  value: string;
}

export interface Message {
  id?: string;
  text: string;
  fromId: string;
  toId: string;
  timestamp: number;
  imageUrl?: string;
  imageUrls?: string[];
  fileUrl?: string;
  files?: Array<{
    url: string;
    name: string;
    type: string;
    size: number;
  }>;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  editedAt?: number;
  replyTo?: {
    messageId: string;
    text: string;
    fromId: string;
    fromName?: string;
    imageCount?: number;
    fileCount?: number;
    fileNames?: string[];
  };
}

export interface LocalChat {
  id: string;
  otherUserId: string;
  otherUserName?: string;
  otherUserFirstName?: string;
  otherUserLastName?: string;
  otherUserEmail: string;
  otherUserPhotoURL?: string;
  lastMessage?: string;
  lastMessageTime: number;
  unreadCount: number;
}

export interface ActiveChat {
  id: string;
  otherUserId: string;
  otherUserName?: string;
  otherUserFirstName?: string;
  otherUserLastName?: string;
  otherUserEmail: string;
  lastMessage?: string;
  lastMessageTime?: number;
  unreadCount: number;
}
