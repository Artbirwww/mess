import { useState, useRef, useEffect } from 'react';
import { searchUsers, User } from '../firebase';
import './SearchInput.css';

interface SearchInputProps {
  onSelectUser: (user: User) => void;
  currentUserId: string;
}

export default function SearchInput({ onSelectUser, currentUserId }: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    const users = await searchUsers(query);
    setResults(users.filter(u => u.uid !== currentUserId));
    setLoading(false);
    setShowDropdown(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSelectUser = (user: User) => {
    onSelectUser(user);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div className="search-input-wrapper" ref={dropdownRef}>
      <div className="search-input-group">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          className="header-search-input"
          onFocus={() => query.trim() && setShowDropdown(true)}
        />
        {loading && <span className="search-loading">⏳</span>}
      </div>

      {showDropdown && (
        <div className="search-dropdown">
          {results.length === 0 ? (
            query.trim() && !loading ? (
              <div className="search-dropdown-empty">
                {'> NO USERS FOUND'}
              </div>
            ) : null
          ) : (
            <div className="search-dropdown-list">
              {results.map(user => (
                <div
                  key={user.uid}
                  className="search-dropdown-item"
                  onClick={() => handleSelectUser(user)}
                >
                  <div className="search-dropdown-item-name">
                    {user.name || user.email}
                  </div>
                  <div className="search-dropdown-item-email">
                    {user.email}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
