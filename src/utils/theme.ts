export const THEME_STORAGE_KEY = 'mangavel:theme';
export const PATTERN_STORAGE_KEY = 'kotatsutv:pattern';

export const THEME_OPTIONS = [
  { key: 'emerald', label: 'Emerald', color: '#10b981' },
  { key: 'ocean', label: 'Ocean', color: '#7dd3fc' },
  { key: 'ember', label: 'Ember', color: '#eeac76' },
  { key: 'sakura', label: 'Sakura', color: '#f472b6' }
] as const;

export type ThemeKey = (typeof THEME_OPTIONS)[number]['key'] | 'dynamic' | (string & {});

export const PATTERN_OPTIONS = [
  { key: 'noise', label: 'Noise' },
  { key: 'grid', label: 'Grid' },
  { key: 'dots', label: 'Dots' },
  { key: 'none', label: 'None' }
] as const;

export type PatternKey = (typeof PATTERN_OPTIONS)[number]['key'];

const isThemeKey = (value: string | null): value is ThemeKey => {
  if (!value) return false;
  if (value === 'dynamic') return true;
  if (THEME_OPTIONS.some((theme) => theme.key === value)) return true;
  return value.startsWith('#');
};

export const getStoredTheme = (): ThemeKey => {
  if (typeof window === 'undefined') return 'emerald';
  const storedValue = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeKey(storedValue) ? storedValue : 'emerald';
};

export const getStoredPattern = (): PatternKey => {
  if (typeof window === 'undefined') return 'noise';
  const val = window.localStorage.getItem(PATTERN_STORAGE_KEY);
  if (val && PATTERN_OPTIONS.some(p => p.key === val)) return val as PatternKey;
  return 'noise';
};

export const applyTheme = (theme: ThemeKey) => {
  if (typeof document === 'undefined') return;
  if (theme.startsWith('#')) {
    document.documentElement.dataset.theme = 'custom';
    document.documentElement.style.setProperty('--app-accent', theme);
    document.documentElement.style.setProperty('--app-accent-strong', theme);
    document.documentElement.style.setProperty('--app-accent-muted', `${theme}20`);
    document.documentElement.style.setProperty('--app-accent-soft', `${theme}40`);
  } else {
    document.documentElement.style.removeProperty('--app-accent');
    document.documentElement.style.removeProperty('--app-accent-strong');
    document.documentElement.style.removeProperty('--app-accent-muted');
    document.documentElement.style.removeProperty('--app-accent-soft');
    document.documentElement.dataset.theme = theme;
  }
};

export const setTheme = (theme: ThemeKey) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
  applyTheme(theme);
};

export const applyPattern = (pattern: PatternKey) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.pattern = pattern;
};

export const setPattern = (pattern: PatternKey) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(PATTERN_STORAGE_KEY, pattern);
  }
  applyPattern(pattern);
};

export const initTheme = () => {
  applyTheme(getStoredTheme());
  applyPattern(getStoredPattern());
};
