import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, useTranslation as useTranslationHook } from '@/i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultValue?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function normalizeLanguage(value: string | null): Language {
  if (value === 'en' || value === 'sw' || value === 'yo' || value === 'ha' || value === 'zu') return value;
  return 'fr';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() =>
    normalizeLanguage(localStorage.getItem('afritok-language'))
  );

  const t = useTranslationHook(language);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('afritok-language', lang);
  };

  useEffect(() => {
    const handleSettingsChange = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      const value = detail?.language;
      if (!value) return;

      const names: Record<string, Language> = {
        'Français': 'fr',
        'English': 'en',
        'Kiswahili': 'sw',
        'Yorùbá': 'yo',
        'Hausa': 'ha',
        'isiZulu': 'zu',
      };
      const next = names[value] ?? normalizeLanguage(value);
      setLanguage(next);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'afritok-language') return;
      setLanguageState(normalizeLanguage(event.newValue));
    };

    window.addEventListener('afritok:settings-change', handleSettingsChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('afritok:settings-change', handleSettingsChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
