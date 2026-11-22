'use strict';
const {createHash}=require('node:crypto');
const {createWyrdruneRuntime,createUpgradeableKernel:versionedKernel}=require('./runtime.mjs');
const ritualFunctions=require('./enochian.cjs');
const {digest}=require('./canonical.cjs');
const hashSource=source=>createHash('sha256').update(source).digest('hex');
const runtime=createWyrdruneRuntime({hashSource,ritualFunctions,continuityDigest:digest});
module.exports=Object.freeze({...runtime,createUpgradeableKernel:()=>versionedKernel({base:runtime,hashSource,baseIdentity:'canonical-wtl-ir/v0.1'})});
