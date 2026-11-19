import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SiteLang } from '../utils/i18n';

const LANG_STORAGE_KEY = 'parfumerie_elkhalifi_lang_v1';

interface LanguageContextValue {
  lang: SiteLang;
  isAr: boolean;
  setLang: (lang: SiteLang) => void;
  toggleLang: () => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'fr',
  isAr: false,
  setLang: () => {},
  toggleLang: () => {},
});

function readInitialLang(): SiteLang {
  try {
    const params = new URLSearchParams(window.location.search);
    const paramLang = params.get('lang');
    if (paramLang === 'ar' || paramLang === 'fr') return paramLang;
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'ar' || saved === 'fr') return saved;
  } catch {
    // ignore storage errors
  }
  return 'fr';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<SiteLang>(() => readInitialLang());

  const setLang = useCallback((next: SiteLang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next: SiteLang = prev === 'fr' ? 'ar' : 'fr';
      try {
        window.localStorage.setItem(LANG_STORAGE_KEY, next);
      } catch {
        // ignore storage errors
      }
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      isAr: lang === 'ar',
      setLang,
      toggleLang,
    }),
    [lang, setLang, toggleLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
