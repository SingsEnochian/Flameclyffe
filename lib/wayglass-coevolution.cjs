'use strict';

// This file is the host bridge, NOT the co-evolution policy.
// All candidate arithmetic, domain tests, comparison and Eightfold choice/carry
// reside in lib/wyrdrune/coevolution-{repair,expand}.wtl.
// Host responsibility: bounded evidence, explicit authority, source integrity,
// existing Möbius Return checkpoints and no production side effects.
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const M = require('./wayglass-mobius.cjs');
const WTL = require('./wyrdrune/wyrdrune.cjs');
const { digest } = require('./wyrdrune/canonical.cjs');

const SCHEMA = 'wayglass.coevolution-wtl/v0.1';
const SYSTEM = 'wayglass:reciprocal-adaptation';
const MODES = Object.freeze(['repair', 'expand']);
const KINDS = Object.freeze(['simulation', 'instrument']);
const CHECKS = Object.freeze(['infrastructure', 'intelligence']);

function string(value, field, max = 300) {
  if (typeof value !== 'string' || !value.trim() || value.length > max ||
      /[\u0000-\u001f]/u.test(value)) throw new TypeError('Invalid ' + field);
  return value.trim();
}
function shape(value, keys, field) {
  if (!value || Array.isArray(value) || typeof value !== 'object' ||
      Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) {
    throw new TypeError(field + ' must have exactly: ' + keys.join(', '));
  }
}
function number(value, label, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(label + ' out of range');
  return value;
}
function fraction(value, field) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(field + ' must be 0..1');
  return value;
}
function validPair(pair) {
  shape(pair, CHECKS, 'configuration');
  shape(pair.infrastructure, ['queue_capacity','timeout_ms'], 'infrastructure');
  shape(pair.intelligence, ['concurrency','context_tokens'], 'intelligence');
  const infra = Object.freeze({
    queue_capacity: number(pair.infrastructure.queue_capacity, 'queue capacity', 8, 64),
    timeout_ms: number(pair.infrastructure.timeout_ms, 'timeout', 500, 8000),
  });
  const mind = Object.freeze({
    concurrency: number(pair.intelligence.concurrency, 'concurrency', 1, 8),
    context_tokens: number(pair.intelligence.context_tokens, 'context tokens', 512, 8192),
  });
  if (mind.concurrency > infra.queue_capacity) throw new RangeError('Concurrency exceeds queue');
  return Object.freeze({ infrastructure: infra, intelligence: mind });
}
function measurement(value) {
  shape(value, ['source_ref','observed_at','kind','network','intelligence','fallback_independent'], 'evidence');
  shape(value.network, ['p95_ms','error_rate'], 'network measurement');
  shape(value.intelligence, ['success_rate'], 'intelligence measurement');
  if (!KINDS.includes(value.kind)) throw new TypeError('Unknown evidence kind');
  const timestamp = string(value.observed_at,'observed_at',48);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(timestamp) ||
      !Number.isFinite(Date.parse(timestamp))) throw new TypeError('Evidence needs UTC timestamp');
  if (typeof value.fallback_independent !== 'boolean') throw new TypeError('Fallback observation missing');
  return Object.freeze({
    source_ref: string(value.source_ref,'source_ref',500),
    observed_at: new Date(timestamp).toISOString(),
    kind:value.kind,
    network:Object.freeze({
      p95_ms:number(value.network.p95_ms,'p95',1,60000),
      error_rate:fraction(value.network.error_rate,'network error'),
    }),
    intelligence:Object.freeze({success_rate:fraction(value.intelligence.success_rate,'success rate')}),
    fallback_independent:value.fallback_independent,
  });
}
function sourcesValid(observed, baseline, candidate) {
  return digest(observed) === digest(baseline) &&
    observed.source_ref !== candidate.source_ref &&
    Date.parse(candidate.observed_at) >= Date.parse(observed.observed_at);
}
function wtlProgramme(mode) {
  if (!MODES.includes(mode)) throw new TypeError('Unknown Wyrdrune co-evolution mode');
  const path = join(__dirname, 'wyrdrune', 'coevolution-' + mode + '.wtl');
  const source = readFileSync(path,'utf8');
  return WTL.compile(source);
}
function wtlSeeds(pair) {
  const { infrastructure:i, intelligence:a } = validPair(pair);
  return { queue_capacity:i.queue_capacity, timeout_ms:i.timeout_ms,
    concurrency:a.concurrency, context_tokens:a.context_tokens };
}
function restoredPair(seeds) {
  return validPair({
    infrastructure:{queue_capacity:seeds.queue_capacity,timeout_ms:seeds.timeout_ms},
    intelligence:{concurrency:seeds.concurrency,context_tokens:seeds.context_tokens},
  });
}
function evidenceBridges({baseline,candidate,configuration,valid}) {
  const noArgs = fn => ({arguments:args})=>{
    if(args.length)throw new TypeError('Unexpected Wyrdrune evidence parameters');
    return fn();
  };
  return Object.freeze({
    baselineP95:noArgs(()=>baseline.network.p95_ms),
    baselineError:noArgs(()=>baseline.network.error_rate),
    baselineSuccess:noArgs(()=>baseline.intelligence.success_rate),
    baselineFallback:noArgs(()=>baseline.fallback_independent),
    baselineKind:noArgs(()=>baseline.kind),
    candidateP95:noArgs(()=>candidate.network.p95_ms),
    candidateError:noArgs(()=>candidate.network.error_rate),
    candidateSuccess:noArgs(()=>candidate.intelligence.success_rate),
    candidateFallback:noArgs(()=>candidate.fallback_independent),
    candidateKind:noArgs(()=>candidate.kind),
    lineageValid:noArgs(()=>valid),
    candidateMatches:({arguments:args})=>{
      if(args.length!==4 || !args.every(Number.isSafeInteger)) return false;
      const wtlSelected = validPair({
        infrastructure:{queue_capacity:args[0],timeout_ms:args[1]},
        intelligence:{concurrency:args[2],context_tokens:args[3]},
      });
      return digest(wtlSelected)===digest(configuration);
    },
  });
}

