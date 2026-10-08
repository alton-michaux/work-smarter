import React, { createContext, useContext, useEffect, useState } from 'react';
import { useClientValue } from 'hooks/useClientValue';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
}

/** The saved theme, else the OS preference. Browser-only. */
function readInitialTheme(): Theme {
  const stored = localStorage.getItem('theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Toggled this session; until then follow the saved/OS theme, which can only
  // be read after hydration ('light' during SSR, as before).
  const [toggledTheme, setToggledTheme] = useState<Theme | null>(null);
  const initialTheme = useClientValue(readInitialTheme);
  const theme: Theme = toggledTheme ?? initialTheme ?? 'light';

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', next);
    setToggledTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
