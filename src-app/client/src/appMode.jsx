import React, { createContext, useContext, useEffect } from 'react';

/**
 * APPLICATION MODE — locked to GENERIC.
 * ======================================================================
 * ZMU mode and the ZMU/Generic toggle have been removed. The app now
 * always runs in Generic mode; there is no user-facing control to
 * switch it, and no other mode exists to switch to.
 *
 * This file keeps the same Context/Provider/hook shape (and export
 * names) that the rest of the app was already importing
 * (AppModeProvider, useAppMode), so nothing else needs to change to
 * keep working — `mode` is now always 'generic' and `isGeneric` is
 * always true. `setMode`/`toggle` are kept as harmless no-ops purely
 * for backward compatibility with any existing call sites; they no
 * longer do anything.
 *
 * LOCAL ONLY / no server impact, same as before: this still never
 * touches localStorage, the server, or any CSV under /data.
 */

const MODES = { GENERIC: 'generic' };

const AppModeCtx = createContext({ mode: MODES.GENERIC, isGeneric: true, setMode: () => {}, toggle: () => {} });

export function AppModeProvider({ children }) {
  // Mirrors ThemeProvider's own dataset-attribute pattern exactly
  // (document.body.dataset.theme) - this file owns setting its own
  // attribute. index.css's Generic theme blocks key off BOTH
  // attributes together (body[data-app-mode='generic'][data-theme='dark']),
  // so this is set once, unconditionally, on mount.
  useEffect(() => {
    document.body.dataset.appMode = MODES.GENERIC;
  }, []);

  return (
    <AppModeCtx.Provider value={{ mode: MODES.GENERIC, isGeneric: true, setMode: () => {}, toggle: () => {} }}>
      {children}
    </AppModeCtx.Provider>
  );
}

export const useAppMode = () => useContext(AppModeCtx);

/**
 * Kept as a no-op so any existing `import { AppModeToggle } from
 * './appMode'` and `<AppModeToggle />` usage elsewhere in the app
 * (e.g. a header component) does not crash with "element type is
 * invalid" now that the toggle has been removed. Renders nothing.
 */
export function AppModeToggle() {
  return null;
}

export { MODES };
