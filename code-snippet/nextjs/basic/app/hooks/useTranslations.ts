'use client';

import { useStore } from '@/app/store';
import { locales } from '@/app/lib/locales';

export const useTranslations = () => {
  const language: any = useStore((state: any) => state.language);

  const t = (key: string) => {
    const translation = locales[language]?.[key] || key;
    return typeof translation === 'function' ? (...args: any) => translation(...args) : translation;
  };

  return { t, language };
};