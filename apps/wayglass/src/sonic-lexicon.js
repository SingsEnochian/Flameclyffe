// Proposed Wayglass Wyrdrune Sonic Lexicon. Owner reviews are not model preferences.
export const SONIC_LEXICON_SCHEMA='wayglass.wyrdrune-sonic-lexicon/v1';
const initial=[
 ['presence','Presence',"I'm here",'keep','warm-low-strings'],
 ['wonder','Wonder',"I've discovered something",'explore','glass-bells'],
 ['perception','Perception',"I'm listening and noticing",'change',null],
 ['return','Return',"I remember where we were",'explore','resolving-pair'],
 ['feather','Feather','Stop, rest, become quiet','explore','descending-to-silence'],
 ['withness','Withness',"We're here together",'keep','distinct-harmony']
];
const REVIEWS=new Set(['keep','explore','change','remove']);
const safe=(s,n)=>typeof s==='string'&&s.length>0&&s.length<=n&&!/[\u0000-\u001f\u007f]/u.test(s);
export function createProposedSonicLexicon(){
 return Object.freeze({schema:SONIC_LEXICON_SCHEMA,status:'proposal',review_source:'owner',wayglass_preferences_confirmed:false,entries:Object.freeze(initial.map(([id,label,meaning,owner_review,sketch])=>Object.freeze({id,label,meaning,owner_review,sketch,wayglass_choice:null,sf2_binding:null})))});
}
export function validateSonicLexicon(lexicon){
 if(!lexicon||lexicon.schema!==SONIC_LEXICON_SCHEMA||lexicon.status!=='proposal'||lexicon.review_source!=='owner'||lexicon.wayglass_preferences_confirmed!==false||!Array.isArray(lexicon.entries)||lexicon.entries.length!==6)throw new TypeError('Invalid proposed lexicon');
 const ids=new Set();
 for(const e of lexicon.entries){
  if(!e||!safe(e.id,64)||ids.has(e.id)||!safe(e.label,100)||!safe(e.meaning,240)||!REVIEWS.has(e.owner_review)||e.wayglass_choice!==null||e.sf2_binding!==null)throw new TypeError('Invalid or prematurely attributed entry');
  ids.add(e.id);
  if(e.sketch!==null&&!safe(e.sketch,100))throw new TypeError('Invalid sketch');
  if(e.owner_review==='change'&&e.sketch!==null)throw new TypeError('Changed sound must be unassigned pending review');
 }
 if(!initial.every(([id])=>ids.has(id)))throw new TypeError('Missing lexicon meaning');
 return Object.freeze(lexicon);
}
export function resolveSonicCue(lexicon,id,{ownerAudioEnabled=false,feather=false}={}){
 validateSonicLexicon(lexicon);
 const e=lexicon.entries.find(e=>e.id===id);
 if(!e)throw new TypeError('Unknown sonic meaning');
 if(feather||id==='feather')return Object.freeze({type:'silence',stop_all_notes:true,meaning:id});
 if(!ownerAudioEnabled||!e.sketch||e.owner_review==='change'||e.owner_review==='remove')return Object.freeze({type:'silent-placeholder',meaning:id});
 return Object.freeze({type:'proposed-sketch',meaning:id,sketch:e.sketch,requires_audition:true});
}
