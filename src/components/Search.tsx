import { useState } from 'react';
import { searchUsers, User } from '../firebase';
import './Search.css';

interface SearchProps {
  onSelectUser: (user: User) => void;
  currentUserId: string;
}

export default function Search({ onSelectUser, currentUserId }: SearchProps) {
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
    <div className="search-container">
      <div className="search-header">
        <div className="search-title">
          {'> SEARCH_USERS'}
        </div>
      </div>

      <div className="search-body">
        <div className="search-form">
          <label className="search-label">
            {'> SEARCH_BY_EMAIL:'}
          </label>
          <div className="search-input-group">
            <input
              type="text"
              placeholder="user@example.com"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="search-input input-terminal"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="search-btn"
            >
              {loading ? '[ SEARCHING ]' : '[ FIND ]'}
            </button>
          </div>
        </div>

        {searched && (
          <div className="search-results">
            <div className="search-results-info">
              {`> RESULTS: ${results.length} USER(S) FOUND`}
            </div>

            {results.length === 0 ? (
              <div className="search-empty-state">
                <pre>
                  {`┌─────────────────────────────────────┐
│                                     │
│      > NO USERS FOUND               │
│                                     │
│      Try a different email address  │
│                                     │
└─────────────────────────────────────┘`}
                </pre>
              </div>
            ) : (
              <div className="search-results-list">
                {results.map(user => (
                  <div
                    key={user.uid}
                    className="search-result-item"
                    onClick={() => onSelectUser(user)}
                  >
                    <div className="search-result-name">
                      {user.name || user.email}
                    </div>
                    <div className="search-result-email">
                      {user.email}
                    </div>
                    <div className="search-result-action">
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
