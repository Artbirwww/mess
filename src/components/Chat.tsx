import { useState, useEffect, useRef } from 'react';
import { sendMessage, listenMessages, Message, User } from '../firebase';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser || !otherUser) return;
    
    const unsubscribe = listenMessages(currentUser.uid, otherUser.uid, setMessages);
    
    return () => unsubscribe();
  }, [currentUser, otherUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    
    setSending(true);
    try {
      await sendMessage(currentUser.uid, otherUser.uid, text);
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

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div style={{ 
      border: '1px solid #00ff9d',
      background: '#0a0e1a',
      borderRadius: 0,
      height: isMobile ? 'calc(100vh - 180px)' : '70vh',
      display: 'flex', 
      flexDirection: 'column'
    }}>
      <div style={{ 
        background: '#1a1e2a',
        padding: isMobile ? '10px 12px' : '12px 20px',
        borderBottom: '1px solid #00ff9d',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#00ff9d', fontSize: isMobile ? '12px' : '14px' }}>
            {'> CHAT_WITH: '}{otherUser.name || otherUser.email}
          </div>
          <div style={{ fontSize: isMobile ? '9px' : '10px', color: '#888', marginTop: 4 }}>
            {otherUser.email} {'| STATUS: ONLINE'}
          </div>
        </div>
        {isMobile && onBack && (
          <button
            onClick={onBack}
            style={{
              background: 'transparent',
              color: '#00ff9d',
              border: '1px solid #00ff9d',
              borderRadius: 0,
              padding: '4px 8px',
              fontSize: '10px',
              fontFamily: 'JetBrains Mono, monospace',
              cursor: 'pointer'
            }}
          >
            {'[ BACK ]'}
          </button>
        )}
      </div>
      
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: isMobile ? '12px' : '20px',
        background: '#0a0e1a'
      }}>
        {messages.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#666', 
            padding: isMobile ? '20px' : '40px 20px',
            fontSize: isMobile ? '10px' : '12px',
            fontFamily: 'JetBrains Mono, monospace',
            whiteSpace: 'pre',
            overflowX: 'auto'
          }}>
            {`┌─────────────────────────────────────┐
│                                     │
│      > NO MESSAGES YET              │
│                                     │
│      Send a message to start        │
│      the conversation               │
│                                     │
└─────────────────────────────────────┘`}
          </div>
        ) : (
          messages.map((msg: Message, index: number) => {
            const isOwn = msg.fromId === currentUser.uid;
            return (
              <div 
                key={msg.id || index} 
                style={{ 
                  display: 'flex', 
                  justifyContent: isOwn ? 'flex-end' : 'flex-start',
                  marginBottom: isMobile ? '12px' : '20px'
                }}
              >
                <div style={{ 
                  maxWidth: isMobile ? '85%' : '70%',
                  background: isOwn ? '#1a3a2a' : '#1a1e2a',
                  border: `1px solid ${isOwn ? '#00ff9d' : '#2a2e3a'}`,
                  padding: isMobile ? '8px 12px' : '12px 16px',
                  position: 'relative'
                }}>
                  <div style={{ 
                    fontSize: isMobile ? '11px' : '12px', 
                    lineHeight: 1.4,
                    color: isOwn ? '#00ff9d' : '#cccccc',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word'
                  }}>
                    {msg.text}
                  </div>
                  <div style={{ 
                    fontSize: isMobile ? '8px' : '9px', 
                    marginTop: 6,
                    color: '#666',
                    textAlign: 'right'
                  }}>
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div style={{ 
        padding: isMobile ? '10px 12px' : '15px 20px', 
        borderTop: '1px solid #2a2e3a',
        background: '#0a0e1a',
        display: 'flex',
        gap: isMobile ? '8px' : '10px'
      }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#00ff9d',
            fontSize: isMobile ? '10px' : '12px',
            opacity: 0.5
          }}>
            {'>'}
          </span>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="type your message..."
            disabled={sending}
            style={{ 
              width: '100%', 
              padding: isMobile ? '10px 10px 10px 28px' : '12px 12px 12px 28px',
              background: '#0a0e1a',
              border: '1px solid #00ff9d',
              borderRadius: 0,
              fontSize: isMobile ? '11px' : '13px',
              fontFamily: 'JetBrains Mono, monospace',
              color: '#00ff9d'
            }}
          />
        </div>
        <button 
          onClick={handleSend}
          disabled={sending || !text.trim()}
          style={{
            padding: isMobile ? '10px 16px' : '12px 32px',
            background: sending || !text.trim() ? '#2a2e3a' : '#00ff9d',
            color: sending || !text.trim() ? '#666' : '#0a0e1a',
            border: 'none',
            borderRadius: 0,
            fontSize: isMobile ? '10px' : '12px',
            fontFamily: 'JetBrains Mono, monospace',
            cursor: (sending || !text.trim()) ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}
        >
          {sending ? '[ SENDING ]' : '[ SEND ]'}
        </button>
      </div>
    </div>
  );
}