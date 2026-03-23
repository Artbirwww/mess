import { useState, useEffect, useRef } from 'react';
import {
  sendMessage,
  listenMessages,
  Message,
  User,
  updateChatInStorage,
  incrementUnreadInStorage,
  uploadImage,
  sendImageMessage,
  uploadFile,
  sendFileMessage,
  getFileIcon,
  formatFileSize,
  deleteMessage,
  editMessage,
  deleteMessages
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputGeneralRef = useRef<HTMLInputElement>(null);
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
      // Фокус на инпут после открытия модального окна
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
      const otherUserName = otherUser.name || otherUser.email;
      setReplyTo({
        messageId: contextMenu.messageId,
        text: contextMenu.messageText,
        fromId: contextMenu.messageId ? messages.find(m => m.id === contextMenu.messageId)?.fromId || '' : '',
        fromName: otherUserName
      });
      setContextMenu(null);
      inputRef.current?.focus();
    }
  };

  const handleCancelReply = () => {
    setReplyTo(null);
  };

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    const messageText = text;
    setText('');
    setReplyTo(null);

    setSending(true);
    try {
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
    } catch (error) {
      console.error('Error sending message:', error);
      setText(messageText);
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
      const { url: fileUrl, resourceType } = await uploadFile(file, currentUser.uid, otherUser.uid);
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

  return (
    <div className="chat-container">
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
            <button
              onClick={toggleSelectionMode}
              className="btn-terminal"
              title="Select multiple messages"
            >
              {'[ SELECT ]'}
            </button>
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
                    {msg.replyTo && msg.replyTo.text && (
                      <div className="chat-message-reply">
                        <span className="chat-message-reply-from">
                          {`> RE: ${replyFromName}`}
                        </span>
                        <span className="chat-message-reply-text">
                          {msg.replyTo.text.substring(0, 100)}{msg.replyTo.text.length > 100 ? '...' : ''}
                        </span>
                      </div>
                    )}
                    {msg.imageUrl && (
                      <div className="chat-message-image">
                        <img
                          src={msg.imageUrl}
                          alt="Shared image"
                          onClick={() => handleImageClick(msg.imageUrl!)}
                        />
                      </div>
                    )}
                    {msg.fileUrl && (
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
              <span className="chat-reply-preview-text">
                {'> RE: '}{replyTo.text.substring(0, 50)}{replyTo.text.length > 50 ? '...' : ''}
              </span>
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
            placeholder="type your message..."
            autoFocus
            className="chat-input input-terminal"
          />
        </div>
        <button
          onClick={handleSend}
          disabled={sending || !text.trim()}
          className="chat-btn chat-btn-send"
        >
          {sending ? '[ SENDING ]' : '[ SEND ]'}
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
    </div>
  );
}
