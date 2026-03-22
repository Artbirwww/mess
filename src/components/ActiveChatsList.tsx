import { useState, useEffect } from 'react';
import {
  LocalChat,
  getChatsFromStorage,
  resetUnreadInStorage,
  getUserById,
  User
} from '../firebase';
import './ActiveChatsList.css';

interface ActiveChatsListProps {
  currentUserId: string;
  onSelectChat: (user: User) => void;
}

export default function ActiveChatsList({
  currentUserId,
  onSelectChat
}: ActiveChatsListProps) {
  const [chats, setChats] = useState<LocalChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedChats = getChatsFromStorage(currentUserId);
    setChats(storedChats);
    setLoading(false);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `messenger_chats_${currentUserId}` && e.newValue) {
        try {
          const newChats = JSON.parse(e.newValue);
          setChats(newChats);
        } catch (error) {
          console.error('Parse storage error:', error);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [currentUserId]);

  const handleChatSelect = async (chat: LocalChat) => {
    resetUnreadInStorage(currentUserId, chat.otherUserId);

    const user = await getUserById(chat.otherUserId);
    if (user) {
      onSelectChat({
        uid: user.uid,
        email: user.email,
        name: user.name
      });
    }

    setChats(prev => prev.map(c =>
      c.otherUserId === chat.otherUserId ? { ...c, unreadCount: 0 } : c
    ));
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (hours < 24) {
      return `${hours}ч назад`;
    } else {
      return date.toLocaleDateString([], { day: 'numeric', month: 'numeric' });
    }
  };

  const truncateMessage = (text: string, maxLength: number = 30) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  if (loading) {
    return (
      <div className="chats-list-container">
        <div className="chats-list-header">
          <div className="chats-list-title">
            {'> ACTIVE_CHATS'}
          </div>
        </div>
        <div className="chats-list-content" style={{ padding: '20px', textAlign: 'center' }}>
          {'> LOADING CHATS...'}
        </div>
      </div>
    );
  }

  return (
    <div className="chats-list-container">
      <div className="chats-list-header">
        <div className="chats-list-title">
          {'> ACTIVE_CHATS'}
        </div>
        {totalUnread > 0 && (
          <div className="chats-list-badge">
            {totalUnread}
          </div>
        )}
      </div>

      <div className="chats-list-content">
        {chats.length === 0 ? (
          <div className="chats-empty-state">
            {`┌─────────────────────────────────────┐
│                                     │
│      > NO ACTIVE CHATS              │
│                                     │
│      Start a conversation to see    │
│      your chat list here            │
│                                     │
└─────────────────────────────────────┘`}
          </div>
        ) : (
          <div className="chats-list">
            {chats.map((chat) => (
              <div
                key={chat.otherUserId}
                className={`chat-item ${chat.unreadCount > 0 ? 'unread' : ''}`}
                onClick={() => handleChatSelect(chat)}
              >
                <div className="chat-item-content">
                  <div className="chat-item-main">
                    <div className="chat-item-name">
                      {chat.otherUserName || chat.otherUserEmail}
                    </div>
                    {chat.lastMessage && (
                      <div className="chat-item-message">
                        {truncateMessage(chat.lastMessage)}
                      </div>
                    )}
                  </div>
                  <div className="chat-item-meta">
                    {chat.lastMessageTime && (
                      <div className="chat-item-time">
                        {formatTime(chat.lastMessageTime)}
                      </div>
                    )}
                    {chat.unreadCount > 0 && (
                      <div className="chat-item-unread-badge">
                        {chat.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
