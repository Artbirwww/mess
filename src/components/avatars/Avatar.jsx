import styles from './Avatar.module.css';

export default function Avatar({ name, email, photoURL, size }) {
  const label = (name || email || '?').charAt(0).toUpperCase();
  const sizeClass =
    size === 'small' ? styles.small : size === 'large' ? styles.large : '';

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt=""
        className={`${styles.avatar} ${styles.image} ${sizeClass}`}
      />
    );
  }

  return (
    <div className={`${styles.avatar} ${sizeClass}`}>
      {label}
    </div>
  );
}
