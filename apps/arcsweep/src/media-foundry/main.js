import {MEDIA_SOURCES, DISCOVERY_COLLECTIONS,KNOWN_HOST_ROUTES,APPLET_DECKS,mediaSource,filterMediaSources,makeTrialProposal,normaliseHostRoutes} from './catalog.js';

const byId=id=>document.getElementById(id);
const el=(tag,className='',content='')=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  node.textContent=content;
  return node;
};
const sourceLink=(href,label)=>{
  const a=el('a','foundry-link',label);
  a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;
};
let selected=null;
function renderCandidates(){
  const filtered=filterMediaSources({category:byId('discipline').value,query:byId('model-query').value});
  const list=byId('model-grid');list.replaceChildren();
  byId('model-count').textContent=`${filtered.length} / ${MEDIA_SOURCES.length} sources`;
  for(const item of filtered){
    const btn=el('button','foundry-model glass-panel','');
    btn.type='button';btn.dataset.model=item.id;btn.setAttribute('aria-pressed',String(item.id===selected));
    btn.append(el('span','model-class',item.category.toUpperCase()+' / '+item.kind),el('strong','model-label',item.label),
      el('span','model-summary',item.summary),el('span','model-footer',item.runtime.replaceAll('-',' ')+' · '+item.license));
    btn.addEventListener('click',()=>selectSource(item.id));list.append(btn);
  }
  if(!filtered.length)list.append(el('p','empty-list','No matching candidates. Change the search or discipline.'));
}
function selectSource(id){
  const item=mediaSource(id);if(!item)return;
  selected=id;renderCandidates();byId('inspector-title').textContent=item.label;
  byId('inspector-summary').textContent=item.summary;
  const meta=byId('inspector-meta');meta.replaceChildren();
  meta.append(el('p','inspect-field',`Source · ${item.kind} / ${item.category}`),el('p','inspect-field',`Licence as listed · ${item.license}`),el('p','inspect-field',`Connection · not installed or authorised by this catalogue`));
  if(item.base_model_id)meta.append(el('p','inspect-field',`Required compatible base · ${item.base_model_id}`));
  if(item.adapter)meta.append(el('p','inspect-field',`Possible ONNX route · ${item.adapter}`));
  const steps=byId('inspector-steps');steps.replaceChildren();item.requirements.forEach(x=>steps.append(el('li','',x)));
  byId('source-open').href=item.url;byId('trial-export').disabled=false;
  byId('plan-status').textContent='Select Export test plan to create a local, proposal-only JSON document.';
}
function saveJson(fileName,content){
  const blob=new Blob([JSON.stringify(content,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=fileName;
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
byId('discipline').addEventListener('change',renderCandidates);
byId('model-query').addEventListener('input',renderCandidates);
byId('trial-export').addEventListener('click',()=>{
  if(!selected)return;
  const proposal=makeTrialProposal(selected);saveJson(`wayglass-${selected}.trial.json`,proposal);
  byId('plan-status').textContent='Exported a local trial proposal, not model output or a host authorisation.';
});
function renderRoutes(){
  const root=byId('route-known');root.replaceChildren();
  KNOWN_HOST_ROUTES.forEach(route=>{
    const item=el('div','foundry-route');item.append(el('strong','',route.label),el('span','',route.availability));root.append(item);
  });
}
if(location.protocol==='file:'){
  byId('inspect-routes').disabled=true;
  byId('route-status').textContent='Offline file preview. Open via a Wayglass/ArcSweep host to inspect route metadata.';
}
byId('inspect-routes').addEventListener('click',async()=>{
  const btn=byId('inspect-routes');btn.disabled=true;
  byId('route-status').textContent='Reading the host route catalogue…';byId('route-results').replaceChildren();
  try{
    const response=await fetch('/api/v1/wayglass/routes',{method:'GET',cache:'no-store',credentials:'same-origin',headers:{'Accept':'application/json'}});
    if(!response.ok)throw new Error(`Host answered HTTP ${response.status}`);
    const routes=normaliseHostRoutes(await response.json());
    if(!routes.length)byId('route-results').append(el('p','sub','The host returned no routes.'));
    for(const route of routes){
      const div=el('div','foundry-route');div.append(el('strong','',route.label),
        el('span','',`${route.id} · ${route.provider} · ${route.configured?'configured':'not configured'} · ${route.connection_verified?'verified by host':'not connection-verified'}`));
      byId('route-results').append(div);
    }
    byId('route-status').textContent=`Host metadata returned ${routes.length} route(s). No inference call was made.`;
  }catch(error){byId('route-status').textContent=`Host route inspection unavailable: ${error.message}. No model was called.`;}
  finally{btn.disabled=false;}
});
function renderApplets(){
  const root=byId('applet-grid');root.replaceChildren();
  for(const deck of APPLET_DECKS){
    const card=el('div','applet-tile');card.append(el('span','model-class',deck.group.toUpperCase()),el('strong','',deck.label),el('p','sub',deck.description));
    // Do not construct or pretend direct routes to hosts not deployed in this origin.
    if(deck.id==='harmonic-observatory'){
      const a=el('a','foundry-link','Open local instrument ↗');a.href='../harmonic-observatory/';card.append(a);
    }else{
      card.append(el('span','pending-link',`Owner: ${deck.owner} · ${deck.availability}`));
    }
    root.append(card);
  }
}
function renderDiscovery(){const root=byId('discovery');root.replaceChildren();DISCOVERY_COLLECTIONS.forEach(source=>{
  const card=el('div','discovery-card');card.append(sourceLink(source.url,source.label+' ↗'),el('span','sub','Browse models at Hugging Face; no installation or endpoint is implied.'));root.append(card);
});}
renderCandidates();renderRoutes();renderApplets();renderDiscovery();
selectSource('kokoro-82m');