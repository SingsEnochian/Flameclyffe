'use strict';
// Compatibility entry point. Hearthgate owns the one canonical runtime implementation.
const runtime = require('../apps/starwell-server/wayglass-runtime/wayglass-stop-receipt.cjs');
module.exports = runtime;
module.exports.STOP_RECEIPT_SCHEMA = runtime.STOP_RECEIPT_SCHEMA;
module.exports.DEPARTURE_SCHEMA = runtime.DEPARTURE_SCHEMA;
module.exports.createWayglassStopReceipt = runtime.createWayglassStopReceipt;
module.exports.continuationPacketFromStopReceipt = runtime.continuationPacketFromStopReceipt;
module.exports.createWayglassDeparture = runtime.createWayglassDeparture;
