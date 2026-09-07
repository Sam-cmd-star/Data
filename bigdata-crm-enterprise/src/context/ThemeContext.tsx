import React, { createContext, useContext, useMemo, useState } from 'react';

const KEY = 'nexus-theme';

export type Theme = 'dark' | 'light';

function readTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* ignore */
  }
  return 'dark';
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
}

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const initial = readTheme();
    applyTheme(initial);
    return initial;
  });

  const value = useMemo(
    () => ({
      theme,
      toggle() {
        setTheme((prev) => {
          const next: Theme = prev === 'dark' ? 'light' : 'dark';
          try {
            localStorage.setItem(KEY, next);
          } catch {
            /* ignore */
          }
          applyTheme(next);
          return next;
        });
      },
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme');
  return ctx;
}
