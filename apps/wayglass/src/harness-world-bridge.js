// One Ship: harness evaluation -> provenance-bound Watercolour projection.
// Reuses the existing independent-observation ledger and pigment event bus.
// The visual field is operational telemetry, not an image of physical reality.
import {createResonanceLearningLedger} from './resonance-learning.js';
import {publishWatercolorActivity} from './watercolor-bridge.js';

export const HARNESS_WORLD_SCHEMA='wayglass.harness-world/v1';
const validRef = value => typeof value==='string' && value.length>0 && value.length<=160 && !/[<>\x00-\x1f]/.test(value);
const validId = value => typeof value==='string' && /^[a-z][a-z0-9-]{0,63}$/.test(value);
const sourceKinds=new Set(['test','instrument','owner-review']);

export function createHarnessWorldBridge({ledger=createResonanceLearningLedger(),publish=publishWatercolorActivity}={}) {
  const scenes=new Map();
  let stopped=false;
  function ensureRunning() { if(stopped)throw new Error('Feather is active: resume explicitly before evaluating.'); }
  function begin({trialId,harnessId,sourceReceipt,baseline,feather=false}={}) {
    if(feather||stopped)return Object.freeze({status:'feather-stopped'});
    if(!validId(harnessId))throw new TypeError('Harness identifier required');
    const result=ledger.begin({trialId,resonanceId:harnessId,sourceReceipt,baseline});
    scenes.set(trialId,Object.freeze({schema:HARNESS_WORLD_SCHEMA,trial_id:trialId,
      harness_id:harnessId,source_receipt:sourceReceipt,observation_kind:'measured',
      status:'awaiting-observation',projection_status:'not-rendered',
      assessment:null}));
    return result;
  }
  function observe({trialId,observationReceipt,measurement,sourceKind,feather=false}={}) {
    if(feather||stopped)return Object.freeze({status:'feather-stopped'});
    if(!sourceKinds.has(sourceKind)||!validRef(observationReceipt))
      throw new TypeError('Independent, attributable observation required');
    return ledger.observe({trialId,observationReceipt,measurement,sourceKind});
  }
  function assess(trialId,{feather=false}={}) {
    if(feather||stopped)return Object.freeze({status:'feather-stopped'});
    const trial=ledger.assess(trialId);
    // No invented measurements or adapter training: 'provisional' is not a trained model.
    const intensity=Math.max(0,Math.min(1,Math.abs(trial.delta)/(Math.abs(trial.baseline)+Math.abs(trial.delta)+1)));
    const scene=Object.freeze({schema:HARNESS_WORLD_SCHEMA,trial_id:trialId,
      harness_id:trial.resonanceId,source_receipt:trial.sourceReceipt,
      observation_kind:'measured',status:'provisional',
      projection_status:'visual-expression-only',
      assessment:Object.freeze({delta:trial.delta,baseline:trial.baseline,
        observation_receipts:Object.freeze(trial.observations.map(item=>item.receipt)),
        source_kinds:Object.freeze(trial.observations.map(item=>item.sourceKind))})});
    // Publish only after independently receipted observations meet existing ledger gate.
    publish({kind:'learning:verified',actor:'wayglass:harness-evaluation',
      intensity,receipt:{schema:HARNESS_WORLD_SCHEMA,receipt_id:trial.sourceReceipt}});
    scenes.set(trialId,scene);
    return scene;
  }
  function feather() {stopped=true;return Object.freeze({status:'feather-stopped'});}
  function resume({ownerApproved=false}={}) {
    if(ownerApproved!==true)throw new TypeError('Owner approval required to resume');
    stopped=false;return Object.freeze({status:'ready'});
  }
  function snapshot() {return Object.freeze({schema:HARNESS_WORLD_SCHEMA,
    stopped,scenes:Object.freeze([...scenes.values()]),ledger:ledger.snapshot()});}
  return Object.freeze({begin,observe,assess,feather,resume,snapshot});
}
