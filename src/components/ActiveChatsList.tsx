import { useState, useEffect } from 'react';
import {
  LocalChat,
  getChatsFromStorage,
  saveChatsToStorage,
  resetUnreadInStorage,
  getUserById,
  User,
  listenMessages
} from '../firebase';

interface ActiveChatsListProps {
  currentUserId: string;
  onSelectChat: (user: User) => void;
  isMobile?: boolean;
}

export default function ActiveChatsList({
  currentUserId,
  onSelectChat,
  isMobile = false
}: ActiveChatsListProps) {
  const [chats, setChats] = useState<LocalChat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Загружаем чаты из localStorage
    const storedChats = getChatsFromStorage(currentUserId);
    console.log('[ActiveChatsList] Загружены чаты из localStorage:', storedChats);
    setChats(storedChats);
    setLoading(false);

    // Подписываемся на обновления localStorage (для синхронизации между вкладками)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `messenger_chats_${currentUserId}` && e.newValue) {
        try {
          const newChats = JSON.parse(e.newValue);
          console.log('[ActiveChatsList] Обновление из другой вкладки:', newChats);
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
    // Сбрасываем счётчик непрочитанных
    resetUnreadInStorage(currentUserId, chat.otherUserId);

    const user = await getUserById(chat.otherUserId);
    if (user) {
      onSelectChat({
        uid: user.uid,
        email: user.email,
        name: user.name
      });
    }

    // Обновляем локально
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
      <div style={{
        border: '1px solid #00ff9d',
        background: '#000000',
        borderRadius: 0,
        padding: isMobile ? '15px' : '20px',
        textAlign: 'center',
        color: '#00ff9d',
        fontSize: isMobile ? '10px' : '12px'
      }}>
        {'> LOADING CHATS...'}
      </div>
    );
  }

  return (
    <div style={{
      border: '1px solid #00ff9d',
      background: '#000000',
      borderRadius: 0,
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: '#000000',
        padding: isMobile ? '8px 12px' : '12px 20px',
        borderBottom: '1px solid #00ff9d',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ color: '#00ff9d', fontSize: isMobile ? '12px' : '14px' }}>
          {'> ACTIVE_CHATS'}
        </div>
        {totalUnread > 0 && (
          <div style={{
            background: '#ff4444',
            color: '#000000',
            padding: '2px 8px',
            borderRadius: 0,
            fontSize: isMobile ? '9px' : '10px',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 'bold'
          }}>
            {totalUnread}
          </div>
        )}
      </div>

      {/* Chat List */}
      <div style={{
        maxHeight: isMobile ? '30vh' : '40vh',
        overflowY: 'auto'
      }}>
        {chats.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: isMobile ? '20px' : '30px 20px',
            color: '#666',
            fontSize: isMobile ? '10px' : '12px',
            fontFamily: 'JetBrains Mono, monospace',
            whiteSpace: 'pre'
          }}>
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
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {chats.map((chat) => (
              <div
                key={chat.otherUserId}
                onClick={() => handleChatSelect(chat)}
                style={{
                  padding: isMobile ? '10px 12px' : '12px 16px',
                  borderBottom: '1px solid #1a1e2a',
                  borderLeft: chat.unreadCount > 0 ? '3px solid #00ff9d' : '3px solid transparent',
                  background: '#000000',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#1a1e2a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#000000';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: chat.unreadCount > 0 ? '#00ff9d' : '#888',
                      fontSize: isMobile ? '11px' : '12px',
                      fontWeight: chat.unreadCount > 0 ? 'bold' : 'normal',
                      wordBreak: 'break-all'
                    }}>
                      {chat.otherUserName || chat.otherUserEmail}
                    </div>
                    {chat.lastMessage && (
                      <div style={{
                        color: '#666',
                        fontSize: isMobile ? '9px' : '10px',
                        marginTop: 4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {truncateMessage(chat.lastMessage)}
                      </div>
                    )}
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    gap: 4,
                    minWidth: 50
                  }}>
                    {formatTime(chat.lastMessageTime) && (
                      <div style={{
                        color: '#666',
                        fontSize: isMobile ? '8px' : '9px'
                      }}>
                        {formatTime(chat.lastMessageTime)}
                      </div>
                    )}
                    {chat.unreadCount > 0 && (
                      <div style={{
                        background: '#00ff9d',
                        color: '#000000',
                        padding: '1px 6px',
                        borderRadius: 0,
                        fontSize: isMobile ? '8px' : '9px',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 'bold'
                      }}>
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
