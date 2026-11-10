// Development regression evidence and completed-language/release evidence differ.
// The strict release decision never accepts TODOs, including this known baseline.
export const SHIP_LANES=Object.freeze(['authority','wyrdrune','mobius','body','observer','agency','return','host']);
export function classifyShipVerification(receipt,{baselineMatched=false,expectedLanguageTodos=0}={}){
 const lanes=receipt?.lanes;
 const structure=receipt?.source_unchanged===true&&Array.isArray(lanes)&&lanes.length===8&&new Set(lanes.map(l=>l.id)).size===8&&SHIP_LANES.every(id=>lanes.some(l=>l.id===id));
 const executable=l=>l.exit_code===0&&!l.timed_out&&l.tests>0&&l.fail===0&&l.skipped===0;
 const complete=structure&&lanes.every(l=>executable(l)&&l.todo===0&&l.status==='passed');
 if(complete)return {development_status:'passed',release_status:'passed',release_ready:true};
 const knownGaps=structure&&baselineMatched&&expectedLanguageTodos>0&&lanes.every(l=>executable(l)&&
   (l.id==='wyrdrune'?l.todo===expectedLanguageTodos&&l.status==='incomplete':l.todo===0&&l.status==='passed'));
 return {development_status:knownGaps?'passed-with-known-language-gaps':'failed',release_status:structure&&lanes.every(executable)?'incomplete':'failed',release_ready:false};
}
