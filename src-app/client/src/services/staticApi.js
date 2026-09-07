/**
 * STATIC API SHIM — lets the whole dashboard run with no Node process.
 * ======================================================================
 * `npm run build:static` snapshots every GET endpoint of the Express API
 * into dist/api-data/<key>.json (see scripts/bake-api.mjs) and sets
 * VITE_STATIC_API=1. This module then patches window.fetch so that every
 * `/api/...` request the app already makes is served from those files
 * instead of the network — no call site changes anywhere.
 *
 * Reads are exact snapshots of what the live API returns. Writes are the
 * demo levers, which were always in-memory server state that reset on
 * restart; here they resolve client-side:
 *
 *   POST /api/auth/login   — resolved against the baked account list, so
 *                            sign-in works exactly as it does live.
 *   POST/DELETE /api/iot/sensors — kept in localStorage, so add/remove
 *                            still works and now survives a reload.
 *   every other write      — 503 with a plain explanation, which the
 *                            existing `r.ok ? ... : j.error` call sites
 *                            already surface as an inline message.
 *
 * In a normal (`npm run build` / `npm run dev`) build VITE_STATIC_API is
 * unset, install() returns immediately and window.fetch is untouched.
 */
import { apiKeyFor, isApiUrl } from './apiKey';

export const STATIC_API = import.meta.env.VITE_STATIC_API === '1';

// Vite rewrites BASE_URL at build time; '/' unless the site is hosted in a
// subdirectory. Keeps the shim working either way.
//
// The snapshots deliberately live under /api-data/, NOT /api/ — the shim
// fetches them with the patched window.fetch, so an /api/ path would match
// isApiUrl() and recurse into itself.
const DATA_ROOT = `${import.meta.env.BASE_URL || '/'}api-data/`.replace(/\/{2,}/g, '/');

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const READ_ONLY = {
  error:
    'This deployment is a static snapshot — live write-back is disabled. '
    + 'Run the platform with its API server (npm run dev) to use this lever.',
};

const SENSOR_STORE = 'adu_static_iot_sensors';

/* ── local IoT sensor overlay ──────────────────────────────────────────
   Baked GET responses are the seed; added/removed sensors are layered on
   top per browser so the add & delete levers on /iot stay usable. */
function loadOverlay() {
  try {
    return JSON.parse(localStorage.getItem(SENSOR_STORE) || '{"added":[],"removed":[]}');
  } catch {
    return { added: [], removed: [] };
  }
}
function saveOverlay(o) {
  try { localStorage.setItem(SENSOR_STORE, JSON.stringify(o)); } catch { /* private mode */ }
}

function applySensorOverlay(payload) {
  const o = loadOverlay();
  if (!o.added.length && !o.removed.length) return payload;
  const removed = new Set(o.removed);
  const sensors = [...o.added, ...(payload.sensors || [])]
    .filter((s) => !removed.has(s.id))
    .sort((a, b) => a.health_pct - b.health_pct);
  const online = sensors.filter((s) => s.status === 'online').length;
  return {
    ...payload,
    sensors,
    kpis: {
      ...payload.kpis,
      total: sensors.length,
      online,
      offline: sensors.length - online,
    },
  };
}

async function readBaked(url) {
  const res = await fetch(`${DATA_ROOT}${apiKeyFor(url)}.json`, { cache: 'force-cache' });
  if (!res.ok) return null;
  return res.json();
}

/* ── writes ───────────────────────────────────────────────────────────── */

async function handleLogin(init) {
  let body = {};
  try { body = JSON.parse(init?.body || '{}'); } catch { /* keep empty */ }
  const accounts = await readBaked('/api/__accounts');
  if (!accounts) return json({ error: 'Account list unavailable in this static build' }, 500);

  const u = accounts[String(body.username || '').trim().toLowerCase()];
  // Same messages, same order of checks, same status codes as server/ext/api.js.
  if (!u) return json({ error: 'Unknown account — pick a role to auto-fill a demo login' }, 401);
  if (body.role && body.role !== u.role) return json({ error: 'Selected role does not match this account' }, 401);
  const pw = String(body.password || '');
  if (pw !== u.password && pw !== 'sso') return json({ error: 'Incorrect password for this account' }, 401);

  const { password, ...safe } = u;
  return json(safe);
}

