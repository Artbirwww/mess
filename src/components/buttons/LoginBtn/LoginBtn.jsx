import styles from './LoginBtn.module.css';

export default function LoginBtn({ loading, isLogin = true }) {
  return (
    <button type="submit" disabled={loading} className={styles.submit}>
      {loading ? 'Подождите…' : isLogin ? 'Вход' : 'Создать аккаунт'}
    </button>
  );
}
