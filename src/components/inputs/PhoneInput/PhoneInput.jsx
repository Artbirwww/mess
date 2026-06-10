import styles from './PhoneInput.module.css';

export function normalizePhone(value) {
  return value.replace(/[^\d+]/g, '');
}

export function isValidPhone(value) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

export default function PhoneInput({ value, onChange, label = 'Phone', required = false }) {
  return (
    <div className={styles.field}>
      <label className={styles.label}>{label}</label>
      <input
        type="tel"
        placeholder="+7 900 123-45-67"
        value={value}
        onChange={onChange}
        required={required}
        className={styles.input}
        autoComplete="tel"
      />
    </div>
  );
}
