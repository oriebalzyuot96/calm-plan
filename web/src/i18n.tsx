import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { STRINGS } from '../../public/js/i18n.js';
import { loadPrefs, updatePrefs } from '../../public/js/prefs.js';
import { WEB_STRINGS } from './strings';

export type Lang = 'ar' | 'en';
type Dict = Record<string, string>;

const DICT: Record<Lang, Dict> = {
  en: { ...(STRINGS.en as Dict), ...WEB_STRINGS.en },
  ar: { ...(STRINGS.ar as Dict), ...WEB_STRINGS.ar },
};

export function translate(lang: Lang, key: string, vars: Record<string, string | number> = {}): string {
  let s = DICT[lang][key] ?? DICT.en[key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function hasKey(lang: Lang, key: string): boolean {
  return key in DICT[lang];
}

/** Sets lang, dir and the title on <html>. Arabic is right to left. */
export function applyDocumentLang(lang: Lang, doc: Document = document) {
  const html = doc.documentElement;
  html.lang = lang;
  html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  doc.title = lang === 'ar' ? 'خطة الهدوء | Calm Plan' : 'Calm Plan | خطة الهدوء';
}

export type T = (key: string, vars?: Record<string, string | number>) => string;

interface I18nValue {
  lang: Lang;
  t: T;
  setLang: (lang: Lang) => void;
  /** BCP 47 locale for dates and numbers. */
  locale: string;
}

const I18nContext = createContext<I18nValue>({
  lang: 'ar',
  t: (key, vars) => translate('ar', key, vars),
  setLang: () => {},
  locale: 'ar',
});

export function I18nProvider({ children, initial }: { children: ReactNode; initial?: Lang }) {
  // The language is one of the few preferences kept in localStorage (public/js/prefs.js).
  const [lang, setLangState] = useState<Lang>(() => initial ?? (loadPrefs().lang as Lang));
  useEffect(() => applyDocumentLang(lang), [lang]);
  const setLang = useCallback((next: Lang) => {
    updatePrefs({ lang: next });
    setLangState(next);
  }, []);
  const value = useMemo<I18nValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      locale: lang === 'ar' ? 'ar' : 'en-GB',
    }),
    [lang, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
