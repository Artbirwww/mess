import { useState, useEffect, useRef, useMemo } from 'react';
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
import { formatUserName } from '../../../services/userService';
import ChatWindowHeader from '../../headers/ChatWindowHeader/ChatWindowHeader';
import MessagesArea from '../MessagesArea/MessagesArea';
import MessageInput from '../../inputs/MessageInput/MessageInput';
import Message from '../../Message/Message';
import UserProfile from '../../UserProfile/UserProfile';
import styles from './ChatWindow.module.css';

function getFirstUnreadIndex(messages, currentUserId, unreadCount) {
  if (unreadCount <= 0) return -1;
  let incomingFromEnd = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].fromId !== currentUserId) {
      incomingFromEnd += 1;
      if (incomingFromEnd === unreadCount) return i;
    }
  }
  return -1;
}

function scrollChatToBottom(container, endRef) {
  endRef?.current?.scrollIntoView({ block: 'end' });
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function isNearBottom(container, threshold = 80) {
  if (!container) return true;
  return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
}

export default function ChatWindow({
  otherUser,
  currentUser,
  initialUnreadCount = 0,
  isMobile = false,
  onBack
}) {
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatchIndex, setSearchMatchIndex] = useState(0);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileInputGeneralRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const initialScrollDoneRef = useRef(false);
  const entryUnreadRef = useRef(initialUnreadCount);
  const lastSeenMessageCountRef = useRef(0);
  const editInputRef = useRef(null);
  const chatId = [currentUser.uid, otherUser.uid].sort().join('_');

  useEffect(() => {
    setMessages([]);
    const unsubscribe = listenMessages(currentUser.uid, otherUser.uid, (newMessages) => {
      if (newMessages.length > prevMessageCountRef.current) {
        const lastMessage = newMessages[newMessages.length - 1];
        const isFromMe = lastMessage.fromId === currentUser.uid;
        updateChatInStorage(
          currentUser.uid,
          otherUser.uid,
          lastMessage.text,
          isFromMe,
          otherUser
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
    entryUnreadRef.current = initialUnreadCount;
    initialScrollDoneRef.current = false;
    prevMessageCountRef.current = 0;
    lastSeenMessageCountRef.current = 0;
    setSearchOpen(false);
    setSearchQuery('');
    setSearchMatchIndex(0);
  }, [otherUser.uid, initialUnreadCount]);

  const searchMatchIndices = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];
    return messages.reduce((indices, msg, index) => {
      if (msg.text?.toLowerCase().includes(query)) indices.push(index);
      return indices;
    }, []);
  }, [messages, searchQuery]);

  const activeSearchMatchIndex =
    searchMatchIndices.length > 0
      ? searchMatchIndices[Math.min(searchMatchIndex, searchMatchIndices.length - 1)]
      : -1;

  useEffect(() => {
    if (activeSearchMatchIndex < 0) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    const node = container.querySelector(`[data-message-index="${activeSearchMatchIndex}"]`);
    node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [activeSearchMatchIndex, searchQuery]);

  useEffect(() => {
    setSearchMatchIndex(0);
  }, [searchQuery, otherUser.uid]);

  const firstUnreadIndex = useMemo(
    () => getFirstUnreadIndex(messages, currentUser.uid, entryUnreadRef.current),
    [messages, currentUser.uid]
  );

  useEffect(() => {
    if (searchOpen || messages.length === 0) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    let cancelled = false;
    let resizeObserver;

    const applyScroll = () => {
      if (cancelled || searchOpen) return;
      scrollChatToBottom(container, messagesEndRef);
      setShowScrollButton(false);
    };

    applyScroll();
    const raf1 = requestAnimationFrame(applyScroll);
    const raf2 = requestAnimationFrame(() => requestAnimationFrame(applyScroll));

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(applyScroll);
      resizeObserver.observe(container);
    }

    const timer = setTimeout(() => {
      applyScroll();
      initialScrollDoneRef.current = true;
      lastSeenMessageCountRef.current = messages.length;
      resizeObserver?.disconnect();
    }, 200);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timer);
      resizeObserver?.disconnect();
    };
  }, [otherUser.uid, messages.length, searchOpen]);

  useEffect(() => {
    if (searchOpen || !initialScrollDoneRef.current || messages.length === 0) return;

    const container = messagesContainerRef.current;
    const prevLen = lastSeenMessageCountRef.current;
    const currentLen = messages.length;
    lastSeenMessageCountRef.current = currentLen;

    if (currentLen <= prevLen) return;

    const lastMessage = messages[currentLen - 1];
    const shouldScroll =
      lastMessage.fromId === currentUser.uid || isNearBottom(container);

    if (shouldScroll) {
      requestAnimationFrame(() => {
        scrollChatToBottom(container, messagesEndRef);
        setShowScrollButton(false);
      });
    }
  }, [messages, searchOpen, currentUser.uid]);

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

  const scrollToMessage = (messageId) => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const messageElement = container.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageElement.style.backgroundColor = 'var(--highlight-bg)';
      setTimeout(() => {
        messageElement.style.backgroundColor = '';
      }, 2000);
    }
  };

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

  const handleReply = (message) => {
    setReplyTo({
      messageId: message.id,
      text: message.text,
      fromId: message.fromId,
      fromName: formatUserName(otherUser)
    });
    inputRef.current?.focus();
  };

  const handleEdit = (message) => {
    setEditModal({
      messageId: message.id,
      messageText: message.text,
      chatId
    });
    setEditText(message.text || '');
    setTimeout(() => editInputRef.current?.focus(), 100);
  };

  const handleDelete = async (message) => {
    await deleteMessage(chatId, message.id);
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

  const handleBackgroundImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите изображение');
      return;
    }
    
    setUploadingBackground(true);
    
    try {
      const imageUrl = await uploadImage(file, currentUser.uid, otherUser.uid);
      await saveChatBackground(chatId, { type: 'image', value: imageUrl });
      setShowBackgroundModal(false);
    } catch (error) {
      console.error('Error uploading background:', error);
      alert('Не удалось загрузить изображение');
    } finally {
      setUploadingBackground(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleRemoveBackground = async () => {
    await saveChatBackground(chatId, null);
    setShowBackgroundModal(false);
  };

  const bgStyle = chatBackground
    ? {
        background: chatBackground.type === 'gradient' ? chatBackground.value : undefined,
        backgroundColor: chatBackground.type === 'color' ? chatBackground.value : undefined,
        backgroundImage: chatBackground.type === 'image' ? `url(${chatBackground.value})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }
    : undefined;

  const pendingCount = pendingFiles.filter((pf) => !pf.uploaded && !pf.uploading).length;

  const renderMessages = () => {
    return messages.map((msg, index) => {
      const isOwn = msg.fromId === currentUser.uid;
      const isSelected = selectedMessages.has(msg.id || '');
      const isSearchMatch = searchMatchIndices.includes(index);
      const highlightQuery = (searchOpen && isSearchMatch) ? searchQuery.trim().toLowerCase() : '';
      
      return (
        <div
          key={msg.id || index}
          data-message-index={index}
          data-message-id={msg.id}
        >
          {index === firstUnreadIndex && (
            <div className={styles.unreadDivider}>Непрочитанные сообщения</div>
          )}
          <Message
            msg={msg}
            messageId={msg.id}
            isOwn={isOwn}
            currentUserId={currentUser.uid}
            otherUserEmail={otherUser.email}
            selectionMode={selectionMode}
            isSelected={isSelected}
            onToggleSelect={(id) => {
              setSelectedMessages((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            onContextMenu={handleContextMenu}
            onImageClick={setSelectedImage}
            onReply={handleReply}
            onEdit={handleEdit}
            onDelete={handleDelete}
            highlightQuery={highlightQuery}
          />
        </div>
      );
    });
  };

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
      {isDragOver && <div className={styles.dropOverlay}>Перетащите файлы для отправки</div>}

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
        searchOpen={searchOpen}
        searchQuery={searchQuery}
        searchMatchCount={searchMatchIndices.length}
        searchMatchIndex={
          searchMatchIndices.length
            ? Math.min(searchMatchIndex, searchMatchIndices.length - 1)
            : 0
        }
        onToggleSearch={() => {
          setSearchOpen((open) => {
            if (open) {
              setSearchQuery('');
              setSearchMatchIndex(0);
            }
            return !open;
          });
        }}
        onSearchQueryChange={setSearchQuery}
        onSearchPrev={() => {
          if (!searchMatchIndices.length) return;
          setSearchMatchIndex(
            (prev) => (prev - 1 + searchMatchIndices.length) % searchMatchIndices.length
          );
        }}
        onSearchNext={() => {
          if (!searchMatchIndices.length) return;
          setSearchMatchIndex((prev) => (prev + 1) % searchMatchIndices.length);
        }}
        onAvatarClick={() => setShowUserProfile(true)}
      />

      <div className={styles.area} ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className={styles.empty}>Нет сообщений</div>
        ) : searchOpen && searchQuery.trim() && searchMatchIndices.length === 0 ? (
          <div className={styles.empty}>Сообщения не найдены</div>
        ) : (
          <div className={styles.messages}>
            {renderMessages()}
            <div ref={messagesEndRef} className={styles.messagesEnd} />
          </div>
        )}
        {showScrollButton && (
          <button
            type="button"
            onClick={() => {
              scrollChatToBottom(messagesContainerRef.current, messagesEndRef);
              setShowScrollButton(false);
            }}
            className={styles.scrollButton}
            title="Прокрутить вниз"
          >
            ↓
          </button>
        )}
      </div>

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
            Копировать
          </button>
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => {
              const message = messages.find((m) => m.id === contextMenu.messageId);
              handleReply(message);
              setContextMenu(null);
            }}
          >
            Ответить
          </button>
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => {
              const message = messages.find((m) => m.id === contextMenu.messageId);
              handleEdit(message);
              setContextMenu(null);
            }}
          >
            Редактировать
          </button>
          <button
            type="button"
            className={`${styles.menuItem} ${styles.menuDanger}`}
            onClick={async () => {
              const message = messages.find((m) => m.id === contextMenu.messageId);
              await handleDelete(message);
              setContextMenu(null);
            }}
          >
            Удалить
          </button>
        </div>
      )}

      {editModal && (
        <div className={styles.overlay} onClick={() => setEditModal(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span>Редактировать сообщение</span>
              <button type="button" onClick={() => setEditModal(null)} className={styles.modalClose}>
                Закрыть
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
              <span>Фон чата</span>
              <button
                type="button"
                onClick={() => setShowBackgroundModal(false)}
                className={styles.modalClose}
              >
                Закрыть
              </button>
            </div>
            
            <div className={styles.backgroundSection}>
              <div className={styles.backgroundSubtitle}>Цвета</div>
              <div className={styles.colorGrid}>
                {[
                  { name: 'Белый', value: '#ffffff' },
                  { name: 'Светло-серый', value: '#f4f4f5' },
                  { name: 'Серый', value: '#e4e4e7' },
                  { name: 'Тёмно-серый', value: '#3f3f46' },
                  { name: 'Чёрный', value: '#1a1a1a' },
                  { name: 'Синий', value: '#e0f2fe' },
                  { name: 'Мятный', value: '#ccfbf1' },
                  { name: 'Персиковый', value: '#ffedd5' }
                ].map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    className={styles.colorBtn}
                    style={{ background: color.value }}
                    title={color.name}
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

            <div className={styles.backgroundSection}>
              <div className={styles.backgroundSubtitle}>Градиенты</div>
              <div className={styles.gradientGrid}>
                {[
                  { name: 'Закат', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
                  { name: 'Океан', value: 'linear-gradient(135deg, #2b5876 0%, #4e4376 100%)' },
                  { name: 'Лес', value: 'linear-gradient(135deg, #134e5e 0%, #71b280 100%)' },
                  { name: 'Восход', value: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
                  { name: 'Ночь', value: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)' }
                ].map((gradient) => (
                  <button
                    key={gradient.name}
                    type="button"
                    className={styles.gradientBtn}
                    style={{ background: gradient.value }}
                    onClick={() => {
                      saveChatBackground(chatId, { type: 'gradient', value: gradient.value });
                      setShowBackgroundModal(false);
                    }}
                  >
                    {gradient.name}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.backgroundSection}>
              <div className={styles.backgroundSubtitle}>Своё изображение</div>
              <div className={styles.imageUploadArea}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundImageUpload}
                  className={styles.fileInput}
                  id="background-upload"
                  disabled={uploadingBackground}
                />
                <label htmlFor="background-upload" className={styles.uploadBackgroundLabel}>
                  {uploadingBackground ? 'Загрузка...' : 'Выбрать фото'}
                </label>
                {chatBackground?.type === 'image' && (
                  <button
                    type="button"
                    onClick={handleRemoveBackground}
                    className={styles.removeBackgroundBtn}
                  >
                    Удалить фон
                  </button>
                )}
                <p className={styles.uploadHint}>
                  Поддерживаются JPG, PNG, GIF. Максимальный размер - 10 МБ
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedImage && (
        <div className={styles.overlay} onClick={() => setSelectedImage(null)}>
          <div className={`${styles.modal} ${styles.imageModal}`} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setSelectedImage(null)} className={styles.modalClose}>
              Закрыть
            </button>
            <img src={selectedImage} alt="Полный размер" />
          </div>
        </div>
      )}

      {showUserProfile && (
        <UserProfile
          user={otherUser}
          chatId={chatId}
          currentUserId={currentUser.uid}
          onClose={() => setShowUserProfile(false)}
          onScrollToMessage={scrollToMessage}
        />
      )}
    </div>
  );
}