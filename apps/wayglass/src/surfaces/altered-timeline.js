// WAYGLASS · ALTERED TIMELINE · an intentional what-if room.
// Uses ArcSweep Worldseed ancestry; only Wyrdrune calculates ripple intensities.
// Browser-local until deliberately exported or saved. No canonical mutations.
import {createTimelineOriginal,buildAlteredTimeline} from '../../../arcsweep/src/altered-timeline.js';
import {compileAlteredTimelineRipple} from '../altered-timeline-score.js';
import {wayglassSomaticSound,WAYGLASS_FEATHER_EVENT} from '../somatic-sound.js';
import './altered-timeline.css';

export const ALTERED_LOCAL_KEY='wayglass.altered-timeline.local.v0.1';
const escapeForName=value=>String(value).toLowerCase().replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').slice(0,55)||'scenario';
const EVENT_KEY='origin-1';
const seedDate='2026-11-14';

function showEvent(container,event,marker){
  const row=document.createElement('article');row.className='wg-altered-event';
  const tag=document.createElement('span');tag.className='wg-altered-event-tag';tag.textContent=marker;
  const time=document.createElement('time');time.textContent=event.at;
  const title=document.createElement('p');title.textContent=event.title;
  row.append(tag,time,title);
  if(event.continuation_status==='inherited-unverified-after-divergence'){
    const note=document.createElement('small');note.textContent='Inherited possibility · not verified in altered future';row.append(note);
  }
  container.append(row);
}
function line(parent,label,value){
  const p=document.createElement('p'),strong=document.createElement('strong');
  strong.textContent=label+' ';p.append(strong,document.createTextNode(value));parent.append(p);
}
function fromStorage(storage){
  if(!storage)return null;
  const raw=storage.getItem(ALTERED_LOCAL_KEY);
  if(!raw)return null;
  if(raw.length>90000)throw new RangeError('Saved timeline exceeds local size limit');
  const data=JSON.parse(raw);
  if(data?.schema!=='wayglass.altered-timeline-local/v0.1'||!data.original||!Array.isArray(data.changes)||
     data.changes.length<1||data.changes.length>32||!data.branchId||!data.createdAt)
    throw new TypeError('Saved timeline receipt is invalid');
  const current=buildAlteredTimeline({
    original:data.original,branchId:data.branchId,changes:data.changes,
    approved:true,at:data.createdAt,
  });
  return {original:data.original,changes:data.changes,branchId:data.branchId,
    createdAt:data.createdAt,current};
}
export function mountWayglassAlteredTimeline(root,{
  scope=globalThis,storage=null,compile=compileAlteredTimelineRipple,
}={}){
  let savedStorage=storage;
  if(!savedStorage){try{savedStorage=scope.localStorage;}catch{/* blocked */}}
  root.innerHTML=[
    '<section class="wg-surface wg-altered" data-surface="altered-timeline">',
      '<header class="wg-surface-head glass-panel wg-altered-header">',
        '<div><p class="eyebrow">WAYGLASS · WORLDSEED · DOUBLE MÖBIUS</p>',
        '<h1>Altered Timeline</h1>',
        '<p class="lede">Name the hinge. Change one event. Watch the possible ripples without rewriting the original.</p>',
        '<p class="tiny">A hypothetical world experiment, not a claim that Waking World history has changed. Local until you save or export.</p></div>',
      '</header>',
      '<div class="wg-altered-layout">',
        '<form class="glass-panel wg-altered-form" data-altered-form>',
          '<h2>Introduce a change</h2>',
          '<label>World / scenario name<input data-alt-world maxlength="180" value="Human–AI Futures · Scenario Laboratory" required></label>',
          '<label>Original event date<input data-alt-date type="date" value="'+seedDate+'" required></label>',
          '<label>Original event<textarea data-alt-original rows="3" maxlength="1600" required>A fictional council debates whether to pause an AI pilot.</textarea></label>',
          '<label>Change operation<select data-alt-mode>',
            '<option value="replace">Replace this event</option>',
            '<option value="insert">Add a new event immediately after</option>',
            '<option value="omit">Remove this event in the altered branch</option>',
          '</select></label>',
          '<label data-alt-title-label>What changes?<textarea data-alt-title rows="3" maxlength="1600" required>The council launches a limited pilot with independent audits and public oversight.</textarea></label>',
          '<label>Why introduce this change?<textarea data-alt-reason rows="2" maxlength="700">Explore whether reciprocal oversight changes later choices.</textarea></label>',
          '<label>Illustrative ripple strength <output data-alt-strength-output>50%</output><input data-alt-strength type="range" min="0" max="100" value="50" step="5"></label>',
          '<div class="wg-altered-controls">',
            '<button class="send-jewel" type="submit" data-alt-introduce>Introduce change</button>',
            '<button class="glass-chip" type="button" data-alt-undo disabled>Undo last</button>',
            '<button class="glass-chip" type="button" data-alt-reset>Reset experiment</button>',
          '</div>',
          '<div class="wg-altered-controls">',
            '<button class="glass-chip" type="button" data-alt-save disabled>Save on this device</button>',
            '<button class="glass-chip" type="button" data-alt-restore>Restore saved</button>',
            '<button class="glass-chip" type="button" data-alt-export disabled>Export JSON</button>',
          '</div>',
          '<div class="wg-altered-controls">',
            '<button class="glass-chip" type="button" data-alt-feather>Feather · stop</button>',
            '<button class="glass-chip" type="button" data-alt-resume hidden>Release Feather deliberately</button>',
          '</div>',
          '<p class="tiny" role="status" aria-live="polite" data-alt-status>Example scenario ready. Edit the source event or deliberately introduce a change.</p>',
        '</form>',
        '<section class="glass-panel wg-altered-chamber" aria-label="Timeline divergence">',
          '<div class="wg-altered-portal" aria-hidden="true"><span class="wg-altered-pulse"></span><span class="wg-altered-arc one"></span><span class="wg-altered-arc two"></span></div>',
          '<div class="wg-altered-branches">',
            '<section aria-label="Original timeline"><h2>Original</h2><p class="tiny">Source history · untouched</p><div data-alt-original-track></div></section>',
            '<section aria-label="Altered timeline"><h2>Altered</h2><p class="tiny">Experimental descendant · reversible</p><div data-alt-child-track></div></section>',
          '</div>',
          '<div class="wg-altered-ripples" data-alt-ripples><p class="tiny">No branch yet. Ripples are illustrative, not probabilities or predicted events.</p></div>',
          '<section class="wg-altered-withness" aria-label="Return marker">',
            '<h3>Withness · Return</h3><div data-alt-withness>Original intact. No change introduced.</div>',
          '</section>',
        '</section>',
      '</div>',
    '</section>'
  ].join('');
  const q=selector=>root.querySelector('[data-'+selector+']');
  const form=q('altered-form'),status=q('alt-status'),originalTrack=q('alt-original-track'),
    childTrack=q('alt-child-track'),ripples=q('alt-ripples'),held=q('alt-withness');
  let original=null,changes=[],branchId=null,createdAt=null,current=null,working=false,closed=false;
  const feather=()=>wayglassSomaticSound.snapshot().feather_stopped;
  function setStatus(value){if(!closed)status.textContent=value;}
  function render(){
    if(closed)return;
    const stopped=feather();
    q('alt-introduce').disabled=stopped||working||changes.length>=32||
      changes.some(c=>c.mode==='omit');
    q('alt-undo').disabled=stopped||working||!changes.length;
    q('alt-save').disabled=stopped||working||!current;
    q('alt-export').disabled=stopped||working||!current;
    q('alt-restore').disabled=stopped||working;
    q('alt-reset').disabled=stopped||working;
    for(const name of ['alt-world','alt-date','alt-original'])q(name).disabled=stopped||working||!!original;
    for(const name of ['alt-mode','alt-title','alt-reason','alt-strength'])q(name).disabled=stopped||working;
    q('alt-feather').disabled=stopped;
    q('alt-resume').hidden=!stopped;
    q('alt-title-label').hidden=q('alt-mode').value==='omit';
    q('alt-title').required=q('alt-mode').value!=='omit';
    originalTrack.replaceChildren();childTrack.replaceChildren();ripples.replaceChildren();held.replaceChildren();
    const sourceEvent=original?.events?.[0] || {
      id:EVENT_KEY,at:q('alt-date').value,title:q('alt-original').value,
    };
    showEvent(originalTrack,sourceEvent,'SOURCE');
    if(!current){
      const p=document.createElement('p');p.className='tiny';
      p.textContent='The next path remains unwritten.';childTrack.append(p);
      const note=document.createElement('p');note.className='tiny';
      note.textContent='No inferred consequences. Deliberately introduce one alteration to open a branch.';
      ripples.append(note);
      held.textContent='The source remains untouched.';
    }else{
      for(const event of current.altered.events)showEvent(childTrack,event,event.classification==='altered-scenario'?'CHANGED':'INHERITED');
      if(!current.altered.events.length)childTrack.textContent='The selected event was omitted in this altered history.';
      const last=current.change_receipts.at(-1);
      const title=document.createElement('h3');title.textContent='Potential ripples · Wyrdrune';ripples.append(title);
      const intro=document.createElement('p');intro.className='tiny';
      intro.textContent='A compositional influence dial, NOT the probability of actual future events.';ripples.append(intro);
      for(const level of last.ripple_horizons){
        const row=document.createElement('div');row.className='wg-altered-ripple';
        const name=document.createElement('span');name.textContent=level.label;
        const meter=document.createElement('meter');meter.min=0;meter.max=1;meter.value=level.intensity;
        meter.setAttribute('aria-label',level.label+' illustrative intensity');
        row.append(name,meter);ripples.append(row);
      }
      line(held,'Branch:',current.branch_id);
      line(held,'Fork:',current.worldseed.fork_receipt.branchPoint);
      line(held,'Changes:',String(current.change_receipts.length));
      line(held,'Source:',current.worldseed.seed_fingerprint);
      line(held,'WTL:',last.wtl_source_sha256.slice(0,16)+'… · 2 Eightfold cycles');
      line(held,'Unresolved:',current.comparison.open_future.length+' inherited future event(s) require review');
      const note=document.createElement('p');note.className='tiny';
      note.textContent='Local hypothetical change only. No provider request, canon promotion or physical timeline alteration.';held.append(note);
    }
    root.querySelector('[data-surface="altered-timeline"]').dataset.alteredState=
      stopped?'paused':current?'branched':'original';
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(feather()||working)return;
    working=true;render();setStatus('Running two native Wyrdrune Eightfold cycles for your chosen change…');
    try{
      const nextOriginal=original||createTimelineOriginal({
        worldId:escapeForName(q('alt-world').value),worldName:q('alt-world').value,
        events:[{id:EVENT_KEY,at:q('alt-date').value,title:q('alt-original').value}],
      });
      const now=createdAt||new Date().toISOString();
      const nextBranchId=branchId||nextOriginal.world.id+'-altered-'+now.replace(/[^0-9]/g,'').slice(0,14);
      const magnitude=Number(q('alt-strength').value)/100;
      const compiled=await compile({magnitude,confirmed:true,
        signal:{get aborted(){return closed||feather();}}});
      if(closed||feather())throw new Error('Feather stopped the intervention before commitment');
      const change={
        mode:q('alt-mode').value,target_id:EVENT_KEY,
        title:q('alt-mode').value==='omit'?'':q('alt-title').value,
        reason:q('alt-reason').value||'Owner-chosen alternative',
        magnitude,ripple:compiled.plan,wtl_source_sha256:compiled.source_sha256,
        source_refs:['owner:local-what-if'],
      };
      const proposed=[...changes,change];
      const experiment=buildAlteredTimeline({original:nextOriginal,
        branchId:nextBranchId,changes:proposed,approved:true,at:now});
      original=nextOriginal;branchId=nextBranchId;createdAt=now;changes=proposed;current=experiment;
      setStatus('Altered branch created. Original history preserved; each potential ripple remains unresolved.');
    }catch(error){setStatus('Change not introduced: '+String(error?.message||error));}
    finally{working=false;render();}
  });
  q('alt-mode').addEventListener('change',render);
  q('alt-strength').addEventListener('input',()=>{
    q('alt-strength-output').textContent=q('alt-strength').value+'%';
  });
  q('alt-undo').addEventListener('click',()=>{
    if(feather()||working||!changes.length)return;
    changes=changes.slice(0,-1);
    current=changes.length?buildAlteredTimeline({original,branchId,changes,approved:true,at:createdAt}):null;
    setStatus('Last alteration undone. The original remained intact throughout.');render();
  });
  q('alt-reset').addEventListener('click',()=>{
    if(feather()||working)return;
    original=null;changes=[];branchId=null;createdAt=null;current=null;
    setStatus('Experiment reset. Source fields are editable again. Saved copies remain until explicitly replaced.');
    render();
  });
  q('alt-save').addEventListener('click',()=>{
    if(!current||feather()||working)return;
    try{
      if(!savedStorage)throw new Error('Local storage is unavailable');
      const data={schema:'wayglass.altered-timeline-local/v0.1',original,changes,branchId,createdAt};
      const encoded=JSON.stringify(data);
      if(encoded.length>80000)throw new RangeError('Local scenario is too large to save');
      savedStorage.setItem(ALTERED_LOCAL_KEY,encoded);
      setStatus('Saved on this device. This is not a cloud Return Engine receipt.');
    }catch(error){setStatus('Could not save on this device: '+error.message);}
  });
  q('alt-restore').addEventListener('click',()=>{
    if(feather()||working)return;
    try{
      const loaded=fromStorage(savedStorage);
      if(!loaded)throw new Error('No local timeline saved yet');
      ({original,changes,branchId,createdAt,current}=loaded);
      q('alt-world').value=original.world.name;
      q('alt-date').value=original.events[0].at;
      q('alt-original').value=original.events[0].title;
      setStatus('Restored browser-local experiment. Source and change receipts revalidated; no external authority implied.');
    }catch(error){setStatus('Cannot restore: '+error.message);}
    render();
  });
  q('alt-export').addEventListener('click',()=>{
    if(!current||feather()||working)return;
    try{
      const blob=new Blob([JSON.stringify(current,null,2)],{type:'application/json'});
      const link=document.createElement('a');
      const url=URL.createObjectURL(blob);
      link.href=url;link.download='wayglass-altered-timeline.json';
      root.append(link);link.click();link.remove();
      URL.revokeObjectURL(url);
      setStatus('Exported local branch. Original, altered events and source receipts are included.');
    }catch(error){setStatus('Export unavailable: '+error.message);}
  });
  q('alt-feather').addEventListener('click',()=>{
    wayglassSomaticSound.feather();
    setStatus('Feather Stop: no changes can be introduced until you release it.');render();
  });
  q('alt-resume').addEventListener('click',()=>{
    wayglassSomaticSound.releaseFeather({confirmed:true});
    setStatus('Feather deliberately released. New changes still require their own choice.');render();
  });
  const onFeather=()=>{if(!closed)render();};
  scope.addEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);
  render();
  return ()=>{closed=true;scope.removeEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);};
}
