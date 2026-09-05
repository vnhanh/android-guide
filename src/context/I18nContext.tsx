import React, { createContext, useContext, useState } from 'react';
import { Language } from '../types';

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  vi: {
    'nav.home': 'Trang chủ',
    'nav.docs': 'Tài liệu Tech Lead',
    'nav.search': 'Tìm kiếm nhanh...',
    'nav.searchShortcut': 'Cmd + K',
    'hero.badge': 'Enterprise Mobile Developer Guide v2.0',
    'hero.title': 'Senior & Tech Lead Mobile Architect Guide',
    'hero.subtitle': 'Cẩm nang kiến trúc chuyên sâu Android, Performance profiling, Multi-module, R8/ProGuard, OOP/SOLID & Mobile System Design.',
    'hero.explore': 'Khám phá ngay',
    'hero.searchPlaceholder': 'Tìm theo từ khóa (Coroutines, Compose, Gradle, R8, SOLID)...',
    'dashboard.categoriesTitle': 'Danh mục kiến thức cốt lõi',
    'dashboard.quickStartTitle': 'Chủ đề hot & Case Study phỏng vấn',
    'dashboard.metricsTitle': 'Chỉ số kinh nghiệm & Công nghệ',
    'doc.onThisPage': 'Mục lục trang này',
    'doc.prev': 'Bài trước',
    'doc.next': 'Bài tiếp theo',
    'doc.level': 'Trình độ',
    'doc.readingTime': 'Thời gian đọc',
    'doc.tags': 'Thẻ phân loại',
    'doc.copyCode': 'Sao chép',
    'doc.copied': 'Đã sao chép!',
    'search.title': 'Tìm kiếm trong tài liệu',
    'search.noResults': 'Không tìm thấy kết quả phù hợp.',
    'search.hint': 'Nhấn ESC để đóng | Dùng phím mũi tên để di chuyển',
  },
  en: {
    'nav.home': 'Home',
    'nav.docs': 'Tech Lead Docs',
    'nav.search': 'Quick search...',
    'nav.searchShortcut': 'Cmd + K',
    'hero.badge': 'Enterprise Mobile Developer Guide v2.0',
    'hero.title': 'Senior & Tech Lead Mobile Architect Guide',
    'hero.subtitle': 'In-depth architectural reference for Android, Performance Profiling, Multi-module, R8/ProGuard, OOP/SOLID & Mobile System Design.',
    'hero.explore': 'Explore Guides',
    'hero.searchPlaceholder': 'Search by topic (Coroutines, Compose, Gradle, R8, SOLID)...',
    'dashboard.categoriesTitle': 'Core Domain Taxonomy',
    'dashboard.quickStartTitle': 'Popular Interview Cases & Topics',
    'dashboard.metricsTitle': 'Seniority Metrics & Tech Stack',
    'doc.onThisPage': 'On this page',
    'doc.prev': 'Previous article',
    'doc.next': 'Next article',
    'doc.level': 'Seniority Level',
    'doc.readingTime': 'Reading Time',
    'doc.tags': 'Tags',
    'doc.copyCode': 'Copy',
    'doc.copied': 'Copied!',
    'search.title': 'Search Documentation',
    'search.noResults': 'No matching results found.',
    'search.hint': 'Press ESC to close | Use arrow keys to navigate',
  }
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('lang') as Language;
    return saved || 'vi';
  });

  const setLang = (newLang: Language) => {
    localStorage.setItem('lang', newLang);
    setLangState(newLang);
  };

  const toggleLang = () => {
    setLang(lang === 'vi' ? 'en' : 'vi');
  };

  const t = (key: string): string => {
    return translations[lang][key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
};
