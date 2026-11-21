'use strict';
// A fixed WTL programme owns the experiment crossing. No caller-supplied
// source, arbitrary bridge providers, external effects, or implicit authority.
const CODE=`mobius scoped {
  perceive { let wonder = "A new law possibility"; }
  compress { let scope = "Dreaming numerical model"; }
  release { let open = "open"; }
  verify { require open == "open" else "Possibility must remain open"; }
  integrate { emit wonder; }
  choose { emit scope; }
  return { emit bridge("magic", "run"); }
  transcend { emit open; }
}`;
function createMagicWtlAdapter({host,wtl=require('./wyrdrune/wyrdrune.cjs')}={}){
 if(!host||typeof host.runAsParticipant!=='function')throw new TypeError('Magic host required');
 return async function executeMagicExperiment(input,{principal,signal}={}){
  if(principal?.authorized!==true)throw Object.assign(new Error('Authorized participant required'),{status:401});let result,bridgeFailure,invocations=0;
  const ir=wtl.compile(CODE);const executed=await wtl.execute(ir,{principal,signal,maxOperations:120,bridges:{magic:{run:async()=>{try{if(++invocations!==1)throw new Error('Repeated magic Return');result=await host.runAsParticipant(input,principal,{signal,kernelVersion:ir.kernelVersion??null});return {runId:result.receipt.runId,status:result.receipt.status,receiptHash:result.receipt.receiptHash||null};}catch(error){bridgeFailure=error;throw error;}}}}});
  if(bridgeFailure)throw bridgeFailure;
  if(invocations!==1||!result)throw new Error('Native WTL Return did not invoke the experiment');
  return {...result,wtl:{sourceHash:executed.sourceHash,kernelVersion:executed.kernelVersion||null,phaseReceipts:executed.receipts,withness:executed.withness,bridge:'magic.run'}};
 };
}
module.exports={CODE,createMagicWtlAdapter};
