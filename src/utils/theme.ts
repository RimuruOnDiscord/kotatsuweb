export const THEME_STORAGE_KEY = 'mangavel:theme';

export const THEME_OPTIONS = [
  { key: 'emerald', label: 'Emerald', color: '#10b981' },
  { key: 'ocean', label: 'Ocean', color: '#3b82f6' },
  { key: 'ember', label: 'Ember', color: '#ef4444' },
] as const;

export type ThemeKey = (typeof THEME_OPTIONS)[number]['key'];

const isThemeKey = (value: string | null): value is ThemeKey =>
  THEME_OPTIONS.some((theme) => theme.key === value);

export const getStoredTheme = (): ThemeKey => {
  if (typeof window === 'undefined') return 'emerald';
  const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeKey(storedValue) ? storedValue : 'emerald';
};

export const applyTheme = (theme: ThemeKey) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
};

export const setTheme = (theme: ThemeKey) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
  applyTheme(theme);
};

export const initTheme = () => {
  applyTheme(getStoredTheme());
};
