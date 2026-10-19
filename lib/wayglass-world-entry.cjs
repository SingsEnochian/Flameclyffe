'use strict';
// Compatibility entry point. Hearthgate owns the one canonical runtime implementation.
const runtime = require('../apps/starwell-server/wayglass-runtime/wayglass-world-entry.cjs');
module.exports = runtime;
module.exports.WORLD_ENTRY_SCHEMA = runtime.WORLD_ENTRY_SCHEMA;
module.exports.WORLD_ENTRY_RECEIPT_SCHEMA = runtime.WORLD_ENTRY_RECEIPT_SCHEMA;
module.exports.enterWayglassWorld = runtime.enterWayglassWorld;
