import { formatFileSize, getFileIcon } from '../../../services/chatService';
import styles from './IncomingMessage.module.css';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, query) {
  if (!query || !text) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, 'gi'));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className={styles.highlight}>
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function IncomingMessage({
  msg,
  replyFromName,
  selectionMode,
  isSelected,
  isOwn = false,
  onContextMenu,
  onToggleSelect,
  onImageClick,
  highlightQuery = ''
}) {
  return (
    <div
      className={`${styles.message} ${isOwn ? styles.own : ''} ${isSelected ? styles.selected : ''}`}
      onContextMenu={onContextMenu}
      onClick={() => selectionMode && msg.id && onToggleSelect(msg.id)}
    >
      {selectionMode && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => msg.id && onToggleSelect(msg.id)}
          className={styles.checkbox}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <div className={styles.bubble}>
        {msg.replyTo && (
          <div className={styles.reply}>
            <span className={styles.replyFrom}>Reply · {replyFromName}</span>
            {msg.replyTo.text && <span>{msg.replyTo.text.substring(0, 80)}…</span>}
          </div>
        )}
        {msg.imageUrls?.map((url, idx) => (
          <div key={idx} className={styles.image}>
            <img src={url} alt="" onClick={() => onImageClick(url)} />
          </div>
        ))}
        {msg.imageUrl && !msg.imageUrls && (
          <div className={styles.image}>
            <img src={msg.imageUrl} alt="" onClick={() => onImageClick(msg.imageUrl)} />
          </div>
        )}
        {msg.files?.map((file, idx) => (
          <a key={idx} href={file.url} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
            <span>{getFileIcon(file.type, file.name)}</span>
            <span className={styles.fileName}>{file.name}</span>
            {file.size && <span className={styles.fileSize}>{formatFileSize(file.size)}</span>}
          </a>
        ))}
        {msg.fileUrl && !msg.files && (
          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
            <span>{getFileIcon(msg.fileType || '', msg.fileName)}</span>
            <span className={styles.fileName}>{msg.fileName || 'File'}</span>
          </a>
        )}
        {msg.text && (
          <div className={styles.text}>
            {highlightQuery ? highlightText(msg.text, highlightQuery) : msg.text}
            {msg.editedAt && <span className={styles.edited}> (edited)</span>}
          </div>
        )}
        <div className={styles.time}>
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
