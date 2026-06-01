import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ChatListHeader from '../../components/headers/ChatListHeader/ChatListHeader';
import ChatList from '../../components/lists/ChatList/ChatList';
import ChatWindow from '../../components/windows/ChatWindow/ChatWindow';
import styles from './Chat.module.css';

const MOBILE_BREAKPOINT = 768;

export default function ChatPage() {
  const { user, logout } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectUser = (selected) => {
    setSelectedUser(selected);
    if (isMobile) setShowSidebar(false);
  };

  const showChatPanel = isMobile ? selectedUser : true;

  return (
    <div className={styles.layout}>
      <ChatListHeader
        onSelectUser={handleSelectUser}
        onLogout={async () => {
          await logout();
          setSelectedUser(null);
          setShowSidebar(true);
        }}
        isMobile={isMobile}
        onShowSidebar={() => setShowSidebar(true)}
      />

      <main className={styles.main}>
        <aside
          className={`${styles.sidebar} ${isMobile && !showSidebar ? styles.sidebarHidden : ''}`}
        >
          <div className={styles.chats}>
            <ChatList currentUserId={user.uid} onSelectChat={handleSelectUser} />
          </div>
        </aside>

        <section className={styles.chatArea}>
          {showChatPanel ? (
            selectedUser ? (
              <ChatWindow
                otherUser={selectedUser}
                currentUser={user}
                isMobile={isMobile}
                onBack={() => {
                  setSelectedUser(null);
                  setShowSidebar(true);
                }}
              />
            ) : (
              <div className={styles.empty}>Select a conversation or search for someone</div>
            )
          ) : (
            <div className={styles.empty}>Select a conversation</div>
          )}
        </section>
      </main>
    </div>
  );
}
