import { useState } from 'react';
import { auth, createUserProfile } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';

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
    <div style={{ 
      maxWidth: 500, 
      margin: '80px auto', 
      padding: 0,
      fontFamily: 'JetBrains Mono, monospace'
    }}>
      <div style={{ 
        border: '1px solid #00ff9d',
        background: '#0a0e1a',
        borderRadius: 0,
        overflow: 'hidden'
      }}>
        {/* Terminal Header */}
        <div style={{ 
          background: '#1a1e2a',
          padding: '12px 20px',
          borderBottom: '1px solid #00ff9d'
        }}>
          <div style={{ color: '#00ff9d', fontSize: 14 }}>
            {'user@auth:~$ '}{isLogin ? 'LOGIN_SYSTEM' : 'REGISTER_SYSTEM'}
          </div>
        </div>
        
        {/* Form Content */}
        <div style={{ padding: 30 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                color: '#00ff9d', 
                fontSize: 12,
                letterSpacing: 1
              }}>
                {'> EMAIL_ADDRESS:'}
              </label>
              <input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ 
                  width: '100%', 
                  padding: '10px 12px',
                  background: '#0a0e1a',
                  border: '1px solid #00ff9d',
                  borderRadius: 0,
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#00ff9d'
                }}
              />
            </div>
            
            <div style={{ marginBottom: 25 }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                color: '#00ff9d', 
                fontSize: 12,
                letterSpacing: 1
              }}>
                {'> PASSWORD:'}
              </label>
              <input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                style={{ 
                  width: '100%', 
                  padding: '10px 12px',
                  background: '#0a0e1a',
                  border: '1px solid #00ff9d',
                  borderRadius: 0,
                  fontSize: 14,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#00ff9d'
                }}
              />
            </div>
            
            {error && (
              <div style={{ 
                background: '#2a1a1a',
                borderLeft: `3px solid #ff4444`,
                padding: '10px 12px',
                marginBottom: 20,
                color: '#ff8888',
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace'
              }}>
                {error}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: '12px',
                background: '#00ff9d',
                color: '#0a0e1a',
                border: 'none',
                borderRadius: 0,
                fontSize: 14,
                fontWeight: 'bold',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#00cc7d';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.background = '#00ff9d';
                }
              }}
            >
              {loading ? '[ PROCESSING... ]' : (isLogin ? '[ LOGIN ]' : '[ REGISTER ]')}
            </button>
          </form>
          
          <div style={{ 
            marginTop: 20, 
            textAlign: 'center',
            borderTop: '1px solid #2a2e3a',
            paddingTop: 20
          }}>
            <button 
              onClick={() => setIsLogin(!isLogin)}
              style={{ 
                background: 'transparent',
                color: '#00ff9d',
                border: '1px solid #00ff9d',
                borderRadius: 0,
                padding: '8px 16px',
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#00ff9d';
                e.currentTarget.style.color = '#0a0e1a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#00ff9d';
              }}
            >
              {isLogin ? '> CREATE_NEW_ACCOUNT' : '> BACK_TO_LOGIN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}