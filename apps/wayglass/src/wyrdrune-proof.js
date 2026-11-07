// Independent browser-side Wyrdrune receipt verification.
// WCE-1 canonical JSON + SHA256. Checks integrity, not signature or prophecy.
const PHASES=Object.freeze(['perceive','compress','release','verify','integrate','choose','return','transcend']);
const LONE_SURROGATE=/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u;
const PREVIEW_KEYS=['schema','status','sourceHash','effectPolicy','executionSchema','values','phaseReceipts','withness','ritualLedger','receiptHash','dispatch','model_turn','canon_commit'].sort();

export function encodeWce1(value) {
  if(value===null)return 'null';
  if(value===true)return 'true';
  if(value===false)return 'false';
  if(typeof value==='number'){
    if(!Number.isFinite(value))throw new TypeError('WCE-1: non-finite number');
    return Object.is(value,-0)?'0':String(value);
  }
  if(typeof value==='string'){
    if(LONE_SURROGATE.test(value))throw new TypeError('WCE-1: ill-formed Unicode');
    return JSON.stringify(value);
  }
  if(Array.isArray(value))return '['+value.map(encodeWce1).join(',')+']';
  const proto=value&&typeof value==='object'?Object.getPrototypeOf(value):null;
  if(value&&typeof value==='object'&&(proto===Object.prototype||proto===null)){
    return '{'+Object.keys(value).sort().map(key=>
      encodeWce1(key)+':'+encodeWce1(value[key])
    ).join(',')+'}';
  }
  throw new TypeError('WCE-1: unsupported value');
}

async function sha256(bytes, cryptoImpl) {
  if(!cryptoImpl?.subtle?.digest)throw new Error('Browser SHA-256 unavailable; verification refused');
  const digest=await cryptoImpl.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}

export async function digestWce1(value,cryptoImpl=globalThis.crypto) {
  const bytes=new TextEncoder().encode(encodeWce1(value));
  return 'wce1:'+await sha256(bytes,cryptoImpl);
}

function reject() {throw new Error('Wyrdrune receipt integrity verification failed');}

/** Called before the editor accepts a host preview or offers a discussion draft. */
export async function verifyWyrdrunePreview(source, data, cryptoImpl=globalThis.crypto) {
  if(typeof source!=='string'||!source.trim()||source.length>16000)reject();
  if(!data||typeof data!=='object'||Array.isArray(data)||
      JSON.stringify(Object.keys(data).sort())!==JSON.stringify(PREVIEW_KEYS)||
      data.schema!=='wayglass.wyrdrune-ritual-preview/v0.1' ||
      data.status!=='preview-only'||data.dispatch!=='none'||
      data.effectPolicy!=='no-host-effects'||data.executionSchema!=='wyrdrune.execution/v0.1'||
      data.model_turn!==false||data.canon_commit!==false)reject();
  const sourceHash=await sha256(new TextEncoder().encode(source),cryptoImpl);
  if(data.sourceHash!==sourceHash)reject();
  const entries=data.ritualLedger?.entries;
  const receipts=data.phaseReceipts;
  const values=data.values;
  if(!Array.isArray(entries)||!Array.isArray(receipts)||!Array.isArray(values)||
      receipts.length===0||receipts.length%8!==0||
      entries.length!==receipts.length||entries.length>800||values.length>2000||
      data.withness?.center!=='withness'||
      data.withness?.completedCycles!==receipts.length/8)reject();

  const ledger=data.ritualLedger;
  const root=await digestWce1({
    schema:'wyrdrune.ritual-ledger-root/v0.1',sourceHash,
    cycleCount:receipts.length/8,outputCount:values.length
  },cryptoImpl);
  if(ledger.schema!=='wyrdrune.ritual-ledger/v0.1'||ledger.sourceHash!==sourceHash||
      ledger.root!==root||ledger.cycles!==receipts.length/8||
      ledger.assurance!=='content-integrity-only; not signer-authenticated or ritual canon')reject();
  let previousHash=root, emitted=0,operations=-1;
  for(let index=0;index<entries.length;index++){
    const receipt=receipts[index],entry=entries[index],phaseIndex=index%8;
    const cycle=Math.floor(index/8)+1;
    if(!receipt||receipt.phase!==PHASES[phaseIndex]||receipt.sourceHash!==sourceHash||
        !Number.isSafeInteger(receipt.operations)||receipt.operations<=operations||
        !Number.isSafeInteger(receipt.emitted)||receipt.emitted<0||
        emitted+receipt.emitted>values.length||receipt.principalId!==null)reject();
    const emissionHashes=[];
    for(let i=emitted;i<emitted+receipt.emitted;i++){
      const value=values[i];
      if(value&&typeof value==='object'&&Object.hasOwn(value,'recordHash')){
        const {recordHash,...record}=value;
        if(recordHash!==await digestWce1(record,cryptoImpl))reject();
      }
      emissionHashes.push(await digestWce1(value,cryptoImpl));
    }
    const expected={
      schema:'wyrdrune.ritual-ledger-step/v0.1',cycle,
      face:cycle%2===1?'outer':'inner',phaseIndex:phaseIndex+1,
      phase:PHASES[phaseIndex],sourceHash,emitted:receipt.emitted,
      operations:receipt.operations,emissionHashes,previousHash,
    };
    const entryHash=await digestWce1(expected,cryptoImpl);
    if(encodeWce1({...expected,entryHash})!==encodeWce1(entry))reject();
    emitted+=receipt.emitted;operations=receipt.operations;previousHash=entryHash;
  }
  if(emitted!==values.length||ledger.terminalHash!==previousHash)reject();
  const sealed={
    schema:data.schema,status:data.status,sourceHash:data.sourceHash,effectPolicy:data.effectPolicy,
    executionSchema:data.executionSchema,values:data.values,phaseReceipts:data.phaseReceipts,
    withness:data.withness,ritualLedger:data.ritualLedger,
  };
  if(data.receiptHash!==await digestWce1(sealed,cryptoImpl))reject();
  return Object.freeze({
    verified:true,sourceHash,terminalHash:previousHash,
    phases:receipts.length,assurance:'content-integrity; not signer-authenticated',
  });
}
