'use strict';
// Compatibility entry point. Hearthgate owns the one canonical runtime implementation.
const runtime = require('../apps/starwell-server/wayglass-runtime/wayglass-reasoning-receipt.cjs');
module.exports = runtime;
module.exports.REASONING_RECEIPT_SCHEMA = runtime.REASONING_RECEIPT_SCHEMA;
module.exports.REASONING_REVIEW_SCHEMA = runtime.REASONING_REVIEW_SCHEMA;
module.exports.createWayglassReasoningReceipt = runtime.createWayglassReasoningReceipt;
module.exports.createWayglassReasoningReview = runtime.createWayglassReasoningReview;
module.exports.reasoningReceiptRef = runtime.reasoningReceiptRef;
module.exports.bindReasoningReceiptToWork = runtime.bindReasoningReceiptToWork;
