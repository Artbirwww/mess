import { useState, useEffect } from 'react';
import { auth, checkUserExists, createUserProfile, getAllUsers } from './firebase';
import Auth from './components/Auth';
import Search from './components/Search';
import Chat from './components/Chat';

interface User {
  uid: string;
  email: string;
  displayName?: string;
}

interface SelectedUser {
  uid: string;
  email: string;
  name?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [loading, setLoading] = useState(true);

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
        fontFamily: 'JetBrains Mono, monospace'
      }}>
        <div style={{ color: '#00ff9d' }}>
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
      padding: 20,
      fontFamily: 'JetBrains Mono, monospace'
    }}>
      {/* Terminal Header */}
      <div style={{ 
        background: '#0a0e1a',
        border: '1px solid #00ff9d',
        borderRadius: 0,
        marginBottom: 20,
        overflow: 'hidden'
      }}>
        <div style={{ 
          background: '#1a1e2a',
          padding: '12px 20px',
          borderBottom: '1px solid #00ff9d',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ color: '#00ff9d', fontSize: 14, fontWeight: 500 }}>
            {'user@messenger:~$ '}
            <span style={{ color: '#ffffff', marginLeft: 8 }}>
              {user.email}
            </span>
          </div>
          <button 
            onClick={handleLogout}
            style={{
              background: 'transparent',
              color: '#ff4444',
              border: '1px solid #ff4444',
              borderRadius: 0,
              padding: '6px 16px',
              fontSize: 12,
              fontFamily: 'JetBrains Mono, monospace',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ff4444';
              e.currentTarget.style.color = '#0a0e1a';
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
      
      {/* Main Content */}
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ flex: 1 }}>
          <Search 
            onSelectUser={setSelectedUser} 
            currentUserId={user.uid} 
          />
        </div>
        
        <div style={{ flex: 2 }}>
          {selectedUser ? (
            <Chat 
              otherUser={selectedUser} 
              currentUser={user}
            />
          ) : (
            <div style={{
              border: '1px solid #00ff9d',
              borderRadius: 0,
              padding: 40,
              textAlign: 'center',
              background: '#0a0e1a',
              color: '#00ff9d'
            }}>
              <div style={{ fontSize: 14, whiteSpace: 'pre', fontFamily: 'JetBrains Mono, monospace' }}>
                {`┌─────────────────────────────────────────┐
│                                         │
│    > SELECT A USER TO START CHATTING    │
│                                         │
│    Use the search panel on the left     │
│    to find and select a user            │
│                                         │
└─────────────────────────────────────────┘`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;