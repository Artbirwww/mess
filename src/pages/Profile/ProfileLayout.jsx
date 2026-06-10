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
            ← Назад к чатам
          </Link>
          <h1 className={styles.pageTitle}>Аккаунт</h1>
        </header>

        <nav className={styles.tabs} aria-label="Profile sections">
          <NavLink
            to="/profile"
            end
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.tabActive : ''}`
            }
          >
            Профиль
          </NavLink>
          <NavLink
            to="/profile/settings"
            className={({ isActive }) =>
              `${styles.tab} ${isActive ? styles.tabActive : ''}`
            }
          >
            Настройки
          </NavLink>
        </nav>

        <div className={styles.content}>
          <Outlet context={{ user }} />
        </div>
      </div>
    </div>
  );
}