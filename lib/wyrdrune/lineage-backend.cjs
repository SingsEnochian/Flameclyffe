'use strict';
// RFC-0001 lineage semantics for every unit: the same interpreter as wyrdrune.cjs, with
// each `mobius` compiled as a scoped lineage (staged emits, require, rollback, checkpoints).
// Used by the conformance suite to claim L1; v0.1 programmes keep using wyrdrune.cjs.
const wtl=require('./wyrdrune.cjs');
module.exports=Object.freeze({...wtl,compile:(source,options={})=>wtl.compile(source,{...options,lineage:true})});
