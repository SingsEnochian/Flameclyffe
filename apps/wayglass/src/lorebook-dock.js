/**
 * Local world lorebook reader for the ArcSweep Writing Room.
 * Provenance first. It does not send to providers, write canon or persist
 * privately authored data without a direct user action.
 */
export const LOREBOOK_SCHEMA='wayglass.lorebook-local/v1';
const clean=(v,max=1000)=>String(v??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g,'').trim().slice(0,max);
export function parseLorebook(raw,{maxEntries=80,maxBytes=180000}={}){
 if(typeof raw!=='string'||raw.length>maxBytes)throw Error('Lorebook exceeds the 180 KB limit.');
 let parsed;
 try{parsed=JSON.parse(raw)}catch{throw Error('Lorebook must be valid JSON.')}
 const list=Array.isArray(parsed)?parsed:Array.isArray(parsed?.entries)?parsed.entries:
  parsed?.entries&&typeof parsed.entries==='object'?Object.values(parsed.entries):null;
 if(!list)throw Error('Lorebook needs an entries collection.');
 if(list.length>maxEntries)throw Error('Lorebook exceeds 80 source entries.');
 const entries=list.map((item,i)=>{
  if(!item||typeof item!=='object')return null;
  const title=clean(item.name||item.title||item.comment||item.key||item.keys?.[0]||('Entry '+(i+1)),90);
  const text=clean(item.content||item.text||item.entry,1600);
  if(!text)return null;
  return Object.freeze({
   id:'lore-'+(i+1),title:title||('Entry '+(i+1)),text,
   source:clean(item.source||item.source_ref||parsed?.source||'local-owner-import',140),
   reviewed:false,canon_commit:false
  });
 }).filter(Boolean);
 return Object.freeze({schema:LOREBOOK_SCHEMA,entries:Object.freeze(entries),imported_locally:true,
  source:'user-chosen-file',canon_commit:false,provider_transfer:false});
}
export function attachLorebookDock(root,{textareaSelector='#wg-input'}={}){
 const surface=root.querySelector('.wg-writing-room');
 if(!surface)return()=>{};
 const composer=surface.querySelector('.wg-composer');
 if(!composer)return()=>{};
 const pane=document.createElement('details');
 pane.className='wg-lorebook-dock glass-panel';
 const summary=document.createElement('summary');summary.textContent='World Atlas · Lorebook';
 pane.append(summary);
 const description=document.createElement('p');
 description.textContent='Import a local JSON lorebook. Nothing uploads automatically. Select an entry to quote in your draft.';
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
 input.setAttribute('aria-label','Import a local JSON lorebook');
 const status=document.createElement('p');status.setAttribute('role','status');
 status.textContent='No lorebook imported. Entries are private and unreviewed.';
 const list=document.createElement('div');list.className='wg-lore-entries';
 pane.append(description,input,status,list);
 composer.before(pane);
 let entries=[];
 function clear(){
  entries=[];list.replaceChildren();
  status.textContent='Local lorebook cleared. No canon or provider write.';
  input.value='';
 }
 const clearButton=document.createElement('button');clearButton.type='button';
 clearButton.textContent='Clear local lorebook';
 pane.append(clearButton);clearButton.addEventListener('click',clear);
 const onChange=async()=>{
  const file=input.files?.[0];if(!file)return;
  if(file.size>180000){status.textContent='File exceeds 180 KB. Nothing imported.';return}
  try{
   const parsed=parseLorebook(await file.text());
   entries=[...parsed.entries];list.replaceChildren();
   for(const entry of entries){
    const button=document.createElement('button');button.type='button';
    button.className='glass-chip';button.textContent=entry.title;
    button.title=entry.source;button.dataset.loreId=entry.id;
    list.append(button);
   }
   status.textContent=entries.length+' local source entries ready; no provider transfer or canon promotion.';
  }catch(error){status.textContent=String(error.message).slice(0,180)}
 };
 input.addEventListener('change',onChange);
 const onSelect=event=>{
  const btn=event.target.closest?.('[data-lore-id]');
  const entry=entries.find(item=>item.id===btn?.dataset.loreId);
  if(!entry)return;
  const editor=surface.querySelector(textareaSelector);
  if(!editor)return;
  const citation='[UNREVIEWED LOREBOOK SOURCE: '+entry.source+' · '+entry.title+']\n'+entry.text+'\n[/LOREBOOK SOURCE]\n';
  // Explicit user click, append to a DRAFT. Existing consent and route
  // confirmation remain mandatory before anything can leave Wayglass.
  editor.value+=(editor.value?'\n\n':'')+citation;
  editor.focus();status.textContent='Inserted source into unsent draft. Review before transmission.';
 };
 list.addEventListener('click',onSelect);
 return()=>{input.removeEventListener('change',onChange);list.removeEventListener('click',onSelect);
  clearButton.removeEventListener('click',clear);entries=[];pane.remove()};
}
