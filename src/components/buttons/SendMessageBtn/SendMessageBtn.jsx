import styles from './SendMessageBtn.module.css';

export default function SendMessageBtn({ onClick, disabled, sending, pendingCount = 0 }) {
  let label = 'Отправить сообщение';
  if (sending) label = 'Отправка…';
  else if (pendingCount > 0) label = `Send (${pendingCount})`;

  return (
    <button type="button" onClick={onClick} disabled={disabled} className={styles.button}>
      {label}
    </button>
  );
}
