import { useState, useCallback, useEffect } from 'react';
import type { Language, TranslationStrings } from './types';
import { zh } from './locales/zh';
import { en } from './locales/en';

const translations: Record<Language, TranslationStrings> = {
  zh,
  en,
};

const languageNames: Record<Language, string> = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
};

const defaultLanguage: Language = 'zh';

function getStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem('app-language');
    if (stored && Object.keys(translations).includes(stored)) {
      return stored as Language;
    }
  } catch {
    return defaultLanguage;
  }
  
  const browserLang = navigator.language.split('-')[0];
  if (Object.keys(translations).includes(browserLang)) {
    return browserLang as Language;
  }
  
  return defaultLanguage;
}

export interface I18nState {
  language: Language;
  t: TranslationStrings;
  setLanguage: (lang: Language) => void;
  getLanguageName: (lang: Language) => string;
  availableLanguages: Language[];
}

let globalState: I18nState | null = null;
let listeners: Array<(state: I18nState) => void> = [];

function notifyListeners() {
  listeners.forEach(listener => listener(globalState!));
}

export function useI18n(): I18nState {
  const [state, setState] = useState<I18nState>(() => {
    if (globalState) return globalState;
    
    const lang = getStoredLanguage();
    globalState = {
      language: lang,
      t: translations[lang],
      setLanguage: (newLang: Language) => {
        if (!translations[newLang]) return;
        
        localStorage.setItem('app-language', newLang);
        globalState = {
          ...globalState!,
          language: newLang,
          t: translations[newLang],
        };
        notifyListeners();
      },
      getLanguageName: (lang: Language) => languageNames[lang] || lang,
      availableLanguages: Object.keys(translations) as Language[],
    };
    return globalState;
  });
  
  useEffect(() => {
    listeners.push(setState);
    return () => {
      listeners = listeners.filter(l => l !== setState);
    };
  }, []);
  
  return state;
}

export function t(key: string, params?: Record<string, string | number>): string {
  const currentLang = globalState?.language || defaultLanguage;
  const strings = translations[currentLang];
  
  const keys = key.split('.');
  let value: unknown = strings;
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k];
    } else {
      return key;
    }
  }
  
  if (typeof value !== 'string') return key;
  
  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, paramKey) => {
      return String(params[paramKey] ?? '');
    });
  }
  
  return value;
}

export function getAvailableLanguages(): Language[] {
  return Object.keys(translations) as Language[];
}

export function getLanguageName(lang: Language): string {
  return languageNames[lang] || lang;
}

export function getCurrentLanguage(): Language {
  return globalState?.language || defaultLanguage;
}

export function setLanguage(lang: Language): void {
  if (!translations[lang]) return;
  
  localStorage.setItem('app-language', lang);
  globalState = {
    ...globalState!,
    language: lang,
    t: translations[lang],
  };
  notifyListeners();
}

export { translations, languageNames };