import { useState, useEffect } from 'react';
import { auth, createUserProfile } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import './Auth.css';

interface AuthProps {
  onAuth: () => void;
}

export default function Auth({ onAuth }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const displayName = email.split('@')[0];

        await updateProfile(user, { displayName });
        await createUserProfile(user.uid, user.email!, displayName);
      }
      onAuth();
    } catch (err: any) {
      let errorMessage = '';
      switch (err.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'ERROR: Email already registered';
          break;
        case 'auth/invalid-email':
          errorMessage = 'ERROR: Invalid email format';
          break;
        case 'auth/weak-password':
          errorMessage = 'ERROR: Password must be at least 6 characters';
          break;
        case 'auth/user-not-found':
          errorMessage = 'ERROR: User not found';
          break;
        case 'auth/wrong-password':
          errorMessage = 'ERROR: Wrong password';
          break;
        default:
          errorMessage = `ERROR: ${err.message}`;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-title">
            {'user@auth:~$ '}{isLogin ? 'LOGIN_SYSTEM' : 'REGISTER_SYSTEM'}
          </div>
        </div>

        <div className="auth-body">
          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field">
              <label className="auth-label">
                {'> EMAIL_ADDRESS:'}
              </label>
              <input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input input-terminal"
              />
            </div>

            <div className="auth-field">
              <label className="auth-label">
                {'> PASSWORD:'}
              </label>
              <input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="auth-input input-terminal"
              />
            </div>

            {error && (
              <div className="auth-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="auth-submit"
            >
              {loading ? '[ PROCESSING... ]' : (isLogin ? '[ LOGIN ]' : '[ REGISTER ]')}
            </button>
          </form>

          <div className="auth-toggle">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="btn-terminal auth-toggle-btn"
            >
              {isLogin ? '> CREATE_NEW_ACCOUNT' : '> BACK_TO_LOGIN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
