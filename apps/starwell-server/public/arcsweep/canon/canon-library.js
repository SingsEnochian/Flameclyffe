const registryUrl = new URL('./registry.json', import.meta.url);
const packList = document.querySelector('#pack-list');
const packView = document.querySelector('#pack-view');
const search = document.querySelector('#canon-search');
const count = document.querySelector('#search-count');
let registry;
let activeEntry;
let activePack;

const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const label = (key) => key.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('-',' ').replace(/^./,c=>c.toUpperCase());

function flatten(value, path=[], out=[]) {
  if (Array.isArray(value)) value.forEach((item,i)=>flatten(item,[...path,String(i)],out));
  else if (value && typeof value === 'object') {
    const text = [value.name,value.id,value.kind,value.status,value.summary,value.divergence,value.convergence].filter(Boolean).join(' · ');
    if (text) out.push({path:path.join('.'),text,record:value});
    Object.entries(value).forEach(([k,v])=>flatten(v,[...path,k],out));
  }
  return out;
}
function groupCount(group){return Array.isArray(group)?group.length:group&&typeof group==='object'?Object.keys(group).length:group?1:0}

function renderPack() {
  if (!activePack) return;
  const recordEntries = Object.entries(activePack.records || {});
  packView.innerHTML = `<section class="panel"><p class="eyebrow">${esc(activePack.packId)}</p><h2>${esc(activePack.name)}</h2>
    <div class="summary-grid"><dl class="facts">
      <div><dt>World</dt><dd>${esc(activePack.world?.name)}</dd></div>
      <div><dt>Variant</dt><dd>${esc(activePack.world?.variant || 'named in records')}</dd></div>
      <div><dt>Timeline</dt><dd>${esc(activePack.world?.timeline || 'named in records')}</dd></div>
      <div><dt>Sources</dt><dd>${activePack.sources?.length || 0}</dd></div>
    </dl><div><h3>Provenance law</h3><p>${esc(activePack.provenance?.revisionNotes?.join(' ') || 'Source provenance retained.')}</p></div></div>
  </section>
  <section class="record-groups">${recordEntries.map(([key,value])=>`<details class="panel record-group" open><summary>${esc(label(key))} <span class="status">${groupCount(value)}</span></summary><pre class="record-json">${esc(JSON.stringify(value,null,2))}</pre></details>`).join('')}</section>`;
  runSearch();
}
function renderCards() {
  packList.innerHTML = registry.packages.map(entry=>`<button class="pack-card" data-pack="${esc(entry.id)}" aria-pressed="${entry.id===activeEntry?.id}"><strong>${esc(entry.name)}</strong><small>${esc(entry.kind)}</small><p>${esc(entry.summary)}</p></button>`).join('');
}
async function openPack(entry) {
  activeEntry=entry;
  const response=await fetch(new URL(entry.manifest, registryUrl));
  if(!response.ok) throw new Error(`Canon pack ${entry.id} returned ${response.status}`);
  activePack=await response.json();
  renderCards(); renderPack();
}
function runSearch(){
  if(!activePack)return;
  const q=search.value.trim().toLowerCase();
  if(!q){count.textContent='';return;}
  const hits=flatten(activePack.records).filter(item=>`${item.path} ${item.text} ${JSON.stringify(item.record)}`.toLowerCase().includes(q)).slice(0,80);
  count.textContent=`${hits.length}${hits.length===80?'+':''} match${hits.length===1?'':'es'}`;
  packView.innerHTML=`<section class="panel"><p class="eyebrow">${esc(activePack.name)}</p><h2>Search · ${esc(search.value)}</h2><div class="results">${hits.length?hits.map(hit=>`<article class="result"><code>${esc(hit.path)}</code><p>${esc(hit.text)}</p></article>`).join(''):'<p>No matching canon records.</p>'}</div></section>`;
}
packList.addEventListener('click',event=>{const button=event.target.closest('[data-pack]');if(button)openPack(registry.packages.find(p=>p.id===button.dataset.pack)).catch(err=>packView.textContent=err.message)});
search.addEventListener('input',()=>{if(search.value.trim())runSearch();else renderPack()});
try{
  const response=await fetch(registryUrl); if(!response.ok) throw new Error(`Registry returned ${response.status}`);
  registry=await response.json(); renderCards(); await openPack(registry.packages[0]);
}catch(error){packView.innerHTML=`<p class="panel">Canon Library could not open: ${esc(error.message)}</p>`}
