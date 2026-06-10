import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const DEFAULT_SETTINGS = {
  theme: 'system',
  language: 'ru',
  notificationsEnabled: true,
  soundEnabled: true
};

const useSettingsStore = create(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      
      updateSetting: (key, value) => {
        set((state) => ({
          settings: { ...state.settings, [key]: value }
        }));
        const newSettings = { ...get().settings, [key]: value };
        get().applyTheme(newSettings);
      },
      
      resetSettings: () => {
        set({ settings: DEFAULT_SETTINGS });
        get().applyTheme(DEFAULT_SETTINGS);
      },
      
      getEffectiveTheme: () => {
        const { theme } = get().settings;
        if (theme !== 'system') return theme;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      },
      
      applyTheme: (settings) => {
        const theme = settings?.theme || get().settings.theme;
        let effectiveTheme = theme;
        if (effectiveTheme === 'system') {
          effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', effectiveTheme);
      }
    }),
    {
      name: 'messenger-settings',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.applyTheme(state.settings);
        }
      }
    }
  )
);

// Применяем тему при загрузке
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
mediaQuery.addEventListener('change', (e) => {
  const store = useSettingsStore.getState();
  if (store.settings.theme === 'system') {
    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
  }
});

export default useSettingsStore;