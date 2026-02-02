'use client';

import { Language } from '@/lib/translations';
import { useTranslation } from '@/hooks/useTranslation';

interface LanguageSelectorProps {
  variant?: 'default' | 'compact' | 'flags';
  className?: string;
  showLabel?: boolean;
}

export function LanguageSelector({
  variant = 'default',
  className = '',
  showLabel = true
}: LanguageSelectorProps) {
  const { lang, setLanguage, t } = useTranslation();

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
  ];

  if (variant === 'flags') {
    return (
      <div className={`flex gap-2 ${className}`}>
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => setLanguage(language.code)}
            className={`text-2xl p-2 rounded-lg transition-all ${
              lang === language.code
                ? 'bg-violet-600 ring-2 ring-violet-400'
                : 'bg-muted hover:bg-accent'
            }`}
            title={language.name}
          >
            {language.flag}
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <select
        value={lang}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className={`bg-muted text-foreground text-sm rounded-lg px-2 py-1 border border-border focus:border-violet-500 focus:outline-none cursor-pointer ${className}`}
      >
        {languages.map((language) => (
          <option key={language.code} value={language.code}>
            {language.flag} {language.code.toUpperCase()}
          </option>
        ))}
      </select>
    );
  }

  // Default variant
  return (
    <div className={`${className}`}>
      {showLabel && (
        <label className="block text-muted-foreground text-sm mb-2">
          {t('common', 'selectLanguage')}
        </label>
      )}
      <div className="flex gap-2">
        {languages.map((language) => (
          <button
            key={language.code}
            onClick={() => setLanguage(language.code)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              lang === language.code
                ? 'bg-violet-600 text-white ring-2 ring-violet-400'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            <span className="text-lg">{language.flag}</span>
            <span>{language.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Standalone selector for login page (doesn't require context)
interface StandaloneLanguageSelectorProps {
  value: Language;
  onChange: (lang: Language) => void;
  className?: string;
}

export function StandaloneLanguageSelector({
  value,
  onChange,
  className = ''
}: StandaloneLanguageSelectorProps) {
  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'pl', name: 'Polski', flag: '🇵🇱' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
  ];

  return (
    <div className={`flex gap-2 ${className}`}>
      {languages.map((language) => (
        <button
          key={language.code}
          type="button"
          onClick={() => onChange(language.code)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
            value === language.code
              ? 'bg-violet-600 text-white ring-2 ring-violet-400'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          <span className="text-lg">{language.flag}</span>
          <span>{language.name}</span>
        </button>
      ))}
    </div>
  );
}
