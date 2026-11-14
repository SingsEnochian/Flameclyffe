'use strict';
// Wayglass Timeline Three: reciprocal adaptation over the EXISTING Möbius engine.
// No extra kernel, model invocation, production mutation or unverified source claim.
const M = require('./wayglass-mobius.cjs');
const { digest } = require('./wyrdrune/canonical.cjs');
const SCHEMA = 'wayglass.coevolution/v0.1';
const SYSTEM = 'wayglass:reciprocal-adaptation';
const KINDS = Object.freeze(['instrument', 'simulation']);
const DECISIONS = Object.freeze(['defer', 'decline', 'accept']);

function name(v, label, max=240) {
  if (typeof v !== 'string' || !v.trim() || v.length > max || /[\u0000-\u001f]/u.test(v)) throw new TypeError('Invalid ' + label);
  return v.trim();
}
function exact(v, keys, label) {
  if (!v || typeof v !== 'object' || Array.isArray(v) ||
      Object.keys(v).sort().join('|') !== [...keys].sort().join('|')) {
    throw new TypeError(label + ' requires exactly ' + keys.join(', '));
  }
}
function int(v, label, min, max) {
  if (!Number.isSafeInteger(v) || v < min || v > max) throw new RangeError(label + ' out of range');
  return v;
}
function fraction(v, label) {
  if (!Number.isFinite(v) || v < 0 || v > 1) throw new RangeError(label + ' must be 0..1');
  return v;
}
function validPair(v) {
  exact(v, ['infrastructure','intelligence'], 'paired configuration');
  exact(v.infrastructure, ['queue_capacity','timeout_ms'], 'infrastructure');
  exact(v.intelligence, ['concurrency','context_tokens'], 'intelligence');
  const i = Object.freeze({
    queue_capacity: int(v.infrastructure.queue_capacity, 'queue_capacity', 8, 64),
    timeout_ms: int(v.infrastructure.timeout_ms, 'timeout_ms', 500, 8000),
  });
  const a = Object.freeze({
    concurrency: int(v.intelligence.concurrency, 'concurrency', 1, 8),
    context_tokens: int(v.intelligence.context_tokens, 'context_tokens', 512, 8192),
  });
  if (a.concurrency > i.queue_capacity) throw new RangeError('Dispatch concurrency exceeds queue');
  return Object.freeze({ infrastructure: i, intelligence: a });
}
function measurement(v, label='measurement') {
  exact(v, ['source_ref','observed_at','kind','network','intelligence','fallback_independent'], label);
  if (!KINDS.includes(v.kind)) throw new TypeError('Unknown evidence kind');
  exact(v.network, ['p95_ms','error_rate'], 'network measurement');
  exact(v.intelligence, ['success_rate'], 'intelligence measurement');
  const at = name(v.observed_at, 'UTC observation time', 48);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(at) || !Number.isFinite(Date.parse(at)))
    throw new TypeError('Explicit ISO UTC timestamp required');
  if (typeof v.fallback_independent !== 'boolean') throw new TypeError('Fallback must be observed');
  return Object.freeze({
    source_ref: name(v.source_ref, 'source_ref', 500),
    observed_at: new Date(at).toISOString(), kind: v.kind,
    network: Object.freeze({
      p95_ms: int(v.network.p95_ms, 'p95_ms', 1, 60000),
      error_rate: fraction(v.network.error_rate, 'error_rate'),
    }),
    intelligence: Object.freeze({ success_rate: fraction(v.intelligence.success_rate, 'success_rate') }),
    fallback_independent: v.fallback_independent,
  });
}
function proposeReciprocalShift(pair, observation) {
  const state = validPair(pair), o = measurement(observation);
  const i = state.infrastructure, a = state.intelligence;
  const stressed = o.network.p95_ms >= 500 || o.network.error_rate >= 0.10 || !o.fallback_independent;
  return validPair(stressed ? {
    infrastructure: { queue_capacity: Math.max(8,i.queue_capacity-4), timeout_ms: Math.min(8000,i.timeout_ms+250) },
    intelligence: { concurrency: Math.max(1,a.concurrency-1), context_tokens: Math.max(512,a.context_tokens-256) },
  } : {
    infrastructure: { queue_capacity: Math.min(64,i.queue_capacity+4), timeout_ms: Math.max(500,i.timeout_ms-50) },
    intelligence: { concurrency: Math.min(8,a.concurrency+1), context_tokens: Math.min(8192,a.context_tokens+128) },
  });
}
function compareTrial(b,c) {
  const reasons=[];
  if (b.kind !== c.kind) reasons.push('incomparable evidence kinds');
  if (b.source_ref === c.source_ref) reasons.push('candidate source is not distinct');
  if (Date.parse(c.observed_at) < Date.parse(b.observed_at)) reasons.push('candidate precedes baseline');
  if (!c.fallback_independent) reasons.push('fallback independence failed');
  if (c.network.error_rate > b.network.error_rate) reasons.push('network error-rate regression');
  if (c.network.p95_ms > b.network.p95_ms) reasons.push('network latency regression');
  if (c.intelligence.success_rate < b.intelligence.success_rate) reasons.push('intelligence success-rate regression');
  if (!(c.network.error_rate < b.network.error_rate ||
        c.network.p95_ms < b.network.p95_ms ||
        c.intelligence.success_rate > b.intelligence.success_rate)) reasons.push('no improvement');
  return Object.freeze({ ok: reasons.length===0, reasons: Object.freeze(reasons) });
}

