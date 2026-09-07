/**
 * apiKeyFor — the single URL → filename mapping used by the static build.
 * ======================================================================
 * The dashboard normally talks to the Express API in /server. For static
 * hosting (Hostinger, or any plain file host) every GET response is baked
 * to a JSON file at build time by scripts/bake-api.mjs, and the client's
 * fetch shim (services/staticApi.js) reads those files instead.
 *
 * Both sides MUST derive the same filename from the same request URL, so
 * that derivation lives here and nowhere else. Import it, never re-implement.
 *
 * Rules:
 *   · the leading `/api` is stripped; remaining path separators become `__`
 *   · query params are SORTED (so `?a=1&b=2` and `?b=2&a=1` are one file)
 *     and appended as `~key-value` pairs
 *   · empty-valued params are dropped, matching how the API treats them
 *   · anything outside [A-Za-z0-9._~-] becomes `_`
 *   · over-long keys fall back to a hash so no filename exceeds the
 *     255-byte limit every filesystem imposes
 *
 *   /api/overview                        -> overview
 *   /api/twin/building/Z03               -> twin__building__Z03
 *   /api/ext/merit?college=ALL           -> ext__merit~college-ALL
 *   /api/overview?squads=Falcon,Oryx     -> overview~squads-Falcon_Oryx
 */

/* Small, stable, dependency-free string hash (FNV-1a, 32-bit) — only ever
   reached by pathological URLs, but both sides must agree on it. */
function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

const MAX_KEY = 180;

export function apiKeyFor(rawUrl) {
  // A base is required for relative URLs; its origin is never used.
  const u = new URL(String(rawUrl), 'http://static.local');

  const path = u.pathname
    .replace(/^\/+/, '')
    .replace(/^api\/?/, '')
    .replace(/\/+$/, '');

  const params = [...u.searchParams.entries()]
    .filter(([, v]) => v !== '' && v != null)
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));

  const raw = (path.replace(/\//g, '__') || 'index')
    + params.map(([k, v]) => `~${k}-${v}`).join('');

  const key = raw.replace(/[^A-Za-z0-9._~-]/g, '_');
  return key.length <= MAX_KEY ? key : `${key.slice(0, MAX_KEY)}.${hash32(raw)}`;
}

/** True for any URL this shim is responsible for (same-origin `/api/...`). */
export function isApiUrl(rawUrl) {
  const s = String(rawUrl);
  if (s.startsWith('/api/') || s === '/api') return true;
  try {
    const u = new URL(s, window.location.href);
    return u.origin === window.location.origin && /^\/api(\/|$)/.test(u.pathname);
  } catch {
    return false;
  }
}
