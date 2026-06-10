import { useEffect } from 'react';
import useSettingsStore from '../../stores/useSettingsStore';
import { useTranslation } from '../../hooks/useTranslation';
import styles from './Settings.module.css';

function ThemeOption({ label, value, currentTheme, onSelect }) {
  const isActive = currentTheme === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`${styles.option} ${isActive ? styles.optionActive : ''}`}
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
        {enabled ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

export default function Settings() {
  const { t } = useTranslation();
  const { settings, updateSetting, resetSettings, getEffectiveTheme } = useSettingsStore();
  
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
  
  const handleThemeChange = (value) => {
    updateSetting('theme', value);
  };
  
  const handleReset = () => {
    if (window.confirm(t('settings.resetConfirm'))) {
      resetSettings();
    }
  };
  
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>{t('settings.title')}</h2>
      
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('settings.theme')}</h3>
        <div className={styles.optionsGroup}>
          <ThemeOption
            label={t('settings.themeLight')}
            value="light"
            currentTheme={settings.theme}
            onSelect={handleThemeChange}
          />
          <ThemeOption
            label={t('settings.themeDark')}
            value="dark"
            currentTheme={settings.theme}
            onSelect={handleThemeChange}
          />
          <ThemeOption
            label={t('settings.themeSystem')}
            value="system"
            currentTheme={settings.theme}
            onSelect={handleThemeChange}
          />
        </div>
      </div>
      
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('settings.notifications')}</h3>
        <ToggleRow
          label={t('settings.notificationsEnable')}
          enabled={settings.notificationsEnabled}
          onToggle={() => updateSetting('notificationsEnabled', !settings.notificationsEnabled)}
        />
        <ToggleRow
          label={t('settings.soundEnable')}
          enabled={settings.soundEnabled}
          onToggle={() => updateSetting('soundEnabled', !settings.soundEnabled)}
        />
      </div>
      
      <div className={styles.section}>
        <button
          type="button"
          onClick={handleReset}
          className={styles.resetButton}
        >
          {t('settings.reset')}
        </button>
      </div>
    </div>
  );
}