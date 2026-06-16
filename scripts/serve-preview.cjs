











const path = require('path');

const root = path.resolve(__dirname, '..'); 
process.chdir(root);
process.env.PROMIX_PORT = process.env.PROMIX_PORT || '4310';

// eslint-disable-next-line import/no-dynamic-require
require(path.join(root, 'dist-server', 'server', 'index.js'));
