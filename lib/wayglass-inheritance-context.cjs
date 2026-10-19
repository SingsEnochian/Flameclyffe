'use strict';
// Compatibility entry point. Hearthgate owns the one canonical runtime implementation.
const runtime = require('../apps/starwell-server/wayglass-runtime/wayglass-inheritance-context.cjs');
module.exports = runtime;
module.exports.WayglassInheritanceContext = runtime.WayglassInheritanceContext;
module.exports.InheritanceContextError = runtime.InheritanceContextError;
