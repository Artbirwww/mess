import { useEffect, useState } from 'react';
import { getChatsFromStorage, resetUnreadInStorage } from '../../../services/chatService';
import { getUserById } from '../../../services/userService';
import ChatTile from '../ChatTile/ChatTile';
import styles from './ChatList.module.css';

export default function ChatList({ currentUserId, onSelectChat }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setChats(getChatsFromStorage(currentUserId));
    setLoading(false);

    const handleStorageChange = (e) => {
      if (e.key === `messenger_chats_${currentUserId}` && e.newValue) {
        try {
          setChats(JSON.parse(e.newValue));
        } catch (error) {
          console.error('Parse storage error:', error);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(() => setChats(getChatsFromStorage(currentUserId)), 2000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [currentUserId]);

  const handleChatSelect = async (chat) => {
    resetUnreadInStorage(currentUserId, chat.otherUserId);
    const user = await getUserById(chat.otherUserId);
    if (user) {
      onSelectChat({ uid: user.uid, email: user.email, name: user.name });
    }
    setChats((prev) =>
      prev.map((c) => (c.otherUserId === chat.otherUserId ? { ...c, unreadCount: 0 } : c))
    );
  };

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading chats…</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Chats</span>
        {totalUnread > 0 && <span className={styles.badge}>{totalUnread}</span>}
      </div>
      <div className={styles.content}>
        {chats.length === 0 ? (
          <div className={styles.empty}>No conversations yet. Search for someone to start.</div>
        ) : (
          <div className={styles.list}>
            {chats.map((chat) => (
              <ChatTile key={chat.otherUserId} chat={chat} onSelect={handleChatSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
