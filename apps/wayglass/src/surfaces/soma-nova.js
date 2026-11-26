import {previewWyrdrune} from '../wyrdrune-client.js';
export function mountSomaNova(root){
 root.innerHTML='<section class="wg-surface wg-soma-nova"><header class="glass-panel wg-surface-head"><h1>Soma Nova</h1><p>Wyrdrune ritual worktable</p></header><section class="glass-panel" style="padding:1.5rem"><label for="soma-source">WTL inscription</label><textarea id="soma-source" rows="10" style="display:block;width:100%;box-sizing:border-box"></textarea><button class="send-jewel" data-charge>Verify inscription</button> <button class="glass-chip" data-fire disabled>Fire (execution unavailable)</button> <button class="glass-chip" data-feather>Feather</button><p role="status" data-status>Awaiting inscription.</p><pre style="white-space:pre-wrap" data-receipt></pre></section></section>';
 const q=s=>root.querySelector(s),charge=q('[data-charge]'),source=q('#soma-source'),status=q('[data-status]');let epoch=0;
 const wake=(strength,mode)=>window.dispatchEvent(new CustomEvent('wayglass:material-wake',{detail:{strength,mode}}));
 const invalidate=()=>{epoch++;charge.disabled=false;q('[data-receipt]').textContent='';status.textContent='Awaiting verification.';};
 source.addEventListener('input',invalidate);
 charge.addEventListener('click',async()=>{const id=++epoch;charge.disabled=true;status.textContent='Verifying inscription…';wake(.65,'braid');try{const result=await previewWyrdrune(source.value);if(id!==epoch)return;q('[data-receipt]').textContent=JSON.stringify(result,null,2);status.textContent='Preview returned. No spell executed.';wake(.85,'ring');}catch(e){if(id===epoch)status.textContent=String(e.message||e);}finally{if(id===epoch)charge.disabled=false;}});
 q('[data-feather]').addEventListener('click',()=>{invalidate();status.textContent='Feather held. Pending preview result discarded.';wake(0,'braid');});
 return ()=>{epoch++;};
}
