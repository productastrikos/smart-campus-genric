/**
 * sync-videos — make the CCTV clips available to the build.
 * ======================================================================
 * The clips are served from the repository root (/videos, /v4.mp4 …) and
 * committed there once. They are NOT committed a second time under
 * src-app/client/public, which would double ~300 MB of video in the repo
 * for no gain — the two copies are always identical.
 *
 * Vite only publishes what is in client/public, so before a build the
 * clips have to be put back. This copies them from the repository root
 * into client/public when they are missing, and does nothing otherwise.
 *
 * In a standalone checkout of the project (no deployed site alongside it)
 * there is no root to copy from, so this no-ops and the build proceeds
 * with whatever clips are already in client/public — which is the normal
 * development case.
 *
 * Runs automatically as the first step of `npm run build:static`.
 */
import { cp, mkdir, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(SRC_APP, 'client/public');
const ROOT = path.resolve(SRC_APP, '..');   // repository root when deployed

const exists = (p) => stat(p).then(() => true, () => false);
const isVideo = (n) => /\.(mp4|webm|mov|m4v)$/i.test(n);

async function hasClips(dir) {
  if (!(await exists(dir))) return false;
  const entries = await readdir(dir, { recursive: true }).catch(() => []);
  return entries.some(isVideo);
}

// Nothing to restore from — a plain checkout of the project on its own.
if (ROOT === SRC_APP || !(await exists(path.join(ROOT, 'index.html')))) {
  console.log('[sync-videos] no deployed root alongside src-app — skipping');
  process.exit(0);
}

let copied = 0;

// Root-level clips (/v4.mp4, /v5.mp4, /v9.mp4).
for (const name of await readdir(ROOT)) {
  if (!isVideo(name)) continue;
  const dest = path.join(PUBLIC, name);
  if (await exists(dest)) continue;
  await cp(path.join(ROOT, name), dest);
  copied++;
}

// The /videos tree.
const rootVideos = path.join(ROOT, 'videos');
const publicVideos = path.join(PUBLIC, 'videos');
if ((await hasClips(rootVideos)) && !(await hasClips(publicVideos))) {
  await mkdir(publicVideos, { recursive: true });
  await cp(rootVideos, publicVideos, { recursive: true });
  copied++;
  console.log('[sync-videos] restored the /videos tree into client/public');
}

console.log(copied
  ? `[sync-videos] restored ${copied} item(s) from the repository root`
  : '[sync-videos] clips already present — nothing to do');
