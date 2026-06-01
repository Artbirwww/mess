import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { createUserProfile } from '../../services/userService';
import EmailInput from '../../components/inputs/EmailInput/EmailInput';
import PasswordInput from '../../components/inputs/PasswordInput/PasswordInput';
import RepeatPassword from '../../components/inputs/PasswordInput/RepeatPassword';
import LoginBtn from '../../components/buttons/LoginBtn/LoginBtn';
import styles from './Register.module.css';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== repeatPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const displayName = email.split('@')[0];
      await updateProfile(user, { displayName });
      await createUserProfile(user.uid, user.email, displayName);
      navigate('/');
    } catch (err) {
      const messages = {
        'auth/email-already-in-use': 'Email already registered',
        'auth/invalid-email': 'Invalid email',
        'auth/weak-password': 'Password must be at least 6 characters'
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
          <h1 className={styles.title}>Create account</h1>
        </div>
        <div className={styles.body}>
          <form className={styles.form} onSubmit={handleSubmit}>
            <EmailInput value={email} onChange={(e) => setEmail(e.target.value)} />
            <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
            <RepeatPassword
              value={repeatPassword}
              onChange={(e) => setRepeatPassword(e.target.value)}
              password={password}
            />
            {error && <div className={styles.error}>{error}</div>}
            <LoginBtn loading={loading} isLogin={false} />
          </form>
          <div className={styles.footer}>
            <Link to="/login" className={styles.link}>
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
