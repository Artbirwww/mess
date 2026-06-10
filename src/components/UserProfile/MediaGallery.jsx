import { useState } from 'react';
import styles from './MediaGallery.module.css';

function ImagePreview({ item, onClose, onDownload, onShowInChat }) {
  return (
    <div className={styles.previewOverlay} onClick={onClose}>
      <div className={styles.previewContent} onClick={(e) => e.stopPropagation()}>
        <img src={item.url} alt="Preview" className={styles.previewImage} />
        <div className={styles.previewActions}>
          <button onClick={onShowInChat} className={styles.previewBtn}>
            Показать в чате
          </button>
          <button onClick={onDownload} className={styles.previewBtn}>
            Скачать
          </button>
        </div>
        <button onClick={onClose} className={styles.previewClose}>×</button>
      </div>
    </div>
  );
}

function FilePreview({ item, onClose, onDownload, onShowInChat }) {
  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
    if (['mp4', 'webm', 'mov'].includes(ext)) return '🎬';
    if (['mp3', 'wav', 'ogg'].includes(ext)) return '🎵';
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['zip', 'rar', '7z'].includes(ext)) return '📦';
    return '📎';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className={styles.previewOverlay} onClick={onClose}>
      <div className={styles.previewContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.filePreviewIcon}>{getFileIcon(item.name)}</div>
        <div className={styles.filePreviewInfo}>
          <div className={styles.filePreviewName}>{item.name}</div>
          {item.size && <div className={styles.filePreviewSize}>{formatFileSize(item.size)}</div>}
        </div>
        <div className={styles.previewActions}>
          <button onClick={onShowInChat} className={styles.previewBtn}>
            Показать в чате
          </button>
          <button onClick={onDownload} className={styles.previewBtn}>
            Скачать
          </button>
        </div>
        <button onClick={onClose} className={styles.previewClose}>×</button>
      </div>
    </div>
  );
}

export default function MediaGallery({ items, type, onItemClick, onDownload }) {
  const [previewItem, setPreviewItem] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item
    });
  };

  const handleShowInChat = () => {
    if (contextMenu && onItemClick) {
      onItemClick(contextMenu.item);
    }
    setContextMenu(null);
  };

  const handleDownload = () => {
    if (contextMenu && onDownload) {
      onDownload(contextMenu.item);
    }
    setContextMenu(null);
  };

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        {type === 'image' ? 'Нет изображений' : 'Нет файлов'}
      </div>
    );
  }

  return (
    <>
      <div className={styles.gallery}>
        {items.map((item, index) => (
          <div
            key={index}
            className={type === 'image' ? styles.imageItem : styles.fileItem}
            onClick={() => setPreviewItem(item)}
            onContextMenu={(e) => handleContextMenu(e, item)}
          >
            {type === 'image' ? (
              <img src={item.url} alt="" className={styles.thumbnail} />
            ) : (
              <div className={styles.fileThumbnail}>
                <span className={styles.fileIcon}>
                  {item.name?.split('.').pop()?.toLowerCase() === 'pdf' ? '📄' :
                   item.name?.split('.').pop()?.toLowerCase() === 'doc' ? '📝' :
                   item.name?.split('.').pop()?.toLowerCase() === 'docx' ? '📝' :
                   item.name?.split('.').pop()?.toLowerCase() === 'zip' ? '📦' : '📎'}
                </span>
                <div className={styles.fileName}>{item.name}</div>
                {item.size && <div className={styles.fileSize}>{formatFileSize(item.size)}</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      {previewItem && type === 'image' && (
        <ImagePreview
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onDownload={() => onDownload(previewItem)}
          onShowInChat={() => {
            onItemClick(previewItem);
            setPreviewItem(null);
          }}
        />
      )}

      {previewItem && type === 'file' && (
        <FilePreview
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onDownload={() => onDownload(previewItem)}
          onShowInChat={() => {
            onItemClick(previewItem);
            setPreviewItem(null);
          }}
        />
      )}

      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={handleShowInChat} className={styles.menuItem}>
            Показать в чате
          </button>
          <button onClick={handleDownload} className={styles.menuItem}>
            Скачать
          </button>
        </div>
      )}
    </>
  );
}