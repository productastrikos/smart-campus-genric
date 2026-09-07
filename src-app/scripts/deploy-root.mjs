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
import { cp, rm, readdir, readFile, stat } from 'node:fs/promises';
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
  // rather than a static site; `npm start` at the root runs app.js, and
  // server.js is a one-line alias for it. Both must survive a deploy.
  'app.js', 'server.js',
]);

const exists = (p) => stat(p).then(() => true, () => false);

/* SAFETY — this script DELETES every entry in ROOT that is not in KEEP, so it
   must be certain ROOT is the deployment repository and not some unrelated
   folder that merely happens to be the parent.

   It is not enough to check that ROOT !== SRC_APP. Run from a standalone
   checkout of the project (…/smart_university/scripts/), ROOT resolves to
   whatever directory that checkout was cloned into — and the script would
   cheerfully delete its siblings. That happened; it cost an 849 MB archive.

   So: refuse unless ROOT carries this specific site's own marker files. */
const MARKER_NAME = 'adu-smart-campus-site';

async function assertDeployRoot() {
  if (path.resolve(ROOT) === path.resolve(SRC_APP)) {
    return 'src-app is the repository root — nothing to deploy into';
  }
  if (path.basename(SRC_APP) !== 'src-app') {
    return `expected to live in <repo>/src-app/scripts, but this is ${SRC_APP}`;
  }
  const pkgPath = path.join(ROOT, 'package.json');
  if (!(await exists(pkgPath))) return `${ROOT} has no package.json — not the deployment repository`;
  let name;
  try {
    name = JSON.parse(await readFile(pkgPath, 'utf8')).name;
  } catch (e) {
    return `${ROOT}/package.json is unreadable: ${e.message}`;
  }
  if (name !== MARKER_NAME) {
    return `${ROOT}/package.json is "${name}", expected "${MARKER_NAME}" — refusing to delete anything`;
  }
  for (const marker of ['index.html', 'app.js']) {
    if (!(await exists(path.join(ROOT, marker)))) {
      return `${ROOT} has no ${marker} — not the deployment repository`;
    }
  }
  return null;
}

if (!(await exists(DIST))) {
  console.error(`[deploy-root] no build found at ${DIST} — run "npm run build:static" first`);
  process.exit(1);
}

const problem = await assertDeployRoot();
if (problem) {
  console.error(`[deploy-root] refusing to run: ${problem}`);
  console.error('[deploy-root] this script only ever runs from inside the deployment repository');
  console.error('[deploy-root] (productastrikos/smart-campus-genric), as <repo>/src-app/scripts/deploy-root.mjs.');
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
