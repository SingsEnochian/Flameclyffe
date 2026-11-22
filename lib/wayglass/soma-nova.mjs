// Soma Nova first ignition: a host-level, effect-free charge/fire boundary.
// This does not add WTL keywords or activate media/device adapters.
import { createHash } from 'node:crypto';
import { createWyrdruneRuntime } from '../wyrdrune/runtime.mjs';

const digest = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const runtime = createWyrdruneRuntime({hashSource:digest,continuityDigest:digest});
const frozen = value => Object.freeze(value);

export function createSomaNovaChamber({principal,signal}={}) {
  let staged=null, consumed=false, active=null, sequence=0;
  const owner = () => {
    if (!principal?.authorized || !principal?.id) throw new Error('Soma Nova requires verified owner authorization');
    if (signal?.aborted) throw new Error('Feather: chamber stopped');
  };
  return frozen({
    charge(source,{seeds}={}) {
      owner();
      if (staged || active) throw new Error('Previous charge must be released or fired');
      const ir=runtime.compile(source);
      // Charge only compiles WTL; no bridge, device, or provider is invoked.
      const id=digest({sourceHash:ir.sourceHash,ir,participant:principal.id,seeds:seeds??null,sequence:++sequence});
      staged=frozen({id,ir,seeds,sourceHash:ir.sourceHash,participantId:principal.id});
      consumed=false;
      return frozen({schema:'soma-nova.charge/v0.1',chargeId:id,sourceHash:ir.sourceHash,
        participantId:principal.id,phases:runtime.PHASES,status:'ready',effects:'none',preview:'compiled-ir'});
    },
    async fire(chargeId,{consent=false,maxOperations=10000}={}) {
      owner();
      if (!staged || staged.id!==chargeId) throw new Error('No matching charged spell');
      if (consumed) throw new Error('Charge already fired');
      if (consent!==true) throw new Error('Explicit firing consent required');
      consumed=true;
      const charge=staged;
      const controller=new AbortController();
      active=controller;
      const onAbort=()=>controller.abort();
      signal?.addEventListener('abort',onAbort,{once:true});
      if(signal?.aborted)controller.abort();
      try {
        const result=await runtime.execute(charge.ir,{principal,signal:controller.signal,maxOperations,seeds:charge.seeds});
        return frozen({schema:'soma-nova.ignition/v0.1',chargeId,participantId:principal.id,
          sourceHash:charge.sourceHash,status:result.status??'committed',result,
          outputKinds:['structured'],externalEffects:'none',receiptDigest:digest(result)});
      } finally {
        signal?.removeEventListener('abort',onAbort);
        staged=null;
        active=null;
      }
    },
    feather() {
      active?.abort();
      staged=null;consumed=true;
      return frozen({status:'cancelled',reason:'Feather'});
    },
    get ready() { return Boolean(staged&&!consumed&&!signal?.aborted); }
  });
}
