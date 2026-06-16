/*
 * serve-preview.cjs — boot the Promix server on a preview-safe port.
 *
 * The Claude preview harness can't bind :3500 here (it's in a Windows reserved /
 * excluded port range), and its launch.json `env` injection mis-quotes the
 * spaced `npm`/Program Files path. So instead of `npm run server`, the harness
 * runs THIS launcher with plain `node` (which spawns cleanly): we set the port
 * ourselves, chdir to the project root so data/.dbkey, data/promix.db and
 * migrations/ resolve exactly as `npm --prefix … run server` would, then load
 * the compiled CommonJS server entry (its app.listen + migration runner fire on
 * require). Rebuild the backend first with `tsc -p tsconfig.server.json`.
 */
const path = require('path');

const root = path.resolve(__dirname, '..'); // Automatix-NEW
process.chdir(root);
process.env.PROMIX_PORT = process.env.PROMIX_PORT || '4310';

// eslint-disable-next-line import/no-dynamic-require
require(path.join(root, 'dist-server', 'server', 'index.js'));
