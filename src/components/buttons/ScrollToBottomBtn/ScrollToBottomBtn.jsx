import styles from './ScrollToBottomBtn.module.css';

export default function ScrollToBottomBtn({ onClick, visible = true, label = 'Scroll down' }) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={styles.button}
      title={label}
      aria-label={label}
    >
      ↓
    </button>
  );
}
