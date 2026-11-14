// World Induction is an authored, opt-in pre-entry score, never an identity oracle.
// All tones are illustrative compositions unless a world-specific source overrides them.
export const WORLD_INDUCTION_SCHEMA='wayglass.world-induction/v1';
export const ASPECT_SCHEMA='wayglass.world-aspect/v1';
const PROFILES=Object.freeze({
  'wayglass:writing-room':Object.freeze({
    rootHz:220,bpm:58,wave:'sine',texture:'A steady open fifth and a slow writing pulse',
    meaning:'The lower tone marks the stable writing desk; the higher tone represents a possibility being composed.',
    listenFor:'Listen for the lower anchor returning beneath a changing upper line.',
    why:'The repeatable anchor distinguishes a return marker from the changes introduced while writing.',
    provenance:'Wayglass original illustrative score, not a measured or canonical world frequency',
  }),
  'evil-gene:film-2015':Object.freeze({
    rootHz:146.83,bpm:54,wave:'triangle',texture:'A low confined drone with a restrained, uneven upper voice',
    meaning:'The anchor suggests a confined setting; a second line holds uncertainty rather than a verdict.',
    listenFor:'Listen for tension between the two lines and the quiet return of the low anchor.',
    why:'The cues orient a fictional investigation without assuming whether any in-world explanation is true.',
    provenance:'Wayglass original suggested film-world sound design, not a film soundtrack or canonical frequency',
  }),
});
const finite=(number,fallback)=>Number.isFinite(Number(number))?Number(number):fallback;
const bound=(number,min,max)=>Math.max(min,Math.min(max,number));
export function worldInductionProfile(world={}){
  const id=String(world.world_id||world.id||'wayglass:writing-room').slice(0,160);
  const chosen=PROFILES[id]||PROFILES['wayglass:writing-room'];
  const override=world.induction_tones;
  const declared=override?.source_ref&&typeof override.source_ref==='string'&&
    finite(override.rootHz,0)>=70&&finite(override.rootHz,0)<=650;
  return Object.freeze({
    schema:WORLD_INDUCTION_SCHEMA,
    world_id:id,
    name:String(world.name||'Unnamed world').slice(0,160),
    rootHz:declared?finite(override.rootHz,chosen.rootHz):chosen.rootHz,
    bpm:declared?bound(finite(override.bpm,chosen.bpm),35,100):chosen.bpm,
    wave:declared&&['sine','triangle'].includes(override.wave)?override.wave:chosen.wave,
    texture:declared?String(override.texture||chosen.texture).slice(0,240):chosen.texture,
    meaning:declared?String(override.meaning||chosen.meaning).slice(0,420):chosen.meaning,
    listenFor:declared?String(override.listenFor||chosen.listenFor).slice(0,420):chosen.listenFor,
    why:declared?String(override.why||chosen.why).slice(0,420):chosen.why,
    provenance:declared?override.source_ref:chosen.provenance,
    source_status:declared?'source-declared':'original-illustrative-proposal',
  });
}
export function writingInductionScore(profile,text=''){
  if(!profile||profile.schema!==WORLD_INDUCTION_SCHEMA)throw new TypeError('World induction profile required');
  const draft=String(text).slice(0,20000);
  const words=draft.match(/\b[\p{L}\p{N}]+(?:['’][\p{L}]+)?\b/gu)||[];
  const sentences=(draft.match(/[.!?]/g)||[]).length;
  const pauses=(draft.match(/[,;:\n]/g)||[]).length;
  const density=bound(words.length/320,0,1);
  const ratio=1.25+((words.length%13)/100)+(Math.min(10,sentences)*.012);
  return Object.freeze({
    schema:'wayglass.world-induction-writing-score/v1',
    rootHz:profile.rootHz,
    counterpartHz:Math.min(900,Number((profile.rootHz*ratio).toFixed(3))),
    beatBpm:bound(profile.bpm+Math.min(16,pauses)*.6,35,110),
    density:Number(density.toFixed(3)),
    wordCount:words.length,
    phraseCount:sentences,
    evidence:'surface-draft-text-features-only; no mood or personal-state inference',
  });
}
export function explicitIAmLines(text=''){
  return String(text).split(/\r?\n/).map(s=>s.trim()).filter(line=>/^I\s+AM\b/i.test(line))
    .map(line=>line.slice(0,240)).slice(0,12);
}
export function validatedAspect({world_id,name,role='',qualities='',boundaries='',affirmations=''}={}){
  if(!world_id||typeof world_id!=='string'||world_id.length>160)throw new TypeError('Choose a world');
  if(typeof name!=='string'||!name.trim()||name.trim().length>100)throw new TypeError('Name your aspect');
  const lines=explicitIAmLines(affirmations);
  if(!lines.length)throw new TypeError('Write at least one explicit I AM line, or choose tones only');
  return Object.freeze({schema:ASPECT_SCHEMA,world_id,name:name.trim(),
    role:String(role).trim().slice(0,240),qualities:String(qualities).slice(0,2500),
    boundaries:String(boundaries).slice(0,2500),affirmations:lines,
    authority:'owner-authored-local-draft-not-canon',promotion:'none'});
}
export function inductionScript(profile,aspect=null){
  if(!profile||profile.schema!==WORLD_INDUCTION_SCHEMA)throw new TypeError('World profile required');
  if(aspect&&(aspect.schema!==ASPECT_SCHEMA||aspect.world_id!==profile.world_id))throw new TypeError('Aspect belongs to another world');
  const introduction=[
    'Preparing to enter '+profile.name+'.',
    'World tone: '+profile.meaning,
    'Listen for this: '+profile.listenFor,
    'Why listen: '+profile.why,
  ];
  const lines=aspect?.affirmations||[];
  return Object.freeze({schema:'wayglass.world-induction-script/v1',
    world_id:profile.world_id,aspect_name:aspect?.name||null,
    introduction,iam:lines,transcript:[...introduction,...lines].join('\n'),
    voice:'quiet-opt-in-full-transcript',hypnosis_or_effect_claimed:false});
}
