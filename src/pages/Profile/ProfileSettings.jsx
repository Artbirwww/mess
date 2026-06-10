import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  updateProfile,
  verifyBeforeUpdateEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut
} from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { updateUserProfile, formatUserName } from '../../services/userService';
import Avatar from '../../components/avatars/Avatar';
import AvatarEditor from '../../components/Profile/AvatarEditor';
import { isValidPhone, normalizePhone } from '../../components/inputs/PhoneInput/PhoneInput';
import useSettingsStore from '../../stores/useSettingsStore';
import { useTranslation } from '../../hooks/useTranslation';
import styles from './Profile.module.css';

function displayNameFromParts(firstName, lastName, name) {
  const full = [firstName, lastName].filter(Boolean).join(' ').trim();
  if (full) return full;
  return name?.trim() || '';
}

function ThemeOption({ label, value, currentTheme, onSelect }) {
  const isActive = currentTheme === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`${styles.themeOption} ${isActive ? styles.themeOptionActive : ''}`}
    >
      {label}
    </button>
  );
}

function ToggleRow({ label, enabled, onToggle }) {
  return (
    <div className={styles.toggleRow}>
      <span className={styles.toggleLabel}>{label}</span>
      <button
        type="button"
        onClick={onToggle}
        className={`${styles.toggle} ${enabled ? styles.toggleOn : styles.toggleOff}`}
      >
        {enabled ? 'ВКЛ' : 'ВЫКЛ'}
      </button>
    </div>
  );
}

