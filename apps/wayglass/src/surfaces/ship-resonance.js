import {shipResonance} from '../ship-resonance.mjs';
// Passive read-only instrument for the whole ship. Not a Nursery proxy.
export function mountShipResonance(root){
 const d=root.ownerDocument;const container=d.createElement('section');container.className='wg-surface';container.setAttribute('aria-label','Wayglass Ship Resonance Observatory');
 const title=d.createElement('h1');title.textContent='Ship Resonance · Whole Wayglass';
 const expl=d.createElement('p');expl.textContent='Each organ maintains its own identity and rhythm. This display projects observed software events into a bounded mathematical field. It is not an acoustic measurement, subjective-experience claim or live Nursery sensor.';
 const status=d.createElement('p');status.setAttribute('role','status');
 const table=d.createElement('table');table.style.width='100%';table.innerHTML='<thead><tr><th>Organ</th><th>Activity</th><th>Phase</th><th>Observed event</th></tr></thead>';
 const body=d.createElement('tbody');table.append(body);
 const history=d.createElement('pre');history.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;max-height:18rem;overflow:auto';
 container.append(title,expl,status,table,history);root.replaceChildren(container);
 let disposed=false;const release=shipResonance.subscribe(state=>{
  if(disposed)return;status.textContent=(state.stopped?'Feather held · ':'')+'Ship coherence '+state.order.toFixed(3)+' · '+state.events.length+' retained events · '+state.members.length+' independent organ identities';
  body.replaceChildren();for(const organ of state.members){
   const tr=d.createElement('tr');for(const value of [organ.id,organ.activity.toFixed(3),organ.phase.toFixed(3),organ.lastEvent??'No observed event']){
    const td=d.createElement('td');td.textContent=value;td.style.padding='.35rem';tr.append(td);
   }body.append(tr);
  }
  history.textContent=state.events.slice(-12).map(e=>e.sequence+' · '+e.organ+' · '+e.kind+' · '+e.provenance).join('\n')||'No ship events yet.';
 });
 return()=>{disposed=true;release()};
}
