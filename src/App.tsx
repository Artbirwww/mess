import { useState, useEffect } from 'react';
import { auth, checkUserExists, createUserProfile, getAllUsers, User } from './firebase';
import Auth from './components/Auth';
import Search from './components/Search';
import Chat from './components/Chat';
import ActiveChatsList from './components/ActiveChatsList';
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
  const [showSearch, setShowSearch] = useState(true);
  const [showChatsList, setShowChatsList] = useState(false);

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
    setShowSearch(true);
  };

  const handleSelectUser = (selectedUser: SelectedUser) => {
    setSelectedUser(selectedUser);
    if (isMobile) {
      setShowSearch(false);
      setShowChatsList(false);
    }
  };

  const handleNotificationClick = async (selectedUser: User) => {
    setSelectedUser({
      uid: selectedUser.uid,
      email: selectedUser.email,
      name: selectedUser.name
    });
    if (isMobile) {
      setShowSearch(false);
      setShowChatsList(false);
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

  const showLeftPanel = isMobile ? showSearch : true;
  const showChatPanel = isMobile ? (!showSearch && !showChatsList) : true;

  return (
    <div className="messenger-container">
      {/* Terminal Header */}
      <header className="messenger-header">
        <div className="messenger-header-content">
          <div className="user-info">
            <span>{'user@messenger:~$'}</span>
            <span className="email">{user.email}</span>
          </div>
          <div className="header-actions">
            {isMobile && (
              <button
                onClick={() => {
                  setShowChatsList(!showChatsList);
                  setShowSearch(false);
                }}
                className={`btn-terminal ${showChatsList ? 'btn-terminal-primary' : ''}`}
              >
                {'[ CHATS ]'}
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

      {/* Mobile Navigation */}
      {isMobile && selectedUser && (
        <nav className="mobile-nav">
          {!showChatsList && (
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="btn-terminal mobile-nav-btn"
            >
              {showSearch ? '[ BACK TO CHAT ]' : '[ SHOW USERS ]'}
            </button>
          )}
          {showChatsList && (
            <button
              onClick={() => setShowChatsList(false)}
              className="btn-terminal mobile-nav-btn"
            >
              {'[ BACK TO CHAT ]'}
            </button>
          )}
        </nav>
      )}

      {/* Main Content */}
      <main className="messenger-main">
        {/* Left Panel - Search */}
        {showLeftPanel && !showChatsList && (
          <div className="panel panel-search">
            <Search
              onSelectUser={handleSelectUser}
              currentUserId={user.uid}
            />
          </div>
        )}

        {/* Chats List */}
        {(!isMobile || (isMobile && showChatsList)) && (
          <div className="panel panel-chats">
            <ActiveChatsList
              currentUserId={user.uid}
              onSelectChat={handleSelectUser}
            />
          </div>
        )}

        {/* Chat Panel */}
        {showChatPanel && (
          <div className="panel panel-chat">
            {selectedUser ? (
              <Chat
                otherUser={selectedUser}
                currentUser={user}
                isMobile={isMobile}
                onBack={() => setShowSearch(true)}
              />
            ) : (
              <div className="empty-state">
                <pre>
                  {`┌─────────────────────────────────────────┐
│                                         │
│    > SELECT A USER TO START CHATTING    │
│                                         │
│    Use the search panel or active       │
│    chats list to select a user          │
│                                         │
└─────────────────────────────────────────┘`}
                </pre>
              </div>
            )}
          </div>
        )}
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
