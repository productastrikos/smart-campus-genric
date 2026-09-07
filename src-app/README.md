# Smart Digital Campus — source

Front end, API and datasets for the Abu Dhabi University Smart Digital Campus
dashboard. Deployment, hosting and repository layout are covered by the
[root README](../README.md) — this file is about working on the code.

## Run

```bash
npm install
npm run dev        # Express API (:5051) + Vite client (:5173)
```

Open http://localhost:5173. Every role's password is its username
(`executive` / `executive`), or use the SSO tab, which needs none.

```bash
npm run generate       # regenerate the CSV datasets (timestamps re-anchor to now)
npm run build          # normal build — expects the API at runtime
npm run build:static   # static build + API snapshot (see below)
npm run preview:static # serve the static build on :4173 with no API running
npm run deploy         # build:static, then refresh the site at the repo root
npm start              # serve the committed site at the repo root (what a host runs)
npm run start:api      # build, then run the live Express API + dist (old `start`)
```

`npm start` is deliberately NOT a build. A host configured with its root
directory set to `src-app` runs it, and rebuilding for ~35s before binding
`$PORT` trips a start health-check; it would also serve a build with no CCTV
clips, which are gitignored here and committed at the repository root. See
`scripts/start-host.mjs`.

## Architecture

```
data/*.csv                  29 synthetic datasets — the system of record
server/generate/            seeded generator (npm run generate)
server/index.js             Express API: aggregates CSVs into module JSON
server/ext/api.js           auth, IoT inventory, extended academic modules
client/                     React + Vite, 13 routes, Tailwind + design tokens
scripts/bake-api.mjs        snapshots the API for static hosting
scripts/sync-videos.mjs     restores the CCTV clips from the deployed root
scripts/deploy-root.mjs     copies dist/ over the repo root
scripts/start-host.mjs      what `npm start` runs; serves the committed site
```

- **Design standard**: tokens, KPI cards, nav and panel styles ported from
  `productastrikos/UserInterface` — CSS custom properties, dark/light themes,
  Inter, 16px-radius panels.
- **Charts**: Recharts, themed to that palette.
- **API proxy**: Vite proxies `/api/*` to Express on :5051 in dev.

## Static build

`npm run build:static` sets `VITE_STATIC_API=1` and then runs
`scripts/bake-api.mjs`, which boots the real API and crawls every endpoint the
client can reach, writing each response to `dist/api-data/<key>.json`. In the
browser, `client/src/services/staticApi.js` patches `window.fetch` so existing
`/api/...` calls read those files. Both sides compute the filename with
`client/src/services/apiKey.js` — change that function and both follow.

If you add an endpoint or a new parameterised route, extend the crawl in
`scripts/bake-api.mjs`; otherwise the static build will 404 on it. The
generated `dist/api-data/manifest.json` lists every URL that was baked, which
is the fastest way to see what is missing.

## Digital Twins

Two, at different scales:

- `client/src/pages/digitalTwin_2.jsx` — **Campus Digital Twin**. MapLibre GIS
  view of the estate: buildings, roads, boundary, parking, CCTV, gates,
  patrols, personnel. Layers live in
  `client/src/components/DigitalTwin2/`; geometry is static GeoJSON under
  `client/src/assets/geojson/` (Vite parses `.geojson` via a small plugin in
  `vite.config.js`).
- `client/src/pages/SmartClassrooms.jsx` — **Smart Classrooms**, the room-level
  drill-down. Wraps
  `client/src/components/SmartClassrooms/SmartClassroomsUIIC.jsx`, which
  renders `EstateDigitalTwin3D` (Academic Block D, floor by floor) and
  `RoomDigitalTwin3D` (one classroom, every device in place) with
  react-three-fiber.

The classroom module also runs standalone. It takes an `embedded` prop: when
set, it drops its own header, advisory strip and floating assistant, because
`Layout` already provides all three, and sizes itself to the remaining
viewport. Its advisory pool lives in `client/src/components/PageAdvisory.jsx`
alongside every other page's, which is the app's single per-page advisory
surface.

## CCTV footage

The clips live in `client/public/videos/` and drive two surfaces: the live
camera wall on Incident Management (`client/src/config/cameras.js` —
`GENERIC_CAMERA_GRID`, six tiles playing at once) and the twin's camera popups
(`client/src/components/DigitalTwin2/data/cameraRegistry.js` —
`GENERIC_LOCAL_CLIPS`, one clip per popup, chosen by hash).

Both pools are ordered smallest-file-first, because the wall autoplays six
clips simultaneously and several are 4K. Keep that order if you add clips.

In the deployed repository the clips are committed once at the ROOT (the
served directory), and these copies are gitignored — identical bytes, no point
storing 300 MB twice. `npm run build:static` runs `scripts/sync-videos.mjs`
first to copy them back, so a fresh clone still builds working footage. In a
standalone checkout with no deployed root alongside it, that step no-ops and
whatever is already in `client/public` is used.

Three clips exceed GitHub's 100 MB per-file limit and are absent:
`videos/building/b1.mp4` (265 MB), `videos/generic/v1.mp4` (170 MB) and
`videos/building/b2.mp4` (103 MB). The first two were already excluded in code
as too slow to open in a popup; `b2` was dropped from `GENERIC_LOCAL_CLIPS` for
the size limit. Compress any of them under 100 MB to put it back.

## Demo storylines baked into the data

- **AHU-02 fault** in Academic Block B — temp drift, BMS alarm, agentic-AI work
  order (visible in the twin and in campus ops).
- **Credential-stuffing burst** on IAM ~6h ago — in the SIEM timeline and feed.
- **Library CO₂ spike** midday; **dining energy spike** yesterday evening.
- **Flow 5 diode** elevated error rate (schema drift).
- **Smart Classrooms**: `D-GF-03` attendance-integrity anomaly (4 BLE cards
  with no presence increment) plus instructor off-site with auto-hybrid
  bridging; `D-GF-07` HVAC actuator fault.

> Synthetic demonstration data only.
