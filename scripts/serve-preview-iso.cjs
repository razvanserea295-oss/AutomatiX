// Isolated preview server for UX auditing. Points PROMIX_DATA_DIR at a private
// copy of the DB (.preview-data) so it never shares promix.db with the live
// :3500 server — two sql.js instances on one file silently clobber each other.
const path = require('path');
const root = path.resolve(__dirname, '..');
process.chdir(root);
process.env.PROMIX_DATA_DIR = path.join(root, '.preview-data');
process.env.PROMIX_PORT = process.env.PROMIX_PORT || '4310';
process.env.PROMIX_ALLOW_DEFAULT_CREDS = '1';
require(path.join(root, 'dist-server', 'server', 'index.js'));
