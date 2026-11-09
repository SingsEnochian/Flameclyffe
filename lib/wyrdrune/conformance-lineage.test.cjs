'use strict';
// RFC-0001 conformance for the lineage backend: L0 and L1 are claimed and must pass.
// (L2 — header seeds, `cycles N`, `until stable`, intent — remains todo.)
const path = require('node:path');
process.env.WTL_BACKEND = path.join(__dirname, 'lineage-backend.cjs');
process.env.WTL_CLAIM = 'L0,L1';
require('./conformance.test.cjs');
