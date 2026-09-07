import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeCtx = createContext({ theme: 'dark', toggle: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('zmu_theme') || 'light');
  useEffect(() => {
    document.body.dataset.theme = theme;
    localStorage.setItem('zmu_theme', theme);
  }, [theme]);
  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);

/**
 * Theme toggle - moon when the app is in LIGHT mode (click to go dark),
 * sun when in DARK mode (click to go light). Icon only, no text.
 *
 * Outer button sizing comes ENTIRELY from the shared `.icon-btn` class
 * (index.css) - the same single source of truth used by LangToggle (the
 * Arabic button) and AppModeToggle - so all three header controls have
 * identical outer dimensions. No inline width/height/padding/radius
 * overrides here, deliberately: those previously made this button
 * 44x44 while its neighbours were 34x34.
 *
 * Uses the existing useTheme() hook and its toggle() - the theme system
 * itself (ThemeProvider, localStorage 'zmu_theme', the body dataset
 * attribute) is completely untouched.
 */
export function ThemeToggle({ className = 'icon-btn', style }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      className={className}
      onClick={toggle}
      title="Toggle light / dark theme"
      aria-label="Toggle light / dark theme"
      style={style}
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" style={{ width: 17, height: 17 }}>
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 17, height: 17 }}>
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}
