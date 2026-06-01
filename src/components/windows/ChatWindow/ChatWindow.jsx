import { useState, useEffect, useRef } from 'react';
import {
  sendMessage,
  listenMessages,
  updateChatInStorage,
  incrementUnreadInStorage,
  uploadImage,
  uploadFile,
  sendMultipleFilesMessage,
  deleteMessage,
  editMessage,
  deleteMessages,
  sendImageMessage,
  sendFileMessage,
  saveChatBackground,
  listenChatBackground
} from '../../../services/chatService';
import ChatWindowHeader from '../../headers/ChatWindowHeader/ChatWindowHeader';
import MessagesArea from '../MessagesArea/MessagesArea';
import MessageInput from '../../inputs/MessageInput/MessageInput';
import styles from './ChatWindow.module.css';

export default function ChatWindow({ otherUser, currentUser, isMobile = false, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editText, setEditText] = useState('');
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [chatBackground, setChatBackground] = useState(null);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileInputGeneralRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const editInputRef = useRef(null);
  const chatId = [currentUser.uid, otherUser.uid].sort().join('_');

  useEffect(() => {
    const unsubscribe = listenMessages(currentUser.uid, otherUser.uid, (newMessages) => {
      if (newMessages.length > prevMessageCountRef.current) {
        const lastMessage = newMessages[newMessages.length - 1];
        const isFromMe = lastMessage.fromId === currentUser.uid;
        updateChatInStorage(
          currentUser.uid,
          otherUser.uid,
          otherUser.email,
          otherUser.name,
          lastMessage.text,
          isFromMe
        );
        if (!isFromMe && document.hidden) {
          incrementUnreadInStorage(currentUser.uid, otherUser.uid);
        }
      }
      setMessages(newMessages);
      prevMessageCountRef.current = newMessages.length;
    });
    return unsubscribe;
  }, [currentUser, otherUser]);

  useEffect(() => {
    return listenChatBackground(chatId, setChatBackground);
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollButton(scrollHeight - scrollTop - clientHeight >= 100);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = () => contextMenu && setContextMenu(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  const addFiles = async (files) => {
    const newPending = files.map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      uploading: false,
      uploaded: false
    }));
    setPendingFiles((prev) => [...prev, ...newPending]);
  };

  const sendAllPendingFiles = async () => {
    const filesToSend = pendingFiles.filter((pf) => !pf.uploaded && !pf.uploading);
    if (!filesToSend.length) return;

    const results = await Promise.all(
      filesToSend.map(async (pf) => {
        setPendingFiles((prev) =>
          prev.map((p) => (p.file === pf.file ? { ...p, uploading: true } : p))
        );
        try {
          const isImage = pf.file.type.startsWith('image/');
          const url = isImage
            ? await uploadImage(pf.file, currentUser.uid, otherUser.uid)
            : (await uploadFile(pf.file, currentUser.uid, otherUser.uid)).url;
          return { file: pf.file, url, isImage, error: null };
        } catch {
          return { file: pf.file, url: '', isImage: false, error: 'Upload failed' };
        }
      })
    );

    const successful = results.filter((r) => r.url && !r.error);
    if (successful.length) {
      const replyData = replyTo
        ? {
            messageId: replyTo.messageId,
            text: replyTo.text,
            fromId: replyTo.fromId,
            fromName: replyTo.fromName
          }
        : undefined;
      await sendMultipleFilesMessage(
        currentUser.uid,
        otherUser.uid,
        text,
        successful,
        replyData
      );
      setText('');
      setReplyTo(null);
      setPendingFiles((prev) => prev.filter((pf) => results.find((r) => r.file === pf.file && r.error)));
    }
  };

  const handleSend = async () => {
    const hasText = text.trim();
    const hasFiles = pendingFiles.filter((pf) => !pf.uploaded && !pf.uploading).length > 0;
    if ((!hasText && !hasFiles) || sending) return;

    setSending(true);
    try {
      if (hasFiles) {
        await sendAllPendingFiles();
      } else if (hasText) {
        const messageText = text;
        setText('');
        const replyData = replyTo
          ? {
              messageId: replyTo.messageId,
              text: replyTo.text,
              fromId: replyTo.fromId,
              fromName: replyTo.fromName
            }
          : undefined;
        setReplyTo(null);
        await sendMessage(currentUser.uid, otherUser.uid, messageText, replyData);
      }
    } catch (error) {
      console.error('Error sending:', error);
    } finally {
      setSending(false);
    }
  };

  const handleContextMenu = (e, message) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      messageId: message.id || '',
      messageText: message.text || '',
      chatId
    });
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length) {
      e.preventDefault();
      await addFiles(files);
    }
  };

  const bgStyle = chatBackground
    ? {
        background: chatBackground.type === 'gradient' ? chatBackground.value : undefined,
        backgroundColor: chatBackground.type === 'color' ? chatBackground.value : undefined,
        backgroundImage:
          chatBackground.type === 'image' ? `url(${chatBackground.value})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : undefined;

  const pendingCount = pendingFiles.filter((pf) => !pf.uploaded && !pf.uploading).length;

  return (
    <div
      className={styles.container}
      style={bgStyle}
      onPaste={handlePaste}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setIsDragOver(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length) await addFiles(files);
      }}
    >
      {isDragOver && <div className={styles.dropOverlay}>Drop files to send</div>}

      <ChatWindowHeader
        otherUser={otherUser}
        isMobile={isMobile}
        onBack={onBack}
        selectionMode={selectionMode}
        selectedCount={selectedMessages.size}
        messagesCount={messages.length}
        onSelectAll={() =>
          setSelectedMessages(new Set(messages.map((m) => m.id).filter(Boolean)))
        }
        onDeleteSelected={async () => {
          if (!selectedMessages.size) return;
          await deleteMessages(chatId, Array.from(selectedMessages));
          setSelectedMessages(new Set());
          setSelectionMode(false);
        }}
        onClearSelection={() => {
          setSelectedMessages(new Set());
          setSelectionMode(false);
        }}
        onToggleSelection={() => {
          setSelectionMode(!selectionMode);
          setSelectedMessages(new Set());
        }}
        onShowBackground={() => setShowBackgroundModal(true)}
      />

      <MessagesArea
        messages={messages}
        currentUser={currentUser}
        otherUser={otherUser}
        selectionMode={selectionMode}
        selectedMessages={selectedMessages}
        onContextMenu={handleContextMenu}
        onToggleSelect={(id) => {
          setSelectedMessages((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          });
        }}
        onImageClick={setSelectedImage}
        messagesEndRef={messagesEndRef}
        messagesContainerRef={messagesContainerRef}
        showScrollButton={showScrollButton}
        onScrollToBottom={() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
      />

      <MessageInput
        text={text}
        onTextChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        onSend={handleSend}
        sending={sending}
        replyTo={replyTo}
        otherUserEmail={otherUser.email}
        onCancelReply={() => setReplyTo(null)}
        pendingFiles={pendingFiles}
        pendingCount={pendingCount}
        fileInputRef={fileInputRef}
        generalInputRef={fileInputGeneralRef}
        uploading={uploading}
        onImageSelect={async (e) => {
          const file = e.target.files?.[0];
          if (!file?.type.startsWith('image/')) return;
          setUploading(true);
          try {
            const url = await uploadImage(file, currentUser.uid, otherUser.uid);
            await sendImageMessage(currentUser.uid, otherUser.uid, url);
            if (fileInputRef.current) fileInputRef.current.value = '';
          } finally {
            setUploading(false);
          }
        }}
        onFileSelect={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          try {
            const { url } = await uploadFile(file, currentUser.uid, otherUser.uid);
            await sendFileMessage(
              currentUser.uid,
              otherUser.uid,
              url,
              file.name,
              file.type || 'application/octet-stream',
              file.size
            );
            if (fileInputGeneralRef.current) fileInputGeneralRef.current.value = '';
          } finally {
            setUploading(false);
          }
        }}
        inputRef={inputRef}
      />

      {contextMenu && (
        <div className={styles.menu} style={{ top: contextMenu.y, left: contextMenu.x }}>
          <button
            type="button"
            className={styles.menuItem}
            onClick={async () => {
              await navigator.clipboard.writeText(contextMenu.messageText);
              setContextMenu(null);
            }}
          >
            Copy
          </button>
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => {
              const message = messages.find((m) => m.id === contextMenu.messageId);
              setReplyTo({
                messageId: contextMenu.messageId,
                text: contextMenu.messageText,
                fromId: message?.fromId || '',
                fromName: otherUser.name || otherUser.email
              });
              setContextMenu(null);
              inputRef.current?.focus();
            }}
          >
            Reply
          </button>
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => {
              setEditModal({ ...contextMenu });
              setEditText(contextMenu.messageText);
              setContextMenu(null);
              setTimeout(() => editInputRef.current?.focus(), 100);
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className={`${styles.menuItem} ${styles.menuDanger}`}
            onClick={async () => {
              await deleteMessage(contextMenu.chatId, contextMenu.messageId);
              setContextMenu(null);
            }}
          >
            Delete
          </button>
        </div>
      )}

      {editModal && (
        <div className={styles.overlay} onClick={() => setEditModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span>Edit message</span>
              <button type="button" onClick={() => setEditModal(null)} className={styles.modalClose}>
                Close
              </button>
            </div>
            <input
              ref={editInputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  editMessage(editModal.chatId, editModal.messageId, editText.trim()).then(() =>
                    setEditModal(null)
                  );
                }
                if (e.key === 'Escape') setEditModal(null);
              }}
              className={styles.editInput}
            />
          </div>
        </div>
      )}

      {showBackgroundModal && (
        <div className={styles.overlay} onClick={() => setShowBackgroundModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span>Background</span>
              <button
                type="button"
                onClick={() => setShowBackgroundModal(false)}
                className={styles.modalClose}
              >
                Close
              </button>
            </div>
            <div className={styles.colorGrid}>
              {[
                { name: 'White', value: '#ffffff' },
                { name: 'Light', value: '#f4f4f5' },
                { name: 'Gray', value: '#e4e4e7' }
              ].map((color) => (
                <button
                  key={color.name}
                  type="button"
                  className={styles.colorBtn}
                  style={{ background: color.value }}
                  onClick={() => {
                    saveChatBackground(chatId, { type: 'color', value: color.value });
                    setShowBackgroundModal(false);
                  }}
                >
                  {color.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <div className={styles.overlay} onClick={() => setSelectedImage(null)}>
          <div className={`${styles.modal} ${styles.imageModal}`} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setSelectedImage(null)} className={styles.modalClose}>
              Close
            </button>
            <img src={selectedImage} alt="Full size" />
          </div>
        </div>
      )}
    </div>
  );
}
