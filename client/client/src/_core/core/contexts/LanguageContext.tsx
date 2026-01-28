import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, useTranslation as useTranslationHook } from '@/i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultValue?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    // Récupérer la langue depuis le localStorage ou utiliser le français par défaut
    const saved = localStorage.getItem('afritok-language') as Language | null;
    return saved || 'fr';
  });

  const t = useTranslationHook(language);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('afritok-language', lang);
  };

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
