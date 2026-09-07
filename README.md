# Abu Dhabi University — Smart Digital Campus

Enterprise smart-campus dashboard: eleven modules over a governed data
backbone, a campus-scale GIS **Digital Twin**, and a room-scale **Smart
Classrooms** 3D twin. All data is synthetic and generated deterministically
from the CSV datasets in `src-app/data`.

**This repository is deployment-ready: point Hostinger at the root directory
and it works.** No Node process, no database, no build step on the server.

---

## Repository layout

```
/                     ← the deployable site. This is what Hostinger serves.
  index.html
  assets/             fingerprinted JS + CSS bundles
  images/             ADU logo lockups, campus hero
  api-data/           997 JSON snapshots of the API (see "How it runs static")
  .htaccess           SPA routing, compression, cache headers

/src-app/             ← full source, kept so the site can be rebuilt
  client/             React + Vite + Tailwind front end
  server/             Express API over the CSV datasets (local dev only)
  data/               29 synthetic CSV datasets — the system of record
  scripts/            bake-api.mjs, deploy-root.mjs
```

---

## Deploying to Hostinger

1. In hPanel, connect this repository under **Website → Git**.
2. Set the repository directory to **`/`** (the root) and the branch to `main`.
3. Deploy. Hostinger copies the root into `public_html` and serves it.

That is the whole process. `.htaccess` handles the rest:

- **SPA routing** — `/smart-classrooms`, `/digital-twin` and every other route
  are client-side paths with no file behind them. Requests that do not match a
  real file are rewritten to `index.html` so refreshes and shared deep links
  work instead of 404ing.
- **Compression** for the JS bundle and the JSON snapshots.
- **Cache headers** — fingerprinted assets are immutable, `index.html` is never
  cached, snapshots revalidate every 5 minutes.
- **`/src-app` is blocked** over HTTP; it is source, not web content.

`.htaccess` is a dotfile — if you upload by FTP rather than Git, make sure your
client is set to show and transfer hidden files, or SPA routing will break.

---

## How it runs without a backend

The dashboard was built against an Express API (`src-app/server`) that
aggregates the CSV datasets into module-shaped JSON. Shared hosting cannot run
that, so the static build replaces it with a snapshot:

1. `npm run build:static` builds the client with `VITE_STATIC_API=1`, then runs
   `scripts/bake-api.mjs`.
2. The bake script boots the real Express API on a scratch port and crawls every
   endpoint the client can reach — discovering building ids, cadet ids, college
   codes, course codes and student ids from the responses as it goes — and
   writes each response to `api-data/<key>.json`.
3. In the browser, `client/src/services/staticApi.js` patches `window.fetch` so
   every existing `/api/...` call reads its snapshot instead. No call site in
   the app changed.

Both sides derive the snapshot filename from the same function
(`client/src/services/apiKey.js`), so a URL and its file can never drift apart.

**What still works:** every dashboard, chart, drill-down and filter — the
snapshots are byte-for-byte what the live API returns, including the 403s a
squadron lead gets for an out-of-scope cadet. Sign-in works against the baked
account list. Adding and removing IoT sensors works and now persists per
browser via `localStorage`.

**What does not:** the remaining write levers (grade edit, registration, merit
weights, HPO/military/conduct entry). These were always in-memory server state
that reset on restart. They now return a plain "static snapshot — write-back
disabled" message inline, which the existing UI already renders. Run the full
stack locally to use them.

---

## Running locally

```bash
cd src-app
npm install
npm run dev          # Express API on :5051 + Vite client on :5173
```

Open http://localhost:5173. Sign in with any role — username and password are
both the role name (e.g. `executive` / `executive`), or use the SSO tab, which
needs no password.

To verify the static build exactly as Hostinger will serve it:

```bash
cd src-app
npm run build:static
npm run preview:static     # http://localhost:4173, no API process running
```

To regenerate the datasets (timestamps re-anchor to "now"):

```bash
npm run generate
```

---

## Publishing a change

```bash
cd src-app
npm run deploy       # build:static, then copy dist/ over the repo root
cd ..
git add -A && git commit -m "..." && git push
```

Then redeploy the root directory in hPanel. `scripts/deploy-root.mjs` only
touches `index.html`, `.htaccess`, `assets/`, `images/` and `api-data/`, so
your README, `.gitignore` and `src-app/` are never disturbed.

---

## Modules

| Route | Module |
|---|---|
| `/` | Operations Centre — cross-domain KPIs, agentic AI actions, alert correlation |
| `/executive` | Campus Overview — executive single screen |
| `/digital-twin` | **Campus Digital Twin** — GIS site plan, per-building telemetry, MEP assets, CCTV, patrols, incident overlay |
| `/smart-classrooms` | **Smart Classrooms** — Academic Block D as a live 3D building twin, and each room as an instrumented 3D room twin |
| `/academic` | Academics & Learning — SIS/LMS, partner integration, AI learning, labs, library |
| `/enterprise` | Enterprise & Finance — ERP finance, procurement, HRMS, master scheduling |
| `/campus-ops` | Smart Campus Operations — BMS, EMS energy, CCTV/access, parking/ANPR, fire & life safety |
| `/sustainability` | Sustainability & Energy |
| `/it-ops` | Enterprise IT & DCIM |
| `/iot` | IoT Sensors & Devices |
| `/security` | Security Operations — split-SIEM, four-network model, PAM/NDR |
| `/incidents` | Incident Management |
| `/integration` | Integration & Data — data flows, master data, ICDs, MFT gateway, DR posture |

### Smart Classrooms

The room-level drill-down of the Campus Digital Twin. Fourteen physical
classrooms in Academic Block D (18 instances, since the Modular rooms split),
each modelled with its real hardware stack: RP-C room controller over
BACnet/IP, 8-port PoE switch with VLAN separation, Insight and SXW sensors,
BLE badge receivers, DALI lighting scenes, motorised blinds, 0–10V HVAC
actuators, an 86" IdeaHub with Teams Rooms bridging, and lecture-capture
cameras.

Two 3D views, both react-three-fiber:

- **Estate** (`EstateDigitalTwin3D`) — the whole block, floor by floor, with
  rooms tinted by status, thermal/CO₂ comfort or power draw.
- **Room** (`RoomDigitalTwin3D`) — one classroom with every device in place,
  live lighting scenes, and occupancy.

Drill in from the estate view, or use the KPI strip to jump straight to a
flagged room.

---

## Video assets (not in this repository)

The CCTV demo clips are excluded from git — several exceed GitHub's 100 MB
limit — so a fresh clone has none. Everything else runs normally; the Digital
Twin camera tiles simply show no footage. To restore them, drop the `.mp4`
files into `src-app/client/public/videos/` (paths are defined in
`src-app/client/src/config/cameras.js` and
`src-app/client/src/components/DigitalTwin2/data/cameraRegistry.js`), then
rebuild and redeploy.

---

## Credits

- Abu Dhabi University name and logo are used for this demonstration build;
  the logo lockup in `images/` is the university's own mark.
- Login hero photograph: **ADU Al Ain Campus** by *Emad Alsharif 88*, via
  Wikimedia Commons, licensed **CC BY-SA 4.0**. The attribution is displayed
  on the login screen.

> Synthetic demonstration data only.
