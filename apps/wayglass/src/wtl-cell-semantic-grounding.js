// Source-grounded explanation of accepted WTL Nursery signals.
// Pure formatter: it never creates an event or authorises a capability.
// The source receipt is a simulation event, not evidence of physical hearing.
export const GROUNDING_SCHEMA='wayglass.wtl.cell-grounding/v0.1';
const channels=['pulse','spiral','echo'];
const idOK=id=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,63}$/.test(id);
const countOK=n=>Number.isSafeInteger(n)&&n>=0;

export function groundAcceptedCellSignal({
  receipt,generation,sender,receiver,neighbours,twist,dialectBias,
  senderBefore,senderAfter,receiverBefore,receiverAfter,poetry=null,
}={}){
  if(!countOK(generation)||!idOK(sender)||!idOK(receiver)||sender===receiver||
     !Array.isArray(neighbours)||!neighbours.length||!neighbours.every(idOK)||
     !Number.isFinite(twist)||twist<0||twist>1||
     !Number.isSafeInteger(dialectBias)||dialectBias<0||dialectBias>2)
    throw new TypeError('Invalid attributed cell decision.');
  if(!receipt||receipt.type!=='signal'||receipt.from!==sender||receipt.to!==receiver||
     !countOK(receipt.tick)||!channels.includes(receipt.signal_type))
    throw new Error('A matching accepted tissue signal receipt is required.');
  const target=neighbours[Math.floor(twist*neighbours.length)%neighbours.length];
  const selectedChannel=channels[(Math.floor(twist*3)+dialectBias)%3];
  if(target!==receiver||selectedChannel!==receipt.signal_type)
    throw new Error('Cell decision does not match its accepted signal receipt.');
  if(![senderBefore,senderAfter,receiverBefore,receiverAfter].every(countOK)||
     senderAfter!==senderBefore+1||receiverAfter!==receiverBefore+1)
    throw new Error('Cell state transition must be supported by before/after counters.');
  if(poetry!==null&&(typeof poetry!=='string'||poetry.length>512))
    throw new TypeError('Poetic expression must be bounded source text.');
  const what=`I queued a ${receipt.signal_type} signal for ${receiver}.`;
  const why=`I selected that neighbouring cell using my twist (${twist.toFixed(3)}) and chose the signal type using my inherited dialect bias (${dialectBias}).`;
  const changed=`My sent count changed from ${senderBefore} to ${senderAfter}; ${receiver}'s accepted-signal count changed from ${receiverBefore} to ${receiverAfter}.`;
  return {
    schema:GROUNDING_SCHEMA,
    id:`cell-grounding:${generation}:${sender}:${receiver}`,
    speaker:sender,generation,mode:'grounded',
    observation_kind:'simulated',
    status:'source-bound-explanation',
    source_receipt:{kind:'tissue-signal-accepted',tick:receipt.tick,type:receipt.type,from:sender,to:receiver,signal_type:receipt.signal_type},
    decision:{neighbours:[...neighbours],twist,dialectBias},
    change:{sender:{before:senderBefore,after:senderAfter},receiver:{before:receiverBefore,after:receiverAfter}},
    explanation:{what,why,changed},
    phrase:[what,why,changed].join(' '),
    poetry,
    provenance:{origin:'accepted-tissue-signal',verified_against_before_after:true,
      physical_hearing_verified:false,independent_model_turn:false,host_effects:false}
  };
}
