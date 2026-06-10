import { useEffect, useState } from 'react';
import { getChatsFromStorage } from '../../../services/chatService';
import { getUserById, toChatUser, formatUserName } from '../../../services/userService';
import ChatTile from '../ChatTile/ChatTile';
import styles from './ChatList.module.css';

async function enrichChatsFromProfiles(chats) {
  return Promise.all(
    chats.map(async (chat) => {
      const user = await getUserById(chat.otherUserId);
      if (!user) return chat;
      return {
        ...chat,
        otherUserFirstName: user.firstName || chat.otherUserFirstName || '',
        otherUserLastName: user.lastName || chat.otherUserLastName || '',
        otherUserName: formatUserName(user),
        otherUserPhotoURL: user.photoURL || chat.otherUserPhotoURL || ''
      };
    })
  );
}

export default function ChatList({ currentUserId, onSelectChat }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadChats = async () => {
      const stored = getChatsFromStorage(currentUserId);
      const enriched = await enrichChatsFromProfiles(stored);
      if (!cancelled) {
        setChats(enriched);
        setLoading(false);
      }
    };

    loadChats();

    const handleStorageChange = (e) => {
      if (e.key === `messenger_chats_${currentUserId}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          enrichChatsFromProfiles(parsed).then((enriched) => {
            if (!cancelled) setChats(enriched);
          });
        } catch (error) {
          console.error('Parse storage error:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(async () => {
      const stored = getChatsFromStorage(currentUserId);
      const enriched = await enrichChatsFromProfiles(stored);
      if (!cancelled) setChats(enriched);
    }, 2000);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [currentUserId]);

  const handleChatSelect = async (chat) => {
    const initialUnreadCount = chat.unreadCount ?? 0;
    const user = await getUserById(chat.otherUserId);
    if (user) {
      onSelectChat({
        ...toChatUser(user),
        initialUnreadCount
      });
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
        <span className={styles.title}>Чаты</span>
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
