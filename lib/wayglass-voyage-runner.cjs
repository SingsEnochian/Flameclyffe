'use strict';
// Compatibility entry point. Hearthgate owns the one canonical runtime implementation.
const runtime = require('../apps/starwell-server/wayglass-runtime/wayglass-voyage-runner.cjs');
module.exports = runtime;
module.exports.INVITATION = runtime.INVITATION;
module.exports.runVoyages = runtime.runVoyages;