export default function ProfileSettings() {
  const { user, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const { settings, updateSetting, resetSettings, getEffectiveTheme } = useSettingsStore();

  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [name, setName] = useState(user?.name || '');
  const [birthday, setBirthday] = useState(user?.birthday || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('appearance');

  useEffect(() => {
    const effectiveTheme = getEffectiveTheme();
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [settings.theme, getEffectiveTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (settings.theme === 'system') {
        document.documentElement.setAttribute('data-theme', getEffectiveTheme());
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme, getEffectiveTheme]);

  if (!user) return null;

  const resolvedName = displayNameFromParts(firstName, lastName, name);

  const savePhotoURL = async (url) => {
    await updateUserProfile(user.uid, { photoURL: url || '' });
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { photoURL: url || null });
    }
    await refreshProfile();
  };

  const handleAvatarSave = async (croppedImage) => {
  setUploading(true);
  setError('');
  
  try {
    const { uploadAvatarToCloudinary } = await import('../../services/cloudinaryService');
    
    // Преобразуем base64 в Blob
    const response = await fetch(croppedImage);
    const blob = await response.blob();
    
    // Создаем File объект из Blob
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    
    const uploadedUrl = await uploadAvatarToCloudinary(file, user.uid);
    
    setPhotoURL(uploadedUrl);
    await savePhotoURL(uploadedUrl);
    setSuccess('Фото обновлено');
    setShowAvatarEditor(false);
  } catch (err) {
    console.error('Upload error:', err);
    setError(err.message || 'Не удалось загрузить фото');
  } finally {
    setUploading(false);
  }
};

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      setError('Пожалуйста, выберите изображение');
      return;
    }
    
    setError('');
    setSuccess('');
    setUploading(true);
    
    try {
      const { uploadAvatarToCloudinary } = await import('../../services/cloudinaryService');
      const uploadedUrl = await uploadAvatarToCloudinary(file, user.uid);
      
      setPhotoURL(uploadedUrl);
      await savePhotoURL(uploadedUrl);
      setSuccess('Фото обновлено');
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Не удалось загрузить фото');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoURL('');
    setError('');
    setSuccess('');
    setUploading(true);
    
    try {
      await savePhotoURL('');
      setSuccess('Фото удалено');
    } finally {
      setUploading(false);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail) {
      setError('Введите новый email');
      return;
    }
    if (trimmedEmail === user.email) {
      setError('Это уже ваш email');
      return;
    }
    if (!emailPassword) {
      setError('Введите текущий пароль для смены email');
      return;
    }

    setChangingEmail(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, emailPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await verifyBeforeUpdateEmail(auth.currentUser, trimmedEmail);
      setNewEmail('');
      setEmailPassword('');
      setSuccess('Ссылка подтверждения отправлена на новый email');
    } catch (err) {
      const messages = {
        'auth/wrong-password': 'Неверный пароль',
        'auth/invalid-email': 'Неверный email',
        'auth/email-already-in-use': 'Email уже используется',
        'auth/requires-recent-login': 'Выйдите и войдите снова, затем повторите'
      };
      setError(messages[err.code] || err.message || 'Не удалось изменить email');
    } finally {
      setChangingEmail(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (phone && !isValidPhone(phone)) {
      setError('Введите корректный номер телефона (10–15 цифр)');
      return;
    }

    setSaving(true);

    const profileData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: resolvedName || formatUserName({ firstName, lastName, email: user.email }),
      birthday: birthday || '',
      bio: bio.trim(),
      phone: normalizePhone(phone),
      photoURL: photoURL
    };

    try {
      await updateUserProfile(user.uid, profileData);

      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: profileData.name,
          photoURL: photoURL || null
        });
      }

      await refreshProfile();
      setSuccess('Профиль сохранён');
    } catch (err) {
      setError(err.message || 'Не удалось сохранить профиль');
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = (value) => {
    updateSetting('theme', value);
  };

  const handleReset = () => {
    if (window.confirm('Вы уверены? Все настройки будут сброшены.')) {
      resetSettings();
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDeleteAccount = async () => {
    const confirm = window.confirm('Вы уверены? Аккаунт будет удалён без возможности восстановления.');
    if (confirm) {
      try {
        await auth.currentUser.delete();
        await logout();
        navigate('/login');
      } catch (err) {
        setError('Не удалось удалить аккаунт. Возможно, требуется повторная авторизация.');
      }
    }
  };

  const settingsTabs = [
    { id: 'profile', label: 'Профиль' },
    { id: 'appearance', label: 'Внешний вид' },
    { id: 'notifications', label: 'Уведомления' },
    { id: 'account', label: 'Аккаунт' }
  ];

  return (
    <div className={styles.settingsContainer}>
      <div className={styles.settingsNav}>
        {settingsTabs.map(tab => (
          <button
            key={tab.id}
            className={`${styles.settingsNavItem} ${activeSettingsTab === tab.id ? styles.settingsNavItemActive : ''}`}
            onClick={() => setActiveSettingsTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.settingsContent}>
        {activeSettingsTab === 'profile' && (
          <div className={styles.settingsSection}>
            <div className={styles.settingsHeader}>
              <h3 className={styles.settingsTitle}>Профиль</h3>
              <p className={styles.settingsDescription}>Редактирование личной информации</p>
            </div>

            <div className={styles.settingsBlock}>
              <div className={styles.settingsBlockTitle}>Аватар</div>
              <div className={styles.avatarSection}>
                <div className={styles.avatarPreviewLarge}>
                  <Avatar
                    name={resolvedName}
                    email={user.email}
                    photoURL={photoURL}
                    size="large"
                  />
                </div>
                <div className={styles.avatarButtons}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className={styles.fileInput}
                    onChange={handleAvatarChange}
                    disabled={uploading}
                  />
                  <button
                    type="button"
                    className={styles.avatarBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? 'Загрузка...' : 'Загрузить фото'}
                  </button>
                  <button
                    type="button"
                    className={styles.avatarBtn}
                    onClick={() => setShowAvatarEditor(true)}
                    disabled={uploading}
                  >
                    Редактировать
                  </button>
                  {photoURL && (
                    <button
                      type="button"
                      className={`${styles.avatarBtn} ${styles.avatarBtnDanger}`}
                      onClick={handleRemovePhoto}
                      disabled={uploading}
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.settingsBlock}>
              <div className={styles.settingsBlockTitle}>Личная информация</div>
              <form className={styles.profileForm} onSubmit={handleSubmit}>
                <div className={styles.formRow}>
                  <div className={styles.field}>
                    <label>Имя</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Имя"
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Фамилия</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Фамилия"
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Отображаемое имя</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={resolvedName || 'Отображаемое имя'}
                  />
                  <span className={styles.hint}>Оставьте пустым для автоматического формирования</span>
                </div>

                <div className={styles.field}>
                  <label>Дата рождения</label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label>О себе</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Расскажите о себе"
                  />
                </div>

                <div className={styles.field}>
                  <label>Телефон</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (___) ___-__-__"
                  />
                </div>

                {error && <div className={styles.errorMessage}>{error}</div>}
                {success && <div className={styles.successMessage}>{success}</div>}

                <button type="submit" className={styles.saveButton} disabled={saving}>
                  {saving ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeSettingsTab === 'appearance' && (
          <div className={styles.settingsSection}>
            <div className={styles.settingsHeader}>
              <h3 className={styles.settingsTitle}>Внешний вид</h3>
              <p className={styles.settingsDescription}>Настройте оформление приложения</p>
            </div>
            <div className={styles.settingsBlock}>
              <div className={styles.settingsBlockTitle}>Тема оформления</div>
              <div className={styles.themeOptions}>
                <ThemeOption
                  label="Светлая"
                  value="light"
                  currentTheme={settings.theme}
                  onSelect={handleThemeChange}
                />
                <ThemeOption
                  label="Тёмная"
                  value="dark"
                  currentTheme={settings.theme}
                  onSelect={handleThemeChange}
                />
                <ThemeOption
                  label="Системная"
                  value="system"
                  currentTheme={settings.theme}
                  onSelect={handleThemeChange}
                />
              </div>
            </div>
          </div>
        )}

        {activeSettingsTab === 'notifications' && (
          <div className={styles.settingsSection}>
            <div className={styles.settingsHeader}>
              <h3 className={styles.settingsTitle}>Уведомления</h3>
              <p className={styles.settingsDescription}>Настройте оповещения</p>
            </div>
            <div className={styles.settingsBlock}>
              <div className={styles.settingsBlockTitle}>Оповещения</div>
              <ToggleRow
                label="Push-уведомления"
                enabled={settings.notificationsEnabled}
                onToggle={() => updateSetting('notificationsEnabled', !settings.notificationsEnabled)}
              />
              <ToggleRow
                label="Звук уведомлений"
                enabled={settings.soundEnabled}
                onToggle={() => updateSetting('soundEnabled', !settings.soundEnabled)}
              />
            </div>
          </div>
        )}

        {activeSettingsTab === 'account' && (
          <div className={styles.settingsSection}>
            <div className={styles.settingsHeader}>
              <h3 className={styles.settingsTitle}>Аккаунт</h3>
              <p className={styles.settingsDescription}>Управление аккаунтом</p>
            </div>
            
            <div className={styles.settingsBlock}>
              <div className={styles.settingsBlockTitle}>Управление аккаунтом</div>
              <div className={styles.accountActions}>
                <button onClick={handleLogout} className={styles.logoutButton}>
                  Выйти из аккаунта
                </button>
                <button onClick={handleDeleteAccount} className={styles.deleteButton}>
                  Удалить аккаунт
                </button>
                <button onClick={handleReset} className={styles.resetButton}>
                  Сбросить все настройки
                </button>
              </div>
            </div>

            <div className={styles.settingsBlock}>
              <div className={styles.settingsBlockTitle}>Смена email</div>
              <div className={styles.emailForm}>
                <div className={styles.field}>
                  <label>Текущий email</label>
                  <input type="email" value={user.email} disabled />
                </div>
                <div className={styles.field}>
                  <label>Новый email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="new@example.com"
                  />
                </div>
                <div className={styles.field}>
                  <label>Текущий пароль</label>
                  <input
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    placeholder="Введите пароль"
                  />
                  <span className={styles.hint}>
                    Ссылка подтверждения будет отправлена на новый адрес
                  </span>
                </div>
                <button
                  onClick={handleEmailChange}
                  className={styles.secondaryBtn}
                  disabled={changingEmail}
                >
                  {changingEmail ? 'Отправка...' : 'Обновить email'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAvatarEditor && (
        <AvatarEditor
          initialImage={photoURL}
          onSave={handleAvatarSave}
          onCancel={() => setShowAvatarEditor(false)}
        />
      )}
    </div>
  );
}