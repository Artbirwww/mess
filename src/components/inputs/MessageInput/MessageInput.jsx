import PinFile from '../../buttons/PinFile/PinFile';
import SendMessageBtn from '../../buttons/SendMessageBtn/SendMessageBtn';
import styles from './MessageInput.module.css';

export default function MessageInput({
  text,
  onTextChange,
  onKeyDown,
  onSend,
  sending,
  replyTo,
  otherUserEmail,
  onCancelReply,
  pendingFiles,
  pendingCount,
  fileInputRef,
  generalInputRef,
  uploading,
  onImageSelect,
  onFileSelect,
  inputRef
}) {
  return (
    <div className={styles.area}>
      <PinFile
        fileInputRef={fileInputRef}
        generalInputRef={generalInputRef}
        uploading={uploading}
        onImageSelect={onImageSelect}
        onFileSelect={onFileSelect}
      />
      <div className={styles.wrapper}>
        {replyTo && (
          <div className={styles.reply}>
            <span>
              <span className={styles.replyFrom}>Reply</span>
              <span className={styles.replyText}>
                {replyTo.fromName || otherUserEmail}
                {replyTo.text && ` · ${replyTo.text.substring(0, 40)}…`}
              </span>
            </span>
            <button type="button" onClick={onCancelReply} className={styles.replyCancel} aria-label="Cancel reply">
              ×
            </button>
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={onTextChange}
          onKeyDown={onKeyDown}
          placeholder={pendingFiles.length > 0 ? `${pendingFiles.length} file(s) attached` : 'напишите что-нибудь…'}
          className={styles.input}
        />
      </div>
      <SendMessageBtn
        onClick={onSend}
        disabled={sending || (!text.trim() && pendingCount === 0)}
        sending={sending}
        pendingCount={pendingCount}
      />
    </div>
  );
}
