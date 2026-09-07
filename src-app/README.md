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
```

## Architecture

```
data/*.csv                  29 synthetic datasets — the system of record
server/generate/            seeded generator (npm run generate)
server/index.js             Express API: aggregates CSVs into module JSON
server/ext/api.js           auth, IoT inventory, extended academic modules
client/                     React + Vite, 13 routes, Tailwind + design tokens
scripts/bake-api.mjs        snapshots the API for static hosting
scripts/deploy-root.mjs     copies dist/ over the repo root
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

## Video assets (not in this repository)

The CCTV demo clips are excluded from git — several exceed GitHub's 100 MB
limit. Everything else runs normally; the twin's camera tiles show no footage
until the clips are supplied. Drop the `.mp4` files into:

```
client/public/v4.mp4  v5.mp4  v9.mp4
client/public/videos/v1.mp4 … v6.mp4
client/public/videos/building/b1.mp4 … b6.mp4
client/public/videos/generic/v1.mp4 … v6.mp4
```

Paths are defined in `client/src/config/cameras.js` and
`client/src/components/DigitalTwin2/data/cameraRegistry.js`. These stay ignored
via `.gitignore`.

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
