'use strict';
// Compatibility entry point. Hearthgate owns the one canonical runtime implementation.
const runtime = require('../apps/starwell-server/wayglass-runtime/wayglass-departure-store.cjs');
module.exports = runtime;
module.exports.createDepartureStore = runtime.createDepartureStore;
