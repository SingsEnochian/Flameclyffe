'use strict';
// Compatibility entry point. Hearthgate owns the one canonical runtime implementation.
const runtime = require('../apps/starwell-server/wayglass-runtime/wayglass-model-observation.cjs');
module.exports = runtime;
module.exports.MODEL_OBSERVATION_SCHEMA = runtime.MODEL_OBSERVATION_SCHEMA;
module.exports.createModelObservation = runtime.createModelObservation;
