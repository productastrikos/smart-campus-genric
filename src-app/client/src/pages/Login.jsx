import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '../theme';
import { useLang } from '../i18n';

const ROLES = [
  { u: 'executive', key: 'role.executive' },
  { u: 'superadmin', key: 'role.superadmin' },
  { u: 'academics', key: 'role.academics' },
  { u: 'readiness', key: 'role.readiness' },
  { u: 'finance', key: 'role.finance' },
  { u: 'ithead', key: 'role.ithead' },
  { u: 'security', key: 'role.security' },
  { u: 'facility', key: 'role.facility' },
  { u: 'squadron1', key: 'role.squadron1' },
  { u: 'squadron2', key: 'role.squadron2' },
];

// Generic Mode's user-facing role labels. Deliberately just a label
// swap — the internal role key sent to the REAL /api/auth/login (the
// `u` field above, e.g. "academics") never changes, so the existing
// backend/RBAC/ROLE_ROUTES/homeFor() in App.jsx need no changes at all.
const GENERIC_ROLE_LABELS = {
  executive: 'Executive',
  superadmin: 'Super Admin',
  academics: 'Academic Head',
  readiness: 'Operations Head',
  finance: 'Finance Head',
  ithead: 'IT Head',
  security: 'Security Head',
  facility: 'Facilities Head',
  squadron1: 'Department Lead 1',
  squadron2: 'Department Lead 2',
};

// Demo credentials — every role's password matches its username; picking a
// role in the password tab auto-fills the pair.
const CREDS = Object.fromEntries(ROLES.map((r) => [r.u, { username: r.u, password: r.u }]));

// Generic-mode credential overrides, keyed by the SAME internal role key
// so the existing CREDS lookup shape is reused. Only the two roles whose
// ZMU demo usernames are ZMU-specific ("squadron1"/"squadron2") are
// overridden; every other role's username is already institution-neutral.
// The internal role key sent to /api/auth/login is NOT changed by this —
// only the username/password pair is. The server has matching
// departmentlead1/departmentlead2 accounts that resolve back to roles
// 'squadron1'/'squadron2', so RBAC/routing behave identically.
const GENERIC_CREDS = {
  squadron1: { username: 'departmentlead1', password: 'departmentlead1' },
  squadron2: { username: 'departmentlead2', password: 'departmentlead2' },
};

// Abu Dhabi University brand red, sampled from the official logo lockup
// (#F12535), lifted slightly so it stays legible over the darkened photo.
const ADU_RED = '#FF5765';

