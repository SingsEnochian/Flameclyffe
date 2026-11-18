'use strict';
// Crow Trainer cohort: Wyrdrune-native, Amber-route-capable training contracts.
// A manifest is not a running agent. Runtime adapters must provide actual model receipts.
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const {createHash}=require('node:crypto');
const {compile,execute,PHASES}=require('./wyrdrune/wyrdrune.cjs');
const {validateNativeProgram}=require('./wayglass-wyrdrune-voice.cjs');
const LESSONS=Object.freeze([
  'lib/wyrdrune/with-002-amber.wtl',
  'lib/wyrdrune/story-soundscape.wtl',
  'lib/wyrdrune/hearthweave-timeline-soundscape.wtl'
]);
const COHORT=Object.freeze([
  {id:'crow:lexicon',role:'Wyrdrune compiler and language tutor'},
  {id:'crow:harmony',role:'harmonic and somatic soundscape researcher'},
  {id:'crow:bridge',role:'authenticated Bluebird and Hearthweave route integrator'},
  {id:'crow:continuity',role:'Return Engine provenance and Withness verifier'}
]);
const digest=s=>createHash('sha256').update(s).digest('hex');
function lessonManifest(root=join(__dirname,'..')){
 return LESSONS.map(path=>{const source=readFileSync(join(root,path),'utf8');const ir=validateNativeProgram(source);return {path,sha256:digest(source),cycles:ir.units.length};});
}
function prepareCohort({principal,modelRoute,allowProviderCalls=false}={}){
 if(!principal?.authorized)throw new Error('Owner-authorised training required');
 if(typeof modelRoute!=='string'||!modelRoute.trim())throw new Error('Explicit Amber model route required');
 return Object.freeze({schema:'wayglass.crow-trainer-cohort/v0.1',model_route:modelRoute,model_calls_authorized:allowProviderCalls===true,agents:COHORT.map(agent=>({...agent,state:'declared-not-spawned'})),lessons:lessonManifest(),protocol:['Perceive existing Wyrdrune and verify source hashes','Compress one bounded task per agent without losing system context','Release original executable WTL, not imitation JavaScript','Verify via native compiler and negative tests','Integrate only through existing authenticated bridges','Choose with explicit owner and model-route authority','Return source, receipt, stop point and next owner','Transcend with separate identity and unchanged provenance','Withness: report what became more whole'],runtime_state:'requires-agent-executor-and-live-model-receipt'});
}
async function assessWyrdrune(source,{principal}={}){
 if(!principal?.authorized)throw new Error('Owner permission required');
 const ir=validateNativeProgram(source);
 return Object.freeze({valid:true,source_sha256:ir.sourceHash,cycles:ir.units.length,phases:PHASES,executed:false,model_trained:false});
}
module.exports={COHORT,LESSONS,lessonManifest,prepareCohort,assessWyrdrune};
