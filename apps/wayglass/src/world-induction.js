import {sanitizedManuscriptFragment} from './faeberpunk-manuscript.js';
import {worldInductionProfile,writingInductionScore,validatedAspect,inductionScript} from './world-induction-model.js';
import {WAYGLASS_FEATHER_EVENT,wayglassSomaticSound} from './somatic-sound.js';
import './world-induction.css';

const STORAGE_PREFIX='wayglass:world-induction:aspect/v1:';
const STEPS=['Identity','Qualities','Boundaries','I AM'];
const escapeText=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');

function storageKey(worldId){return STORAGE_PREFIX+encodeURIComponent(worldId);}
function safeStoreGet(storage,key){try{return storage?.getItem(key)||null;}catch{return null;}}
function safeStoreSet(storage,key,value){try{storage?.setItem(key,value);return true;}catch{return false;}}
function cleanHTML(editor,doc){
  const span=doc.createElement('div');
  span.append(sanitizedManuscriptFragment(editor.innerHTML,doc));
  return span.innerHTML;
}
function editorText(editor){return String(editor.innerText||editor.textContent||'').trim();}
function makeAudio({scope=globalThis}={}){
  let context=null,master=null,anchor=null,counterpart=null,pulse=null,pulseDepth=null,active=false;
  function stop(){
    active=false;
    for(const node of [anchor,counterpart,pulse])try{node?.stop();}catch{}
    for(const node of [anchor,counterpart,pulse,pulseDepth,master])try{node?.disconnect();}catch{}
    anchor=null;counterpart=null;pulse=null;pulseDepth=null;master=null;
    if(context){const old=context;context=null;try{Promise.resolve(old.close()).catch(()=>{});}catch{}}
  }
  async function start(profile,score){
    stop();
    const Ctor=scope.AudioContext||scope.webkitAudioContext;
    if(typeof Ctor!=='function')throw new Error('This browser has no Web Audio support');
    try{
      context=new Ctor({latencyHint:'playback'});
      await context.resume();
      master=context.createGain();
      const limiter=context.createDynamicsCompressor();
      limiter.threshold.value=-18;limiter.knee.value=0;limiter.ratio.value=12;
      limiter.attack.value=.005;limiter.release.value=.18;
      master.gain.value=.055;
      master.connect(limiter).connect(context.destination);
      const bed=context.createGain();bed.gain.value=.72;bed.connect(master);
      const low=context.createGain();low.gain.value=.7;low.connect(bed);
      const high=context.createGain();high.gain.value=.23;high.connect(bed);
      anchor=context.createOscillator();anchor.type=profile.wave;anchor.frequency.value=score.rootHz;
      counterpart=context.createOscillator();counterpart.type='sine';counterpart.frequency.value=score.counterpartHz;
      anchor.connect(low);counterpart.connect(high);
      pulseDepth=context.createGain();pulseDepth.gain.value=.14;
      pulse=context.createOscillator();pulse.type='sine';pulse.frequency.value=score.beatBpm/60;
      pulse.connect(pulseDepth).connect(bed.gain);
      anchor.start();counterpart.start();pulse.start();
      active=true;
      return true;
    }catch(error){stop();throw error;}
  }
  function update(score){
    if(!active||!context)return false;
    const now=context.currentTime;
    counterpart.frequency.setTargetAtTime(score.counterpartHz,now,.28);
    pulse.frequency.setTargetAtTime(score.beatBpm/60,now,.4);
    return true;
  }
  return {start,stop,update,get active(){return active;}};
}

