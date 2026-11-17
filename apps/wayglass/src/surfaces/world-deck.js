import {listWayglassSurfaces} from '../surface-registry.js';
import {readWayglassRouteObservation,subscribeWayglassObserver} from '../living-observer-model.js';
import {wayglassSomaticSound} from '../somatic-sound.js';
// Native Wayglass world deck. Never loads /arcsweep/ or assumes legacy storage.
export function mountWayglassWorldDeck(root,{listRooms=listWayglassSurfaces,readRoute=readWayglassRouteObservation,subscribe=subscribeWayglassObserver,navigate=id=>globalThis.__wayglassOS?.mount(id),sound=wayglassSomaticSound}={}){
 if(!root?.ownerDocument)throw new TypeError('Wayglass world deck requires DOM root');
 const doc=root.ownerDocument,section=doc.createElement('section');section.className='wg-surface wg-world-deck glass-panel';section.dataset.surface='wayglass-world-deck';
 const title=doc.createElement('h1');title.textContent='Wayglass · World and Continuity Deck';
 const explanation=doc.createElement('p');explanation.textContent='Native Wayglass navigation. Rooms open directly without the ArcSweep iframe. Return and authored world continuity are separate instruments.';
 const status=doc.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const rooms=doc.createElement('nav');rooms.setAttribute('aria-label','Wayglass destinations');
 const feather=doc.createElement('button');feather.type='button';feather.textContent='🪽 Feather · stop sensory output';
 let disposed=false;
 const refresh=()=>{if(disposed)return;const route=readRoute();status.textContent=route?.status?'Observed route: '+route.status+' · '+(route.route_id||'unlabelled'):'No model transport observed in this session.';};
 const go=id=>{try{const result=navigate(id);Promise.resolve(result).catch(e=>{if(!disposed)status.textContent='Room unavailable: '+String(e?.message||e);});}catch(e){status.textContent='Room unavailable: '+String(e?.message||e);}};
 const items=listRooms().filter(s=>typeof s?.surface_id==='string'&&s.surface_id.startsWith('wayglass:')&&s.surface_id!=='wayglass:world-deck'&&typeof s.mount==='function');
 for(const item of items){const b=doc.createElement('button');b.type='button';b.className='glass-chip';b.textContent=String(item.label||item.surface_id);b.dataset.room=item.surface_id;b.addEventListener('click',()=>go(item.surface_id));rooms.append(b);}
 const onFeather=()=>{sound.feather();refresh();};feather.addEventListener('click',onFeather);
 section.append(title,explanation,status,feather,rooms);root.replaceChildren(section);
 const unsubscribe=subscribe(refresh);refresh();
 return ()=>{disposed=true;unsubscribe?.();feather.removeEventListener('click',onFeather);};
}
