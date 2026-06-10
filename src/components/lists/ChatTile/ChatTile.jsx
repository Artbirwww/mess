import Avatar from '../../avatars/Avatar';
import { formatUserName } from '../../../services/userService';
import styles from './ChatTile.module.css';

export default function ChatTile({ chat, onSelect }) {
  const displayName = formatUserName({
    firstName: chat.otherUserFirstName,
    lastName: chat.otherUserLastName,
    name: chat.otherUserName,
    email: chat.otherUserEmail
  });

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 1) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (hours < 24) return `${hours}h`;
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const truncate = (text, max = 36) => {
    if (!text) return '';
    return text.length <= max ? text : `${text.substring(0, max)}…`;
  };

  return (
    <div
      className={`${styles.tile} ${chat.unreadCount > 0 ? styles.unread : ''}`}
      onClick={() => onSelect(chat)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(chat)}
    >
      <div className={styles.content}>
        <Avatar
          name={displayName}
          email={chat.otherUserEmail}
          photoURL={chat.otherUserPhotoURL}
          size="small"
        />
        <div className={styles.main}>
          <div className={styles.name}>{displayName}</div>
          {chat.lastMessage && <div className={styles.preview}>{truncate(chat.lastMessage)}</div>}
        </div>
        <div className={styles.meta}>
          {chat.lastMessageTime && <span className={styles.time}>{formatTime(chat.lastMessageTime)}</span>}
          {chat.unreadCount > 0 && <span className={styles.unreadBadge}>{chat.unreadCount}</span>}
        </div>
      </div>
    </div>
  );
}
