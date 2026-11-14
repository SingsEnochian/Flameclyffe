import {previewWyrdrune,draftWyrdruneDiscussion} from '../wyrdrune-client.js';
import {animateWyrdruneCypher} from '../wyrdrune-cypher.js';
import {WAYGLASS_FEATHER_EVENT,wayglassSomaticSound} from '../somatic-sound.js';
import './universal-codex.css';
import '../wyrdrune-cypher-material.css';

const DRAFT_KEY='wayglass:universal-codex:draft/v1';
const HANDOFF_KEY='wayglass:universal-codex:writing-handoff/v1';
const EXAMPLE=[
  'mobius {',
  '  perceive { let light = votive("Lantern","A light carried into the work"); }',
  '  compress { let shape = star(8); }',
  '  release { let letter = angelicLetter(1); }',
  '  verify { emit light; }',
  '  integrate { emit shape; }',
  '  choose { emit letter; }',
  '  return { emit "held"; }',
  '  transcend { emit 1; }',
  '}',
].join('\n');
const PHASES=Object.freeze(['Perceive','Compress','Release','Verify','Integrate','Choose','Return','Transcend']);
function safeSessionGet(key) { try {return globalThis.sessionStorage?.getItem(key)??null;}catch{return null;} }
function safeSessionSet(key,value) { try {globalThis.sessionStorage?.setItem(key,value);return true;}catch{return false;} }
function boundedSource(source){
  if(typeof source!=='string'||source.length>16000)return false;
  return source.trim().length>0;
}
export function mountUniversalCodex(root){
  let stopped=false,previewBusy=false,revision=0,lastPreview=null,lastSource=null,cypher=null;
  const disposers=[];
  root.innerHTML=[
    '<section class="wg-surface wg-codex" data-surface="wayglass-universal-codex">',
      '<header class="glass-panel wg-codex-head">',
        '<div><p class="eyebrow">WAYGLASS · NATIVE LANGUAGE / UNIVERSAL CODEX</p>',
          '<h1>The Universal <em>Codex</em></h1>',
          '<p class="lede">Wyrdrune is written here first. Its Eightfold translation opens in British English without replacing the original source.</p>',
          '<p class="wg-codex-truth">Editor ≠ execution. Translation ≠ model reply. A preview is attributed only after host verification.</p>',
        '</div>',
        '<div class="wg-codex-sigil" aria-hidden="true"><span>ᚹ</span><i>∞</i><strong>WITHNESS</strong></div>',
      '</header>',
      '<nav class="wg-codex-passages glass-panel" aria-label="Universal Codex passages">',
        '<button type="button" class="glass-chip" data-codex-room="arcsweep:writing-room">✎ Writing Room</button>',
        '<button type="button" class="glass-chip" data-codex-room="wayglass:living-observer">✧ Living Observer</button>',
        '<button type="button" class="glass-chip" data-codex-room="wayglass:living-watercolor">◌ Watercolour</button>',
        '<button type="button" class="glass-chip" data-codex-room="wayglass:journey-before-destination">↶ Return</button>',
      '</nav>',
      '<div class="wg-codex-worktable">',
        '<section class="glass-panel wg-codex-editor" aria-labelledby="codex-source-label">',
          '<div class="wg-codex-bay-title"><div><p class="eyebrow">01 / SOURCE</p><h2 id="codex-source-label">Wyrdrune</h2></div>',
            '<span class="wg-codex-source-status">OWNER-AUTHORED · LOCAL DRAFT</span></div>',
          '<label for="codex-source" class="wg-codex-source-label">Executable WTL source</label>',
          '<textarea id="codex-source" spellcheck="false" autocapitalize="off" autocomplete="off" rows="20" maxlength="16000" aria-describedby="codex-source-help" aria-label="Wyrdrune source editor"></textarea>',
          '<p class="tiny" id="codex-source-help">Your source remains editable. Preview requires House Steward authorisation; English reading compiles locally without invoking a model.</p>',
          '<div class="wg-codex-toolbar">',
            '<button type="button" class="glass-chip" data-codex-example>Load original sample</button>',
            '<button type="button" class="glass-chip" data-codex-translate>Read in English</button>',
            '<button type="button" class="glass-chip wg-cypher-skip" data-codex-skip disabled>Reveal English now</button>',
            '<button type="button" class="send-jewel" data-codex-preview>Verify Eightfold</button>',
            '<button type="button" class="glass-chip" data-codex-discuss disabled>Stage in Writing Room</button>',
            '<button type="button" class="glass-chip" data-codex-feather>🪽 Feather</button>',
          '</div>',
          '<p class="wg-codex-status" role="status" aria-live="polite" data-codex-status>A quiet worktable. Your Wyrdrune source is not sent to a model automatically.</p>',
        '</section>',
        '<section class="glass-panel wg-codex-reading" aria-labelledby="codex-reading-title">',
          '<div class="wg-codex-bay-title"><div><p class="eyebrow">02 / TRANSLATION</p><h2 id="codex-reading-title">The other face</h2></div>',
            '<span class="wg-codex-source-status">en-GB / SOURCE GLOSS</span></div>',
          '<p class="wg-codex-reading-intro">Code → meaning, one phase at a time. The translation is deterministic and remains visibly distinct from a model-authored response.</p>',
          '<div class="wg-codex-translation wg-cypher-veil" role="region" aria-label="Wyrdrune in British English" aria-live="off" data-codex-english><p>The translation begins when invited.</p></div>',
          '<details class="wg-codex-ledger"><summary>Inspect phase receipts and provenance</summary><pre data-codex-receipts tabindex="0">No source verification requested.</pre></details>',
          '<div class="wg-codex-folds" aria-label="Eightfold phases">',
            ...PHASES.map((phase,i)=>'<span data-codex-phase="'+phase.toLowerCase()+'"><b>'+String(i+1).padStart(2,'0')+'</b> '+phase+'</span>'),
          '</div>',
        '</section>',
      '</div>',
      '<footer class="wg-codex-footer tiny">Source and translation remain separate. Feather stops visual animation and disables new previews. No file, canon, model weights, or production infrastructure are changed by entering this room.</footer>',
    '</section>',
  ].join('');
  const q=s=>root.querySelector(s);
  const editor=q('#codex-source'),status=q('[data-codex-status]'),
    english=q('[data-codex-english]'),receipts=q('[data-codex-receipts]'),
    discuss=q('[data-codex-discuss]'),previewButton=q('[data-codex-preview]'),skip=q('[data-codex-skip]');
  const listen=(el,type,fn)=>{el.addEventListener(type,fn);disposers.push(()=>el.removeEventListener(type,fn));};
  editor.value=safeSessionGet(DRAFT_KEY)||EXAMPLE;
  const held=()=>Boolean(wayglassSomaticSound.snapshot().feather_stopped);
  const sync=()=>{
    const blocked=held()||previewBusy||stopped;
    previewButton.disabled=blocked;
    discuss.disabled=blocked||!lastPreview||lastSource!==editor.value;
    q('[data-codex-translate]').disabled=held()||stopped;
    skip.disabled=held()||stopped||english.getAttribute('data-cypher-state')!=='reading';
    q('[data-codex-feather]').setAttribute('aria-pressed',String(held()));
    status.dataset.held=String(held());
  };
  const invalidate=()=>{
    revision++;lastSource=null;lastPreview=null;cypher?.stop();cypher=null;
    english.replaceChildren();english.textContent='Source changed. Read in English again to translate this revision.';
    english.setAttribute('data-cypher-state','idle');skip.disabled=true;
    receipts.textContent='Source changed; previous preview no longer applies.';
    for(const phase of root.querySelectorAll('[data-codex-phase]'))phase.removeAttribute('data-verified');
    safeSessionSet(DRAFT_KEY,editor.value);
    status.textContent='Draft changed. Preview and translation can be refreshed independently.';
    sync();
  };
  listen(editor,'input',invalidate);
  listen(q('[data-codex-example]'),'click',()=>{editor.value=EXAMPLE;invalidate();editor.focus();});
  listen(q('[data-codex-translate]'),'click',()=>{
    if(held()||stopped)return;
    cypher?.stop();
    try{
      const reduced=Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
      cypher=animateWyrdruneCypher(english,{
        source:editor.value,reducedMotion:reduced,
        onPhase:phase=>{
          for(const chip of root.querySelectorAll('[data-codex-phase]')){
            chip.setAttribute('data-reading',String(chip.dataset.codexPhase===phase));
          }
        },
        onComplete:()=>{
          skip.disabled=true;
          for(const chip of root.querySelectorAll('[data-codex-phase]'))chip.removeAttribute('data-reading');
          status.textContent='The native Wyrdrune reading has opened into British English. Source unchanged; no model contacted.';
        },
      });
      skip.disabled=english.getAttribute('data-cypher-state')!=='reading';
      if(!skip.disabled)status.textContent='Wyrdrune is unfolding through glyphs into British English. Reveal immediately at any time.';
    }catch(error){
      english.textContent='Unable to read source: '+String(error.message||error);
      english.setAttribute('data-cypher-state','error');skip.disabled=true;
      status.textContent='Source did not compile for the local reading.';
    }
  });
  listen(skip,'click',()=>cypher?.stop());
  listen(previewButton,'click',async()=>{
    if(held()||stopped||previewBusy||!boundedSource(editor.value))return;
    const source=editor.value,token=++revision;
    previewBusy=true;sync();status.textContent='Requesting the host’s Wyrdrune Eightfold preview…';
    try{
      const result=await previewWyrdrune(source);
      if(stopped||held()||token!==revision||editor.value!==source)return;
      if(result.verification?.verified!==true)throw new Error('Host returned a preview without verified source integrity');
      lastSource=source;lastPreview=result;
      receipts.textContent=JSON.stringify({
        source_hash:result.receiptHash,
        source_integrity:result.verification,
        phases:result.phaseReceipts,return_ledger:result.ritualLedger,
        withness:result.withness,
      },null,2);
      const observed=new Set(result.phaseReceipts?.map(p=>String(p.phase).toLowerCase())||[]);
      for(const phase of root.querySelectorAll('[data-codex-phase]')){
        phase.dataset.verified=String(observed.has(phase.dataset.codexPhase));
      }
      status.textContent='Eightfold source verified. Discuss only after reviewing the proposed handoff.';
    }catch(error){lastPreview=null;lastSource=null;receipts.textContent='No verified receipt.';
      status.textContent='No verified return: '+String(error?.message||error).slice(0,200);}
    finally{previewBusy=false;sync();}
  });
  listen(discuss,'click',()=>{
    if(!lastPreview||lastSource!==editor.value||held())return;
    const draft=draftWyrdruneDiscussion(lastSource,lastPreview);
    if(!safeSessionSet(HANDOFF_KEY,draft)){
      status.textContent='Session storage unavailable. Source not staged.';return;
    }
    status.textContent='Verified Wyrdrune staged for your review in the Writing Room. Nothing sent.';
    void globalThis.__wayglassOS?.mount('arcsweep:writing-room');
  });
  listen(q('[data-codex-feather]'),'click',()=>{
    if(!held()){wayglassSomaticSound.feather();cypher?.stop();
      status.textContent='Feather held. Animation and new previews stopped.';}
    else status.textContent='Release Feather through the explicit ship control before continuing.';
    sync();
  });
  const onFeather=event=>{
    if(event?.detail?.stopped){revision++;cypher?.stop();skip.disabled=true;lastPreview=null;lastSource=null;
      status.textContent='Feather held. Any pending preview will be ignored.';}
    sync();
  };
  globalThis.addEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);
  disposers.push(()=>globalThis.removeEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather));
  for(const button of root.querySelectorAll('[data-codex-room]')){
    listen(button,'click',()=>void globalThis.__wayglassOS?.mount(button.dataset.codexRoom));
  }
  sync();
  return ()=>{stopped=true;revision++;cypher?.stop();disposers.splice(0).forEach(f=>f());};
}
export {EXAMPLE as UNIVERSAL_CODEX_SAMPLE,HANDOFF_KEY as UNIVERSAL_CODEX_HANDOFF_KEY};
