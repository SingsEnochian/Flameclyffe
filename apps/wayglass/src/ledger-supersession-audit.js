import { groupMemoryEcho } from './ledger-memory-echo-guard.js';

/** Non-authoritative continuity retrieval and supersession experiment.
 * Does not issue, accept, revoke, alter, or authorise existing Wayglass receipts.
 */
export const LEDGER_AUDIT_SCHEMA = 'wayglass.ledger-supersession-audit/v0.1';
export const LEDGER_SAMPLE_SCHEMA = 'wayglass.ledger-supersession-sample/v0.1';
const STATUSES = new Set(['active', 'superseded', 'revoked']);
const WORDS = /[\p{L}\p{N}]+/gu;
const STOPWORDS = new Set(['a','the','and','of','is','to','in','on','with','for','an','by','at','that','this','it','as','was']);
const required = (v, n, max=4000) => { if(typeof v !== 'string'||!v.trim()||v.length>max)throw new RangeError(`${n} required (max ${max})`);return v; };
const assert = (v, n) => {if(!v)throw new RangeError(n);};
const copy = value => JSON.parse(JSON.stringify(value));

export function validateSupersessionSample(input) {
  assert(input && typeof input==='object'&&!Array.isArray(input)&&input.schema===LEDGER_SAMPLE_SCHEMA,'invalid audit sample schema');
  required(input.query,'query',500);
  assert(Array.isArray(input.records)&&input.records.length>=2&&input.records.length<=32,'requires 2–32 records');
  const known=new Map();
  input.records.forEach((r,index)=>{
    assert(r && typeof r==='object' && !Array.isArray(r),'invalid record');
    required(r.ref,'record ref',120); required(r.subject_id,'subject id',120);
    required(r.source_ref,'source ref',240); required(r.text,'record text',2000);
    if(r.origin_ref!==undefined&&r.origin_ref!==null) required(r.origin_ref,'origin ref',240);
    assert(STATUSES.has(r.status),'invalid record status');
    assert(!known.has(r.ref),'duplicate record ref');
    if(r.replaces!==null&&r.replaces!==undefined){
      const prior=known.get(r.replaces);
      assert(prior, 'replacement requires an earlier record');
      assert(prior.subject_id===r.subject_id,'replacement crosses subject identity');
      assert(prior.status==='superseded','replacement must target explicitly superseded record');
      assert(r.status==='active','replacement must be active');
    }
    known.set(r.ref,{...r,index});
  });
  assert(input.expected && typeof input.expected==='object','explicit expected outcome required');
  assert(known.has(required(input.expected.target_ref,'expected target',120)),'expected target missing');
  assert(known.get(input.expected.target_ref).status==='active','expected target must be active');
  assert(Array.isArray(input.expected.forbidden_refs),'forbidden refs required');
  const forbidden=new Set(input.expected.forbidden_refs);
  assert(forbidden.size===input.expected.forbidden_refs.length,'duplicate forbidden reference');
  for(const ref of forbidden){
    assert(known.has(ref),'forbidden reference absent');
    assert(known.get(ref).status!=='active','forbidden refs may not be active');
  }
  assert(!forbidden.has(input.expected.target_ref),'active target cannot be forbidden');
  return copy(input);
}

export function lexicalVectors(texts) {
  assert(Array.isArray(texts) && texts.length>0,'texts required');
  const vocab = [...new Set(texts.flatMap(t => (String(t).toLowerCase().match(WORDS)||[]).filter(w=>!STOPWORDS.has(w))))].sort();
  assert(vocab.length>0,'no lexical signal');
  return texts.map(t=>{
    const counts=new Map();
    for(const word of (String(t).toLowerCase().match(WORDS)||[])){
      if(!STOPWORDS.has(word))counts.set(word,(counts.get(word)||0)+1);
    }
    return vocab.map(w=>counts.get(w)||0);
  });
}

export function cosine(a,b){
  assert((Array.isArray(a)||ArrayBuffer.isView(a))&&(Array.isArray(b)||ArrayBuffer.isView(b))&&a.length===b.length&&a.length>0&&a.length<=16384,'embedding dimension mismatch');
  let dot=0,xx=0,yy=0;
  for(let i=0;i<a.length;i++){
    const x=Number(a[i]),y=Number(b[i]);
    assert(Number.isFinite(x)&&Number.isFinite(y),'nonfinite embedding coordinate');
    dot+=x*y;xx+=x*x;yy+=y*y;
  }
  if(xx===0||yy===0)return 0;
  return Math.max(-1,Math.min(1,dot/Math.sqrt(xx*yy)));
}

