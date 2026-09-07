/**
 * Static file server for the pre-built site in this directory.
 * ======================================================================
 * The repository root IS the deployable artifact. On plain static hosting
 * (Apache/LiteSpeed) `.htaccess` serves it and this file is never used.
 *
 * This exists for the other case: a host configured as a NODE.JS
 * APPLICATION. Two deliberate choices make it work with the shared-hosting
 * Node runtimes (Phusion Passenger, LiteSpeed LSNODE) that Hostinger and
 * cPanel use:
 *
 *   · It is CommonJS, not an ES module. Those runtimes load the entry
 *     point with require(), which throws ERR_REQUIRE_ESM on an ESM file —
 *     the app then never boots and LiteSpeed answers every request with
 *     "503 Service Unavailable / The server is temporarily busy". The root
 *     package.json therefore has no "type": "module" either.
 *   · It is named app.js, the filename those runtimes default to when a
 *     startup file is not configured explicitly.
 *
 * It has ZERO dependencies (node builtins only), so `npm install` at the
 * root installs nothing and it cannot break on a version bump. Passenger
 * intercepts .listen(), so calling it here is correct under Passenger and
 * when run directly.
 *
 * It mirrors the rules in .htaccess exactly:
 *
 *   · real files are served as-is, with the right Content-Type
 *   · a missing ASSET 404s rather than being handed index.html — a <video>
 *     or <img> receiving HTML fails confusingly
 *   · anything else falls back to index.html, so the client-side routes
 *     (/smart-classrooms, /digital-twin …) survive a refresh or a shared
 *     deep link
 *   · /src-app is refused; it is source, not web content
 *   · Range requests are honoured, which the CCTV clips need in order to
 *     seek and to start playing before the whole file has downloaded
 *
 *   node app.js [port]
 */
'use strict';

const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.argv[2] || process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8',
};

// Extensions that must 404 when absent instead of falling back to index.html.
const ASSET = /\.(mp4|webm|mov|m4v|json|geojson|png|jpe?g|svg|webp|gif|ico|woff2?|ttf|css|js|mjs|map)$/i;

const typeFor = (f) => TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream';

function cacheFor(urlPath) {
  // Vite fingerprints /assets, so those are immutable. index.html must never
  // be cached or a deploy will not reach browsers. Snapshots revalidate.
  if (urlPath.startsWith('/assets/')) return 'public, max-age=31536000, immutable';
  if (urlPath === '/' || urlPath.endsWith('.html')) return 'no-cache, must-revalidate';
  if (urlPath.startsWith('/api-data/')) return 'public, max-age=300, must-revalidate';
  if (/\.(mp4|webm|png|jpe?g|svg|webp|gif|ico|woff2?)$/i.test(urlPath)) return 'public, max-age=2592000';
  return 'public, max-age=600';
}

function send(res, status, body, type) {
  res.writeHead(status, {
    'Content-Type': type || 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

async function serveFile(req, res, file, urlPath) {
  const info = await fsp.stat(file);
  const headers = {
    'Content-Type': typeFor(file),
    'Cache-Control': cacheFor(urlPath),
    'Last-Modified': info.mtime.toUTCString(),
    'Accept-Ranges': 'bytes',
  };

  // Range support — without it the browser cannot seek in the CCTV clips and
  // must download each one whole before playback starts.
  const range = req.headers.range;
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(String(range).trim());
  if (m) {
    let start = m[1] === '' ? null : Number(m[1]);
    let end = m[2] === '' ? null : Number(m[2]);
    if (start === null) {                       // suffix range: last N bytes
      start = Math.max(0, info.size - (end || 0));
      end = info.size - 1;
    } else {
      end = end === null ? info.size - 1 : Math.min(end, info.size - 1);
    }
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= info.size) {
      res.writeHead(416, { 'Content-Range': 'bytes */' + info.size });
      res.end();
      return;
    }
    res.writeHead(206, Object.assign({}, headers, {
      'Content-Range': `bytes ${start}-${end}/${info.size}`,
      'Content-Length': end - start + 1,
    }));
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, Object.assign({}, headers, { 'Content-Length': info.size }));
  if (req.method === 'HEAD') { res.end(); return; }
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end();
      return;
    }

    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (e) {
      send(res, 400, 'Bad Request');
      return;
    }

    if (urlPath === '/src-app' || urlPath.startsWith('/src-app/')) {
      send(res, 403, 'Forbidden');
      return;
    }

    const file = path.join(ROOT, urlPath);
    // Reject anything that escapes the root, however it was encoded.
    if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
      send(res, 403, 'Forbidden');
      return;
    }

    const info = await fsp.stat(file).catch(() => null);
    if (info && info.isFile()) {
      await serveFile(req, res, file, urlPath);
      return;
    }
    if (info && info.isDirectory()) {
      const index = path.join(file, 'index.html');
      const ok = await fsp.stat(index).then((s) => s.isFile(), () => false);
      if (ok) { await serveFile(req, res, index, '/'); return; }
    }

    if (ASSET.test(urlPath)) {
      send(res, 404, 'Not Found');
      return;
    }

    // SPA fallback.
    await serveFile(req, res, path.join(ROOT, 'index.html'), '/');
  } catch (err) {
    console.error('[app] request failed:', err && err.stack ? err.stack : err);
    if (!res.headersSent) send(res, 500, 'Internal Server Error');
    else res.end();
  }
});

// Fail loudly in the host's log rather than dying silently behind a 503.
server.on('error', (err) => {
  console.error('[app] server error:', err && err.stack ? err.stack : err);
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error('[app] uncaught exception:', err && err.stack ? err.stack : err);
  process.exit(1);
});

if (!fs.existsSync(path.join(ROOT, 'index.html'))) {
  console.error('[app] index.html is missing from ' + ROOT + ' — the committed build is incomplete');
  process.exit(1);
}

server.listen(PORT, HOST, () => {
  console.log('Abu Dhabi University — Smart Digital Campus');
  console.log('serving ' + ROOT);
  console.log('listening on http://' + HOST + ':' + PORT);
});

module.exports = server;
