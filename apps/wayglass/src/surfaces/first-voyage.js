import './first-voyage.css';
import {checkHouseSteward,signInHouseSteward} from '../house-steward-session.js';
import {observeIntegratedVoyage} from '../integrated-voyage-visual.js';
import {wayglassSomaticSound} from '../somatic-sound.js';

const MODES=Object.freeze({
 repair:Object.freeze({title:'Shelter the system',subtitle:'A network under pressure. Intelligence and infrastructure yield together.',network:'800 → 480 ms',intelligence:'70% → 85%',configuration:'Queue 24 → 20 · Context 2048 → 1792',question:'What can the two sides relinquish together?'}),
 expand:Object.freeze({title:'Give possibility room',subtitle:'A system with headroom. Two different architectures grow together.',network:'300 → 260 ms',intelligence:'85% → 91%',configuration:'Queue 24 → 28 · Context 2048 → 2176',question:'What new space can they create without losing the way home?'}),
});
const FOLDS=['Perceive','Compress','Release','Verify','Integrate','Choose','Return','Transcend'];
export async function mountWayglassFirstVoyage(root){
 let mode='repair',stopped=false,busy=false,authenticated=false,controller=null;
 const callbacks=[];
 root.innerHTML=`
 <section class="wg-surface wg-voyage" data-surface="first-voyage" data-mode="repair">
   <header class="wg-voyage-intro glass-panel">
     <div class="wg-voyage-copy">
       <p class="eyebrow">WAYGLASS · FAEberpunk · FIRST VOYAGE</p>
       <h1>A universe<br><em>in motion.</em></h1>
       <p class="lede">Infrastructure and intelligence change together in native Wyrdrune. Each keeps its identity. Every return leaves a trace.</p>
       <div class="wg-voyage-hero-actions">
         <button type="button" class="send-jewel" data-voyage-navigate="wayglass:living-watercolor">↶ The Watercolour</button>
         <button type="button" class="glass-chip" data-voyage-navigate="wayglass:mythience-crossing">◇ Mythience</button>
       </div>
       <p class="wg-voyage-material">OBSIDIAN <span>✧</span> OPAL <span>✧</span> LIVING INK <span>✧</span> BRASS</p>
     </div>
     <div class="wg-voyage-window" role="img" aria-label="Two distinct Möbius circuits moving around a shared Withness centre">
       <svg viewBox="0 0 600 510" aria-hidden="true" focusable="false">
         <defs>
           <linearGradient id="voyage-gradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#edcca0"/><stop offset=".38" stop-color="#82e1cd"/><stop offset=".7" stop-color="#5a8ab2"/><stop offset="1" stop-color="#d4a46e"/></linearGradient>
           <linearGradient id="voyage-underside" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5ac8bd"/><stop offset=".5" stop-color="#192e49"/><stop offset="1" stop-color="#d3a176"/></linearGradient>
           <radialGradient id="voyage-well"><stop offset="0" stop-color="#c2ffec" stop-opacity=".55"/><stop offset=".7" stop-color="#5ac3ab" stop-opacity=".16"/><stop offset="1" stop-color="#07151f" stop-opacity="0"/></radialGradient>
         </defs>
         <circle cx="300" cy="255" r="190" fill="url(#voyage-well)"/>
         <ellipse cx="300" cy="250" rx="234" ry="191" fill="none" stroke="#a0d8c5" stroke-opacity=".24" stroke-dasharray="3 13"/>
         <ellipse cx="300" cy="250" rx="207" ry="159" fill="none" stroke="#e0bf90" stroke-opacity=".17" transform="rotate(32 300 250)"/>
         <g class="wg-voyage-ribbon">
           <path d="M66 253 C146 75 246 85 300 251 C362 417 472 415 534 251 C452 71 362 91 300 251 C239 413 126 419 66 253" fill="none" stroke="#132e37" stroke-width="24" stroke-linecap="round"/>
           <path d="M66 253 C146 75 246 85 300 251 C362 417 472 415 534 251 C452 71 362 91 300 251 C239 413 126 419 66 253" fill="none" stroke="url(#voyage-gradient)" stroke-width="11" stroke-linecap="round" opacity=".96"/>
           <path d="M65 238 C159 105 239 103 298 252 C361 409 453 396 535 266 C439 108 360 98 301 249 C231 391 155 411 65 238" fill="none" stroke="url(#voyage-underside)" stroke-width="3" stroke-linecap="round"/>
         </g>
         <circle cx="300" cy="251" r="49" fill="#07171c" stroke="#d4bc91" stroke-width="2"/>
         <circle cx="300" cy="251" r="37" fill="#153d3a" stroke="#9edbd0" stroke-opacity=".45"/>
         <text x="300" y="250" text-anchor="middle" fill="#f6edce" font-size="12" letter-spacing="3">WITH</text>
         <text x="300" y="266" text-anchor="middle" fill="#a6dbcd" font-size="10" letter-spacing="2">NESS</text>
         <text x="110" y="467" fill="#acd7cb" font-size="14">INFRASTRUCTURE</text>
         <text x="382" y="467" fill="#f2d3a1" font-size="14">INTELLIGENCE</text>
       </svg>
       <p class="wg-voyage-window-caption"><span>01 · Distinct systems</span><span>∞ · Witnessed return</span></p>
     </div>
   </header>
   <section class="wg-voyage-gate glass-panel" aria-labelledby="voyage-gate-heading">
     <div class="wg-voyage-gate-heading">
       <div><p class="eyebrow">THE DOUBLE MÖBIUS · CHOOSE A TIDE</p><h2 id="voyage-gate-heading">Where shall the current flow?</h2>
       <p data-voyage-subtitle>A network under pressure. Intelligence and infrastructure yield together.</p></div>
       <span class="wg-voyage-flag">SIMULATED · NO LIVE MODEL</span>
     </div>
     <div class="wg-voyage-choices" role="group" aria-label="Choose a Wyrdrune scenario">
       <button type="button" data-voyage-mode="repair" aria-pressed="true"><span aria-hidden="true">◒</span><strong>Under pressure</strong><small>Repair · find shelter</small></button>
       <button type="button" data-voyage-mode="expand" aria-pressed="false"><span aria-hidden="true">✦</span><strong>Room to breathe</strong><small>Expand · allow growth</small></button>
     </div>
     <div class="wg-voyage-habitats" aria-label="Synthetic baseline to trial comparisons">
       <article><p>◌ INFRASTRUCTURE</p><strong data-voyage-network>800 → 480 ms</strong><small>p95 network latency · synthetic</small></article>
       <div class="wg-voyage-exchange" aria-hidden="true">⇄</div>
       <article><p>✧ INTELLIGENCE</p><strong data-voyage-intelligence>70% → 85%</strong><small>Task success · synthetic</small></article>
     </div>
     <div class="wg-voyage-configuration"><span>WYRDRUNE / RECIPROCAL TRANSFORMATION</span><p data-voyage-configuration>Queue 24 → 20 · Context 2048 → 1792</p></div>
     <p class="wg-voyage-question" data-voyage-question>What can the two sides relinquish together?</p>
     <label class="wg-voyage-consent"><input type="checkbox" data-voyage-consent><span>Allow a <strong>fictional</strong> Mythience membrane proposal in this experiment.</span></label>
     <p class="tiny">Unchecked consent tests the refusal path. This demonstration never changes actual systems, trains models, or moves between physical worlds.</p>
     <form class="wg-voyage-signin" data-voyage-signin>
       <label for="wg-voyage-key">House Steward sign-in</label>
       <div><input id="wg-voyage-key" type="password" maxlength="4096" autocomplete="off" placeholder="Your House credential" required><button type="submit" class="glass-chip">Unlock</button></div>
       <p class="tiny">The host verifies your credential. This room does not save it.</p>
     </form>
     <div class="wg-voyage-controls">
       <button type="button" class="send-jewel wg-voyage-run" data-voyage-run disabled>✧ Begin First Voyage</button>
       <button type="button" class="glass-chip wg-voyage-feather" data-voyage-feather>🪽 Feather · Hold</button>
       <button type="button" class="glass-chip" data-voyage-return>↶ Return to Watercolour</button>
     </div>
     <p class="wg-voyage-status" data-voyage-status role="status" aria-live="polite">Checking the House threshold…</p>
   </section>
   <section class="wg-voyage-consequence glass-panel" aria-labelledby="voyage-withness">
     <div class="wg-voyage-consequence-top"><div><p class="eyebrow">EIGHTFOLD · ONE RETURN</p><h2 id="voyage-withness">The shape of the change</h2></div><span class="wg-voyage-flag" data-voyage-result-flag>AWAITING A VOYAGE</span></div>
     <ol class="wg-voyage-folds" aria-label="Wyrdrune Eightfold phases">
       ${FOLDS.map((name,i)=>'<li data-voyage-fold="'+name.toLowerCase()+'"><span>'+String(i+1).padStart(2,'0')+'</span><strong>'+name+'</strong></li>').join('')}
     </ol>
     <div class="wg-voyage-reading">
       <div><p class="eyebrow">WITHNESS · SOURCE BOUND</p><h3 data-voyage-headline>A possibility awaits</h3><p data-voyage-reading>Wyrdrune will return a proposal, or preserve a refusal. Both matter.</p></div>
       <div class="wg-voyage-return-stone"><span aria-hidden="true">◇</span><strong data-voyage-return-label>Return marker ready</strong><small>Identity and provenance remain distinct</small></div>
     </div>
     <details class="wg-voyage-evidence"><summary>Inspect Wyrdrune and Return receipts</summary>
       <p class="tiny">A receipt proves which code ran. It does not establish cognition or physical-world change.</p>
       <pre data-voyage-receipt>Not run. No result claimed.</pre>
       <a data-voyage-source href="https://github.com/SingsEnochian/Flameclyffe/blob/wayglass/first-voyage-reciprocal-integration-20261113/lib/wyrdrune/coevolution-repair.wtl" target="_blank" rel="noopener noreferrer">Read native Wyrdrune source</a>
     </details>
   </section>
 </section>
 `;
 const q=s=>root.querySelector(s),area=q('.wg-voyage'),status=q('[data-voyage-status]'),signIn=q('[data-voyage-signin]'),run=q('[data-voyage-run]'),consent=q('[data-voyage-consent]');
 const listen=(element,event,callback)=>{element.addEventListener(event,callback);callbacks.push(()=>element.removeEventListener(event,callback));};
 const announce=value=>{if(!stopped)status.textContent=String(value)};
 const held=()=>wayglassSomaticSound.snapshot().feather_stopped;
 const reflect=()=>{
   if(stopped)return;
   area.dataset.feather=String(held());
   q('[data-voyage-feather]').textContent=held()?'🪽 Held · Release explicitly':'🪽 Feather · Hold';
   q('[data-voyage-feather]').setAttribute('aria-pressed',String(held()));
   run.disabled=!authenticated||busy||held();
 };
 const render=()=>{
   const selected=MODES[mode];area.dataset.mode=mode;
   q('[data-voyage-subtitle]').textContent=selected.subtitle;
   q('[data-voyage-network]').textContent=selected.network;
   q('[data-voyage-intelligence]').textContent=selected.intelligence;
   q('[data-voyage-configuration]').textContent=selected.configuration;
   q('[data-voyage-question]').textContent=selected.question;
   q('[data-voyage-source]').href='https://github.com/SingsEnochian/Flameclyffe/blob/wayglass/first-voyage-reciprocal-integration-20261113/lib/wyrdrune/coevolution-'+mode+'.wtl';
   root.querySelectorAll('[data-voyage-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.voyageMode===mode)));
 };
 root.querySelectorAll('[data-voyage-mode]').forEach(button=>listen(button,'click',()=>{
   if(busy)return;mode=button.dataset.voyageMode;render();announce('Scenario chosen. You decide when Wyrdrune runs.');
 }));
 root.querySelectorAll('[data-voyage-navigate]').forEach(button=>listen(button,'click',()=>void globalThis.__wayglassOS?.mount(button.dataset.voyageNavigate)));
 listen(q('[data-voyage-return]'),'click',()=>void globalThis.__wayglassOS?.mount('wayglass:living-watercolor'));
 listen(signIn,'submit',async event=>{
   event.preventDefault();const field=q('#wg-voyage-key'),button=signIn.querySelector('button');if(button.disabled)return;
   button.disabled=true;const credential=field.value;field.value='';
   try{await signInHouseSteward(credential);if(stopped)return;authenticated=true;signIn.hidden=true;announce('House verified. Begin when ready.');reflect()}
   catch(error){announce('Sign-in refused: '+error.message)}
   finally{if(!stopped)button.disabled=false}
 });
 listen(q('[data-voyage-feather]'),'click',()=>{
   if(held()){
     try{wayglassSomaticSound.releaseFeather({confirmed:true});announce('Feather released by explicit choice. Audio remains off.');}
     catch(error){announce(error.message)}
   }else{
     controller?.abort();wayglassSomaticSound.feather();
     announce('Feather holding. The request is stopped; no automatic restart.');
   }
   reflect();
 });
 const stopOnFeather=()=>{controller?.abort();reflect()};
 globalThis.addEventListener('wayglass:feather',stopOnFeather);
 callbacks.push(()=>globalThis.removeEventListener('wayglass:feather',stopOnFeather));
 listen(run,'click',async()=>{
   if(busy||!authenticated||held())return;
   busy=true;controller=new AbortController();reflect();
   q('[data-voyage-result-flag]').textContent='WYRDRUNE RUNNING';
   announce('Tracing two source-labelled systems through Wyrdrune and the shared Return Engine…');
   try{
     const response=await fetch('/api/v1/wayglass/wyrdrune/first-voyage',{
       method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
       headers:{'Content-Type':'application/json'},body:JSON.stringify({mode,fictionConsent:consent.checked}),
     });
     const data=await response.json().catch(()=>({}));
     if(!response.ok)throw new Error(data.error||'House host refused the voyage');
     if(data.schema!=='wayglass.first-voyage-response/v0.1'||data.source_kind!=='simulation'||data.measurement_is_live!==false||data.production_mutation!==false)
       throw new Error('Unrecognised provenance or live mutation claim');
     if(stopped||held())return;
     const result=data.receipt,success=result?.status==='connected-sandbox-preview';
     q('[data-voyage-headline]').textContent=success?'A return has been witnessed':'The boundary has spoken';
     q('[data-voyage-result-flag]').textContent=success?'RETURN VERIFIED':'REFUSAL PRESERVED';
     q('[data-voyage-reading]').textContent=success?
       'Wyrdrune returned proposals from two distinct domains. The Autopoietic Runtime, Tensor engine and Observer contributed receipts. The Watercolour receives a source-bound pigment event, not permission to alter infrastructure.':
       'Wyrdrune or the fictional membrane declined. The shared voyage did not commit a Return. The choice remains open.';
     q('[data-voyage-return-label]').textContent=success?'Return packet verified':'Refusal remains valid';
     root.querySelectorAll('[data-voyage-fold]').forEach(el=>{if(success)el.dataset.witnessed='true';else delete el.dataset.witnessed;});
     if(success)observeIntegratedVoyage(result);
     q('[data-voyage-receipt]').textContent=JSON.stringify({
       scenario:data.scenario,kind:data.source_kind,status:result?.status,
       coevolution_wtl:result?.coevolution?.native_wtl||null,
       mythience_wtl:result?.mythience?.native_wtl||null,
       tensor:result?.tensor?.program_fingerprint||null,
       observer:result?.observer?.checkpoint_hash||null,
       voyage:result?.runtime?.receipt_hash||null,
       return_verdict:result?.return_verification?.verdict||null,
       sources:result?.provenance_refs||[],production_mutation:false,
     },null,2);
     announce(success?'Withness witnessed the return. Living Watercolour received the receipt. No live system changed.':'Refusal preserved without simulated success or a false Return.');
   }catch(error){if(stopped)return;q('[data-voyage-result-flag]').textContent='NO CONFIRMED RETURN';
     announce(error?.name==='AbortError'?'Feather stopped this request. No result admitted.':'Voyage unavailable: '+String(error?.message||error));}
   finally{controller=null;busy=false;reflect()}
 });
 render();reflect();
 try{
   authenticated=await checkHouseSteward();
   if(!stopped){signIn.hidden=authenticated;announce(authenticated?'House verified. Choose a tide and begin.':'House sign-in required for execution. The room remains open.');reflect()}
 }catch{if(!stopped){authenticated=false;announce('House session unavailable. Sign in to execute a voyage.');reflect()}}
 return ()=>{stopped=true;controller?.abort();callbacks.forEach(fn=>fn())};
}
