import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, useTranslation as useTranslationHook } from '@/i18n/translations';
import { ExtendedLanguage, languageAdditions } from '@/i18n/languageAdditions';

interface LanguageContextType {
  language: ExtendedLanguage;
  setLanguage: (lang: ExtendedLanguage) => void;
  t: (key: string, defaultValue?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

function normalizeLanguage(value: string | null): ExtendedLanguage {
  if (value === 'en' || value === 'sw' || value === 'yo' || value === 'ha' || value === 'zu' || value === 'es' || value === 'ar' || value === 'pt') return value;
  return 'fr';
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<ExtendedLanguage>(() => normalizeLanguage(localStorage.getItem('afritok-language')));
  const baseTranslate = useTranslationHook(language as Language);
  const t = (key: string, defaultValue?: string) => languageAdditions[language as 'es' | 'ar' | 'pt']?.[key] ?? baseTranslate(key, defaultValue);

  const setLanguage = (lang: ExtendedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('afritok-language', lang);
  };

  useEffect(() => {
    const handleSettingsChange = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      const value = detail?.language;
      if (!value) return;
      const names: Record<string, ExtendedLanguage> = {
        'Français': 'fr', 'English': 'en', 'Kiswahili': 'sw', 'Yorùbá': 'yo', 'Hausa': 'ha', 'isiZulu': 'zu',
        'Español': 'es', 'العربية': 'ar', 'Português': 'pt',
      };
      setLanguage(names[value] ?? normalizeLanguage(value));
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'afritok-language') setLanguageState(normalizeLanguage(event.newValue));
    };
    window.addEventListener('afritok:settings-change', handleSettingsChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('afritok:settings-change', handleSettingsChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
}
