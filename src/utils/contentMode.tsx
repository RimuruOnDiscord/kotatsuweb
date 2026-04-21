import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type ContentMode = 'manga' | 'anime';

export const CONTENT_MODE_STORAGE_KEY = 'mangavel:content-mode';

const getInitialMode = (): ContentMode => {
  if (typeof window === 'undefined') return 'manga';
  return window.localStorage.getItem(CONTENT_MODE_STORAGE_KEY) === 'anime' ? 'anime' : 'manga';
};

export const getStoredContentMode = (): ContentMode => getInitialMode();

type ContentModeContextValue = {
  mode: ContentMode;
  isAnimeMode: boolean;
  setMode: (mode: ContentMode) => void;
  toggleMode: () => void;
  brandName: string;
};

const ContentModeContext = createContext<ContentModeContextValue | null>(null);

export const ContentModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ContentMode>(getInitialMode);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CONTENT_MODE_STORAGE_KEY, mode);
    window.dispatchEvent(new CustomEvent('mangavel:content-mode-change', { detail: mode }));
  }, [mode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncMode = () => setModeState(getInitialMode());
    window.addEventListener('storage', syncMode);
    window.addEventListener('mangavel:content-mode-change', syncMode as EventListener);

    return () => {
      window.removeEventListener('storage', syncMode);
      window.removeEventListener('mangavel:content-mode-change', syncMode as EventListener);
    };
  }, []);

  const value = useMemo<ContentModeContextValue>(
    () => ({
      mode,
      isAnimeMode: mode === 'anime',
      setMode: setModeState,
      toggleMode: () => setModeState((current) => (current === 'anime' ? 'manga' : 'anime')),
      brandName: mode === 'anime' ? 'kotatsutv' : 'kotatsuweb',
    }),
    [mode]
  );

  return <ContentModeContext.Provider value={value}>{children}</ContentModeContext.Provider>;
};

export const useContentMode = () => {
  const context = useContext(ContentModeContext);
  if (!context) {
    throw new Error('useContentMode must be used inside ContentModeProvider');
  }
  return context;
};
