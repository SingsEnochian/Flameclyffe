import {listWayglassSurfaces} from '../surface-registry.js';
import {readWayglassRouteObservation,subscribeWayglassObserver} from '../living-observer-model.js';
import {wayglassSomaticSound} from '../somatic-sound.js';
import {createWayglassWorldDraftStore} from '../world-draft-store.js';
import {importHouseWorlds,filterImportedWorlds} from '../imported-worlds.js';
// Native Wayglass world deck. Never loads /arcsweep/ or assumes legacy storage.
export function mountWayglassWorldDeck(root,{listRooms=listWayglassSurfaces,readRoute=readWayglassRouteObservation,subscribe=subscribeWayglassObserver,navigate=id=>globalThis.__wayglassOS?.mount(id),sound=wayglassSomaticSound,worldStore=()=>createWayglassWorldDraftStore(),readImportedWorlds=importHouseWorlds}={}){
 if(!root?.ownerDocument)throw new TypeError('Wayglass world deck requires DOM root');
 const doc=root.ownerDocument,section=doc.createElement('section');section.className='wg-surface wg-world-deck glass-panel';section.dataset.surface='wayglass-world-deck';
 const title=doc.createElement('h1');title.textContent='Wayglass · World and Continuity Deck';
 const explanation=doc.createElement('p');explanation.textContent='Native Wayglass navigation. Rooms open directly without the ArcSweep iframe. Return and authored world continuity are separate instruments.';
 const status=doc.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const rooms=doc.createElement('nav');rooms.setAttribute('aria-label','Wayglass destinations');
 const editor=doc.createElement('section');editor.className='glass-panel';editor.setAttribute('aria-label','Native Wayglass world draft');
 const worldTitle=doc.createElement('input');worldTitle.setAttribute('aria-label','World name');worldTitle.placeholder='World name';worldTitle.maxLength=120;
 const notes=doc.createElement('textarea');notes.setAttribute('aria-label','World notes');notes.placeholder='Write the world as it grows…';notes.maxLength=16000;
 const save=doc.createElement('button');save.type='button';save.textContent='Save local world draft';
 const draftStatus=doc.createElement('p');draftStatus.setAttribute('role','status');draftStatus.setAttribute('aria-live','polite');
 try{const previous=worldStore().read();if(previous){worldTitle.value=previous.title;notes.value=previous.notes;draftStatus.textContent='Local world draft restored · '+previous.saved_at;}else draftStatus.textContent='Unsaved local draft. No cloud or canon claim.';}catch(e){draftStatus.textContent='Draft unavailable: '+String(e?.message||e);}
 const onSave=()=>{try{const receipt=worldStore().save({title:worldTitle.value,notes:notes.value});draftStatus.textContent='Saved locally · '+receipt.saved_at+' · not a verified Return or canon commit';}catch(e){draftStatus.textContent='Save failed; existing draft preserved: '+String(e?.message||e);}};
 save.addEventListener('click',onSave);editor.append(worldTitle,notes,save,draftStatus);
 const archive=doc.createElement('section');archive.className='glass-panel';archive.setAttribute('aria-label','Imported worlds');
 const archiveTitle=doc.createElement('h2');archiveTitle.textContent='Imported worlds · source-preserving archive';
 const archiveStatus=doc.createElement('p');archiveStatus.setAttribute('role','status');
 const search=doc.createElement('input');search.type='search';search.setAttribute('aria-label','Search imported worlds');search.placeholder='Search worlds, origins and descriptions';
 const archiveList=doc.createElement('div');archiveList.className='wg-imported-worlds';
 let importedWorlds=[];
 const renderArchive=()=>{
  archiveList.replaceChildren();const matches=filterImportedWorlds(importedWorlds,search.value);
  archiveStatus.textContent=matches.length+' of '+importedWorlds.length+' worlds · source-preserving read-only archive';
  for(const world of matches){
   const details=doc.createElement('details');const summary=doc.createElement('summary');summary.textContent=world.name;
   const description=doc.createElement('p');description.textContent=world.description||world.kind||'World record';
   const history=doc.createElement('p');history.textContent=world.history?'History: '+world.history:'No history in source bundle';
   const rules=doc.createElement('p');rules.textContent=world.rules?'World rules: '+world.rules:'No rules in source bundle';
   const provenance=doc.createElement('p');provenance.textContent='Source: '+world.source_key+' · '+world.source_bundle+' · '+world.source_version;
   details.append(summary,description,history,rules,provenance);
   if(world.source_urls?.length){const sources=doc.createElement('p');sources.textContent=world.source_urls.length+' original source references retained';details.append(sources);}
   archiveList.append(details);
  }
 };
 try{const imported=readImportedWorlds();importedWorlds=imported.worlds;renderArchive();}
 catch(e){archiveStatus.textContent='World archive unavailable: '+String(e?.message||e);}
 const onSearch=()=>renderArchive();search.addEventListener('input',onSearch);
 archive.append(archiveTitle,search,archiveStatus,archiveList);
 const feather=doc.createElement('button');feather.type='button';feather.textContent='🪽 Feather · stop sensory output';
 let disposed=false;
 const refresh=()=>{if(disposed)return;const route=readRoute();status.textContent=route?.status?'Observed route: '+route.status+' · '+(route.route_id||'unlabelled'):'No model transport observed in this session.';};
 const go=id=>{try{const result=navigate(id);Promise.resolve(result).catch(e=>{if(!disposed)status.textContent='Room unavailable: '+String(e?.message||e);});}catch(e){status.textContent='Room unavailable: '+String(e?.message||e);}};
 const items=listRooms().filter(s=>typeof s?.surface_id==='string'&&s.surface_id.startsWith('wayglass:')&&s.surface_id!=='wayglass:world-deck'&&typeof s.mount==='function');
 for(const item of items){const b=doc.createElement('button');b.type='button';b.className='glass-chip';b.textContent=String(item.label||item.surface_id);b.dataset.room=item.surface_id;b.addEventListener('click',()=>go(item.surface_id));rooms.append(b);}
 const onFeather=()=>{sound.feather();refresh();};feather.addEventListener('click',onFeather);
 section.append(title,explanation,status,archive,editor,feather,rooms);root.replaceChildren(section);
 const unsubscribe=subscribe(refresh);refresh();
 return ()=>{disposed=true;unsubscribe?.();feather.removeEventListener('click',onFeather);save.removeEventListener('click',onSave);search.removeEventListener('input',onSearch);};
}
