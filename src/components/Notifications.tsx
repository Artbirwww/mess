import { useState, useEffect, useRef } from 'react';
import { User, getChatsFromStorage, getUserById } from '../firebase';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  type: 'message' | 'system';
}

interface NotificationsProps {
  currentUserId: string;
  isMobile?: boolean;
  onNotificationClick?: (user: User) => void;
}

export default function Notifications({
  currentUserId,
  isMobile = false,
  onNotificationClick
}: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const prevChatsRef = useRef<{ [key: string]: number }>({});

  // Инициализация уведомлений браузера
  useEffect(() => {
    // Запрашиваем разрешение на уведомления браузера
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Воспроизведение звука уведомления
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (error) {
      console.log('Audio notification error:', error);
    }
  };

  // Показ браузерного уведомления
  const showBrowserNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        requireInteraction: false,
        tag: 'messenger-notification'
      });
    }
  };

  // Слушаем изменения в localStorage
  useEffect(() => {
    const updateUnreadCount = () => {
      const chats = getChatsFromStorage(currentUserId);
      const total = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
      setTotalUnread(total);

      // Проверяем новые непрочитанные сообщения
      chats.forEach(chat => {
        const prevUnread = prevChatsRef.current[chat.otherUserId] || 0;
        
        if (chat.unreadCount > prevUnread && chat.unreadCount > 0 && chat.lastMessage) {
          const userName = chat.otherUserName || chat.otherUserEmail;
          
          const notification: Notification = {
            id: `${chat.otherUserId}_${Date.now()}`,
            title: 'Новое сообщение',
            message: `${userName}: ${chat.lastMessage}`,
            timestamp: Date.now(),
            type: 'message'
          };
          
          // Добавляем уведомление
          setNotifications(prev => [notification, ...prev].slice(0, 10));
          
          // Воспроизводим звук
          playNotificationSound();
          
          // Показываем браузерное уведомление
          showBrowserNotification('Новое сообщение', `${userName}: ${chat.lastMessage}`);
        }
      });

      // Сохраняем текущие значения для следующего сравнения
      chats.forEach(chat => {
        prevChatsRef.current[chat.otherUserId] = chat.unreadCount;
      });
    };

    // Первоначальная загрузка
    updateUnreadCount();

    // Подписка на изменения localStorage
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `messenger_chats_${currentUserId}`) {
        updateUnreadCount();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Периодическая проверка (на случай если изменения в той же вкладке)
    const interval = setInterval(updateUnreadCount, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [currentUserId, onNotificationClick]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (onNotificationClick) {
      // Извлекаем userId из notification
      const parts = notification.message.split(':');
      const userNameOrEmail = parts[0];
      const user = await getUserByDisplayName(userNameOrEmail);
      if (user) {
        onNotificationClick(user);
      }
    }
    // Удаляем уведомление после клика
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
  };

  const getUserByDisplayName = async (displayName: string): Promise<User | null> => {
    const { getAllUsers } = await import('../firebase');
    const users = await getAllUsers();
    const user = users.find(u => u.name === displayName || u.email === displayName);
    return user || null;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: isMobile ? '10px' : '20px',
      right: isMobile ? '10px' : '20px',
      zIndex: 1000
    }}>
      {/* Кнопка уведомлений */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        style={{
          width: isMobile ? 45 : 50,
          height: isMobile ? 45 : 50,
          borderRadius: '50%',
          background: '#000000',
          border: '2px solid #00ff9d',
          color: '#00ff9d',
          fontSize: isMobile ? '16px' : '18px',
          fontFamily: 'JetBrains Mono, monospace',
          cursor: 'pointer',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s',
          boxShadow: '0 0 10px rgba(0, 255, 157, 0.3)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 157, 0.5)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 255, 157, 0.3)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        🔔
        {totalUnread > 0 && (
          <div style={{
            position: 'absolute',
            top: -5,
            right: -5,
            background: '#ff4444',
            color: '#000000',
            borderRadius: '50%',
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '9px' : '10px',
            fontFamily: 'JetBrains Mono, monospace',
            fontWeight: 'bold',
            border: '2px solid #000000'
          }}>
            {totalUnread > 99 ? '99+' : totalUnread}
          </div>
        )}
      </button>

      {/* Панель уведомлений */}
      {showNotifications && (
        <div style={{
          position: 'absolute',
          bottom: isMobile ? 55 : 60,
          right: 0,
          width: isMobile ? 280 : 320,
          maxHeight: isMobile ? '40vh' : 400,
          overflowY: 'auto',
          background: '#000000',
          border: '1px solid #00ff9d',
          borderRadius: 0,
          boxShadow: '0 0 20px rgba(0, 255, 157, 0.2)'
        }}>
          {/* Header */}
          <div style={{
            padding: isMobile ? '10px 12px' : '12px 16px',
            borderBottom: '1px solid #00ff9d',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{
              color: '#00ff9d',
              fontSize: isMobile ? '11px' : '12px',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              {'> NOTIFICATIONS'}
              {totalUnread > 0 && (
                <span style={{ marginLeft: 8, color: '#ff4444' }}>
                  ({totalUnread} new)
                </span>
              )}
            </div>
            <button
              onClick={clearNotifications}
              style={{
                background: 'transparent',
                color: '#ff4444',
                border: '1px solid #ff4444',
                borderRadius: 0,
                padding: '4px 8px',
                fontSize: isMobile ? '8px' : '9px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer'
              }}
            >
              {'[CLEAR]'}
            </button>
          </div>

          {/* Список уведомлений */}
          <div>
            {notifications.length === 0 ? (
              <div style={{
                padding: isMobile ? '20px' : '30px 20px',
                textAlign: 'center',
                color: '#666',
                fontSize: isMobile ? '10px' : '11px',
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                {'> NO NEW NOTIFICATIONS'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    style={{
                      padding: isMobile ? '10px 12px' : '12px 16px',
                      borderBottom: '1px solid #1a1e2a',
                      borderLeft: '3px solid #00ff9d',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
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
                      alignItems: 'flex-start',
                      marginBottom: 4
                    }}>
                      <div style={{
                        color: '#00ff9d',
                        fontSize: isMobile ? '10px' : '11px',
                        fontWeight: 'bold'
                      }}>
                        {notification.title}
                      </div>
                      <div style={{
                        color: '#666',
                        fontSize: isMobile ? '8px' : '9px'
                      }}>
                        {formatTime(notification.timestamp)}
                      </div>
                    </div>
                    <div style={{
                      color: '#888',
                      fontSize: isMobile ? '9px' : '10px',
                      wordBreak: 'break-word'
                    }}>
                      {notification.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
