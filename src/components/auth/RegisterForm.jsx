import { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { createUserProfile, formatUserName } from '../../services/userService';
import { normalizePhone, isValidPhone } from '../inputs/PhoneInput/PhoneInput';
import AvatarEditor from '../Profile/AvatarEditor';
import styles from './RegisterForm.module.css';

const GENDERS = [
  { value: 'male', label: 'Мужской' },
  { value: 'female', label: 'Женский' },
  { value: 'other', label: 'Другой' },
  { value: 'unspecified', label: 'Не указан' }
];

function formatPhoneWithMask(value) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return '';
  let result = '+7';
  if (digits.length > 1) result += ` (${digits.slice(1, 4)}`;
  if (digits.length >= 5) result += `) ${digits.slice(4, 7)}`;
  if (digits.length >= 8) result += `-${digits.slice(7, 9)}`;
  if (digits.length >= 10) result += `-${digits.slice(9, 11)}`;
  return result;
}

function validateName(name, fieldName) {
  if (!name.trim()) return `${fieldName} обязательно для заполнения`;
  if (!/^[A-Za-zА-Яа-яЁё]+$/.test(name.trim())) return `${fieldName} может содержать только буквы`;
  return '';
}

function validateEmail(email) {
  if (!email.trim()) return 'Email обязателен для заполнения';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Введите корректный email';
  return '';
}

function validatePassword(password) {
  if (!password) return 'Пароль обязателен для заполнения';
  if (password.length < 6) return 'Пароль должен быть не менее 6 символов';
  return '';
}

function validatePasswordMatch(password, repeat) {
  if (!repeat) return 'Подтверждение пароля обязательно';
  if (password !== repeat) return 'Пароли не совпадают';
  return '';
}

