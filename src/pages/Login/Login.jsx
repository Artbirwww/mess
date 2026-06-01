import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase/config';
import EmailInput from '../../components/inputs/EmailInput/EmailInput';
import PasswordInput from '../../components/inputs/PasswordInput/PasswordInput';
import LoginBtn from '../../components/buttons/LoginBtn/LoginBtn';
import GotoRegisterBtn from '../../components/buttons/gotoRegisterBtn/GotoRegisterBtn';
import styles from './Login.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      const messages = {
        'auth/user-not-found': 'User not found',
        'auth/wrong-password': 'Wrong password',
        'auth/invalid-email': 'Invalid email'
      };
      setError(messages[err.code] || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Sign in</h1>
        </div>
        <div className={styles.body}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <EmailInput value={email} onChange={(e) => setEmail(e.target.value)} />
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && <div className={styles.error}>{error}</div>}
            <LoginBtn loading={loading} />
          </form>
          <div className={styles.footer}>
            <GotoRegisterBtn />
          </div>
          <p className={styles.footer}>
            <Link to="/" className={styles.backLink}>
              Back to app
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
