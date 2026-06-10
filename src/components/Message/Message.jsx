import { useState, useRef } from 'react';
import Reactions from './Reactions';
import useUserStore from '../../stores/useUserStore';
import { formatFileSize, getFileIcon } from '../../services/chatService';
import styles from './Message.module.css';

const REACTIONS_LIST = ['like', 'heart', 'laugh', 'wow', 'sad'];
const REACTION_EMOJI = {
  like: '👍',
  heart: '❤️',
  laugh: '😂',
  wow: '😮',
  sad: '😢'
};

function ImageGrid({ urls, onImageClick }) {
  if (!urls || urls.length === 0) return null;
  
  return (
    <div className={styles.images}>
      {urls.map((url, idx) => (
        <div key={idx} className={styles.image}>
          <img src={url} alt="" onClick={() => onImageClick(url)} />
        </div>
      ))}
    </div>
  );
}

function FileList({ files }) {
  if (!files || files.length === 0) return null;
  
  return (
    <div className={styles.files}>
      {files.map((file, idx) => (
        <a
          key={idx}
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.fileLink}
        >
          <span>{getFileIcon(file.type, file.name)}</span>
          <span className={styles.fileName}>{file.name}</span>
          {file.size && <span className={styles.fileSize}>{formatFileSize(file.size)}</span>}
        </a>
      ))}
    </div>
  );
}

function ReplyPreview({ reply, currentUserId, otherUserEmail }) {
  const fromName = reply.fromId === currentUserId ? 'Вы' : (reply.fromName || otherUserEmail);
  const previewText = reply.text || (reply.fileNames?.length ? `${reply.fileNames.length} файл(ов)` : '');
  
  return (
    <div className={styles.replyPreview}>
      <span className={styles.replyFrom}>{fromName}:</span>
      <span className={styles.replyText}>{previewText?.substring(0, 50)}</span>
    </div>
  );
}

export default function Message({
  msg,
  messageId,
  isOwn,
  currentUserId,
  otherUserEmail,
  selectionMode,
  isSelected,
  onToggleSelect,
  onContextMenu,
  onImageClick,
  onReply,
  onEdit,
  onDelete,
  highlightQuery
}) {
  const [showReactions, setShowReactions] = useState(false);
  const [reactionButtonRect, setReactionButtonRect] = useState(null);
  const reactionButtonRef = useRef(null);
  const { addReaction, getMessageReactions } = useUserStore();
  
  const reactions = getMessageReactions(messageId);
  
  const groupedReactions = reactions.reduce((acc, r) => {
    acc[r.reaction] = (acc[r.reaction] || 0) + 1;
    return acc;
  }, {});
  
  const userReaction = reactions.find(r => r.userId === currentUserId)?.reaction;
  
  const handleReactionClick = (reactionType) => {
    addReaction(messageId, currentUserId, reactionType);
    setShowReactions(false);
  };
  
  const handleReactionButtonClick = (e) => {
    e.stopPropagation();
    const rect = reactionButtonRef.current?.getBoundingClientRect();
    if (rect) {
      setReactionButtonRect(rect);
    }
    setShowReactions(!showReactions);
  };
  
  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={index} className={styles.highlight}>{part}</mark>
        : part
    );
  };
  
  const imageUrls = msg.imageUrls || (msg.imageUrl ? [msg.imageUrl] : []);
  
  return (
    <div
      className={`${styles.message} ${isOwn ? styles.own : ''} ${isSelected ? styles.selected : ''}`}
      onContextMenu={(e) => onContextMenu(e, msg)}
    >
      {selectionMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(messageId)}
          className={styles.checkbox}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      
      <div className={styles.bubble}>
        {msg.replyTo && (
          <ReplyPreview
            reply={msg.replyTo}
            currentUserId={currentUserId}
            otherUserEmail={otherUserEmail}
          />
        )}
        
        <ImageGrid urls={imageUrls} onImageClick={onImageClick} />
        
        <FileList files={msg.files} />
        
        {msg.text && (
          <div className={styles.text}>
            {highlightQuery ? highlightText(msg.text, highlightQuery) : msg.text}
            {msg.editedAt && <span className={styles.edited}> (ред.)</span>}
          </div>
        )}
        
        <div className={styles.meta}>
          <div className={styles.time}>
            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          
          {!selectionMode && (
            <div className={styles.actions}>
              <button
                ref={reactionButtonRef}
                type="button"
                onClick={handleReactionButtonClick}
                className={`${styles.reactionButton} ${userReaction ? styles.hasReaction : ''}`}
              >
                {userReaction ? REACTION_EMOJI[userReaction] : '😊'}
              </button>
              <button type="button" onClick={() => onReply(msg)} className={styles.actionButton}>
                ↩
              </button>
              {isOwn && (
                <button type="button" onClick={() => onEdit(msg)} className={styles.actionButton}>
                  ✎
                </button>
              )}
              <button type="button" onClick={() => onDelete(msg)} className={`${styles.actionButton} ${styles.danger}`}>
                ×
              </button>
            </div>
          )}
        </div>
        
        {Object.keys(groupedReactions).length > 0 && (
          <div className={styles.reactionsList}>
            {Object.entries(groupedReactions).map(([type, count]) => (
              <span key={type} className={styles.reactionBadge}>
                {REACTION_EMOJI[type]} {count}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {showReactions && reactionButtonRect && (
        <Reactions
          reactions={REACTIONS_LIST}
          emojiMap={REACTION_EMOJI}
          onSelect={handleReactionClick}
          onClose={() => setShowReactions(false)}
          anchorRect={reactionButtonRect}
        />
      )}
    </div>
  );
}