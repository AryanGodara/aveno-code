'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'neon' | 'brutal';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('brutal'); // Default to Neo-Brutalism
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('aveno-theme') as Theme;
    if (stored && (stored === 'neon' || stored === 'brutal')) {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    localStorage.setItem('aveno-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    // Apply theme class to html element
    const html = document.documentElement;
    html.classList.remove('theme-neon', 'theme-brutal');
    html.classList.add(`theme-${theme}`);
  }, [theme, mounted]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}