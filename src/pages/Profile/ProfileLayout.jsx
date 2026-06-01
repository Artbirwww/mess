import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Profile.module.css';

export default function ProfileLayout() {
  const { user } = useAuth();

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.topBar}>
          <Link to="/" className={styles.backLink}>
            ← Messages
          </Link>
          <h1 className={styles.pageTitle}>Account</h1>
        </header>

        <nav className={styles.tabs} aria-label="Profile sections">
          <NavLink
            to="/profile"
            end
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.tabActive : ''}`
            }
          >
            Profile
          </NavLink>
          <NavLink
            to="/profile/settings"
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.tabActive : ''}`
            }
          >
            Settings
          </NavLink>
        </nav>

        <div className={styles.content}>
          <Outlet context={{ user }} />
        </div>
      </div>
    </div>
  );
}
