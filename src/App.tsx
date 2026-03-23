import { useState, useEffect } from 'react';
import { auth, checkUserExists, createUserProfile, getAllUsers, User } from './firebase';
import Auth from './components/Auth';
import SearchInput from './components/SearchInput';
import ActiveChatsList from './components/ActiveChatsList';
import Chat from './components/Chat';
import Notifications from './components/Notifications';
import './App.css';

interface SelectedUser {
  uid: string;
  email: string;
  name?: string;
}

// Breakpoints
const MOBILE_BREAKPOINT = 768;

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [showSidebar, setShowSidebar] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const userData = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || undefined
        };
        setUser(userData);

        const exists = await checkUserExists(firebaseUser.uid);
        if (!exists) {
          const displayName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
          await createUserProfile(firebaseUser.uid, firebaseUser.email || '', displayName);
        }
      } else {
        setUser(null);
        setSelectedUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    setSelectedUser(null);
    setShowSidebar(true);
  };

  const handleSelectUser = (selectedUser: SelectedUser) => {
    setSelectedUser(selectedUser);
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const handleNotificationClick = async (selectedUser: User) => {
    setSelectedUser({
      uid: selectedUser.uid,
      email: selectedUser.email,
      name: selectedUser.name
    });
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  useEffect(() => {
    if (user) {
      getAllUsers().then(users => {
        console.log(`[SYSTEM] Total users in database: ${users.length}`);
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-text">
          {'> LOADING SYSTEM...'}
          <span className="cursor-blink">_</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuth={() => setUser(auth.currentUser as User)} />;
  }

  const showChatPanel = isMobile ? selectedUser : true;

  return (
    <div className="messenger-container">
      {/* Terminal Header */}
      <header className="messenger-header">
        <div className="messenger-header-content">
          <div className="user-info">
            <span>{'user@messenger:~$'}</span>
            <span className="email">{user.email}</span>
          </div>
          <SearchInput
            onSelectUser={handleSelectUser}
            currentUserId={user.uid}
          />
          <div className="header-actions">
            {isMobile && (
              <button
                onClick={() => setShowSidebar(true)}
                className="btn-terminal"
              >
                {'[ MENU ]'}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="btn-terminal btn-terminal-danger"
            >
              {'[ LOGOUT ]'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="messenger-main">
        {/* Sidebar - Chats List */}
        <aside className={`sidebar ${isMobile && !showSidebar ? 'hide-mobile' : ''}`}>
          <div className="sidebar-chats">
            <ActiveChatsList
              currentUserId={user.uid}
              onSelectChat={handleSelectUser}
            />
          </div>
        </aside>

        {/* Chat Area */}
        <section className="chat-area">
          {showChatPanel ? (
            selectedUser ? (
              <Chat
                otherUser={selectedUser}
                currentUser={user}
                isMobile={isMobile}
                onBack={() => {
                  setSelectedUser(null);
                  setShowSidebar(true);
                }}
              />
            ) : (
              <div className="empty-state">
                <pre>
                  {`┌─────────────────────────────────────────┐
│                                         │
│    > SELECT A USER TO START CHATTING    │
│                                         │
│    Use the search or active chats       │
│    in the sidebar to select a user      │
│                                         │
└─────────────────────────────────────────┘`}
                </pre>
              </div>
            )
          ) : (
            <div className="empty-state">
              <pre>
                {`┌─────────────────────────────────────────┐
│                                         │
│    > SELECT A USER TO START CHATTING    │
│                                         │
└─────────────────────────────────────────┘`}
              </pre>
            </div>
          )}
        </section>
      </main>

      {/* Notifications */}
      <Notifications
        currentUserId={user.uid}
        onNotificationClick={handleNotificationClick}
      />
    </div>
  );
}

export default App;
