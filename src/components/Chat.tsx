import { useState, useEffect, useRef } from 'react';
import {
  sendMessage,
  listenMessages,
  Message,
  User,
  updateChatInStorage,
  incrementUnreadInStorage,
  uploadImage,
  sendImageMessage
} from '../firebase';
import './Chat.css';

interface ChatProps {
  otherUser: User;
  currentUser: User;
  isMobile?: boolean;
  onBack?: () => void;
}

export default function Chat({ otherUser, currentUser, isMobile = false, onBack }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMessageCountRef = useRef<number>(0);

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

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      await sendMessage(
        currentUser.uid,
        otherUser.uid,
        text
      );
      setText('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
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
          messages.map((msg: Message, index: number) => {
            const isOwn = msg.fromId === currentUser.uid;
            return (
              <div
                key={msg.id || index}
                className={`chat-message ${isOwn ? 'own' : ''}`}
              >
                <div className="chat-message-bubble">
                  {msg.imageUrl && (
                    <div className="chat-message-image">
                      <img
                        src={msg.imageUrl}
                        alt="Shared image"
                        onClick={() => handleImageClick(msg.imageUrl!)}
                      />
                    </div>
                  )}
                  {msg.text && (
                    <div className="chat-message-text">
                      {msg.text}
                    </div>
                  )}
                  <div className="chat-message-time">
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="chat-btn"
          title="Attach image"
        >
          {uploading ? '[ ... ]' : '[ IMG ]'}
        </button>
        <div className="chat-input-wrapper">
          <span className="chat-input-prefix">{'>'}</span>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="type your message..."
            disabled={sending}
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
    </div>
  );
}
