// Journey Before Destination: four chambers and four supportive folds.
// Session journal only; no silent route execution, canon, durable memory or identity writes.
export const JOURNEY_SCHEMA = 'wayglass.journey-before-destination/v1';
export const JOURNEY_CHAMBERS = Object.freeze([
  {id:'pre-flight',label:'Pre-flight',mode:'plan',purpose:'Intent, permissions, route and what must be checked before departure.'},
  {id:'journey',label:'Journey',mode:'work',purpose:'Work in progress, observed crossings and their receipts.'},
  {id:'dream-journey',label:'Dream-Journey',mode:'dream',purpose:'Possible worlds, wonder questions and imaginative alternatives.'},
  {id:'voyage',label:'Voyage',mode:'narrate',purpose:'Witnessed results, stopping points and what continues on return.'},
].map(x=>Object.freeze(x)));
export const SUPPORT_FOLDS = Object.freeze([
  {id:'compass',label:'Compass',purpose:'Intent and route'},
  {id:'witness',label:'Witness',purpose:'Evidence and PREMAQC'},
  {id:'feather',label:'Feather',purpose:'Stop, quiet and consent'},
  {id:'hearth',label:'Hearth',purpose:'Continuity and return'},
].map(x=>Object.freeze(x)));
const CHAMBERS = new Set(JOURNEY_CHAMBERS.map(c=>c.id));
const FOLDS = new Set(SUPPORT_FOLDS.map(c=>c.id));
const text=(v,max=1200)=>String(v??'').trim().slice(0,max);
const clone=value=>structuredClone(value);

export function createJourneyLedger({now=()=>new Date().toISOString()}={}) {
  let chamber='pre-flight', stopped=false, sequence=0;
  const entries=[];
  const snapshot=()=>Object.freeze(clone({
    schema:JOURNEY_SCHEMA,
    active_chamber:chamber, feather_stopped:stopped,
    entries, state_persistence:'session-only',
    canon_committed:false, model_inference_claimed:false,
  }));
  function entry(kind,{note='',sourceRef=null,author='owner:local'}={}) {
    if(stopped) throw new Error('Feather Stop is active; resume deliberately before journaling.');
    const item=Object.freeze({
      schema:'wayglass.journey-entry/v1',id:'journey-'+(++sequence),kind,
      chamber,at:now(),author:text(author,100),
      note:text(note),source_ref:sourceRef?text(sourceRef,180):null,
      evidence_state:sourceRef?'reference-not-independently-verified':'local-entry',
      authority:'session-only-no-canon-commit',
    });
    entries.push(item);
    if(entries.length>120)entries.shift();
    return item;
  }
  return Object.freeze({
    selectChamber(id){
      if(!CHAMBERS.has(id)) throw new TypeError('Unknown journey chamber.');
      if(stopped) throw new Error('Feather Stop is active.');
      chamber=id;
      return entry('chamber-entered',{note:'Entered '+id});
    },
    write:entry,
    supportFold(id,details={}){
      if(!FOLDS.has(id)) throw new TypeError('Unknown supportive fold.');
      if(id==='feather'){
        stopped=true;
        const item=Object.freeze({
          schema:'wayglass.journey-entry/v1',id:'journey-'+(++sequence),
          kind:'feather-stop',chamber,at:now(),
          author:'owner:local',note:text(details.note||'All sound and action paused.'),
          source_ref:null,evidence_state:'owner-stop',
          authority:'pause-only',
        });
        entries.push(item);
        return item;
      }
      return entry('support:'+id,details);
    },
    resume({confirmed=false}={}){
      if(confirmed!==true) throw new Error('Owner confirmation required to release Feather.');
      stopped=false;
      return entry('feather-released',{note:'Owner resumed the local journal.'});
    },
    snapshot,
  });
}
