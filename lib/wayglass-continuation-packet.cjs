'use strict';
// Compatibility entry point. Hearthgate owns the one canonical runtime implementation.
const runtime = require('../apps/starwell-server/wayglass-runtime/wayglass-continuation-packet.cjs');
module.exports = runtime;
module.exports.CONTINUATION_PACKET_SCHEMA = runtime.CONTINUATION_PACKET_SCHEMA;
module.exports.CONTINUATION_INSPECTION_SCHEMA = runtime.CONTINUATION_INSPECTION_SCHEMA;
module.exports.createContinuationPacket = runtime.createContinuationPacket;
module.exports.inspectContinuationPacket = runtime.inspectContinuationPacket;
