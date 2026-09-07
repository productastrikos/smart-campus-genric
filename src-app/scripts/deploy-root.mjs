/**
 * deploy-root — refresh the deployable site at the repository root.
 * ======================================================================
 * The published repo (productastrikos/smart-campus-genric) is laid out so
 * Hostinger can be pointed at the ROOT DIRECTORY and serve it as-is:
 *
 *   /                 index.html, assets/, images/, api-data/, .htaccess
 *   /src-app          this project, kept so the site can be rebuilt
 *
 * After changing anything under src-app, run:
 *
 *   npm run build:static && node scripts/deploy-root.mjs
 *
 * which copies the fresh dist/ over the root files it owns and removes
 * stale fingerprinted assets. Nothing outside that set is touched, so the
 * README, .gitignore and src-app/ itself are safe.
 */
import { cp, rm, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC_APP = path.resolve(HERE, '..');          // .../src-app
const DIST = path.join(SRC_APP, 'dist');
const ROOT = path.resolve(SRC_APP, '..');          // repository root

// Only these root entries are managed by the build; everything else is left be.
const OWNED = ['index.html', '.htaccess', 'assets', 'images', 'api-data'];

const exists = (p) => stat(p).then(() => true, () => false);

if (!(await exists(DIST))) {
  console.error(`[deploy-root] no build found at ${DIST} — run "npm run build:static" first`);
  process.exit(1);
}
if (path.resolve(ROOT) === path.resolve(SRC_APP)) {
  console.error('[deploy-root] src-app is the repository root — nothing to deploy into');
  process.exit(1);
}

for (const name of OWNED) {
  await rm(path.join(ROOT, name), { recursive: true, force: true });
}

let copied = 0;
for (const entry of await readdir(DIST)) {
  await cp(path.join(DIST, entry), path.join(ROOT, entry), { recursive: true });
  copied++;
}

console.log(`[deploy-root] refreshed ${copied} root entries from ${path.relative(ROOT, DIST)}`);
console.log('[deploy-root] commit and push, then redeploy the root directory on Hostinger');