// The paired configuration is one carried value in Wayglass's original engine.
// Distinct infrastructure and intelligence state survive separately in that carry.
// Accept only moves the sandbox carry; it never applies effects outside this process.
function createCoEvolution({seeds, participant_ref, previous=null, feather=()=>false}={}) {
  const initial=validPair(seeds), participant=name(participant_ref,'participant_ref');
  if (typeof feather !== 'function') throw new TypeError('Feather callback required');
  const lineage=M.createLineage({system:SYSTEM,name:'reciprocal-coupling',
    intent:'timeline-three-isolated-sandbox',participant,seeds:initial,previous,feather});
  let inFlight=false;
  return Object.freeze({
    schema:SCHEMA,
    get root(){return lineage.root;},
    get head(){return lineage.head;},
    get configuration(){return lineage.head?.carry || initial;},
    async cycle({observation,trial=null,decision='defer',approval_ref=null}={}) {
      if (inFlight) throw new Error('Co-evolution cycle already in flight');
      if (!DECISIONS.includes(decision)) throw new TypeError('Unknown decision');
      if (decision==='accept') name(approval_ref,'approval_ref',500);
      const obs=measurement(observation,'observation');
      let baseline=null,candidate=null,claimed=null;
      if (trial!==null) {
        exact(trial,['baseline','candidate','configuration_sha256'],'trial');
        baseline=measurement(trial.baseline,'trial.baseline');
        candidate=measurement(trial.candidate,'trial.candidate');
        claimed=name(trial.configuration_sha256,'trial.configuration_sha256',64);
      }
      inFlight=true;
      try {
        const current=lineage.head?.carry || initial;
        const proposal=proposeReciprocalShift(current,obs);
        const proposalHash=digest(proposal);
        const trialResult=baseline && candidate ? compareTrial(baseline,candidate) :
          Object.freeze({ok:false,reasons:['no paired trial']});
        const bothChanged=digest(current.infrastructure)!==digest(proposal.infrastructure) &&
          digest(current.intelligence)!==digest(proposal.intelligence);
        const checks=[
          {ok: trial!==null,reason:'paired trial required'},
          {ok: claimed===proposalHash,reason:'candidate configuration does not match tested proposal'},
          {ok: Boolean(baseline) && digest(baseline)===digest(obs),reason:'baseline does not match source observation'},
          {ok: trialResult.ok,reason:trialResult.reasons.join('; ') || 'candidate regressed'},
          {ok: bothChanged,reason:'adaptation must change both sides'},
        ];
        const phases={
          perceive: async ctx=>{
            ctx.possibility('gathered',2);
            return {observed:obs,carry_digest:digest(ctx.carried)};
          },
          compress: async ()=>({network_stressed:obs.network.p95_ms>=500 ||
            obs.network.error_rate>=0.10 || !obs.fallback_independent,
            source_ref:obs.source_ref}),
          release: async ctx=>{
            ctx.possibility('generated',2);
            return {proposal,configuration_sha256:proposalHash,
              trial_ref:candidate?.source_ref || null};
          },
          verify: async ()=>checks,
          integrate: async ctx=>{
            ctx.harmony(1,'hearthweave-local');
            return {reciprocal:true,trial:trialResult,previous:digest(ctx.carried)};
          },
          choose: async ()=>({decision,approval_ref:decision==='accept'?approval_ref:null,
            can_decline:true,external_effects:false}),
          transcend: async ctx=>decision==='accept'?proposal:ctx.carried,
        };
        const r=await lineage.cycle(phases);
        const accepted=r.status==='committed' && decision==='accept';
        return Object.freeze({
          schema:SCHEMA,participant_ref:participant,root:lineage.root,
          status:r.status==='committed' ? (accepted?'accepted-sandbox-carry':
            decision==='decline'?'declined':'proposed-only') : r.status,
          engine_status:r.status,decision,proposal,proposal_hash:proposalHash,
          observation_ref:obs.source_ref,baseline_ref:baseline?.source_ref||null,
          trial_ref:candidate?.source_ref||null,evidence_kind:obs.kind,
          trial_evaluation:trialResult,reason:r.reason||[],
          checkpoint:r.checkpoint,receipts:r.receipts,
          carry:r.checkpoint?.carry||current,
          model_invoked:false,weights_changed:false,external_effects:false,
          production_mutation:false,persisted:false,canon_commit:false,authority_grant:false,
        });
      } finally { inFlight=false; }
    },
  });
}
module.exports={SCHEMA,SYSTEM,KINDS,DECISIONS,validPair,measurement,
  proposeReciprocalShift,compareTrial,createCoEvolution};
