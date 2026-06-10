import { NavLink } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import styles from './Sidebar.module.css';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t } = useTranslation();
  
  return (
    <>
      <div className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ''}`} onClick={onClose} />
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Меню</h2>
          <button onClick={onClose} className={styles.closeButton}>×</button>
        </div>
        <nav className={styles.nav}>
          <NavLink to="/" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
            {t('nav.home')}
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
            {t('nav.profile')}
          </NavLink>
          <NavLink to="/app-settings" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
            {t('nav.settings')}
          </NavLink>
        </nav>
      </aside>
    </>
  );
}