'use strict';
// Compatibility entry point. Hearthgate owns the one canonical runtime implementation.
const runtime = require('../apps/starwell-server/wayglass-runtime/wayglass-waygate.cjs');
module.exports = runtime;
module.exports.WAYGATE_SCHEMA = runtime.WAYGATE_SCHEMA;
module.exports.WAYGATE_INSPECTION_SCHEMA = runtime.WAYGATE_INSPECTION_SCHEMA;
module.exports.createWaygateManifest = runtime.createWaygateManifest;
module.exports.inspectWaygateManifest = runtime.inspectWaygateManifest;
