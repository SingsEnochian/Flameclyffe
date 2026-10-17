import { auditSupersession, demoSupersessionSample, validateSupersessionSample } from '../ledger-supersession-audit.js';
import { APPROVED_ONNX_MODELS, createLocalOnnxEmbedder } from '../ledger-local-onnx.js';
import '../ledger-supersession.css';

const esc = (s='') => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
const pretty = result => JSON.stringify(result,null,2);
function downloadReceipt(record){
  const blob=new Blob([pretty(record)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='wayglass-ledger-supersession-audit.json';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function renderResult(result){
  const {metrics,model,eligible,candidates}=result;
  const lines=eligible.map((c,i)=>`<li><span class="ledger-rank">${i+1}</span><div><strong>${esc(c.ref)}</strong><small>${esc(c.source_ref)}</small></div><span>${c.similarity.toFixed(3)}</span></li>`).join('');
  return `<div class="ledger-result-grid">
    <div class="ledger-score-card"><small>Expected replacement at rank</small><strong>${metrics.expected_active_rank}</strong><span>${metrics.expected_active_top1?'Rank-one retrieval observed':'Not first in this comparison'}</span></div>
    <div class="ledger-score-card"><small>Forbidden records excluded</small><strong>${metrics.forbidden_not_retrieved?'YES':'NO'}</strong><span>${metrics.retired_count} inactive record(s), excluded from retrieval</span></div>
    <div class="ledger-score-card"><small>Comparison mode</small><strong class="ledger-score-mode">${esc(model.mode)}</strong><span>${esc(model.id)}</span></div>
  </div><ol class="ledger-ranked">${lines}</ol>
  <details><summary>All candidates, including retired references</summary><table class="ledger-table"><thead><tr><th>Reference</th><th>Ledger status</th><th>Similarity</th></tr></thead><tbody>${candidates.map(x=>`<tr><td>${esc(x.ref)}</td><td>${esc(x.status)}</td><td>${x.similarity.toFixed(3)}</td></tr>`).join('')}</tbody></table></details>
  <p class="tiny">These are retrieval measurements over supplied records. They do not verify source signatures, resolve contradictions, grant identity, change canon or write back to the Ledger.</p>`;
}

export function mountWayglassContinuityLedger(root){
  let latest=null,disposed=false;
  root.innerHTML=`<section class="wg-surface wg-ledger-room" data-surface="wayglass:continuity-ledger">
    <nav class="wg-deck-nav glass-panel" aria-label="Wayglass rooms"><button type="button" class="glass-chip" data-wayglass-room="arcsweep:writing-room">Writing Room</button><button type="button" class="glass-chip" data-wayglass-room="wayglass:library">Library</button><button type="button" class="glass-chip" data-wayglass-room="wayglass:living-observer">Living Observer</button><button type="button" class="glass-chip active" aria-current="page">Continuity Ledger</button><button type="button" class="glass-chip" data-wayglass-room="wayglass:systems">Organs</button></nav>
    <header class="wg-surface-head glass-panel"><div><p class="eyebrow">Wayglass · Evidence and Return</p><h1>Continuity Ledger</h1><p class="lede">A local instrument for testing whether a replacement is found and a retired or revoked memory stays excluded. Similarity is a reading, not a verdict.</p></div><div class="ledger-gem-wrap"><div class="ledger-gem" aria-hidden="true"><span>⌁</span></div><small>RETURN ENGINE</small></div></header>
    <div class="ledger-ledger-note glass-panel"><b>Audit-only</b> · No imported signature or authority proof. The sample below is fictional test data, not a reading of a live participant's Ledger.</div>
    <div class="ledger-columns"><section class="glass-panel ledger-form"><p class="eyebrow">01 · Source and expectations</p><h2>Supersession trial</h2><label for="ledger-sample">Local trial packet · JSON</label><textarea id="ledger-sample" spellcheck="false" aria-describedby="ledger-help">${esc(pretty(demoSupersessionSample()))}</textarea><p id="ledger-help" class="tiny">Two to 32 records. Each record declares its source and current status; a replacement must name an earlier superseded record. Never paste secrets or unreviewed personal memory here.</p>
      <div class="ledger-actions"><button type="button" class="send-jewel" data-ledger-action="baseline">Run local baseline</button><button type="button" class="glass-chip" data-ledger-action="onnx">Try staged local ONNX</button></div>
      <p id="ledger-status" role="status" aria-live="polite" class="tiny">Ready · local lexical baseline requires no model download.</p>
      <details><summary>Local embedding engine requirements</summary><p class="tiny">${esc(APPROVED_ONNX_MODELS[0].id)} is the initial Apache-2.0 ONNX candidate. A trusted, same-origin Transformers.js pipeline and pre-cached model weights must be staged separately. No external model download or prompt submission happens in this surface. An absent runtime is reported, not simulated.</p></details>
    </section><section class="glass-panel ledger-results"><p class="eyebrow">02 · Evidence readout</p><h2>Retrieval and exclusion</h2><div id="ledger-results" aria-live="polite"><p class="tiny">Run the sample trial to inspect retrieval order, explicit revocation exclusion and the source ledger statuses.</p></div><button type="button" class="glass-chip" data-ledger-action="export" disabled>Export audit receipt</button></section></div>
    <footer class="tiny ledger-footer">Wayglass travelling inheritance and signed receipt verification remain the authority. This deck cannot accept, revoke, supersede or persist any source event.</footer>
  </section>`;
  const $ = selector=>root.querySelector(selector);
  const status=$('#ledger-status'),output=$('#ledger-results'),exportButton=$('[data-ledger-action="export"]');
  let generation=0;
  const listeners=[];
  const on=(element,event,listener)=>{element.addEventListener(event,listener);listeners.push(()=>element.removeEventListener(event,listener));};
  root.querySelectorAll('[data-wayglass-room]').forEach(button=>on(button,'click',()=>globalThis.__wayglassOS?.mount(button.dataset.wayglassRoom)));
  async function run(mode){
    const ticket=++generation;
    exportButton.disabled=true;latest=null;status.textContent=`Running ${mode} locally…`;
    try{
      const raw=$('#ledger-sample').value;
      if(raw.length>22000)throw new RangeError('Audit packet exceeds 22 KB');
      const packet=validateSupersessionSample(JSON.parse(raw));
      let options={};
      if(mode==='onnx'){
        const provider=globalThis.__wayglassLocalONNX;
        if(!provider?.local || typeof provider?.pipelineFactory!=='function')throw new Error('No trusted same-origin ONNX pipeline installed. Run the baseline, or stage the optional adapter.');
        const model=createLocalOnnxEmbedder({pipelineFactory:provider.pipelineFactory});
        options={embed:model.embed,model:model.model};
      }
      const result=await auditSupersession(packet,options);
      if(disposed||ticket!==generation)return;
      latest=result;output.innerHTML=renderResult(result);exportButton.disabled=false;
      status.textContent=`Completed. ${result.metrics.forbidden_not_retrieved?'Retired and revoked records remain excluded.':'Forbidden exclusion test failed.'} No Ledger was modified.`;
    }catch(err){if(disposed||ticket!==generation)return;status.textContent=`Audit stopped: ${err?.message||String(err)}`;output.innerHTML='<p class="tiny">No audit receipt created.</p>';}
  }
  on($('[data-ledger-action="baseline"]'),'click',()=>{void run('lexical-baseline');});
  on($('[data-ledger-action="onnx"]'),'click',()=>{void run('onnx');});
  on(exportButton,'click',()=>{if(latest)downloadReceipt(latest);});
  return ()=>{disposed=true;generation++;latest=null;listeners.forEach(off=>off());};
}