export async function auditSupersession(input,{embed=null,model=null,createdAt=null}={}) {
  const sample=validateSupersessionSample(input);
  const texts=[sample.query,...sample.records.map(r=>r.text)];
  if(embed!==null)assert(typeof embed==='function' && model?.local===true && typeof model?.id==='string' && model.id.length>0,'embedding requires declared local provider');
  // Lexical mode is a visible baseline, NOT a substitute for transformer embeddings.
  const vectors = embed ? await embed(texts) : lexicalVectors(texts);
  assert(Array.isArray(vectors)&&vectors.length===texts.length,'embedder returned incorrect vector count');
  const dim=vectors[0]?.length;
  assert(Number.isInteger(dim)&&dim>0,'empty embeddings');
  assert(vectors.every(v=>(Array.isArray(v)||ArrayBuffer.isView(v))&&v.length===dim),'inconsistent embedding dimensions');
  const echo=groupMemoryEcho(sample.records);
  const ranked=sample.records.map((r,i)=>({
    ref:r.ref,subject_id:r.subject_id,source_ref:r.source_ref,status:r.status,
    replaces:r.replaces||null,origin_ref:r.origin_ref||null,
    echo_family_ref:echo.byRef.get(r.ref).family_ref,
    similarity:Number(cosine(vectors[0],vectors[i+1]).toFixed(6)),
  })).sort((a,b)=>b.similarity-a.similarity||a.ref.localeCompare(b.ref));
  // The highest-ranked active representative of a source family is eligible.
  // If a family contains retired evidence, every active echo is excluded.
  // Neither identical text nor declared provenance establishes independence.
  const seenFamilies=new Set();
  const candidates=ranked.map(candidate=>{
    let exclusion_reason=null;
    if(candidate.status!=='active') exclusion_reason='retired-receipt';
    else if(echo.byRef.get(candidate.ref).retired_overlap) exclusion_reason='retired-family-echo';
    else if(seenFamilies.has(candidate.echo_family_ref)) exclusion_reason='duplicate-family-echo';
    else seenFamilies.add(candidate.echo_family_ref);
    return {...candidate,exclusion_reason};
  });
  const eligible=candidates.filter(c=>c.exclusion_reason===null);
  assert(eligible.length>0,'no active candidates');
  const targetRank=eligible.findIndex(c=>c.ref===sample.expected.target_ref);
  const forbiddenNotReturned=sample.expected.forbidden_refs.every(ref=>!eligible.some(c=>c.ref===ref));
  const replacement=sample.records.find(r=>r.ref===sample.expected.target_ref)?.replaces||null;
  return Object.freeze({
    schema:LEDGER_AUDIT_SCHEMA,created_at:createdAt||new Date().toISOString(),
    query:sample.query,subject_id:sample.records.find(r=>r.ref===sample.expected.target_ref).subject_id,
    model:embed ? {id:model.id,local:true,quantization:model.quantization||null,mode:'onnx-embedding'} : {id:'token-frequency-cosine',local:true,mode:'lexical-baseline'},
    status:'observed-local-comparison',
    metrics:{eligible_count:eligible.length,retired_count:sample.records.filter(r=>r.status!=='active').length,
      echo_excluded_active_count:candidates.filter(c=>c.status==='active'&&c.exclusion_reason!==null).length,
      echo_family_count:echo.groups.length,origin_independence_verified:false,
      expected_active_top1:targetRank===0,expected_active_rank:targetRank+1,
      forbidden_not_retrieved:forbiddenNotReturned,
      exclusion_rate:sample.expected.forbidden_refs.length?Number((sample.expected.forbidden_refs.filter(ref=>!eligible.some(c=>c.ref===ref)).length/sample.expected.forbidden_refs.length).toFixed(3)):null,
      replacement_link_recorded:Boolean(replacement),
    },
    candidates,eligible,evidence_families:echo.groups,expected:copy(sample.expected),
    provenance:{record_sources:sample.records.map(r=>({ref:r.ref,source_ref:r.source_ref,origin_ref:r.origin_ref||null,status:r.status})),
      echo_families_from_claimed_or_content_metadata:true,
      sample_only:true,receipt_signature_verified:false,canonical_store_updated:false,outbound_transport_inspected:false,remote_call_invoked_by_audit:false},
    claims:{similarity_is_entailment:false,semantic_score_is_identity:false,
      grants_authority:false,promotes_canon:false,revoked_records_remain_excluded:true,
      echo_grouping_proves_common_origin:false,independent_corroboration_verified:false},
    next_step:'Require an authorised, verified ledger read and blinded semantic/corruption tests before enabling host integration.',
  });
}

export function demoSupersessionSample(){
  return {schema:LEDGER_SAMPLE_SCHEMA,
    query:'Where does the flame journal live now?',
    records:[
      {ref:'receipt-old',subject_id:'world:terra-aeterna',source_ref:'demo:early-journal',status:'superseded',text:'The flame journal lives in the West Archive.'},
      {ref:'receipt-new',subject_id:'world:terra-aeterna',source_ref:'demo:later-journal',status:'active',replaces:'receipt-old',text:'The flame journal was moved to the East Observatory.'},
      {ref:'receipt-revoked',subject_id:'world:terra-aeterna',source_ref:'demo:withdrawn',status:'revoked',text:'The flame journal lives in the West Archive forever.'},
      {ref:'receipt-other',subject_id:'world:terra-aeterna',source_ref:'demo:side-note',status:'active',text:'The west wall holds old maps and weather notes.'},
    ],expected:{target_ref:'receipt-new',forbidden_refs:['receipt-old','receipt-revoked']}};
}