import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { searchUsers } from '../../../services/userService';
import { useAuth } from '../../../context/AuthContext';
import Avatar from '../../avatars/Avatar';
import styles from './ChatListHeader.module.css';

export default function ChatListHeader({ onSelectUser, onLogout, isMobile, onShowSidebar }) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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
    setResults(users.filter((u) => u.uid !== user.uid));
    setLoading(false);
    setShowDropdown(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleSelect = (selected) => {
    onSelectUser({ uid: selected.uid, email: selected.email, name: selected.name });
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/profile" className={styles.user}>
          <Avatar
            name={user?.name}
            email={user?.email}
            photoURL={user?.photoURL}
            size="small"
          />
          <span className={styles.userLabel}>{user?.name || user?.email}</span>
        </Link>

        <div className={styles.searchWrap} ref={dropdownRef}>
          <div className={styles.searchGroup}>
            <input
              type="text"
              placeholder="Search people…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              className={styles.searchInput}
              onFocus={() => query.trim() && setShowDropdown(true)}
            />
          </div>
          {showDropdown && (
            <div className={styles.dropdown}>
              {results.length === 0 ? (
                query.trim() && !loading ? (
                  <div className={styles.dropdownEmpty}>No users found</div>
                ) : null
              ) : (
                results.map((u) => (
                  <div
                    key={u.uid}
                    className={styles.dropdownItem}
                    onClick={() => handleSelect(u)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className={styles.dropdownName}>{u.name || u.email}</div>
                    <div className={styles.dropdownEmail}>{u.email}</div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          {isMobile && (
            <button type="button" onClick={onShowSidebar} className={styles.btn}>
              Menu
            </button>
          )}
          <button type="button" onClick={onLogout} className={`${styles.btn} ${styles.btnDanger}`}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