async function handleSensorAdd(init) {
  let body = {};
  try { body = JSON.parse(init?.body || '{}'); } catch { /* keep empty */ }
  const base = await readBaked('/api/iot/sensors');
  if (!base) return json(READ_ONLY, 503);

  const cfg = base.typeCatalogue?.[body.type];
  if (!cfg) return json({ error: 'unknown sensor type' }, 400);

  const subIdx = Math.max(0, cfg.subtypes.indexOf(body.subtype));
  const template = (base.sensors || []).find((s) => s.type === body.type) || base.sensors?.[0] || {};
  const buildingId = body.building_id || base.buildings?.[0];
  const sensor = {
    ...template,
    id: `SN-LOCAL-${Date.now().toString(36).toUpperCase()}`,
    building_id: buildingId,
    type: body.type,
    subtype: cfg.subtypes[subIdx],
    unit: cfg.units?.[subIdx] ?? '',
    name: body.name || `${cfg.subtypes[subIdx]} — ${buildingId}`,
    floor: body.floor || 'G',
    status: 'online',
    health_pct: 100,
    last_seen_min: 0,
  };

  const o = loadOverlay();
  o.added.unshift(sensor);
  saveOverlay(o);
  return json({ ok: true, sensor, kpis: applySensorOverlay(base).kpis });
}

async function handleSensorDelete(id) {
  const base = await readBaked('/api/iot/sensors');
  if (!base) return json(READ_ONLY, 503);

  const o = loadOverlay();
  const wasAdded = o.added.some((s) => s.id === id);
  const exists = wasAdded || (base.sensors || []).some((s) => s.id === id);
  if (!exists) return json({ error: 'unknown sensor' }, 404);

  o.added = o.added.filter((s) => s.id !== id);
  if (!wasAdded && !o.removed.includes(id)) o.removed.push(id);
  saveOverlay(o);
  return json({ ok: true, removed: id, kpis: applySensorOverlay(base).kpis });
}

/* ── router ───────────────────────────────────────────────────────────── */

async function route(url, init) {
  const method = (init?.method || 'GET').toUpperCase();
  const path = new URL(url, window.location.href).pathname;

  if (method === 'GET') {
    const data = await readBaked(url);
    if (!data) return json({ error: `No baked response for ${path}` }, 404);
    // Endpoints that legitimately answer non-2xx (e.g. a squadron leader
    // requesting an out-of-squad cadet -> 403) are snapshotted with their
    // status so the UI sees exactly what the live API would return.
    if (data.__httpStatus) return json(data.__body, data.__httpStatus);
    return json(path === '/api/iot/sensors' ? applySensorOverlay(data) : data);
  }

  if (method === 'POST' && path === '/api/auth/login') return handleLogin(init);
  if (method === 'POST' && path === '/api/iot/sensors') return handleSensorAdd(init);
  if (method === 'DELETE' && path.startsWith('/api/iot/sensors/')) {
    return handleSensorDelete(decodeURIComponent(path.split('/api/iot/sensors/')[1]));
  }

  return json(READ_ONLY, 503);
}

export function installStaticApi() {
  if (!STATIC_API || typeof window === 'undefined') return;

  const real = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (!url || !isApiUrl(url)) return real(input, init);
    // readBaked() targets /api-data/*.json, which isApiUrl() rejects, so the
    // shim's own reads fall through to the real fetch — no recursion.
    return route(url, init || {});
  };

  // eslint-disable-next-line no-console
  console.info('[static-api] serving /api/* from baked JSON — no backend required');
}
