import { useState } from 'react';
import { Button } from '../UI';
import { useI18n, getAvailableLanguages, getLanguageName } from '@/i18n';
import type { Language } from '@/i18n/types';

export interface LanguageSelectorProps {
  variant?: 'dropdown' | 'buttons' | 'compact';
  className?: string;
}

export function LanguageSelector({ 
  variant = 'dropdown', 
  className 
}: LanguageSelectorProps) {
  const { language, setLanguage, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  
  const languages = getAvailableLanguages();
  
  if (variant === 'buttons') {
    return (
      <div className={`language-selector-buttons ${className || ''}`}>
        {languages.map((lang) => (
          <Button
            key={lang}
            variant={language === lang ? 'primary' : 'secondary'}
            size="small"
            onClick={() => setLanguage(lang)}
          >
            {getLanguageName(lang)}
          </Button>
        ))}
      </div>
    );
  }
  
  if (variant === 'compact') {
    return (
      <button
        className={`language-selector-compact ${className || ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={t.settings.language}
      >
        <span className="language-icon">🌐</span>
        <span className="language-current">{getLanguageName(language)}</span>
        {isOpen && (
          <div className="language-dropdown-mini">
            {languages.map((lang) => (
              <button
                key={lang}
                className={`language-option ${language === lang ? 'active' : ''}`}
                onClick={() => {
                  setLanguage(lang);
                  setIsOpen(false);
                }}
              >
                {getLanguageName(lang)}
              </button>
            ))}
          </div>
        )}
      </button>
    );
  }
  
  return (
    <div className={`language-selector ${className || ''}`}>
      <Button
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        className="language-trigger"
      >
        <span className="language-icon">🌐</span>
        <span className="language-label">{getLanguageName(language)}</span>
        <span className={`language-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </Button>
      
      {isOpen && (
        <div className="language-dropdown">
          <div className="language-dropdown-header">
            {t.settings.language}
          </div>
          {languages.map((lang) => (
            <button
              key={lang}
              className={`language-option ${language === lang ? 'active' : ''}`}
              onClick={() => {
                setLanguage(lang);
                setIsOpen(false);
              }}
            >
              <span className="language-option-name">{getLanguageName(lang)}</span>
              {language === lang && (
                <span className="language-option-check">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const { language, setLanguage } = useI18n();
  const languages = getAvailableLanguages();
  
  const currentIndex = languages.indexOf(language);
  const nextLanguage = languages[(currentIndex + 1) % languages.length];
  
  return (
    <button
      className={`language-switcher ${className || ''}`}
      onClick={() => setLanguage(nextLanguage)}
      title={`切换到 ${getLanguageName(nextLanguage)}`}
    >
      {getLanguageName(language)}
    </button>
  );
}