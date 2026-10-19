'use strict';
// Compatibility entry point. Hearthgate owns the one canonical runtime implementation.
const runtime = require('../apps/starwell-server/wayglass-runtime/wayglass-kernel.cjs');
module.exports = runtime;
module.exports.KERNEL_SCHEMA = runtime.KERNEL_SCHEMA;
module.exports.bootWayglassKernel = runtime.bootWayglassKernel;
