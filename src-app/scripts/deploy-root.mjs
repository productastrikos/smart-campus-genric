/**
 * deploy-root — refresh the deployable site at the repository root.
 * ======================================================================
 * The published repo (productastrikos/smart-campus-genric) is laid out so
 * Hostinger can be pointed at the ROOT DIRECTORY and serve it as-is:
 *
 *   /                 index.html, assets/, images/, api-data/, videos/, .htaccess
 *   /src-app          this project, kept so the site can be rebuilt
 *
 * After changing anything under src-app, run:
 *
 *   npm run build:static && node scripts/deploy-root.mjs
 *
 * which replaces every root entry with the fresh dist/, so stale fingerprinted
 * assets and dropped files are cleared rather than left behind. The repo's own
 * files — README, .gitignore, .gitattributes, src-app/ — are never touched.
 */
import { cp, rm, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_APP = path.resolve(HERE, '..');          // .../src-app
const DIST = path.join(SRC_APP, 'dist');
const ROOT = path.resolve(SRC_APP, '..');          // repository root

// Everything at the root belongs to the build EXCEPT these, which are the
// repository's own files. Working by exclusion rather than an allow-list means
// adding an output directory (videos/, say) needs no change here, and a file
// dropped from the build is cleared away instead of lingering as a stale copy.
const KEEP = new Set([
  '.git', '.gitignore', '.gitattributes', 'README.md', 'src-app',
  // The root package.json is what stops auto-detecting hosts (Hostinger and
  // friends) from descending into src-app/ and running the SOURCE build, which
  // writes to a directory that is neither committed nor served. It must
  // survive a deploy. node_modules is whatever `npm install` leaves behind.
  'package.json', 'package-lock.json', 'node_modules',
  // Zero-dependency static server for hosts configured as a Node APPLICATION
  // rather than a static site; `npm start` at the root runs it.
  'server.js',
]);

const exists = (p) => stat(p).then(() => true, () => false);

if (!(await exists(DIST))) {
  console.error(`[deploy-root] no build found at ${DIST} — run "npm run build:static" first`);
  process.exit(1);
}
if (path.resolve(ROOT) === path.resolve(SRC_APP)) {
  console.error('[deploy-root] src-app is the repository root — nothing to deploy into');
  process.exit(1);
}

for (const name of await readdir(ROOT)) {
  if (KEEP.has(name)) continue;
  await rm(path.join(ROOT, name), { recursive: true, force: true });
}

let copied = 0;
for (const entry of await readdir(DIST)) {
  await cp(path.join(DIST, entry), path.join(ROOT, entry), { recursive: true });
  copied++;
}

console.log(`[deploy-root] refreshed ${copied} root entries from ${path.relative(ROOT, DIST)}`);
console.log('[deploy-root] commit and push, then redeploy the root directory on Hostinger');
