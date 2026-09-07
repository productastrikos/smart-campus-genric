/**
 * bake-api — snapshot the Express API into static JSON.
 * ======================================================================
 * Boots server/index.js on a scratch port, crawls every GET endpoint the
 * client can reach (discovering ids from the responses as it goes), and
 * writes each response to dist/api-data/<key>.json, where <key> comes from
 * client/src/services/apiKey.js — the same function the browser shim uses
 * to look the file back up.
 *
 * Run via `npm run build:static`, which builds the client with
 * VITE_STATIC_API=1 and then calls this.
 *
 *   node scripts/bake-api.mjs [--out dist/api-data] [--port 5199]
 */
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { apiKeyFor } = await import(
  pathToFileURL(path.join(ROOT, 'client/src/services/apiKey.js')).href
);

const args = process.argv.slice(2);
const argOf = (n, d) => {
  const i = args.indexOf(`--${n}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const OUT = path.resolve(ROOT, argOf('out', 'dist/api-data'));
const PORT = Number(argOf('port', '5199'));
const BASE = `http://127.0.0.1:${PORT}`;

/* Squadron leaders scope every request they make; mirrors ROLE_SQUADS in
   client/src/services/api.js, so their views get their own snapshots. */
const SQUAD_SCOPES = [null, 'Falcon,Oryx', 'Saqr,Ghaf'];

/* Demo accounts, mirrored from server/ext/api.js. Baked so the shim can
   resolve POST /api/auth/login offline. These are the published demo
   credentials the login screen already prints — not secrets. */
const ACCOUNTS = {
  executive: { role: 'executive', name: 'Executive Command' },
  superadmin: { role: 'superadmin', name: 'Platform Administrator' },
  academics: { role: 'academics', name: 'Head of Academics' },
  readiness: { role: 'readiness', name: 'Military Head' },
  finance: { role: 'finance', name: 'Finance Head' },
  ithead: { role: 'ithead', name: 'IT Head' },
  security: { role: 'security', name: 'Security Head' },
  facility: { role: 'facility', name: 'Facility Management Head' },
  squadron1: { role: 'squadron1', name: 'Squadron Leader 1' },
  squadron2: { role: 'squadron2', name: 'Squadron Leader 2' },
  departmentlead1: { role: 'squadron1', name: 'Department Lead 1' },
  departmentlead2: { role: 'squadron2', name: 'Department Lead 2' },
};

const seen = new Map();   // key -> url, for collision detection
let written = 0;
let failed = 0;    // could not be reached or parsed — a real problem
let errored = 0;   // reached, answered non-2xx — snapshotted as-is

const log = (...m) => console.log('[bake]', ...m);

async function waitForServer(proc, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`server exited early (code ${proc.exitCode})`);
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not answer /api/health within ${timeoutMs}ms`);
}

/** Fetch one endpoint and write its snapshot. Returns the parsed body. */
async function bake(apiPath) {
  const url = apiPath.startsWith('/api') ? apiPath : `/api${apiPath}`;
  const key = apiKeyFor(url);

  // Case-insensitive filesystems (Windows, macOS) would silently merge two
  // keys differing only in case, so treat that as a hard failure.
  const dedupe = key.toLowerCase();
  if (seen.has(dedupe)) {
    if (seen.get(dedupe) !== url) {
      throw new Error(`key collision: "${url}" and "${seen.get(dedupe)}" both map to ${key}`);
    }
    return null; // already baked
  }
  seen.set(dedupe, url);

  let res;
  try {
    res = await fetch(BASE + url);
  } catch (e) {
    failed++; log(`FAIL ${url} — ${e.message}`); return null;
  }

  const body = await res.json().catch(() => null);
  if (body === null) { failed++; log(`FAIL ${url} — HTTP ${res.status}, unparseable body`); return null; }

  // Non-2xx answers are real API behaviour the client must still see — a
  // squadron leader asking for an out-of-squad cadet gets a 403, and the UI
  // renders that as an access message. Snapshot the status alongside the body
  // and let the shim replay it, rather than dropping the endpoint.
  if (!res.ok) {
    await writeFile(path.join(OUT, `${key}.json`), JSON.stringify({ __httpStatus: res.status, __body: body }), 'utf8');
    written++; errored++;
    return null;
  }

  await writeFile(path.join(OUT, `${key}.json`), JSON.stringify(body), 'utf8');
  written++;
  return body;
}

/** Bake `p` once per squadron scope (and unscoped). Returns the unscoped body. */
async function bakeScoped(p) {
  let base = null;
  for (const squads of SQUAD_SCOPES) {
    const url = squads ? `${p}${p.includes('?') ? '&' : '?'}squads=${encodeURIComponent(squads)}` : p;
    const body = await bake(url);
    if (!squads) base = body;
  }
  return base;
}

/* ── crawl ─────────────────────────────────────────────────────────────── */

async function crawl() {
  // 1. Module endpoints — every useApi()/fetchApi() path in the client.
  const MODULES = [
    '/overview', '/academic', '/readiness', '/enterprise', '/campus', '/sustainability',
    '/twin', '/security', '/integration', '/cadet-journey', '/cctv', '/itops', '/alerts',
    '/health',
  ];
  const bodies = {};
  for (const m of MODULES) bodies[m] = await bakeScoped(m);

  // 2. Digital Twin — one snapshot per building.
  const buildings = bodies['/twin']?.buildings || [];
  for (const b of buildings) {
    const id = b.building_id || b.id;
    if (id) await bakeScoped(`/twin/building/${encodeURIComponent(id)}`);
  }
  log(`twin buildings: ${buildings.length}`);

  // 3. Readiness — human digital twin per cadet.
  const cadets = bodies['/readiness']?.cadets || [];
  for (const c of cadets) {
    if (c.cadet_id || c.id) await bakeScoped(`/readiness/cadet/${encodeURIComponent(c.cadet_id || c.id)}`);
  }
  log(`readiness cadets: ${cadets.length}`);

  // 4. Cadet journey — per cadet.
  const journey = bodies['/cadet-journey']?.cadets || bodies['/cadet-journey']?.rows || [];
  for (const c of journey) {
    const id = c.cadet_id || c.id;
    if (id) await bakeScoped(`/cadet-journey/${encodeURIComponent(id)}`);
  }
  log(`journey cadets: ${journey.length}`);

  // 5. IoT — the page filters by building and by type, both defaulting to ALL.
  const iot = await bakeScoped('/iot/sensors');
  const iotBuildings = ['ALL', ...(iot?.buildings || [])];
  const iotTypes = ['ALL', ...(iot?.types || [])];
  for (const b of iotBuildings) {
    for (const t of iotTypes) {
      await bakeScoped(`/iot/sensors?building=${encodeURIComponent(b)}&type=${encodeURIComponent(t)}`);
    }
  }
  log(`iot combinations: ${iotBuildings.length} buildings x ${iotTypes.length} types`);

  // 6. Extended academic modules — everything is scoped by college.
  const colleges = await bakeScoped('/ext/colleges');
  const codes = ['ALL', ...(Array.isArray(colleges) ? colleges : colleges?.colleges || [])
    .map((c) => c.code || c.id || c).filter(Boolean)];
  await bakeScoped('/ext/weights');

  for (const c of codes) {
    const q = encodeURIComponent(c);
    await bakeScoped(`/ext/sis?college=${q}`);
    await bakeScoped(`/ext/lms?college=${q}`);
    await bakeScoped(`/ext/merit?college=${q}`);
    await bakeScoped(`/ext/students?college=${q}`);
    for (const which of ['hpo', 'military', 'conduct']) {
      await bakeScoped(`/ext/stream/${which}?college=${q}`);
    }
  }
  log(`colleges: ${codes.join(', ')}`);

  // 7. Per-student profiles and per-course originality reports.
  const students = await (await fetch(`${BASE}/api/ext/students?college=ALL`)).json();
  const list = students?.students || students?.rows || (Array.isArray(students) ? students : []);
  for (const s of list) {
    if (s.id) await bakeScoped(`/ext/student/${encodeURIComponent(s.id)}`);
  }
  log(`students: ${list.length}`);

  const lms = await (await fetch(`${BASE}/api/ext/lms?college=ALL`)).json();
  const courses = lms?.courses || lms?.sections || [];
  const codesSeen = new Set();
  for (const c of courses) {
    const code = c.course_code || c.code;
    if (code && !codesSeen.has(code)) {
      codesSeen.add(code);
      await bakeScoped(`/ext/lms/originality/${encodeURIComponent(code)}`);
    }
  }
  log(`course originality reports: ${codesSeen.size}`);

  // 8. Account list for the offline login handler.
  const accounts = {};
  for (const [username, meta] of Object.entries(ACCOUNTS)) {
    accounts[username] = { username, password: username, ...meta, email: `${username}@adu.ac.ae` };
  }
  await writeFile(path.join(OUT, `${apiKeyFor('/api/__accounts')}.json`), JSON.stringify(accounts), 'utf8');
  written++;

  // 9. Manifest — every baked URL, for debugging a missing snapshot.
  await writeFile(
    path.join(OUT, 'manifest.json'),
    JSON.stringify({ generated: new Date().toISOString(), count: seen.size, urls: [...seen.values()].sort() }, null, 2),
    'utf8',
  );
}

/* ── main ──────────────────────────────────────────────────────────────── */

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

log(`starting API on :${PORT}`);
const server = spawn(process.execPath, [path.join(ROOT, 'server/index.js')], {
  cwd: ROOT,
  env: { ...process.env, API_PORT: String(PORT), API_HOST: '127.0.0.1' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
server.stdout.on('data', (d) => process.stdout.write(`[api] ${d}`));
server.stderr.on('data', (d) => process.stderr.write(`[api] ${d}`));

let code = 0;
try {
  await waitForServer(server);
  log('API up — crawling');
  await crawl();
  log(`wrote ${written} snapshots to ${path.relative(ROOT, OUT)} (${errored} of them non-2xx, replayed as-is)`);
  if (failed) { log(`${failed} endpoint(s) unreachable`); code = 1; }
} catch (e) {
  console.error('[bake] ERROR', e);
  code = 1;
} finally {
  server.kill();
}
process.exit(code);
