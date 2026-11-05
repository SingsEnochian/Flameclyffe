'use strict';

const path = require('node:path');
const fs = require('node:fs');

// Choose an installed surface from staged files, without reading configuration,
// changing permissions or contacting a model route.
function selectPrimaryApplicationUrl(runtimeRoot, port = 3841, existsSync = fs.existsSync) {
  if (typeof runtimeRoot !== 'string' || !runtimeRoot) throw new TypeError('Runtime root required');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new RangeError('Valid loopback port required');
  for (const room of ['wayglass', 'starwell']) {
    if (existsSync(path.join(runtimeRoot, 'public', room, 'index.html'))) return `http://localhost:${port}/${room}/`;
  }
  return `http://localhost:${port}/hearthgate.html`;
}

module.exports = { selectPrimaryApplicationUrl };
