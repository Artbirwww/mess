import styles from './PasswordInput.module.css';

export default function PasswordInput({
  value,
  onChange,
  label = 'Password',
  minLength = 6,
  placeholder = '••••••'
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input
        type="password"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required
        minLength={minLength}
        className={styles.input}
      />
    </div>
  );
}
