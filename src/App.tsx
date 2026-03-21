import { useState, useEffect } from 'react';
import { auth, checkUserExists, createUserProfile, getAllUsers, User } from './firebase';
import Auth from './components/Auth';
import Search from './components/Search';
import Chat from './components/Chat';
import ActiveChatsList from './components/ActiveChatsList';
import Notifications from './components/Notifications';

interface SelectedUser {
  uid: string;
  email: string;
  name?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showSearch, setShowSearch] = useState(true);
  const [showChatsList, setShowChatsList] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
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
          console.log('[SYSTEM] Creating user profile...');
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
      console.log(`[SYSTEM] User logged in: ${user.email}`);
      getAllUsers().then(users => {
        console.log(`[SYSTEM] Total users in database: ${users.length}`);
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'JetBrains Mono, monospace',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div style={{ color: '#00ff9d', fontSize: isMobile ? '14px' : '16px' }}>
          {'> LOADING SYSTEM...'}
          <span className="cursor-blink">_</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuth={() => setUser(auth.currentUser as User)} />;
  }

  return (
    <div style={{
      maxWidth: 1400,
      margin: '0 auto',
      padding: isMobile ? '10px' : '20px',
      fontFamily: 'JetBrains Mono, monospace'
    }}>
      {/* Terminal Header */}
      <div style={{
        background: '#000000',
        border: '1px solid #00ff9d',
        borderRadius: 0,
        marginBottom: isMobile ? '10px' : '20px',
        overflow: 'hidden'
      }}>
        <div style={{
          background: '#000000',
          padding: isMobile ? '8px 12px' : '12px 20px',
          borderBottom: '1px solid #00ff9d',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{
            color: '#00ff9d',
            fontSize: isMobile ? '12px' : '14px',
            fontWeight: 500,
            wordBreak: 'break-all'
          }}>
            {'user@messenger:~$ '}
            <span style={{ color: '#ffffff', marginLeft: 8 }}>
              {user.email}
            </span>
          </div>
          <div style={{
            display: 'flex',
            gap: '8px',
            alignItems: 'center'
          }}>
            {/* Mobile: Toggle Chats List Button */}
            {isMobile && (
              <button
                onClick={() => {
                  setShowChatsList(!showChatsList);
                  setShowSearch(false);
                }}
                style={{
                  background: showChatsList ? '#00ff9d' : 'transparent',
                  color: showChatsList ? '#000000' : '#00ff9d',
                  border: '1px solid #00ff9d',
                  borderRadius: 0,
                  padding: '4px 12px',
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  cursor: 'pointer'
                }}
              >
                {'[ CHATS ]'}
              </button>
            )}
            <button
              onClick={handleLogout}
              style={{
                background: 'transparent',
                color: '#ff4444',
                border: '1px solid #ff4444',
                borderRadius: 0,
                padding: isMobile ? '4px 12px' : '6px 16px',
                fontSize: isMobile ? '10px' : '12px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer',
                transition: 'all 0.3s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ff4444';
                e.currentTarget.style.color = '#000000';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#ff4444';
              }}
            >
              {'[LOGOUT]'}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobile && selectedUser && (
        <div style={{ marginBottom: '10px', display: 'flex', gap: '8px' }}>
          {!showChatsList && (
            <button
              onClick={() => setShowSearch(!showSearch)}
              style={{
                flex: 1,
                padding: '10px',
                background: '#000000',
                color: '#00ff9d',
                border: '1px solid #00ff9d',
                borderRadius: 0,
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer'
              }}
            >
              {showSearch ? '[ BACK TO CHAT ]' : '[ SHOW USERS ]'}
            </button>
          )}
          {showChatsList && (
            <button
              onClick={() => setShowChatsList(false)}
              style={{
                flex: 1,
                padding: '10px',
                background: '#000000',
                color: '#00ff9d',
                border: '1px solid #00ff9d',
                borderRadius: 0,
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer'
              }}
            >
              {'[ BACK TO CHAT ]'}
            </button>
          )}
        </div>
      )}

      {/* Main Content */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '10px' : '20px'
      }}>
        {/* Left Panel - Search or Chats List on Mobile */}
        {(isMobile ? showSearch : true) && !showChatsList && (
          <div style={{
            flex: 1,
            width: isMobile ? '100%' : 'auto',
            marginBottom: isMobile ? '10px' : '0'
          }}>
            <Search
              onSelectUser={handleSelectUser}
              currentUserId={user.uid}
              isMobile={isMobile}
            />
          </div>
        )}

        {/* Chats List - Always visible on desktop, toggle on mobile */}
        {(!isMobile || (isMobile && showChatsList)) && (
          <div style={{
            width: isMobile ? '100%' : 300,
            flexShrink: 0
          }}>
            <ActiveChatsList
              currentUserId={user.uid}
              onSelectChat={handleSelectUser}
              isMobile={isMobile}
            />
          </div>
        )}

        {/* Chat Panel */}
        {(isMobile ? !showSearch && !showChatsList : true) && (
          <div style={{
            flex: 2,
            width: isMobile ? '100%' : 'auto'
          }}>
            {selectedUser ? (
              <Chat
                otherUser={selectedUser}
                currentUser={user}
                isMobile={isMobile}
                onBack={() => setShowSearch(true)}
              />
            ) : (
              <div style={{
                border: '1px solid #00ff9d',
                borderRadius: 0,
                padding: isMobile ? '20px' : '40px',
                textAlign: 'center',
                background: '#000000',
                color: '#00ff9d'
              }}>
                <div style={{
                  fontSize: isMobile ? '10px' : '14px',
                  whiteSpace: 'pre',
                  fontFamily: 'JetBrains Mono, monospace',
                  overflowX: 'auto'
                }}>
                  {`┌─────────────────────────────────────────┐
│                                         │
│    > SELECT A USER TO START CHATTING    │
│                                         │
│    Use the search panel or active       │
│    chats list to select a user          │
│                                         │
└─────────────────────────────────────────┘`}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notifications Component */}
      <Notifications
        currentUserId={user.uid}
        isMobile={isMobile}
        onNotificationClick={handleNotificationClick}
      />
    </div>
  );
}

export default App;