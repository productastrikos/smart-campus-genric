/**
 * Static file server for the pre-built site at this directory.
 * ======================================================================
 * The repository root IS the deployable artifact. On plain static hosting
 * (Apache/LiteSpeed) `.htaccess` serves it and this file is never used.
 *
 * This exists for the other case: a host configured as a NODE.JS
 * APPLICATION rather than a static site. There, the platform runs
 * `npm start` and expects a process listening on $PORT — a no-op start
 * script reads as a crashed app and the deployment is marked failed.
 *
 * It has ZERO dependencies (node: builtins only), so `npm install` at the
 * root installs nothing and this cannot break on a version bump. It
 * mirrors the rules in .htaccess exactly:
 *
 *   · real files are served as-is, with the right Content-Type
 *   · a missing ASSET 404s, rather than being handed index.html — a
 *     <video> or <img> receiving HTML fails confusingly
 *   · anything else falls back to index.html, so the client-side routes
 *     (/smart-classrooms, /digital-twin …) survive a refresh or a shared
 *     deep link
 *   · /src-app is refused; it is source, not web content
 *   · Range requests are honoured, which the CCTV clips need in order to
 *     seek and to start playing before the whole file has downloaded
 *
 *   node server.js [port]
 */
import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
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

const send = (res, status, body, type = 'text/plain; charset=utf-8') => {
  res.writeHead(status, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
};

async function serveFile(req, res, file, urlPath) {
  const info = await stat(file);
  const type = typeFor(file);
  const headers = {
    'Content-Type': type,
    'Cache-Control': cacheFor(urlPath),
    'Last-Modified': info.mtime.toUTCString(),
    'Accept-Ranges': 'bytes',
  };

  // Range support — without it the browser cannot seek in the CCTV clips and
  // must download each one whole before playback starts.
  const range = req.headers.range;
  const m = range && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (m) {
    let start = m[1] === '' ? null : Number(m[1]);
    let end = m[2] === '' ? null : Number(m[2]);
    if (start === null) {                       // suffix range: last N bytes
      start = Math.max(0, info.size - (end ?? 0));
      end = info.size - 1;
    } else {
      end = end === null ? info.size - 1 : Math.min(end, info.size - 1);
    }
    if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= info.size) {
      res.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${info.size}`,
      'Content-Length': end - start + 1,
    });
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file, { start, end }).pipe(res);
    return;
  }

  res.writeHead(200, { ...headers, 'Content-Length': info.size });
  if (req.method === 'HEAD') { res.end(); return; }
  createReadStream(file).pipe(res);
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
    } catch {
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

    const info = await stat(file).catch(() => null);
    if (info?.isFile()) {
      await serveFile(req, res, file, urlPath);
      return;
    }
    if (info?.isDirectory()) {
      const index = path.join(file, 'index.html');
      if (await stat(index).then((s) => s.isFile(), () => false)) {
        await serveFile(req, res, index, '/');
        return;
      }
    }

    if (ASSET.test(urlPath)) {
      send(res, 404, 'Not Found');
      return;
    }

    // SPA fallback.
    await serveFile(req, res, path.join(ROOT, 'index.html'), '/');
  } catch (err) {
    console.error('[server]', err);
    if (!res.headersSent) send(res, 500, 'Internal Server Error');
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Abu Dhabi University — Smart Digital Campus`);
  console.log(`serving ${ROOT}`);
  console.log(`listening on http://${HOST}:${PORT}`);
});
