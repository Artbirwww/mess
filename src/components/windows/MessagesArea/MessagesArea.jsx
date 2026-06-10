import IncomingMessage from '../../messages/incomingMessage/IncomingMessage';
import OutgoingMessage from '../../messages/outgoingMessage/OutgoingMessage';
import ScrollToBottomBtn from '../../buttons/ScrollToBottomBtn/ScrollToBottomBtn';
import styles from './MessagesArea.module.css';

export default function MessagesArea({
  messages,
  firstUnreadIndex = -1,
  currentUser,
  otherUser,
  selectionMode,
  selectedMessages,
  onContextMenu,
  onToggleSelect,
  onImageClick,
  messagesEndRef,
  messagesContainerRef,
  showScrollButton,
  onScrollToBottom,
  searchQuery = '',
  searchMatchIndices = [],
  activeSearchMatchIndex = -1
}) {
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return (
    <div className={styles.area} ref={messagesContainerRef}>
      {messages.length === 0 ? (
        <div className={styles.empty}>No messages yet</div>
      ) : normalizedQuery && searchMatchIndices.length === 0 ? (
        <div className={styles.empty}>No messages match your search</div>
      ) : (
        <div className={styles.messages}>
          {messages.map((msg, index) => {
            const isOwn = msg.fromId === currentUser.uid;
            const isSelected = selectedMessages.has(msg.id || '');
            const isSearchMatch = searchMatchIndices.includes(index);
            const isActiveMatch = index === activeSearchMatchIndex;
            const replyFromName =
              msg.replyTo?.fromId === currentUser.uid
                ? currentUser.email
                : msg.replyTo?.fromName || otherUser.email;
            const MessageComponent = isOwn ? OutgoingMessage : IncomingMessage;
            return (
              <div
                key={msg.id || index}
                data-message-index={index}
                className={isActiveMatch ? styles.activeMatch : undefined}
              >
                {index === firstUnreadIndex && (
                  <div className={styles.unreadDivider}>Непрочитанные сообщения</div>
                )}
                <MessageComponent
                  msg={msg}
                  replyFromName={replyFromName}
                  selectionMode={selectionMode}
                  isSelected={isSelected}
                  onContextMenu={(e) => !selectionMode && onContextMenu(e, msg)}
                  onToggleSelect={onToggleSelect}
                  onImageClick={onImageClick}
                  highlightQuery={isSearchMatch ? normalizedQuery : ''}
                />
              </div>
            );
          })}
          <div ref={messagesEndRef} className={styles.messagesEnd} />
        </div>
      )}
      <ScrollToBottomBtn visible={showScrollButton} onClick={onScrollToBottom} />
    </div>
  );
}
