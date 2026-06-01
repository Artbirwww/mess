import styles from './ChatWindowHeader.module.css';

export default function ChatWindowHeader({
  otherUser,
  isMobile,
  onBack,
  selectionMode,
  selectedCount,
  messagesCount,
  onSelectAll,
  onDeleteSelected,
  onClearSelection,
  onToggleSelection,
  onShowBackground
}) {
  return (
    <div className={styles.header}>
      <div className={styles.info}>
        <div className={styles.name}>{otherUser.name || otherUser.email}</div>
        <div className={styles.status}>{otherUser.email}</div>
      </div>
      <div className={styles.actions}>
        {selectionMode ? (
          <>
            <span className={styles.selectionInfo}>
              {selectedCount} / {messagesCount}
            </span>
            <button type="button" onClick={onSelectAll} className={styles.btn}>
              All
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              disabled={selectedCount === 0}
              className={`${styles.btn} ${styles.btnDanger}`}
            >
              Delete
            </button>
            <button type="button" onClick={onClearSelection} className={styles.btn}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={onShowBackground} className={styles.btn} title="Background">
              Background
            </button>
            <button type="button" onClick={onToggleSelection} className={styles.btn}>
              Select
            </button>
          </>
        )}
      </div>
      {isMobile && onBack && (
        <button type="button" onClick={onBack} className={styles.btn}>
          Back
        </button>
      )}
    </div>
  );
}
