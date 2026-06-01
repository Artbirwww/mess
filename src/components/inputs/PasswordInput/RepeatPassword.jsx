import PasswordInput from './PasswordInput';
import styles from './RepeatPassword.module.css';

export default function RepeatPassword({ value, onChange, password }) {
  const mismatch = value && password && value !== password;

  return (
    <>
      <PasswordInput
        value={value}
        onChange={onChange}
        label="Confirm password"
        placeholder="••••••"
      />
      {mismatch && <p className={styles.mismatch}>Passwords do not match</p>}
    </>
  );
}
