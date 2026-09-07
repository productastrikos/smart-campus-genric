import React from 'react';
import { ThemeToggle } from '../theme';
import { useLang, LangToggle } from '../i18n';
import { useAppMode } from '../appMode';

/**
 * StandaloneShell — chrome for a module opened in its own browser tab from the
 * Academics / Readiness launch buttons. Deliberately has NO navigation back to
 * the dashboard (no sidebar, no home link) — just the brand, the module
 * title, and the language / theme toggles. The page stands on its own.
 *
 * This shell previously always rendered the ZMU logo and institution name
 * unconditionally — it had no isGeneric awareness at all, which is why the
 * standalone SIS/LMS tabs still showed ZMU branding even with SIS.jsx itself
 * already generic-aware. Fixed here the same way as everywhere else: real
 * ZMU branding when isGeneric is false, a neutral mark/name when it's true.
 */
const GENERIC_UNIVERSITY_NAME = 'Abu Dhabi University';

export default function StandaloneShell({ titleKey, children }) {
  const { t } = useLang();
  const { isGeneric } = useAppMode();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--app-bg)' }}>
      <header style={{
        height: 'var(--app-header-h)', flexShrink: 0, background: 'var(--app-chrome-bg)',
        borderBottom: '1px solid var(--app-panel-border)',
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 18px',
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0, padding: 4, background: '#fff',
          border: '1px solid var(--app-panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isGeneric ? (
            // The ADU mark on its own — the frame here is a 34px square, too
            // small for the stacked mark-over-wordmark lockup used in the
            // sidebar and on the login screen.
            <img src="/images/adu-logo.png" alt="Abu Dhabi University" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <img src="/images/zmu-logo-full.png" alt="ZMU" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          )}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--app-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {t(titleKey)}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--app-text-faint)' }}>{isGeneric ? GENERIC_UNIVERSITY_NAME : t('app.university')}</div>
        </div>
        <LangToggle />
        <ThemeToggle />
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '18px 20px 30px', minHeight: 0 }}>
        {children}
      </main>
    </div>
  );
}
