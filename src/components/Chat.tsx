import { useState, useEffect, useRef } from 'react';
import {
  sendMessage,
  listenMessages,
  Message,
  User,
  updateChatInStorage,
  incrementUnreadInStorage,
  uploadImage,
  uploadFile,
  sendMultipleFilesMessage,
  getFileIcon,
  formatFileSize,
  deleteMessage,
  editMessage,
  deleteMessages,
  sendImageMessage,
  sendFileMessage,
  saveChatBackground,
  listenChatBackground,
  ChatBackground
} from '../firebase';
import './Chat.css';

interface ChatProps {
  otherUser: User;
  currentUser: User;
  isMobile?: boolean;
  onBack?: () => void;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  messageId: string;
  messageText: string;
  chatId: string;
}

interface EditModalState {
  visible: boolean;
  messageId: string;
  messageText: string;
  chatId: string;
}

interface ReplyState {
  messageId: string;
  text: string;
  fromId: string;
  fromName?: string;
  imageCount?: number;
  fileCount?: number;
  fileNames?: string[];
}

interface PendingFile {
  file: File;
  preview?: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}

export default function Chat({ otherUser, currentUser, isMobile = false, onBack }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editModal, setEditModal] = useState<EditModalState | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyState | null>(null);
  const [editText, setEditText] = useState('');
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [chatBackground, setChatBackground] = useState<ChatBackground | null>(null);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputGeneralRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef<number>(0);
  const chatId = [currentUser.uid, otherUser.uid].sort().join('_');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser || !otherUser) return;

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

    return () => unsubscribe();
  }, [currentUser, otherUser]);

  useEffect(() => {
    if (!currentUser || !otherUser) return;

    const unsubscribe = listenChatBackground(chatId, (background) => {
      setChatBackground(background);
    });

    return () => unsubscribe();
  }, [chatId, currentUser, otherUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Закрытие контекстного меню при клике
  useEffect(() => {
    const handleClick = () => {
      if (contextMenu) {
        setContextMenu(null);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  // Обработка вставки из буфера обмена
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
      e.preventDefault();
      e.stopPropagation();
      await addFiles(files);
    }
  };

  // Обработка перетаскивания
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await addFiles(files);
    }
  };

  // Добавление файлов в очередь
  const addFiles = async (files: File[]) => {
    const newPendingFiles: PendingFile[] = files.map(file => {
      const isImage = file.type.startsWith('image/');
      return {
        file,
        preview: isImage ? URL.createObjectURL(file) : undefined,
        uploading: false,
        uploaded: false
      };
    });

    setPendingFiles(prev => [...prev, ...newPendingFiles]);
  };

  // Загрузка всех файлов и отправка одним сообщением
  const sendAllPendingFiles = async () => {
    const filesToSend = pendingFiles.filter(pf => !pf.uploaded && !pf.uploading);
    if (filesToSend.length === 0) return;

    // Помечаем все как загружаемые
    const filePromises = filesToSend.map(async (pf) => {
      setPendingFiles(prev => prev.map(p => 
        p.file === pf.file ? { ...p, uploading: true } : p
      ));

      const isImage = pf.file.type.startsWith('image/');
      let url = '';

      try {
        if (isImage) {
          url = await uploadImage(pf.file, currentUser.uid, otherUser.uid);
        } else {
          const result = await uploadFile(pf.file, currentUser.uid, otherUser.uid);
          url = result.url;
        }

        return {
          file: pf.file,
          url,
          isImage,
          error: null
        };
      } catch (error) {
        console.error('Error uploading file:', error);
        return {
          file: pf.file,
          url: '',
          isImage,
          error: 'Ошибка загрузки'
        };
      }
    });

    const results = await Promise.all(filePromises);
    const successfulFiles = results.filter(r => r.url && !r.error);
    const failedFiles = results.filter(r => r.error);

    // Отправляем одним сообщением все успешные файлы
    if (successfulFiles.length > 0) {
      try {
        const replyData = replyTo ? {
          messageId: replyTo.messageId,
          text: replyTo.text,
          fromId: replyTo.fromId,
          fromName: replyTo.fromName
        } : undefined;

        await sendMultipleFilesMessage(
          currentUser.uid,
          otherUser.uid,
          text, // Текст сообщения (если есть)
          successfulFiles,
          replyData
        );

        // Очищаем текст и файлы
        setText('');
        setReplyTo(null);

        // Помечаем как отправленные
        setPendingFiles(prev => prev.filter(pf => {
          const failed = failedFiles.find(f => f.file === pf.file);
          return !!failed;
        }));

        // Очищаем успешные файлы через 2 секунды
        setTimeout(() => {
          successfulFiles.forEach(sf => {
            if (sf.file.type.startsWith('image/') && sf.url) {
              URL.revokeObjectURL(sf.url);
            }
          });
        }, 2000);
      } catch (error) {
        console.error('Error sending message:', error);
      }
    }

    // Помечаем неудачные
    failedFiles.forEach(ff => {
      setPendingFiles(prev => prev.map(p => 
        p.file === ff.file ? { ...p, uploading: false, error: ff.error || 'Ошибка' } : p
      ));
    });
  };

  // Удалить файл из очереди
  const removeFile = (file: File) => {
    setPendingFiles(prev => {
      const pf = prev.find(p => p.file === file);
      if (pf?.preview) {
        URL.revokeObjectURL(pf.preview);
      }
      return prev.filter(p => p.file !== file);
    });
  };

  const handleContextMenu = (e: React.MouseEvent, message: Message) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      messageId: message.id || '',
      messageText: message.text || '',
      chatId
    });
  };

  const handleCopyMessage = async () => {
    if (contextMenu?.messageText) {
      try {
        await navigator.clipboard.writeText(contextMenu.messageText);
      } catch (error) {
        console.error('Failed to copy:', error);
      }
      setContextMenu(null);
    }
  };

  const handleDeleteMessage = async () => {
    if (contextMenu?.messageId && contextMenu.chatId) {
      try {
        await deleteMessage(contextMenu.chatId, contextMenu.messageId);
      } catch (error) {
        console.error('Failed to delete:', error);
      }
      setContextMenu(null);
    }
  };

  const handleEditMessage = () => {
    if (contextMenu?.messageId) {
      setEditModal({
        visible: true,
        messageId: contextMenu.messageId,
        messageText: contextMenu.messageText,
        chatId: contextMenu.chatId
      });
      setEditText(contextMenu.messageText);
      setContextMenu(null);
      setTimeout(() => editInputRef.current?.focus(), 100);
    }
  };

  const handleSaveEdit = async () => {
    if (editModal?.messageId && editModal.chatId && editText.trim()) {
      try {
        await editMessage(editModal.chatId, editModal.messageId, editText.trim());
        setEditModal(null);
        setEditText('');
      } catch (error) {
        console.error('Failed to edit:', error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditModal(null);
    setEditText('');
  };

  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedMessages(new Set());
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const selectAllMessages = () => {
    const allIds = messages.map(m => m.id).filter((id): id is string => !!id);
    setSelectedMessages(new Set(allIds));
  };

  const clearSelection = () => {
    setSelectedMessages(new Set());
    setSelectionMode(false);
  };

  const handleDeleteSelectedMessages = async () => {
    if (selectedMessages.size === 0) return;

    try {
      await deleteMessages(chatId, Array.from(selectedMessages));
      setSelectedMessages(new Set());
      setSelectionMode(false);
    } catch (error) {
      console.error('Failed to delete selected messages:', error);
    }
  };

  const handleReplyMessage = () => {
    if (contextMenu) {
      const message = messages.find(m => m.id === contextMenu.messageId);
      const otherUserName = otherUser.name || otherUser.email;
      
      // Подсчитываем изображения и файлы
      const imageCount = message?.imageUrls?.length || (message?.imageUrl ? 1 : 0);
      const fileCount = message?.files?.length || 0;
      const fileNames = message?.files?.map(f => f.name) || [];
      
      setReplyTo({
        messageId: contextMenu.messageId,
        text: contextMenu.messageText,
        fromId: message?.fromId || '',
        fromName: otherUserName,
        imageCount,
        fileCount,
        fileNames
      });
      setContextMenu(null);
      inputRef.current?.focus();
    }
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const handleSend = async () => {
    const hasText = text.trim();
    const hasFiles = pendingFiles.filter(pf => !pf.uploaded && !pf.uploading).length > 0;
    
    if ((!hasText && !hasFiles) || sending) return;

    setSending(true);
    
    try {
      // Если есть и текст и файлы, или только файлы - отправляем одним сообщением
      if (hasFiles) {
        await sendAllPendingFiles();
      } else if (hasText) {
        // Только текст - отправляем как обычное сообщение
        const messageText = text;
        setText('');
        setReplyTo(null);

        const replyData = replyTo ? {
          messageId: replyTo.messageId,
          text: replyTo.text,
          fromId: replyTo.fromId,
          fromName: replyTo.fromName
        } : undefined;

        await sendMessage(
          currentUser.uid,
          otherUser.uid,
          messageText,
          replyData
        );
      }
    } catch (error) {
      console.error('Error sending:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    setUploading(true);
    try {
      const imageUrl = await uploadImage(file, currentUser.uid, otherUser.uid);
      await sendImageMessage(
        currentUser.uid,
        otherUser.uid,
        imageUrl
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { url: fileUrl } = await uploadFile(file, currentUser.uid, otherUser.uid);
      await sendFileMessage(
        currentUser.uid,
        otherUser.uid,
        fileUrl,
        file.name,
        file.type || 'application/octet-stream',
        file.size
      );
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
  };

  const handleBackgroundSelect = async (background: ChatBackground) => {
    try {
      await saveChatBackground(chatId, background);
      setChatBackground(background);
      setShowBackgroundModal(false);
    } catch (error) {
      console.error('Error saving background:', error);
    }
  };

  const handleBackgroundImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    try {
      const imageUrl = await uploadImage(file, currentUser.uid, otherUser.uid);
      await handleBackgroundSelect({ type: 'image', value: imageUrl });
      if (e.target) {
        e.target.value = '';
      }
    } catch (error) {
      console.error('Error uploading background image:', error);
    }
  };

  return (
    <div
      ref={chatContainerRef}
      className="chat-container"
      style={chatBackground ? {
        background: chatBackground.type === 'gradient' ? chatBackground.value : undefined,
        backgroundColor: chatBackground.type === 'color' ? chatBackground.value : undefined,
        backgroundImage: chatBackground.type === 'image' ? `url(${chatBackground.value})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      } : undefined}
      onPaste={handlePaste}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop Zone Overlay */}
      {isDragOver && (
        <div className="chat-drop-overlay">
          <div className="chat-drop-overlay-content">
            <span className="chat-drop-overlay-icon">📁</span>
            <span className="chat-drop-overlay-text">{'DROP FILES TO SEND'}</span>
          </div>
        </div>
      )}

      <div className="chat-header">
        <div className="chat-user-info">
          <div className="chat-user-name">
            {'> CHAT_WITH: '}{otherUser.name || otherUser.email}
          </div>
          <div className="chat-user-status">
            {otherUser.email} {' | STATUS: ONLINE'}
          </div>
        </div>
        <div className="chat-header-actions">
          {selectionMode ? (
            <>
              <span className="chat-selection-info">
                {`> SELECTED: ${selectedMessages.size}/${messages.length}`}
              </span>
              <button
                onClick={selectAllMessages}
                className="btn-terminal"
              >
                {'[ SELECT ALL ]'}
              </button>
              <button
                onClick={handleDeleteSelectedMessages}
                disabled={selectedMessages.size === 0}
                className="btn-terminal btn-terminal-danger"
              >
                {'[ DELETE ]'}
              </button>
              <button
                onClick={clearSelection}
                className="btn-terminal"
              >
                {'[ CANCEL ]'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowBackgroundModal(true)}
                className="btn-terminal"
                title="Change chat background"
              >
                {'[ BG ]'}
              </button>
              <button
                onClick={toggleSelectionMode}
                className="btn-terminal"
                title="Select multiple messages"
              >
                {'[ SELECT ]'}
              </button>
            </>
          )}
        </div>
        {isMobile && onBack && (
          <button
            onClick={onBack}
            className="btn-terminal"
          >
            {'[ BACK ]'}
          </button>
        )}
      </div>

      {/* Pending Files Bar */}
      {pendingFiles.length > 0 && (
        <div className="chat-pending-files-bar">
          <div className="chat-pending-files-list">
            {pendingFiles.map((pf, index) => (
              <div 
                key={index}
                className={`chat-pending-file ${pf.uploaded ? 'uploaded' : ''} ${pf.uploading ? 'uploading' : ''} ${pf.error ? 'error' : ''}`}
              >
                {pf.preview && (
                  <div className="chat-pending-file-preview">
                    <img src={pf.preview} alt={pf.file.name} />
                  </div>
                )}
                {!pf.preview && (
                  <div className="chat-pending-file-icon">📎</div>
                )}
                <div className="chat-pending-file-info">
                  <div className="chat-pending-file-name">{pf.file.name}</div>
                  {pf.uploading && (
                    <div className="chat-pending-file-status uploading">⏳ Uploading...</div>
                  )}
                  {pf.uploaded && (
                    <div className="chat-pending-file-status uploaded">✅ Sent</div>
                  )}
                  {pf.error && (
                    <div className="chat-pending-file-status error">{pf.error}</div>
                  )}
                </div>
                <button
                  onClick={() => removeFile(pf.file)}
                  className="chat-pending-file-remove"
                  disabled={pf.uploading || pf.uploaded}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <pre>
              {`┌─────────────────────────────────────┐
│                                     │
│      > NO MESSAGES YET              │
│                                     │
│      Send a message to start        │
│      the conversation               │
│                                     │
└─────────────────────────────────────┘`}
            </pre>
          </div>
        ) : (
          <>
            {messages.map((msg: Message, index: number) => {
              const isOwn = msg.fromId === currentUser.uid;
              const isSelected = selectedMessages.has(msg.id || '');
              const replyFromName = msg.replyTo?.fromId === currentUser.uid
                ? currentUser.email
                : (msg.replyTo?.fromName || otherUser.email);
              return (
                <div
                  key={msg.id || index}
                  className={`chat-message ${isOwn ? 'own' : ''} ${isSelected ? 'selected' : ''}`}
                  onContextMenu={(e) => !selectionMode && handleContextMenu(e, msg)}
                  onClick={() => selectionMode && msg.id && toggleMessageSelection(msg.id)}
                >
                  {selectionMode && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => msg.id && toggleMessageSelection(msg.id)}
                      className="chat-message-checkbox"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <div className="chat-message-bubble">
                    {msg.replyTo && (
                      <div className="chat-message-reply">
                        <span className="chat-message-reply-from">
                          {`> RE: ${replyFromName}`}
                        </span>
                        <span className="chat-message-reply-content">
                          {msg.replyTo.imageCount ? (
                            <span className="chat-message-reply-media">
                              {'📷 '}{msg.replyTo.imageCount} image{msg.replyTo.imageCount > 1 ? 's' : ''}
                            </span>
                          ) : null}
                          {msg.replyTo.fileCount ? (
                            <span className="chat-message-reply-media">
                              {'📎 '}{msg.replyTo.fileCount} file{msg.replyTo.fileCount > 1 ? 's' : ''}
                            </span>
                          ) : null}
                          {msg.replyTo.text && (
                            <span className="chat-message-reply-text">
                              {msg.replyTo.text.substring(0, 100)}{msg.replyTo.text.length > 100 ? '...' : ''}
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                    
                    {/* Несколько изображений */}
                    {msg.imageUrls && msg.imageUrls.length > 0 && (
                      <div className="chat-message-images">
                        {msg.imageUrls.map((url, idx) => (
                          <div key={idx} className="chat-message-image">
                            <img
                              src={url}
                              alt={`Shared image ${idx + 1}`}
                              onClick={() => handleImageClick(url)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Одно изображение (старый формат) */}
                    {msg.imageUrl && !msg.imageUrls && (
                      <div className="chat-message-image">
                        <img
                          src={msg.imageUrl}
                          alt="Shared image"
                          onClick={() => handleImageClick(msg.imageUrl!)}
                        />
                      </div>
                    )}
                    
                    {/* Несколько файлов */}
                    {msg.files && msg.files.length > 0 && (
                      <div className="chat-message-files">
                        {msg.files.map((file, idx) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="chat-file-link"
                          >
                            <span className="chat-file-icon">{getFileIcon(file.type, file.name)}</span>
                            <div className="chat-file-info">
                              <span className="chat-file-name">{file.name || 'File'}</span>
                              {file.size && (
                                <span className="chat-file-size">{formatFileSize(file.size)}</span>
                              )}
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                    
                    {/* Один файл (старый формат) */}
                    {msg.fileUrl && !msg.files && (
                      <div className="chat-message-file">
                        <a
                          href={msg.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="chat-file-link"
                        >
                          <span className="chat-file-icon">{getFileIcon(msg.fileType || '', msg.fileName)}</span>
                          <div className="chat-file-info">
                            <span className="chat-file-name">{msg.fileName || 'File'}</span>
                            {msg.fileSize && (
                              <span className="chat-file-size">{formatFileSize(msg.fileSize)}</span>
                            )}
                          </div>
                        </a>
                      </div>
                    )}
                    
                    {msg.text && (
                      <div className="chat-message-text">
                        {msg.text}
                        {msg.editedAt && (
                          <span className="chat-message-edited">{' (edited)'}</span>
                        )}
                      </div>
                    )}
                    <div className="chat-message-time">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="chat-input-area">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />
        <input
          ref={fileInputGeneralRef}
          type="file"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="file-input-general"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="chat-btn"
          title="Attach image"
        >
          {uploading ? '[ ... ]' : '[ IMG ]'}
        </button>
        <button
          onClick={() => fileInputGeneralRef.current?.click()}
          disabled={uploading}
          className="chat-btn"
          title="Attach file"
        >
          {uploading ? '[ ... ]' : '[ FILE ]'}
        </button>
        <div className="chat-input-wrapper">
          {replyTo && (
            <div className="chat-reply-preview">
              <div className="chat-reply-preview-content">
                <span className="chat-reply-preview-from">
                  {'> RE: '}{replyTo.fromName || otherUser.email}
                </span>
                {replyTo.imageCount ? (
                  <span className="chat-reply-preview-media">
                    {'📷 '}{replyTo.imageCount} image{replyTo.imageCount > 1 ? 's' : ''}
                  </span>
                ) : null}
                {replyTo.fileCount ? (
                  <span className="chat-reply-preview-media">
                    {'📎 '}{replyTo.fileCount} file{replyTo.fileCount > 1 ? 's' : ''}
                  </span>
                ) : null}
                {replyTo.text && (
                  <span className="chat-reply-preview-text">
                    {replyTo.text.substring(0, 50)}{replyTo.text.length > 50 ? '...' : ''}
                  </span>
                )}
              </div>
              <button onClick={handleCancelReply} className="chat-reply-cancel">
                {'×'}
              </button>
            </div>
          )}
          <span className="chat-input-prefix">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={pendingFiles.length > 0 ? `${pendingFiles.length} file(s) ready to send...` : "type your message... (Ctrl+V to paste files)"}
            autoFocus
            className="chat-input input-terminal"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={sending || (!text.trim() && pendingFiles.filter(pf => !pf.uploaded && !pf.uploading).length === 0)}
          className="chat-btn chat-btn-send"
        >
          {sending ? '[ SENDING ]' : pendingFiles.length > 0 ? `[ SEND ${pendingFiles.length} ]` : '[ SEND ]'}
        </button>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="image-modal" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="image-modal-close" onClick={closeImageModal}>
              {'[ CLOSE ]'}
            </button>
            <img src={selectedImage} alt="Full size" />
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="chat-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button onClick={handleCopyMessage} className="chat-context-menu-item">
            {'[ COPY ]'}
          </button>
          <button onClick={handleReplyMessage} className="chat-context-menu-item">
            {'[ REPLY ]'}
          </button>
          <button onClick={handleEditMessage} className="chat-context-menu-item">
            {'[ EDIT ]'}
          </button>
          <button onClick={handleDeleteMessage} className="chat-context-menu-item chat-context-menu-danger">
            {'[ DELETE ]'}
          </button>
        </div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <div className="edit-modal" onClick={handleCancelEdit}>
          <div className="edit-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="edit-modal-header">
              <span>{'> EDIT_MESSAGE:'}</span>
              <button onClick={handleCancelEdit} className="edit-modal-close">
                {'[ CLOSE ]'}
            </button>
            </div>
            <div className="edit-modal-body">
              <div className="edit-input-wrapper">
                <span className="edit-input-prefix">{'>'}</span>
                <input
                  ref={editInputRef}
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyPress={handleEditKeyPress}
                  placeholder="edit your message..."
                  className="edit-input input-terminal"
                />
              </div>
            </div>
            <div className="edit-modal-footer">
              <button onClick={handleCancelEdit} className="btn-terminal">
                {'[ CANCEL ]'}
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editText.trim()}
                className="btn-terminal btn-terminal-primary"
              >
                {'[ SAVE ]'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background Modal */}
      {showBackgroundModal && (
        <div className="bg-modal" onClick={() => setShowBackgroundModal(false)}>
          <div className="bg-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="bg-modal-header">
              <span>{'> CHAT_BACKGROUND:'}</span>
              <button onClick={() => setShowBackgroundModal(false)} className="bg-modal-close">
                {'[ CLOSE ]'}
              </button>
            </div>
            <div className="bg-modal-body">
              {/* Colors */}
              <div className="bg-section">
                <div className="bg-section-title">{'> COLORS:'}</div>
                <div className="bg-colors-grid">
                  {[
                    { name: 'Default', value: 'var(--bg-primary)' },
                    { name: 'Dark', value: '#1a1a2e' },
                    { name: 'Blue', value: '#1e3a5f' },
                    { name: 'Green', value: '#1a3d2e' },
                    { name: 'Purple', value: '#2d1a4f' },
                    { name: 'Gray', value: '#2a2a2a' }
                  ].map((color) => (
                    <button
                      key={color.name}
                      className={`bg-color-option ${chatBackground?.type === 'color' && chatBackground?.value === color.value ? 'selected' : ''}`}
                      style={{ background: color.value }}
                      onClick={() => handleBackgroundSelect({ type: 'color', value: color.value })}
                    >
                      {color.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gradients */}
              <div className="bg-section">
                <div className="bg-section-title">{'> GRADIENTS:'}</div>
                <div className="bg-gradients-grid">
                  {[
                    { name: 'Sunset', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
                    { name: 'Ocean', value: 'linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%)' },
                    { name: 'Forest', value: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
                    { name: 'Fire', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
                    { name: 'Night', value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
                    { name: 'Gold', value: 'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)' }
                  ].map((gradient) => (
                    <button
                      key={gradient.name}
                      className={`bg-gradient-option ${chatBackground?.type === 'gradient' && chatBackground?.value === gradient.value ? 'selected' : ''}`}
                      style={{ background: gradient.value }}
                      onClick={() => handleBackgroundSelect({ type: 'gradient', value: gradient.value })}
                    >
                      {gradient.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Image */}
              <div className="bg-section">
                <div className="bg-section-title">{'> CUSTOM_IMAGE:'}</div>
                <div className="bg-image-upload">
                  <input
                    type="file"
                    id="bg-image-input"
                    accept="image/*"
                    onChange={handleBackgroundImageUpload}
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="bg-image-input" className="bg-upload-btn">
                    {'[ UPLOAD_IMAGE ]'}
                  </label>
                  {chatBackground?.type === 'image' && (
                    <button
                      className="bg-remove-btn"
                      onClick={() => handleBackgroundSelect({ type: 'color', value: 'var(--bg-primary)' })}
                    >
                      {'[ REMOVE ]'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
        <div className="image-modal" onClick={closeImageModal}>
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button onClick={closeImageModal} className="image-modal-close">
              {'[ CLOSE ]'}
            </button>
            <img src={selectedImage} alt="Full size" />
          </div>
        </div>
      )}
    </div>
  );
}
