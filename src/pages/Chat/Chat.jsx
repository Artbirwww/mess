import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUnreadCount, resetUnreadInStorage } from '../../services/chatService';
import ChatListHeader from '../../components/headers/ChatListHeader/ChatListHeader';
import ChatList from '../../components/lists/ChatList/ChatList';
import ChatWindow from '../../components/windows/ChatWindow/ChatWindow';
import Sidebar from '../../components/sidebar/Sidebar';
import styles from './Chat.module.css';

const MOBILE_BREAKPOINT = 768;

export default function ChatPage() {
  const { user, logout } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showChatSidebar, setShowChatSidebar] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectUser = (selected) => {
    const initialUnreadCount =
      selected.initialUnreadCount ?? getUnreadCount(user.uid, selected.uid);
    resetUnreadInStorage(user.uid, selected.uid);
    setSelectedUser({
      uid: selected.uid,
      email: selected.email,
      firstName: selected.firstName || '',
      lastName: selected.lastName || '',
      name: selected.name,
      photoURL: selected.photoURL || '',
      initialUnreadCount
    });
    if (isMobile) setShowChatSidebar(false);
  };

  const showChatPanel = isMobile ? selectedUser : true;

  return (
    <div className={styles.layout}>
      {/* <button 
        className={styles.menuButton}
        onClick={() => setShowSidebar(true)}
      >
        Меню
      </button> */}
      
      {/* <Sidebar isOpen={showSidebar} onClose={() => setShowSidebar(false)} /> */}
      
      <ChatListHeader
        onSelectUser={handleSelectUser}
        onLogout={async () => {
          await logout();
          setSelectedUser(null);
          setShowChatSidebar(true);
        }}
        isMobile={isMobile}
        onShowSidebar={() => setShowChatSidebar(true)}
      />

      <main className={styles.main}>
        <aside
          className={`${styles.sidebar} ${isMobile && !showChatSidebar ? styles.sidebarHidden : ''}`}
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
                initialUnreadCount={selectedUser.initialUnreadCount ?? 0}
                isMobile={isMobile}
                onBack={() => {
                  setSelectedUser(null);
                  setShowChatSidebar(true);
                }}
              />
            ) : (
              <div className={styles.empty}>Выберите диалог или найдите пользователя</div>
            )
          ) : (
            <div className={styles.empty}>Выберите диалог</div>
          )}
        </section>
      </main>
    </div>
  );
}