import { useEffect, useState } from 'react';
import ru from '../locales/ru.json';

const translations = { ru };

export function useTranslation() {
  const [language] = useState('ru');
  const [t, setT] = useState(() => (key) => key);
  
  useEffect(() => {
    const dict = translations[language];
    if (dict) {
      setT(() => (key, params = {}) => {
        let text = dict[key] || key;
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{{${k}}}`, v);
        });
        return text;
      });
    }
  }, [language]);
  
  return { t, language };
}