const inputStyle = {
  width: '100%', height: 44, borderRadius: 10, padding: '0 14px', fontFamily: 'inherit',
  fontSize: 13.5, color: 'var(--app-text)', background: 'var(--app-surface)',
  border: '1px solid var(--app-panel-border)', boxSizing: 'border-box',
};
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
  textTransform: 'uppercase', color: 'var(--app-text-faint)', marginBottom: 6,
};

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('sso'); // 'sso' | 'password'
  const [role, setRole] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { t, dir } = useLang();
  const roleLabel = (r) => GENERIC_ROLE_LABELS[r.u];

  async function submitLogin(payload) {
    setErr(null); setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
      const user = await res.json();
      onLogin(user);
      navigate(user.role === 'executive' ? '/executive' : '/');
    } catch (e) { setErr(String(e.message || e)); setBusy(false); }
  }

  function switchMode(m) {
    setMode(m); setErr(null); setRole(''); setUsername(''); setPassword('');
  }

  // Password tab — selecting a role auto-fills its demo username & password.
  function credsFor(r) {
    return GENERIC_CREDS[r] || CREDS[r];
  }

  function pickRoleWithCreds(r) {
    setRole(r); setErr(null);
    const c = credsFor(r);
    setUsername(c ? c.username : '');
    setPassword(c ? c.password : '');
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!role) return setErr('Choose a role');
    if (!username.trim()) return setErr('Enter a username');
    if (!password.trim()) return setErr('Enter a password');
    submitLogin({ username: username.trim(), password, role });
  }

  function handleSso() {
    if (!role) return setErr('Choose a role first');
    submitLogin({ username: role, password: 'sso', role });
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--app-bg)', position: 'relative' }} dir={dir}>
      <div style={{ position: 'absolute', top: 18, insetInlineEnd: 20, zIndex: 5, display: 'flex', gap: 8 }}>
        <ThemeToggle />
      </div>

      {/* Left — Abu Dhabi University brand + campus hero image */}
      <div style={{
        flex: '0 0 58%', maxWidth: '58%', position: 'relative', overflow: 'hidden',
        backgroundImage: 'url(/images/adu-campus-hero.jpg)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '52px 60px',
      }}>
        {/* bottom-anchored gradient only (transparent through most of the
            image, darkening near the bottom where the heading sits) so the
            supplied photo is shown close to its original appearance. */}
        <div style={{ position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(8,12,20,0.86) 0%, rgba(8,12,20,0.38) 34%, rgba(8,12,20,0) 60%)' }} />

        {/* ADU lockup, top-left. The mark is navy-on-transparent, so it sits on
            a white chip rather than directly on the photograph. */}
        <div style={{ position: 'relative', display: 'flex' }}>
          <div style={{
            background: '#fff', borderRadius: 14, padding: '14px 20px',
            boxShadow: '0 10px 34px rgba(8,12,20,0.30)', display: 'flex', alignItems: 'center',
          }}>
            <img src="/images/adu-logo-full.png" alt="Abu Dhabi University"
              style={{ height: 74, width: 'auto', display: 'block' }} />
          </div>
        </div>

        <div style={{ position: 'relative', maxWidth: 560 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
            color: ADU_RED, marginBottom: 10,
          }}>
            Abu Dhabi University
          </div>
          <h1 style={{ fontSize: 46, fontWeight: 800, color: '#fdf7ea', lineHeight: 1.12, letterSpacing: '-0.02em' }}>
            Smart Digital Campus
          </h1>
        </div>

        {/* CC BY-SA 4.0 requires visible attribution for the campus photograph. */}
        <div style={{
          position: 'absolute', insetInlineEnd: 14, bottom: 10, fontSize: 9,
          color: 'rgba(253,247,234,0.42)', letterSpacing: '0.01em',
        }}>
          ADU Al Ain Campus · photo Emad Alsharif 88 · CC BY-SA 4.0
        </div>
      </div>

      {/* Right — sign-in form */}
      <div style={{ flex: '0 0 42%', maxWidth: '42%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 52px', background: 'var(--app-panel)' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--app-text)', letterSpacing: '-0.02em' }}>{t('login.title')}</h2>
          <p style={{ fontSize: 13, color: 'var(--app-text-faint)', marginTop: 6, marginBottom: 20 }}>
            Abu Dhabi University · Smart Digital Campus platform
          </p>

          {/* mode toggle — SSO vs Username & Password */}
          <div style={{
            display: 'flex', gap: 4, padding: 4, borderRadius: 11, marginBottom: 20,
            background: 'var(--app-surface-soft)', border: '1px solid var(--app-border)',
          }}>
            {[['sso', t('login.tabSso')], ['password', t('login.tabPassword')]].map(([m, label]) => (
              <button key={m} type="button" onClick={() => switchMode(m)}
                style={{
                  flex: 1, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 700, letterSpacing: '0.01em',
                  background: mode === m ? 'var(--app-accent)' : 'transparent',
                  color: mode === m ? '#231d10' : 'var(--app-text-faint)',
                  transition: 'background 0.15s ease, color 0.15s ease',
                }}>
                {label}
              </button>
            ))}
          </div>

          {mode === 'sso' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>{t('login.role')}</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="" disabled>{t('login.rolePlaceholder')}</option>
                  {ROLES.map((r) => <option key={r.u} value={r.u}>{roleLabel(r)}</option>)}
                </select>
              </div>

              <p style={{ fontSize: 12, color: 'var(--app-text-faint)', lineHeight: 1.6, margin: 0 }}>
                {t('login.ssoHint')}
              </p>

              {err && <div style={{ fontSize: 12, color: 'var(--app-danger)', fontWeight: 600 }}>{err}</div>}

              <button type="button" onClick={handleSso} disabled={busy}
                style={{ width: '100%', height: 46, borderRadius: 10, cursor: 'pointer',
                  background: 'var(--app-accent)', border: 'none', color: '#231d10',
                  fontSize: 14, fontWeight: 750, opacity: busy ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
                  <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                {busy ? '···' : t('login.uaepass')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>{t('login.role')}</label>
                <select value={role} onChange={(e) => pickRoleWithCreds(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="" disabled>{t('login.rolePlaceholder')}</option>
                  {ROLES.map((r) => <option key={r.u} value={r.u}>{roleLabel(r)}</option>)}
                </select>
              </div>

              <div>
                <label style={labelStyle}>{t('login.username')}</label>
                <input value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('login.usernamePlaceholder')} autoComplete="off" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>{t('login.password')}</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')} autoComplete="new-password" style={inputStyle} />
              </div>

              {err && <div style={{ fontSize: 12, color: 'var(--app-danger)', fontWeight: 600 }}>{err}</div>}

              <button type="submit" disabled={busy}
                style={{
                  width: '100%', height: 46, borderRadius: 10, cursor: 'pointer', marginTop: 4,
                  background: 'var(--app-accent)', border: 'none', color: '#231d10',
                  fontSize: 14, fontWeight: 750, opacity: busy ? 0.6 : 1,
                }}>
                {busy ? '···' : t('login.signIn')}
              </button>
            </form>
          )}

          <p style={{ fontSize: 11, color: 'var(--app-text-faint)', textAlign: 'center', marginTop: 22, lineHeight: 1.6 }} className="ltr-num">
            {t('login.credsHint')}
          </p>
        </div>
      </div>
    </div>
  );
}