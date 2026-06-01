import IncomingMessage from '../../messages/incomingMessage/IncomingMessage';
import OutgoingMessage from '../../messages/outgoingMessage/OutgoingMessage';
import styles from './MessagesArea.module.css';

export default function MessagesArea({
  messages,
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
  onScrollToBottom
}) {
  return (
    <div className={styles.area} ref={messagesContainerRef}>
      {messages.length === 0 ? (
        <div className={styles.empty}>No messages yet</div>
      ) : (
        <>
          {messages.map((msg, index) => {
            const isOwn = msg.fromId === currentUser.uid;
            const isSelected = selectedMessages.has(msg.id || '');
            const replyFromName =
              msg.replyTo?.fromId === currentUser.uid
                ? currentUser.email
                : msg.replyTo?.fromName || otherUser.email;
            const MessageComponent = isOwn ? OutgoingMessage : IncomingMessage;
            return (
              <MessageComponent
                key={msg.id || index}
                msg={msg}
                replyFromName={replyFromName}
                selectionMode={selectionMode}
                isSelected={isSelected}
                onContextMenu={(e) => !selectionMode && onContextMenu(e, msg)}
                onToggleSelect={onToggleSelect}
                onImageClick={onImageClick}
              />
            );
          })}
          <div ref={messagesEndRef} />
        </>
      )}
      {showScrollButton && (
        <button type="button" onClick={onScrollToBottom} className={styles.scrollBtn} title="Scroll down">
          ↓
        </button>
      )}
    </div>
  );
}
