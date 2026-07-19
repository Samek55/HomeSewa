import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language } from '../src/i18n/translations';

const STORAGE_KEY = 'appLanguage';

type LanguageContextValue = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const lookup = (dict: any, key: string): string | undefined =>
  key.split('.').reduce((obj, part) => (obj ? obj[part] : undefined), dict);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored === 'en' || stored === 'ne') setLanguageState(stored);
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {});
  };

  const t = (key: string, params?: Record<string, string>): string => {
    // Falls back to English if a Nepali string is ever missing for a key.
    let str = lookup(translations[language], key) ?? lookup(translations.en, key) ?? key;
    if (params) {
      Object.entries(params).forEach(([token, value]) => {
        str = str.replace(`{${token}}`, value);
      });
    }
    return str;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
