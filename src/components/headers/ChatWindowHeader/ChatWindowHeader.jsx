import Avatar from '../../avatars/Avatar';
import { formatUserName } from '../../../services/userService';
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
  onShowBackground,
  searchOpen,
  searchQuery,
  searchMatchCount,
  searchMatchIndex,
  onToggleSearch,
  onSearchQueryChange,
  onSearchPrev,
  onSearchNext,
  onAvatarClick
}) {
  const displayName = formatUserName(otherUser);

  return (
    <div className={styles.header}>
      <div className={styles.info} onClick={onAvatarClick} style={{ cursor: 'pointer' }}>
        <Avatar
          name={displayName}
          email={otherUser.email}
          photoURL={otherUser.photoURL}
          size="small"
        />
        <div className={styles.infoText}>
          <div className={styles.name}>{displayName}</div>
          <div className={styles.status}>{otherUser.email}</div>
        </div>
      </div>

      {searchOpen && !selectionMode && (
        <div className={styles.searchBar}>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            placeholder="Поиск в чате..."
            className={styles.searchInput}
            autoFocus
          />
          {searchQuery.trim() && (
            <span className={styles.searchCount}>
              {searchMatchCount > 0
                ? `${searchMatchIndex + 1} / ${searchMatchCount}`
                : '0 результатов'}
            </span>
          )}
          <button
            type="button"
            onClick={onSearchPrev}
            disabled={searchMatchCount === 0}
            className={styles.btn}
            title="Предыдущее"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onSearchNext}
            disabled={searchMatchCount === 0}
            className={styles.btn}
            title="Следующее"
          >
            ↓
          </button>
        </div>
      )}

      <div className={styles.actions}>
        {selectionMode ? (
          <>
            <span className={styles.selectionInfo}>
              {selectedCount} / {messagesCount}
            </span>
            <button type="button" onClick={onSelectAll} className={styles.btn}>
              Все
            </button>
            <button
              type="button"
              onClick={onDeleteSelected}
              disabled={selectedCount === 0}
              className={`${styles.btn} ${styles.btnDanger}`}
            >
              Удалить
            </button>
            <button type="button" onClick={onClearSelection} className={styles.btn}>
              Отмена
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onToggleSearch}
              className={`${styles.btn} ${searchOpen ? styles.btnActive : ''}`}
              title="Поиск сообщений"
            >
              Поиск
            </button>
            <button type="button" onClick={onShowBackground} className={styles.btn} title="Фон">
              Фон
            </button>
            <button type="button" onClick={onToggleSelection} className={styles.btn}>
              Выбрать
            </button>
          </>
        )}
      </div>
      {isMobile && onBack && (
        <button type="button" onClick={onBack} className={styles.btn}>
          Назад
        </button>
      )}
    </div>
  );
}