import styles from './RegBtn.module.css';

export default function RegBtn({ onClick, isLogin, children }) {
  return (
    <div className={styles.toggle}>
      <button type="button" onClick={onClick} className={styles.link}>
        {children || (isLogin ? 'Create an account' : 'Back to sign in')}
      </button>
    </div>
  );
}
