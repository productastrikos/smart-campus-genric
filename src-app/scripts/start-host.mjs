/**
 * start-host — what `npm start` runs, in either place it can be run.
 * ======================================================================
 * This project is normally deployed as a PRE-BUILT static site: the
 * repository root holds index.html, assets/, images/, videos/ and
 * api-data/, and a host is meant to serve that directory.
 *
 * But a host can be configured with its root directory set to `src-app`
 * and its framework set to Express, in which case it never sees the
 * repository root at all — it installs and starts in here instead. That
 * configuration used to fail twice over:
 *
 *   · `npm start` was "npm run build && node server/index.js", so the
 *     process spent ~35s running vite build before it bound $PORT. A
 *     platform health-check that expects the port to open promptly gives
 *     up first and marks the deploy failed.
 *   · even once up, it served src-app/dist — a build with no CCTV clips
 *     (they are gitignored under src-app, committed at the root instead)
 *     and no baked api-data.
 *
 * So: if the committed site is sitting next to us, serve THAT, and start
 * listening immediately. It is the artifact that was built, verified and
 * committed, videos and all. Otherwise fall back to the local behaviour —
 * build, then run the Express API, which serves its own dist and the live
 * /api routes.
 *
 * Either way $PORT is honoured, because that is what the host binds to.
 */
import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = path.resolve(SRC_APP, '..');

const exists = (p) => stat(p).then(() => true, () => false);

const run = (args, cwd) => {
  const child = spawn(process.execPath, args, { cwd, stdio: 'inherit', env: process.env });
  child.on('exit', (code) => process.exit(code ?? 0));
  // Let the platform's stop signal reach the server rather than orphaning it.
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig));
};

const prebuilt = path.join(ROOT, 'server.js');
if ((await exists(prebuilt)) && (await exists(path.join(ROOT, 'index.html')))) {
  console.log('[start] serving the pre-built site at the repository root');
  console.log('[start] (no build step - this is the committed, verified artifact)');
  run([prebuilt], ROOT);
} else {
  console.log('[start] no pre-built site alongside src-app - building, then running the API');
  const build = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
    cwd: SRC_APP, stdio: 'inherit', env: process.env, shell: process.platform === 'win32',
  });
  build.on('exit', (code) => {
    if (code) process.exit(code);
    run([path.join(SRC_APP, 'server/index.js')], SRC_APP);
  });
}
