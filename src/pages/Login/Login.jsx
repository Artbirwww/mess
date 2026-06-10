import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
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
        'auth/user-not-found': 'No account with this email. Create one on the register page.',
        'auth/wrong-password': 'Wrong password',
        'auth/invalid-email': 'Invalid email',
        'auth/invalid-credential': 'Incorrect email or password',
        'auth/invalid-login-credentials': 'Incorrect email or password',
        'auth/operation-not-allowed':
          'Email/password sign-in is off. In Firebase Console → Authentication → Sign-in method, enable Email/Password.',
        'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
        'auth/user-disabled': 'This account has been disabled',
        'auth/missing-password': 'Enter your password',
        'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
          'Firebase API key is missing or invalid. Update .env from Firebase Console (or GitHub secrets for the deployed site), then restart the dev server.'
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
