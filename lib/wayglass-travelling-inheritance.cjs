'use strict';
// Compatibility entry point. Hearthgate owns the one canonical runtime implementation.
const runtime = require('../apps/starwell-server/wayglass-runtime/wayglass-travelling-inheritance.cjs');
module.exports = runtime;
module.exports.TravellingInheritance = runtime.TravellingInheritance;
module.exports.SCHEMA = runtime.SCHEMA;
