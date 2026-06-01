import styles from './EmailInput.module.css';

export default function EmailInput({ value, onChange, label = 'Email' }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input
        type="email"
        placeholder="you@example.com"
        value={value}
        onChange={onChange}
        required
        className={styles.input}
      />
    </div>
  );
}
