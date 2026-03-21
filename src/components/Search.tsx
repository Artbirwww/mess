import { useState, useEffect } from 'react';
import { searchUsers, User } from '../firebase';

interface SearchProps {
  onSelectUser: (user: User) => void;
  currentUserId: string;
  isMobile?: boolean;
}

export default function Search({ onSelectUser, currentUserId, isMobile = false }: SearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setSearched(true);
    const users = await searchUsers(query);
    setResults(users.filter(u => u.uid !== currentUserId));
    setLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div style={{ 
      border: '1px solid #00ff9d',
      background: '#0a0e1a',
      borderRadius: 0,
      overflow: 'hidden'
    }}>
      <div style={{ 
        background: '#1a1e2a',
        padding: isMobile ? '8px 12px' : '12px 20px',
        borderBottom: '1px solid #00ff9d'
      }}>
        <div style={{ color: '#00ff9d', fontSize: isMobile ? '12px' : '14px' }}>
          {'> SEARCH_USERS'}
        </div>
      </div>
      
      <div style={{ padding: isMobile ? '15px' : '20px' }}>
        <div style={{ marginBottom: isMobile ? '15px' : '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: 8, 
            color: '#00ff9d', 
            fontSize: isMobile ? '10px' : '12px',
            letterSpacing: 1
          }}>
            {'> SEARCH_BY_EMAIL:'}
          </label>
          <div style={{ display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
            <input
              type="text"
              placeholder="user@example.com"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              style={{ 
                flex: 1, 
                padding: isMobile ? '8px 10px' : '10px 12px',
                background: '#0a0e1a',
                border: '1px solid #00ff9d',
                borderRadius: 0,
                fontSize: isMobile ? '12px' : '14px',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#00ff9d'
              }}
            />
            <button 
              onClick={handleSearch}
              disabled={loading}
              style={{
                padding: isMobile ? '8px 16px' : '10px 24px',
                background: '#00ff9d',
                color: '#0a0e1a',
                border: 'none',
                borderRadius: 0,
                fontSize: isMobile ? '10px' : '12px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              {loading ? '[ SEARCHING ]' : '[ FIND ]'}
            </button>
          </div>
        </div>
        
        {searched && (
          <div>
            <div style={{ 
              marginBottom: isMobile ? '10px' : '15px', 
              padding: isMobile ? '6px 10px' : '8px 12px',
              background: '#1a1e2a',
              borderLeft: `3px solid #00ff9d`,
              fontSize: isMobile ? '9px' : '11px',
              color: '#00ff9d'
            }}>
              {`> RESULTS: ${results.length} USER(S) FOUND`}
            </div>
            
            {results.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: isMobile ? '20px' : '30px 20px',
                border: '1px solid #2a2e3a',
                color: '#666',
                fontSize: isMobile ? '10px' : '12px',
                whiteSpace: 'pre',
                fontFamily: 'JetBrains Mono, monospace',
                overflowX: 'auto'
              }}>
                {`┌─────────────────────────────────────┐
│                                     │
│      > NO USERS FOUND               │
│                                     │
│      Try a different email address  │
│                                     │
└─────────────────────────────────────┘`}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '6px' : '8px' }}>
                {results.map(user => (
                  <div 
                    key={user.uid} 
                    onClick={() => onSelectUser(user)}
                    style={{ 
                      cursor: 'pointer', 
                      padding: isMobile ? '10px 12px' : '12px 16px',
                      border: '1px solid #2a2e3a',
                      transition: 'all 0.3s',
                      background: '#0a0e1a'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#1a1e2a';
                      e.currentTarget.style.borderColor = '#00ff9d';
                      e.currentTarget.style.transform = isMobile ? 'none' : 'translateX(5px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#0a0e1a';
                      e.currentTarget.style.borderColor = '#2a2e3a';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{ fontWeight: 'bold', color: '#00ff9d', fontSize: isMobile ? '12px' : '13px', wordBreak: 'break-all' }}>
                      {user.name || user.email}
                    </div>
                    <div style={{ fontSize: isMobile ? '10px' : '11px', color: '#888', marginTop: 4, wordBreak: 'break-all' }}>
                      {user.email}
                    </div>
                    <div style={{ fontSize: isMobile ? '9px' : '10px', color: '#666', marginTop: 6 }}>
                      {'> SELECT_TO_CHAT'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}