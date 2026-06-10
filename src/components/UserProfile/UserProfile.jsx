import { useState, useEffect } from 'react';
import Avatar from '../avatars/Avatar';
import { formatUserName } from '../../services/userService';
import MediaGallery from './MediaGallery';
import styles from './UserProfile.module.css';

export default function UserProfile({ user, chatId, currentUserId, onClose, onScrollToMessage }) {
  const [activeTab, setActiveTab] = useState('info');
  const [messages, setMessages] = useState([]);
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChatMedia();
  }, [chatId]);

  const loadChatMedia = async () => {
    setLoading(true);
    try {
      const { listenMessages } = await import('../../services/chatService');
      const unsubscribe = listenMessages(currentUserId, user.uid, (allMessages) => {
        setMessages(allMessages);
        
        const chatImages = [];
        const chatFiles = [];
        
        allMessages.forEach(msg => {
          if (msg.imageUrls && msg.imageUrls.length > 0) {
            msg.imageUrls.forEach(url => {
              chatImages.push({
                url,
                messageId: msg.id,
                timestamp: msg.timestamp,
                senderId: msg.fromId
              });
            });
          }
          if (msg.imageUrl) {
            chatImages.push({
              url: msg.imageUrl,
              messageId: msg.id,
              timestamp: msg.timestamp,
              senderId: msg.fromId
            });
          }
          if (msg.files && msg.files.length > 0) {
            msg.files.forEach(file => {
              chatFiles.push({
                ...file,
                messageId: msg.id,
                timestamp: msg.timestamp,
                senderId: msg.fromId
              });
            });
          }
        });
        
        setImages(chatImages.sort((a, b) => b.timestamp - a.timestamp));
        setFiles(chatFiles.sort((a, b) => b.timestamp - a.timestamp));
      });
      
      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  };

  const messageCount = messages.length;
  const displayName = formatUserName(user);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <button onClick={onClose} className={styles.closeButton}>
            ×
          </button>
        </div>

        <div className={styles.profileInfo}>
          <Avatar
            name={displayName}
            email={user.email}
            photoURL={user.photoURL}
            size="large"
          />
          <h3 className={styles.name}>{displayName}</h3>
          <p className={styles.email}>{user.email}</p>
          {user.bio && <p className={styles.bio}>{user.bio}</p>}
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{messageCount}</span>
              <span className={styles.statLabel}>сообщений</span>
            </div>
          </div>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'info' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('info')}
          >
            Инфо
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'images' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('images')}
          >
            Изображения ({images.length})
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'files' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('files')}
          >
            Файлы ({files.length})
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'info' && (
            <div className={styles.infoContent}>
              {user.phone && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Телефон:</span>
                  <span className={styles.infoValue}>{user.phone}</span>
                </div>
              )}
              {user.birthday && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Дата рождения:</span>
                  <span className={styles.infoValue}>
                    {new Date(user.birthday).toLocaleDateString()}
                  </span>
                </div>
              )}
              {user.gender && user.gender !== 'unspecified' && (
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}>Пол:</span>
                  <span className={styles.infoValue}>
                    {user.gender === 'male' ? 'Мужской' : 
                     user.gender === 'female' ? 'Женский' : 'Другой'}
                  </span>
                </div>
              )}
            </div>
          )}

          {activeTab === 'images' && (
            <MediaGallery
              items={images}
              type="image"
              onItemClick={(item) => {
                onScrollToMessage(item.messageId);
                onClose();
              }}
              onDownload={async (item) => {
                const link = document.createElement('a');
                link.href = item.url;
                link.download = `image_${Date.now()}.jpg`;
                link.click();
              }}
            />
          )}

          {activeTab === 'files' && (
            <MediaGallery
              items={files}
              type="file"
              onItemClick={(item) => {
                onScrollToMessage(item.messageId);
                onClose();
              }}
              onDownload={async (item) => {
                const link = document.createElement('a');
                link.href = item.url;
                link.download = item.name || `file_${Date.now()}`;
                link.click();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}