function createCoEvolution({seeds,participant_ref,previous=null,feather=()=>false}={}) {
  const initial = wtlSeeds(seeds);
  const participant = string(participant_ref,'participant_ref');
  if (typeof feather !== 'function') throw new TypeError('Feather callback required');
  const lineage=M.createLineage({
    system:SYSTEM,name:'timeline-three-wyrdrune',
    intent:'reciprocal-adaptation',participant,seeds:initial,
    previous,feather,
  });
  let running=false;
  return Object.freeze({
    schema:SCHEMA,
    get root(){return lineage.root;},
    get head(){return lineage.head;},
    get configuration(){return restoredPair(lineage.head?.carry || initial);},
    async cycle({mode,observation,trial,decision='defer',approval_ref=null,principal}={}) {
      if(running)throw new Error('Co-evolution already in flight');
      if(!MODES.includes(mode))throw new TypeError('Explicit Wyrdrune mode required');
      if(!['defer','decline','accept'].includes(decision))throw new TypeError('Invalid decision');
      if (!principal || principal.authorized!==true || !principal.id ||
          string(principal.id,'principal.id') !== participant)
        throw new Error('Verified participant authority required at Wyrdrune bridge');
      if(decision==='accept')string(approval_ref,'approval_ref',500);
      const baseline=measurement(observation);
      shape(trial, ['baseline','candidate','configuration'], 'trial');
      const original=measurement(trial.baseline);
      const candidate=measurement(trial.candidate);
      const configuration=validPair(trial.configuration);
      const valid=sourcesValid(baseline,original,candidate);
      const ir=wtlProgramme(mode); // Compiled WTL is authoritative.
      const activeWeight=decision==='accept'?1:0;
      const bridges={
        evidence:evidenceBridges({baseline,candidate,configuration,valid}),
        authority:{
          sandboxWeight:({arguments:args})=>{
            if(args.length)throw new TypeError('Unexpected authority bridge arguments');
            if(feather())throw new WTL.WyrdruneHardStop('Feather: paused');
            return activeWeight;
          },
        },
      };
      running=true;
      try{
        let result;
        try{
          result=await WTL.execute(ir,{seeds:lineage.head?.carry || initial,principal,
            bridges,signal:{get aborted(){return Boolean(feather());}},maxOperations:9000});
        }catch(error){
          if(/Feather/.test(String(error?.message)))return Object.freeze({
            schema:SCHEMA,status:'feather-stopped',changed:false,checkpoint:null,
            provenance:[baseline.source_ref,candidate.source_ref],model_invoked:false,
            external_effects:false,production_mutation:false,
          });
          throw error;
        }
        if(result.status!=='committed')return Object.freeze({
          schema:SCHEMA,status:result.status,decision,changed:false,proposal:null,
          reason:result.verdict?.reason || 'Wyrdrune Verify refused',
          wtl_source_hash:ir.sourceHash,wtl_receipts:result.receipts,
          wtl_checkpoint:null,checkpoint:null,
          provenance:[baseline.source_ref,candidate.source_ref],
          model_invoked:false,external_effects:false,production_mutation:false,
        });
        const nativeOutput=result.output[0];
        if(!nativeOutput || nativeOutput.outcome!==mode || result.output.length!==1)
          throw new Error('Wyrdrune must emit one native reciprocal proposal');
        if(result.checkpoints.length!==1 || result.receipts.length!==8)
          throw new Error('Native Eightfold receipts or checkpoint missing');
        const carried=result.continuity.carry;
        const selected=restoredPair(carried);
        const expected=decision==='accept'?configuration:this.configuration;
        if(digest(selected)!==digest(expected))throw new Error('Wyrdrune carry differs from authorised choice');
        const phases={
          perceive:async ctx=>{ctx.possibility('gathered',2);return {
            wtl_source_hash:ir.sourceHash,baseline_ref:baseline.source_ref,
            candidate_ref:candidate.source_ref,input_digest:digest(ctx.carried)};},
          compress:async()=>({evidence_kind:baseline.kind,mode}),
          release:async ctx=>{ctx.possibility('generated',2);return {
            native_output_digest:digest(nativeOutput),
            native_checkpoint_digest:digest(result.checkpoints[0])};},
          verify:async()=>[{ok:result.status==='committed',reason:'native Wyrdrune Verify declined'}],
          integrate:async ctx=>{ctx.harmony(1);return {
            withness:'evidence-bound-reciprocity',output_digest:digest(nativeOutput)};},
          choose:async()=>({decision,approval_ref:decision==='accept'?approval_ref:null,
            source:'explicit-authenticated-caller',mode}),
          transcend:async()=>carried,
        };
        const host=await lineage.cycle(phases);
        const accepted=host.status==='committed' && decision==='accept';
        return Object.freeze({
          schema:SCHEMA,mode,participant_ref:participant,root:lineage.root,
          status:host.status==='committed'?
            accepted?'accepted-sandbox-carry':decision==='decline'?'declined':'proposed-only':
            host.status,
          decision,changed:accepted,proposal:validPair({
            infrastructure:nativeOutput.infrastructure,
            intelligence:nativeOutput.intelligence,
          }),
          evidence_kind:baseline.kind,source_refs:[baseline.source_ref,candidate.source_ref],
          wtl_source_hash:ir.sourceHash,wtl_receipts:result.receipts,
          wtl_checkpoint:result.checkpoints[0],
          wtl_execution_lineage:result.lineage.root,
          host_receipts:host.receipts,checkpoint:host.checkpoint,
          carry:this.configuration,
          model_invoked:false,model_weight_updates:false,external_effects:false,
          production_mutation:false,persisted:false,canon_commit:false,authority_grant:false,
        });
      }finally{running=false;}
    },
  });
}

module.exports={SCHEMA,SYSTEM,MODES,KINDS,validPair,measurement,wtlProgramme,createCoEvolution};