export function mountWorldInduction(root,{worldSelect,input,manuscriptRoot=null,
  getWorld=()=>null,scope=globalThis,doc=globalThis.document,
  storage=scope.localStorage,writerText=()=>String(input?.value||'')}={}){
  if(!root||!doc||!worldSelect||!input)throw new TypeError('World Induction needs its world and writing editors');
  const audio=makeAudio({scope});
  let world=null,profile=null,aspect=null,step=0,playing=false,disposed=false;
  let speechEpoch=0,voiceTimer=null,ownSpeech=false;
  const listeners=[];
  const listen=(node,event,fn)=>{node?.addEventListener?.(event,fn);listeners.push(()=>node?.removeEventListener?.(event,fn));};
  root.innerHTML=[
    '<section class="wg-world-induction glass-panel" aria-labelledby="wg-induction-title">',
    '<div class="wg-induction-heading"><div><p class="eyebrow">WAYGLASS · WORLD INDUCTION</p>',
    '<h2 id="wg-induction-title">Listen before crossing</h2>',
    '<p class="tiny">An original, source-labelled world-tone orientation. The quiet voice is fully disclosed and optional; no hidden assertions or automatic sound.</p></div>',
    '<span class="wg-induction-sigil" aria-hidden="true">◇</span></div>',
    '<div class="wg-induction-world"><strong data-induction-world></strong><p data-induction-cues></p>',
    '<p class="tiny" data-induction-provenance></p></div>',
    '<div class="wg-induction-actions"><button type="button" class="glass-chip" data-induction-aspect>Edit / create my aspect</button>',
    '<button type="button" class="glass-chip" data-induction-tones-only>Tones only</button></div>',
    '<div class="wg-induction-wizard" data-induction-wizard hidden>',
    '<p class="eyebrow">First-person aspect · user-authored, not assigned</p>',
    '<p class="tiny">Choose how you enter this world. You may revise, skip the voice, or leave. Nothing is sent to a model or promoted to world canon.</p>',
    '<div class="wg-induction-steps" role="group" aria-label="Aspect creation steps">',
    ...STEPS.map((name,i)=>'<span data-induction-step-label="'+i+'">'+(i+1)+' · '+name+'</span>'),
    '</div>',
    '<section data-induction-step="0"><label>Aspect name<input data-induction-name maxlength="100" autocomplete="off" placeholder="A name you choose"></label>',
    '<label>My place in this world<input data-induction-role maxlength="240" autocomplete="off" placeholder="Who I choose to be here"></label></section>',
    '<section data-induction-step="1" hidden><p>What qualities does this aspect carry?</p>',
    '<div class="wg-induction-rich" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Rich-text aspect qualities" spellcheck="true" lang="en-GB" data-induction-rich="qualities" data-placeholder="Strengths, wonders, contradictions, possibilities…"></div></section>',
    '<section data-induction-step="2" hidden><p>What are its boundaries and return anchors?</p>',
    '<div class="wg-induction-rich" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Rich-text aspect boundaries" spellcheck="true" lang="en-GB" data-induction-rich="boundaries" data-placeholder="I may refuse… I return when…"></div></section>',
    '<section data-induction-step="3" hidden><p>Write the first-person lines to place quietly beneath your world score. Begin each chosen line with I AM.</p>',
    '<div class="wg-induction-rich" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Rich-text I AM affirmations" spellcheck="true" lang="en-GB" data-induction-rich="affirmations" data-placeholder="I AM…"></div></section>',
    '<div class="wg-induction-toolbar" role="toolbar" aria-label="Native rich-text formatting">',
    '<button class="glass-chip" type="button" data-induction-command="bold" title="Bold"><strong>B</strong></button>',
    '<button class="glass-chip" type="button" data-induction-command="italic" title="Italic"><em>I</em></button>',
    '<button class="glass-chip" type="button" data-induction-command="underline" title="Underline"><u>U</u></button>',
    '<button class="glass-chip" type="button" data-induction-command="insertUnorderedList">• List</button></div>',
    '<div class="wg-induction-actions"><button type="button" class="glass-chip" data-induction-back>Back</button>',
    '<button type="button" class="glass-chip" data-induction-next>Next</button>',
    '<button type="button" class="send-jewel" data-induction-save hidden>Use this aspect</button>',
    '<button type="button" class="glass-chip" data-induction-cancel>Not now</button></div>',
    '<p class="tiny" data-induction-wizard-status role="status" aria-live="polite"></p></div>',
    '<div class="wg-induction-mixer"><div class="wg-induction-actions">',
    '<label><input type="checkbox" data-induction-voice checked> Include very quiet spoken I AM layer</label>',
    '<label><input type="checkbox" data-induction-loop checked> Repeat quiet layer</label>',
    '<label><input type="checkbox" data-induction-mono checked> Mono-safe projection</label></div>',
    '<div class="wg-induction-actions"><button type="button" class="send-jewel" data-induction-play>Start world induction</button>',
    '<button type="button" class="glass-chip" data-induction-stop>Stop</button>',
    '<button type="button" class="glass-chip" data-induction-feather>🪽 Feather</button></div>',
    '<p class="tiny" data-induction-status role="status" aria-live="polite">Sound and voice are off. Select an aspect or choose tones only.</p>',
    '<output class="tiny" data-induction-score></output>',
    '<details class="wg-induction-transcript"><summary>Read the entire quiet script</summary><pre data-induction-script></pre></details>',
    '</div></section>',
  ].join('');
  const $=selector=>root.querySelector(selector);
  const wizard=$('[data-induction-wizard]'),status=$('[data-induction-status]');
  const voice=$('[data-induction-voice]'),loop=$('[data-induction-loop]');
  const mono=$('[data-induction-mono]'),script=$('[data-induction-script]');
  let toneOnly=false,activeEditor=null;
  const editors=Object.fromEntries(['qualities','boundaries','affirmations']
    .map(kind=>[kind,$('[data-induction-rich="'+kind+'"]')]));
  const storedHtml={qualities:'',boundaries:'',affirmations:''};
  function stopVoice(){
    ++speechEpoch;
    if(voiceTimer!==null){scope.clearTimeout?.(voiceTimer);voiceTimer=null;}
    if(ownSpeech){try{scope.speechSynthesis?.cancel();}catch{}}
    ownSpeech=false;
  }
  function stop(reason='World induction stopped.'){
    playing=false;stopVoice();audio.stop();status.textContent=reason;
    $('[data-induction-play]').disabled=false;
  }
  function voiceScript(){
    if(!playing||!voice.checked||!profile)return;
    const SynthUtterance=scope.SpeechSynthesisUtterance;
    const synth=scope.speechSynthesis;
    if(typeof SynthUtterance!=='function'||!synth){
      status.textContent='World tones playing; this browser does not provide speech synthesis. Script remains readable.';
      return;
    }
    const narrative=inductionScript(profile,toneOnly?null:aspect).transcript;
    const token=++speechEpoch;
    const utterance=new SynthUtterance(narrative);
    utterance.lang='en-GB';utterance.rate=.86;utterance.volume=.06;
    utterance.onend=()=>{
      if(token!==speechEpoch||!playing)return;
      ownSpeech=false;
      if(loop.checked)voiceTimer=scope.setTimeout?.(()=>voiceScript(),26000);
    };
    utterance.onerror=()=>{
      if(token===speechEpoch&&playing){ownSpeech=false;status.textContent='Tones continue; spoken layer unavailable. Read the script above.';}
    };
    ownSpeech=true;
    try{synth.speak(utterance);}catch{ownSpeech=false;}
  }
  function readAspect(){
    const raw=safeStoreGet(storage,storageKey(profile.world_id));
    if(!raw)return null;
    try{
      const parsed=JSON.parse(raw);
      if(parsed?.world_id!==profile.world_id||parsed?.schema!=='wayglass.world-aspect-saved/v1')return null;
      const valid=validatedAspect(parsed.aspect);
      const html=parsed.html||{};
      return {aspect:valid,html};
    }catch{return null;}
  }
  function refreshScript(){
    const rendered=inductionScript(profile,toneOnly?null:aspect);
    script.textContent=rendered.transcript;
    $('[data-induction-aspect]').textContent=aspect?'Edit '+aspect.name:'Create my aspect';
  }
  function renderScore(){
    const score=writingInductionScore(profile,writerText());
    $('[data-induction-score]').textContent='World root '+score.rootHz.toFixed(1)+' Hz · writing voice '
      +score.counterpartHz.toFixed(1)+' Hz · beat '+score.beatBpm.toFixed(1)
      +' BPM · '+score.wordCount+' words · local text features only';
    audio.update(score);
  }
  function clearWizard(){
    $('[data-induction-name]').value='';$('[data-induction-role]').value='';
    Object.values(editors).forEach(editor=>editor.replaceChildren());
  }
  function loadWorld(){
    stop('World changed. No audio has been started.');
    const selected=getWorld(worldSelect.value)||{world_id:worldSelect.value,name:worldSelect.selectedOptions?.[0]?.textContent||'Selected world'};
    world=selected;profile=worldInductionProfile(world);toneOnly=false;
    const saved=readAspect();
    aspect=saved?.aspect||null;
    clearWizard();
    if(saved){
      $('[data-induction-name]').value=aspect.name;
      $('[data-induction-role]').value=aspect.role;
      for(const kind of Object.keys(editors)){
        const html=String(saved.html?.[kind]||'').slice(0,180000);
        try{editors[kind].replaceChildren(sanitizedManuscriptFragment(html,doc));}
        catch{editors[kind].textContent=kind==='affirmations'?aspect.affirmations.join('\n'):aspect[kind]||'';}
      }
    }
    $('[data-induction-world]').textContent=profile.name;
    $('[data-induction-cues]').textContent=profile.texture+' · '+profile.listenFor;
    $('[data-induction-provenance]').textContent=profile.provenance+' · '+profile.source_status;
    refreshScript();renderScore();showWizard(!aspect);
  }
  function showWizard(open){
    wizard.hidden=!open;
    if(open){step=0;setStep(0);}
  }
  function setStep(next){
    step=Math.min(3,Math.max(0,next));
    root.querySelectorAll('[data-induction-step]').forEach(s=>{s.hidden=Number(s.dataset.inductionStep)!==step;});
    root.querySelectorAll('[data-induction-step-label]').forEach(s=>{
      s.dataset.current=String(Number(s.dataset.inductionStepLabel)===step);
    });
    $('[data-induction-back]').disabled=step===0;
    $('[data-induction-next]').hidden=step===3;
    $('[data-induction-save]').hidden=step!==3;
    $('.wg-induction-toolbar').hidden=step===0;
    activeEditor=step===1?editors.qualities:step===2?editors.boundaries:step===3?editors.affirmations:null;
    $('[data-induction-wizard-status]').textContent='Step '+(step+1)+' of 4 · '+STEPS[step];
  }
  function createAspect(){
    const raw={
      world_id:profile.world_id,name:$('[data-induction-name]').value,role:$('[data-induction-role]').value,
      qualities:editorText(editors.qualities),boundaries:editorText(editors.boundaries),
      affirmations:editorText(editors.affirmations),
    };
    try{
      const next=validatedAspect(raw);
      const html=Object.fromEntries(Object.entries(editors).map(([key,editor])=>[key,cleanHTML(editor,doc)]));
      const stored={schema:'wayglass.world-aspect-saved/v1',world_id:profile.world_id,aspect:next,html};
      if(!safeStoreSet(storage,storageKey(profile.world_id),JSON.stringify(stored)))
        throw new Error('Local storage unavailable; aspect not saved');
      aspect=next;toneOnly=false;showWizard(false);stop('Aspect selected. Start induction when ready.');
      refreshScript();status.textContent='Using '+aspect.name+' in '+profile.name+'. Nothing sent or made canonical.';
    }catch(error){$('[data-induction-wizard-status]').textContent=String(error.message||error);}
  }
  listen($('[data-induction-aspect]'),'click',()=>{toneOnly=false;stop('Aspect editor opened. Sound stopped.');showWizard(true);});
  listen($('[data-induction-tones-only]'),'click',()=>{
    stop('Tones-only option selected.');toneOnly=true;showWizard(false);refreshScript();
    status.textContent='Tones only. No I AM lines will be spoken.';
  });
  listen($('[data-induction-back]'),'click',()=>setStep(step-1));
  listen($('[data-induction-next]'),'click',()=>{
    if(step===0&&!$('[data-induction-name]').value.trim()){
      $('[data-induction-wizard-status]').textContent='First choose an aspect name, or use Tones only.';return;
    }
    setStep(step+1);
  });
  listen($('[data-induction-save]'),'click',createAspect);
  listen($('[data-induction-cancel]'),'click',()=>{showWizard(false);status.textContent='Aspect creation deferred. Choose tones only or reopen the editor.';});
  for(const button of root.querySelectorAll('[data-induction-command]')){
    listen(button,'pointerdown',e=>{if(e.pointerType==='mouse')e.preventDefault();});
    listen(button,'click',()=>{
      if(!activeEditor||wayglassSomaticSound.snapshot().feather_stopped)return;
      activeEditor.focus();
      const ok=doc.execCommand?.(button.dataset.inductionCommand,false,null);
      if(!ok)$('[data-induction-wizard-status]').textContent='Rich formatting unavailable; plain-text editing remains.';
    });
  }
  listen($('[data-induction-play]'),'click',async()=>{
    if(disposed||playing)return;
    if(wayglassSomaticSound.snapshot().feather_stopped){status.textContent='Feather is held. Release deliberately before playback.';return;}
    if(!aspect&&!toneOnly){showWizard(true);status.textContent='Create a first-person aspect or choose Tones only before starting.';return;}
    try{
      const score=writingInductionScore(profile,writerText());
      await audio.start(profile,score);
      if(disposed||wayglassSomaticSound.snapshot().feather_stopped){stop();return;}
      playing=true;$('[data-induction-play]').disabled=true;
      status.textContent='Original world tones and writing-reactive beat playing. Quiet speech at 6% of browser speech volume, if available; device loudness varies.';
      if(voice.checked&&!toneOnly)voiceScript();
      else if(voice.checked&&toneOnly)voiceScript(); // World orientation only.
    }catch(error){stop('Induction audio unavailable: '+String(error.message||error));}
  });
  listen($('[data-induction-stop]'),'click',()=>stop());
  listen($('[data-induction-feather]'),'click',()=>wayglassSomaticSound.feather());
  listen(voice,'change',()=>{if(!voice.checked)stopVoice();else if(playing)voiceScript();});
  listen(mono,'change',()=>{status.textContent=mono.checked?'Mono-safe: world tones remain centred.':'Mono-safe off. World tone bed remains centred by default.';});
  listen(input,'input',renderScore);
  listen(manuscriptRoot,'input',renderScore);
  listen(worldSelect,'change',loadWorld);
  const onFeather=event=>{if(event.detail?.stopped===true)stop('Feather held: world induction, voice and beat stopped.');};
  scope.addEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);
  loadWorld();
  return {destroy(){disposed=true;stop();scope.removeEventListener?.(WAYGLASS_FEATHER_EVENT,onFeather);listeners.splice(0).forEach(fn=>fn());},
    getSnapshot(){return {world_id:profile?.world_id,aspect_name:toneOnly?null:aspect?.name||null,
      tone_only:toneOnly,playing,score:writingInductionScore(profile,writerText())};}};
}
