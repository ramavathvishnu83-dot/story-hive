import { createContext, useContext, useState, useCallback } from 'react';
import { translations, LANGUAGES } from '../i18n/translations';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() =>
    localStorage.getItem('sh_lang') || 'en'
  );

  const changeLang = useCallback((code) => {
    setLang(code);
    localStorage.setItem('sh_lang', code);
  }, []);

  // t('common.save') → translated string
  const t = useCallback((key) => {
    const keys = key.split('.');
    let obj = translations;
    for (const k of keys) {
      obj = obj?.[k];
      if (!obj) return key;
    }
    return obj[lang] || obj.en || key;
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, changeLang, t, LANGUAGES }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => useContext(LangContext);
