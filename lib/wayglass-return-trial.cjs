'use strict';
// Compatibility entry point. Hearthgate owns the one canonical runtime implementation.
const runtime = require('../apps/starwell-server/wayglass-runtime/wayglass-return-trial.cjs');
module.exports = runtime;
module.exports.OUTCOME_SCHEMA = runtime.OUTCOME_SCHEMA;
module.exports.evaluateReturnAttempt = runtime.evaluateReturnAttempt;
