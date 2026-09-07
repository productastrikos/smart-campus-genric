import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './theme';
import { LangProvider } from './i18n';
import { AppModeProvider } from './appMode';
import { installStaticApi } from './services/staticApi';
import './index.css';

// Static-build only (VITE_STATIC_API=1): routes /api/* to the JSON
// snapshots in /api-data so the site needs no backend. No-op otherwise.
// Must run before anything renders, since Layout fetches on mount.
installStaticApi();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* AppModeProvider sits ABOVE LangProvider so the language layer can
          read the current app mode - Generic Mode is English-only, and
          LangProvider needs useAppMode() to enforce that. AppModeProvider
          itself depends on neither language nor theme, so hoisting it is
          safe and changes nothing else. */}
      <AppModeProvider>
        <LangProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </LangProvider>
      </AppModeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
