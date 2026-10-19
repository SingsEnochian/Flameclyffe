'use strict';
// Compatibility entry point. Hearthgate owns the one canonical runtime implementation.
const runtime = require('../apps/starwell-server/wayglass-runtime/wayglass-voyage-messages.cjs');
module.exports = runtime;
module.exports.WayglassVoyageMessages = runtime.WayglassVoyageMessages;
