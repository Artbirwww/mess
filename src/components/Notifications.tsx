import { useState, useEffect, useRef } from 'react';
import { User, getChatsFromStorage } from '../firebase';
import './Notifications.css';

interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  type: 'message' | 'system';
}

interface NotificationsProps {
  currentUserId: string;
  onNotificationClick?: (user: User) => void;
}

export default function Notifications({
  currentUserId,
  onNotificationClick
}: NotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const prevChatsRef = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

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

  useEffect(() => {
    const updateUnreadCount = () => {
      const chats = getChatsFromStorage(currentUserId);
      const total = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
      setTotalUnread(total);

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

          setNotifications(prev => [notification, ...prev].slice(0, 10));
          playNotificationSound();
          showBrowserNotification('Новое сообщение', `${userName}: ${chat.lastMessage}`);
        }
      });

      chats.forEach(chat => {
        prevChatsRef.current[chat.otherUserId] = chat.unreadCount;
      });
    };

    updateUnreadCount();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `messenger_chats_${currentUserId}`) {
        updateUnreadCount();
      }
    };
    window.addEventListener('storage', handleStorageChange);

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
      const parts = notification.message.split(':');
      const userNameOrEmail = parts[0];
      const user = await getUserByDisplayName(userNameOrEmail);
      if (user) {
        onNotificationClick(user);
      }
    }
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
    <div className="notifications-container">
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="notifications-btn"
      >
        🔔
        {totalUnread > 0 && (
          <div className="notifications-btn-badge">
            {totalUnread > 99 ? '99+' : totalUnread}
          </div>
        )}
      </button>

      {showNotifications && (
        <div className="notifications-panel">
          <div className="notifications-panel-header">
            <div className="notifications-panel-title">
              {'> NOTIFICATIONS'}
              {totalUnread > 0 && (
                <span className="unread-count">
                  ({totalUnread} new)
                </span>
              )}
            </div>
            <button
              onClick={clearNotifications}
              className="notifications-clear-btn"
            >
              {'[ CLEAR ]'}
            </button>
          </div>

          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="notifications-empty">
                {'> NO NEW NOTIFICATIONS'}
              </div>
            ) : (
              <>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="notification-item"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="notification-item-header">
                      <div className="notification-item-title">
                        {notification.title}
                      </div>
                      <div className="notification-item-time">
                        {formatTime(notification.timestamp)}
                      </div>
                    </div>
                    <div className="notification-item-message">
                      {notification.message}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