export default function RegisterForm({ onSuccess, onLoginClick }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('unspecified');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  const handlePhoneChange = (e) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');
    if (digits.length > 11) return;
    setPhone(formatPhoneWithMask(raw));
    if (touched.phone) {
      validateField('phone', formatPhoneWithMask(raw));
    }
  };
  
  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    validateField(field);
  };
  
  const validateField = (field, value = null) => {
    let error = '';
    const fieldValue = value !== null ? value : {
      firstName, lastName, email, password, repeatPassword, phone
    }[field];
    
    switch (field) {
      case 'firstName':
        error = validateName(fieldValue, 'Имя');
        break;
      case 'lastName':
        error = validateName(fieldValue, 'Фамилия');
        break;
      case 'email':
        error = validateEmail(fieldValue);
        break;
      case 'password':
        error = validatePassword(fieldValue);
        if (!error && repeatPassword && touched.repeatPassword) {
          const matchError = validatePasswordMatch(fieldValue, repeatPassword);
          if (matchError) {
            setErrors(prev => ({ ...prev, repeatPassword: matchError }));
          } else {
            setErrors(prev => ({ ...prev, repeatPassword: '' }));
          }
        }
        break;
      case 'repeatPassword':
        error = validatePasswordMatch(password, fieldValue);
        break;
      case 'phone':
        if (fieldValue) {
          const normalizedPhone = normalizePhone(fieldValue);
          if (normalizedPhone && !isValidPhone(normalizedPhone)) {
            error = 'Введите корректный номер телефона';
          }
        }
        break;
      default:
        break;
    }
    
    setErrors(prev => ({ ...prev, [field]: error }));
    return !error;
  };
  
  const validateForm = () => {
    const allFields = ['firstName', 'lastName', 'email', 'password', 'repeatPassword'];
    const phoneField = phone ? ['phone'] : [];
    const fieldsToValidate = [...allFields, ...phoneField];
    
    let isValid = true;
    const newErrors = {};
    
    fieldsToValidate.forEach(field => {
      let error = '';
      const value = {
        firstName, lastName, email, password, repeatPassword, phone
      }[field];
      
      switch (field) {
        case 'firstName':
          error = validateName(value, 'Имя');
          break;
        case 'lastName':
          error = validateName(value, 'Фамилия');
          break;
        case 'email':
          error = validateEmail(value);
          break;
        case 'password':
          error = validatePassword(value);
          break;
        case 'repeatPassword':
          error = validatePasswordMatch(password, value);
          break;
        case 'phone':
          if (value) {
            const normalizedPhone = normalizePhone(value);
            if (normalizedPhone && !isValidPhone(normalizedPhone)) {
              error = 'Введите корректный номер телефона';
            }
          }
          break;
        default:
          break;
      }
      
      newErrors[field] = error;
      if (error) isValid = false;
    });
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const allTouched = {
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      repeatPassword: true,
      phone: true
    };
    setTouched(allTouched);
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      
      const normalizedPhoneValue = phone ? normalizePhone(phone) : '';
      
      let photoURL = '';
      if (avatar) {
        try {
          const { uploadAvatarToCloudinary } = await import('../../services/cloudinaryService');
          const response = await fetch(avatar);
          const blob = await response.blob();
          photoURL = await uploadAvatarToCloudinary(blob, user.uid);
        } catch (err) {
          console.warn('Avatar upload failed:', err);
        }
      }
      
      const profile = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        phone: normalizedPhoneValue,
        photoURL
      };
      
      const displayName = formatUserName(profile);
      
      await updateProfile(user, { displayName, photoURL: photoURL || null });
      await createUserProfile(user.uid, user.email, profile);
      
      onSuccess();
    } catch (err) {
      console.error('Registration error:', err);
      const messages = {
        'auth/email-already-in-use': 'Email уже зарегистрирован',
        'auth/invalid-email': 'Неверный email',
        'auth/weak-password': 'Пароль должен быть не менее 6 символов',
        'auth/network-request-failed': 'Ошибка сети. Проверьте подключение к интернету',
        'auth/internal-error': 'Внутренняя ошибка сервера. Попробуйте позже'
      };
      setErrors({ submit: messages[err.code] || err.message || 'Ошибка регистрации' });
    } finally {
      setLoading(false);
    }
  };
  
  const handleAvatarSave = (croppedImage) => {
    setAvatar(croppedImage);
    setShowAvatarEditor(false);
  };
  
  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.avatarSection}>
        <div className={styles.avatarPreview}>
          {avatar ? (
            <img src={avatar} alt="Avatar preview" className={styles.avatarImage} />
          ) : (
            <div className={styles.avatarPlaceholder}>Фото</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowAvatarEditor(true)}
          className={styles.avatarButton}
        >
          {avatar ? 'Изменить фото' : 'Выбрать аватар'}
        </button>
        {avatar && (
          <p className={styles.avatarHint}>
            Фото будет загружено после создания аккаунта
          </p>
        )}
      </div>
      
      <div className={styles.fieldGroup}>
        <div className={styles.field}>
          <label className={styles.label}>Имя *</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              if (touched.firstName) validateField('firstName', e.target.value);
            }}
            onBlur={() => handleBlur('firstName')}
            className={`${styles.input} ${errors.firstName && touched.firstName ? styles.inputError : ''}`}
          />
          {errors.firstName && touched.firstName && (
            <span className={styles.error}>{errors.firstName}</span>
          )}
        </div>
        
        <div className={styles.field}>
          <label className={styles.label}>Фамилия *</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              if (touched.lastName) validateField('lastName', e.target.value);
            }}
            onBlur={() => handleBlur('lastName')}
            className={`${styles.input} ${errors.lastName && touched.lastName ? styles.inputError : ''}`}
          />
          {errors.lastName && touched.lastName && (
            <span className={styles.error}>{errors.lastName}</span>
          )}
        </div>
      </div>
      
      <div className={styles.field}>
        <label className={styles.label}>Пол</label>
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className={styles.select}
        >
          {GENDERS.map(g => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </div>
      
      <div className={styles.field}>
        <label className={styles.label}>Номер телефона</label>
        <input
          type="tel"
          value={phone}
          onChange={handlePhoneChange}
          onBlur={() => handleBlur('phone')}
          placeholder="+7 (___) ___-__-__"
          className={`${styles.input} ${errors.phone && touched.phone ? styles.inputError : ''}`}
        />
        {errors.phone && touched.phone && (
          <span className={styles.error}>{errors.phone}</span>
        )}
      </div>
      
      <div className={styles.field}>
        <label className={styles.label}>Email *</label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (touched.email) validateField('email', e.target.value);
          }}
          onBlur={() => handleBlur('email')}
          className={`${styles.input} ${errors.email && touched.email ? styles.inputError : ''}`}
        />
        {errors.email && touched.email && (
          <span className={styles.error}>{errors.email}</span>
        )}
      </div>
      
      <div className={styles.fieldGroup}>
        <div className={styles.field}>
          <label className={styles.label}>Пароль *</label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (touched.password) validateField('password', e.target.value);
            }}
            onBlur={() => handleBlur('password')}
            className={`${styles.input} ${errors.password && touched.password ? styles.inputError : ''}`}
          />
          {errors.password && touched.password && (
            <span className={styles.error}>{errors.password}</span>
          )}
        </div>
        
        <div className={styles.field}>
          <label className={styles.label}>Подтвердите пароль *</label>
          <input
            type="password"
            value={repeatPassword}
            onChange={(e) => {
              setRepeatPassword(e.target.value);
              if (touched.repeatPassword) validateField('repeatPassword', e.target.value);
            }}
            onBlur={() => handleBlur('repeatPassword')}
            className={`${styles.input} ${errors.repeatPassword && touched.repeatPassword ? styles.inputError : ''}`}
          />
          {errors.repeatPassword && touched.repeatPassword && (
            <span className={styles.error}>{errors.repeatPassword}</span>
          )}
        </div>
      </div>
      
      {errors.submit && <div className={styles.submitError}>{errors.submit}</div>}
      
      <button 
        type="submit" 
        disabled={loading} 
        className={styles.submitButton}
      >
        {loading ? 'Создание...' : 'Создать аккаунт'}
      </button>
      
      <div className={styles.loginLink}>
        <button type="button" onClick={onLoginClick} className={styles.linkButton}>
          Уже есть аккаунт? Войти
        </button>
      </div>
      
      {showAvatarEditor && (
        <AvatarEditor
          initialImage={avatar}
          onSave={handleAvatarSave}
          onCancel={() => setShowAvatarEditor(false)}
        />
      )}
    </form>
  );
}