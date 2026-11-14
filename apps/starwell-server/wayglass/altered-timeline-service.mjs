// Owner-authorised, domain-specific validation before House stores a Return
// checkpoint. Browser score hints are never accepted without native Wyrdrune
// replay against an independently compiled, content-addressed source.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createWyrdruneRuntime} from '../../../lib/wyrdrune/runtime.mjs';
import {buildAlteredTimeline} from '../../arcsweep/src/altered-timeline.js';
import {compareTimelineEvidence} from '../../arcsweep/src/coherence-spine.js';

const wtlSource=readFileSync(new URL('../../../lib/wyrdrune/altered-timeline.wtl',import.meta.url),'utf8');
const digest=text=>createHash('sha256').update(text).digest('hex');
const text=(value,max=500)=>typeof value==='string'&&value.trim()&&value.length<=max?value.trim():null;
const scenarios=Object.freeze(['original','altered','assimilation','accommodation','coevolution']);
const validRelations=new Set(['supports','challenges','context']);
const validClasses=new Set(['observed','reported','projected','simulated']);

export async function validateAlteredTimelineCheckpoint(data){
  if(!data||typeof data!=='object'||Array.isArray(data))
    throw new TypeError('Altered Timeline snapshot must be a record');
  const keys=Object.keys(data).sort();
  if(keys.some(k=>!['original','changes','branchId','createdAt','evidence'].includes(k))||
     !data.original||!Array.isArray(data.changes)||data.changes.length<1||
     data.changes.length>32||!text(data.branchId,120)||!text(data.createdAt,50))
    throw new TypeError('Bounded Altered Timeline checkpoint required');
  if(!/^[a-z0-9][a-z0-9-]{0,119}$/.test(data.branchId))
    throw new TypeError('Altered branch ID must be a safe name');
  if(!Number.isFinite(Date.parse(data.createdAt)))
    throw new TypeError('Created time must be parseable');
  const runtime=createWyrdruneRuntime({hashSource:digest});
  for(const [index,change] of data.changes.entries()){
    const magnitude=change?.magnitude;
    if(typeof magnitude!=='number'||!Number.isFinite(magnitude)||magnitude<0||magnitude>1)
      throw new TypeError('Change '+(index+1)+' has an invalid intensity');
    const authored=wtlSource.replace('let change_strength = 0.5;',
      'let change_strength = '+String(magnitude)+';');
    const hash=digest(authored);
    if(authored===wtlSource&&magnitude!==0.5||
       change.wtl_source_sha256!==hash)
      throw new TypeError('Wyrdrune source integrity mismatch');
    const result=await runtime.execute(runtime.compile(authored),{maxOperations:5000});
    if(result?.withness?.completedCycles!==2||result.receipts.length!==16)
      throw new TypeError('Wyrdrune Eightfold replay did not complete');
    const score=result.output.find(v=>v?.schema==='wayglass.altered-timeline-ripple/v0.1');
    if(JSON.stringify(score)!==JSON.stringify(change.ripple))
      throw new TypeError('Wyrdrune ripple receipt disagrees with native replay');
  }
  const experiment=buildAlteredTimeline({
    original:data.original,branchId:data.branchId,changes:data.changes,
    approved:true,at:data.createdAt,
  });
  const evidence=Array.isArray(data.evidence)?data.evidence:[];
  if(evidence.length>64)throw new RangeError('Maximum 64 source-labelled timeline evidence receipts');
  const accepted=evidence.map((item,i)=>{
    if(!item||typeof item!=='object'||!text(item.receipt_id,140)||
       !Array.isArray(item.source_refs)||item.source_refs.length<1||item.source_refs.length>8||
       !item.source_refs.every(ref=>text(ref,300))||
       !Array.isArray(item.timeline_evidence)||item.timeline_evidence.length!==1)
      throw new TypeError('Invalid timeline evidence receipt '+i);
    const r=item.timeline_evidence[0];
    if(!scenarios.includes(r?.timeline_id)||!validRelations.has(r.relation)||
       !validClasses.has(r.evidence_class))
      throw new TypeError('Invalid timeline evidence classification '+i);
    return {receipt_id:item.receipt_id,source_refs:[...new Set(item.source_refs)],
      when:{occurred_at:text(item.when?.occurred_at,50)||null},
      timeline_evidence:[{
        timeline_id:r.timeline_id,relation:r.relation,
        evidence_class:r.evidence_class,source_refs:[...new Set(item.source_refs)],
      }]};
  });
  const comparison=compareTimelineEvidence(accepted,scenarios);
  return {snapshot:{
    original:experiment.original,changes:data.changes,branchId:data.branchId,
    createdAt:data.createdAt,evidence:accepted,
  },experiment,comparison};
}
