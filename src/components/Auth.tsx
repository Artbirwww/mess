import { useState, useEffect } from 'react';
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      maxWidth: isMobile ? '95%' : '500px', 
      margin: isMobile ? '40px auto' : '80px auto', 
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
          padding: isMobile ? '8px 12px' : '12px 20px',
          borderBottom: '1px solid #00ff9d'
        }}>
          <div style={{ color: '#00ff9d', fontSize: isMobile ? '12px' : '14px' }}>
            {'user@auth:~$ '}{isLogin ? 'LOGIN_SYSTEM' : 'REGISTER_SYSTEM'}
          </div>
        </div>
        
        {/* Form Content */}
        <div style={{ padding: isMobile ? '20px' : '30px' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: isMobile ? '15px' : '20px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                color: '#00ff9d', 
                fontSize: isMobile ? '10px' : '12px',
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
                  padding: isMobile ? '8px 10px' : '10px 12px',
                  background: '#0a0e1a',
                  border: '1px solid #00ff9d',
                  borderRadius: 0,
                  fontSize: isMobile ? '12px' : '14px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#00ff9d'
                }}
              />
            </div>
            
            <div style={{ marginBottom: isMobile ? '20px' : '25px' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                color: '#00ff9d', 
                fontSize: isMobile ? '10px' : '12px',
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
                  padding: isMobile ? '8px 10px' : '10px 12px',
                  background: '#0a0e1a',
                  border: '1px solid #00ff9d',
                  borderRadius: 0,
                  fontSize: isMobile ? '12px' : '14px',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: '#00ff9d'
                }}
              />
            </div>
            
            {error && (
              <div style={{ 
                background: '#2a1a1a',
                borderLeft: `3px solid #ff4444`,
                padding: isMobile ? '8px 10px' : '10px 12px',
                marginBottom: isMobile ? '15px' : '20px',
                color: '#ff8888',
                fontSize: isMobile ? '10px' : '12px',
                fontFamily: 'JetBrains Mono, monospace',
                wordBreak: 'break-word'
              }}>
                {error}
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: '100%', 
                padding: isMobile ? '10px' : '12px',
                background: '#00ff9d',
                color: '#0a0e1a',
                border: 'none',
                borderRadius: 0,
                fontSize: isMobile ? '12px' : '14px',
                fontWeight: 'bold',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.3s'
              }}
            >
              {loading ? '[ PROCESSING... ]' : (isLogin ? '[ LOGIN ]' : '[ REGISTER ]')}
            </button>
          </form>
          
          <div style={{ 
            marginTop: isMobile ? '15px' : '20px', 
            textAlign: 'center',
            borderTop: '1px solid #2a2e3a',
            paddingTop: isMobile ? '15px' : '20px'
          }}>
            <button 
              onClick={() => setIsLogin(!isLogin)}
              style={{ 
                background: 'transparent',
                color: '#00ff9d',
                border: '1px solid #00ff9d',
                borderRadius: 0,
                padding: isMobile ? '6px 12px' : '8px 16px',
                fontSize: isMobile ? '10px' : '12px',
                fontFamily: 'JetBrains Mono, monospace',
                cursor: 'pointer',
                transition: 'all 0.3s',
                width: isMobile ? '100%' : 'auto'
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