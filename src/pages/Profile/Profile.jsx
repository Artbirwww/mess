import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/avatars/Avatar';
import { formatUserName } from '../../services/userService';
import styles from './Profile.module.css';

function formatBirthday(value) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function displayName(user) {
  return formatUserName(user);
}

export default function Profile() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className={styles.card}>
      <div className={styles.hero}>
        <Avatar
          name={displayName(user)}
          email={user.email}
          photoURL={user.photoURL}
          size="large"
        />
        <div className={styles.heroText}>
          <h2 className={styles.displayName}>{displayName(user)}</h2>
          <p className={styles.email}>{user.email}</p>
        </div>
      </div>

      <dl className={styles.details}>
        <div className={styles.detailRow}>
          <dt>First name</dt>
          <dd>{user.firstName || '—'}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt>Last name</dt>
          <dd>{user.lastName || '—'}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt>Birthday</dt>
          <dd>{formatBirthday(user.birthday)}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt>Phone</dt>
          <dd>{user.phone || '—'}</dd>
        </div>
        <div className={styles.detailRow}>
          <dt>Bio</dt>
          <dd>{user.bio || '—'}</dd>
        </div>
      </dl>

      <Link to="/profile/settings" className={styles.primaryBtn}>
        Edit profile
      </Link>
    </div>
  );
}
