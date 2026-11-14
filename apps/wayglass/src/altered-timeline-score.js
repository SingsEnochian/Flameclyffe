// One native Wyrdrune programme supplies the ripple display score.
// Browser code does not invent an alternative transfer function.
import source from '../../../lib/wyrdrune/altered-timeline.wtl?raw';
import {createWyrdruneRuntime} from '../../../lib/wyrdrune/runtime.mjs';
import {validateWyrdruneRipple,TIMELINE_RIPPLE_SCHEMA} from '../../arcsweep/src/altered-timeline.js';

export async function compileAlteredTimelineRipple({
  magnitude,confirmed=false,cryptoProvider=globalThis.crypto,signal=null,
}={}) {
  if(confirmed!==true)throw new Error('The owner must explicitly introduce the change');
  if(typeof magnitude!=='number'||!Number.isFinite(magnitude)||magnitude<0||magnitude>1)
    throw new RangeError('Scenario strength must be between zero and one');
  if(signal?.aborted)throw new Error('Feather Stop: scenario is paused');
  if(!cryptoProvider?.subtle)throw new Error('Secure source hashing is required');
  // No privileged WTL bridge: deliberately authored, bounded numeric literal only.
  // A browser preview never asserts a verified House Steward principal.
  const authored=source.replace('let change_strength = 0.5;', 'let change_strength = '+String(magnitude)+';');
  if(authored===source&&magnitude!==0.5)throw new Error('WTL magnitude slot missing');
  const hash=await cryptoProvider.subtle.digest('SHA-256',new TextEncoder().encode(authored));
  const sourceHash=[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
  const runtime=createWyrdruneRuntime({hashSource:()=>sourceHash});
  const result=await runtime.execute(runtime.compile(authored),{
    signal:{get aborted(){return Boolean(signal?.aborted);}},maxOperations:5000,
  });
  if(result.withness?.completedCycles!==2||result.receipts.length!==16)
    throw new TypeError('Both native Eightfold cycles must complete');
  const plan=result.output.find(x=>x?.schema===TIMELINE_RIPPLE_SCHEMA);
  validateWyrdruneRipple(plan);
  return Object.freeze({plan,source_sha256:sourceHash,phase_receipts:result.receipts,
    authority:'preview-only; no live model, storage, physical or canon mutation'});
}
