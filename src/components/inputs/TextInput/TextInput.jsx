import styles from './TextInput.module.css';

export default function TextInput({
  value,
  onChange,
  label,
  placeholder,
  autoComplete,
  required = true
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        className={styles.input}
      />
    </div>
  );
}
