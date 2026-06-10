import { useNavigate } from 'react-router-dom';
import RegisterForm from '../../components/Auth/RegisterForm';
import styles from './Register.module.css';

export default function Register() {
  const navigate = useNavigate();
  
  const handleSuccess = () => {
    console.log('Registration successful, navigating to home');
    navigate('/');
  };
  
  const handleLoginClick = () => {
    console.log('Navigating to login');
    navigate('/login');
  };
  
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Создать аккаунт</h1>
        </div>
        <div className={styles.body}>
          <RegisterForm 
            onSuccess={handleSuccess}
            onLoginClick={handleLoginClick}
          />
        </div>
      </div>
    </div>
  );
}