'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Language, t, TranslationKey, TranslationSection, getStoredLanguage, setStoredLanguage } from '@/lib/translations';
import { supabase } from '@/lib/supabase';

interface TranslationContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: <K extends TranslationKey, S extends TranslationSection<K>>(
    section: K,
    key: S,
    params?: Record<string, string | number>
  ) => string;
}

const TranslationContext = createContext<TranslationContextType | null>(null);

interface TranslationProviderProps {
  children: ReactNode;
  initialLang?: Language;
}

export function TranslationProvider({ children, initialLang }: TranslationProviderProps) {
  const [lang, setLangState] = useState<Language>(initialLang || 'pl');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize language from localStorage or user profile
  useEffect(() => {
    const initLanguage = async () => {
      // First check localStorage
      const storedLang = getStoredLanguage();

      // Then try to get from user profile if logged in
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('language')
            .eq('auth_id', user.id)
            .single();

          if (profile?.language) {
            setLangState(profile.language as Language);
            setStoredLanguage(profile.language as Language);
            setIsInitialized(true);
            return;
          }
        }
      } catch (error) {
        // Ignore - user not logged in
      }

      setLangState(storedLang);
      setIsInitialized(true);
    };

    initLanguage();
  }, []);

  // Set language and save to localStorage + database
  const setLang = useCallback(async (newLang: Language) => {
    setLangState(newLang);
    setStoredLanguage(newLang);

    // Try to save to database if user is logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('users')
          .update({ language: newLang })
          .eq('auth_id', user.id);
      }
    } catch (error) {
      // Ignore - localStorage is enough for non-logged users
    }
  }, []);

  // Translation function wrapper
  const translate = useCallback(<K extends TranslationKey, S extends TranslationSection<K>>(
    section: K,
    key: S,
    params?: Record<string, string | number>
  ): string => {
    return t(section, key, lang, params);
  }, [lang]);

  return (
    <TranslationContext.Provider value={{ lang, setLang, t: translate }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}

// Simple hook for components that just need the current language
export function useLanguage(): Language {
  const context = useContext(TranslationContext);
  return context?.lang || 'pl';
}
