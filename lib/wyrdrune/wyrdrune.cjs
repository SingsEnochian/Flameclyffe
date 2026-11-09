'use strict';
const {createHash}=require('node:crypto');
const {createWyrdruneRuntime}=require('./runtime.mjs');
const ritualFunctions=require('./enochian.cjs');
const {digest}=require('./canonical.cjs');
module.exports=createWyrdruneRuntime({hashSource:source=>createHash('sha256').update(source).digest('hex'),ritualFunctions,continuityDigest:digest});
