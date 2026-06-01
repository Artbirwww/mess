import { Link } from 'react-router-dom';
import styles from './GotoRegisterBtn.module.css';

export default function GotoRegisterBtn() {
  return (
    <Link to="/register" className={styles.link}>
      Create an account
    </Link>
  );
}
