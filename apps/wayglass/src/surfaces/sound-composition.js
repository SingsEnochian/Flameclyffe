import './sound-composition.css';

const clamp = value => Math.max(-1, Math.min(1, Number(value)));
const fixed = value => Number(value).toFixed(2);

export function soundstagePosition(event, rect) {
  if (![event.clientX,event.clientY,rect?.left,rect?.top,rect?.width,rect?.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) throw new Error('Soundstage geometry unavailable');
  return { x:clamp(((event.clientX-rect.left)/rect.width-.5)/.42), y:clamp(((event.clientY-rect.top)/rect.height-.5)/.42) };
}
export function moveSoundObject(position,key,{fine=false}={}) {
  const offsets={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if (!offsets[key]) return null;
  const step=fine?.02:.1;
  return {x:clamp(position.x+offsets[key][0]*step),y:clamp(position.y+offsets[key][1]*step)};
}

// The shared composition outlives this room. Unmount removes UI subscriptions,
// leaving the explicitly started score and playback under their own controls.
export function mountWayglassSoundComposition(root,{composition,soundscape=null,storage,storyBinding=null}={}) {
  if (!root || !composition || typeof composition.snapshot !== 'function' || typeof composition.subscribe !== 'function') throw new Error('Shared sound composition engine unavailable');
  if(storyBinding&&[storyBinding.setContext,storyBinding.getContext].some(method=>typeof method!=='function'))throw new Error('Story declaration bridge unavailable');
  const document=root.ownerDocument||globalThis.document;
  let returnStorage=storage;
  if(returnStorage===undefined){try{returnStorage=globalThis.localStorage;}catch{returnStorage=null;}}
  const returnKey='wayglass.sound-composition.return/'+composition.snapshot().region+'/v1';
  let disposed=false,selected=null,dragging=null,last=null;
  const nodes=new Map();
  root.innerHTML=`<section class="wg-surface wg-composer" data-surface="sound-composition">
  <header class="glass-panel"><p class="eyebrow">Wayglass · Living composition</p><h1>The Spatial Soundstage</h1>
  <p>Place each sound in the landscape. Let the score evolve, then choose when to hear it.</p>
  <p class="wg-composer-note">One vessel. Many listening landscapes. Source and region stay with each sound.</p></header>
  <div class="wg-composer-layout"><section class="glass-panel wg-composer-panel">
  <h2>Sound objects around you</h2><div class="wg-composer-stage" data-soundstage role="group" aria-label="Spatial soundstage" aria-describedby="wg-composer-help">
  <div class="wg-composer-orbits" aria-hidden="true"></div><span class="wg-composer-centre" aria-hidden="true">✧</span></div>
  <p id="wg-composer-help" class="wg-composer-note">Drag a sound with mouse or touch. Focus a sound and use arrow keys to move it; Shift makes a fine adjustment. Top is front; coordinates run from −1 to 1; left and right set the stereo field. Mono keeps every object's position available.</p>
  <p class="wg-composer-readout" data-composition-status role="status" aria-live="polite"></p>
  <p class="wg-composer-readout" data-composition-error role="alert"></p>
  <div class="wg-composer-actions"><button type="button" class="glass-chip" data-score-start>Start evolving score</button><button type="button" class="glass-chip" data-score-pause>Pause score</button></div>
  <div class="wg-composer-actions"><button type="button" class="glass-chip" data-audio-enable>Enable sound</button><button type="button" class="glass-chip" data-audio-disable>Silence sound</button><button type="button" class="glass-chip" data-composition-feather>🪽 Feather · Stop</button><button type="button" class="glass-chip" data-composition-release>Release Feather</button></div>
  <p class="wg-composer-note">Generation and playback have separate switches. Leaving this room keeps an explicitly started composition running; Feather stops it across both bridge sides. Fresh landscapes evolve quietly under your standing choice. Playback needs its own gesture; saved recovery remains paused and silent.</p>
  </section><aside class="glass-panel wg-composer-panel wg-composer-options">
  <fieldset><legend>Whole landscape</legend><label>Density <input type="range" data-density min="0" max="1" step="0.05"></label>
  <label>Evolution interval (seconds) <input type="range" data-rate min="1" max="30" step="1"></label><output data-mix-readout></output>
  <label><span><input type="checkbox" data-composition-mono> Mono projection</span></label></fieldset>
  <fieldset data-story-declarations><legend>Source-declared voices</legend>
  <label>First independent voice <input type="text" data-story-voice-one maxlength="160" autocomplete="off"></label>
  <label>Second independent voice <input type="text" data-story-voice-two maxlength="160" autocomplete="off"></label>
  <label>Declared affinity (0–1) <input type="number" data-story-affinity min="0" max="1" step="0.01"></label>
  <button type="button" class="glass-chip" data-story-apply>Apply declarations</button>
  <p data-story-declaration-status class="wg-composer-note" role="status" aria-live="polite">Pending · declare two independent voices and affinity.</p>
  </fieldset>
  <fieldset><legend>Selected sound</legend><label>Sound object <select data-layer-select aria-label="Select sound object"></select></label>
  <p data-layer-source class="wg-composer-note"></p><label>Layer gain <input type="range" data-layer-gain min="0" max="1" step="0.01"></label>
  <label><span><input type="checkbox" data-layer-muted> Mute this layer</span></label><output data-layer-position></output></fieldset>
  <fieldset><legend>Crossing and return</legend><p data-composition-bridge class="wg-composer-note"></p>
  <button type="button" class="glass-chip" data-bridge-propose>Propose score to other bridge side</button>
  <div class="wg-composer-actions"><button type="button" class="glass-chip" data-composition-save>Save return</button><button type="button" class="glass-chip" data-composition-recover>Recover muted</button></div>
  <p data-return-status class="wg-composer-note" role="status"></p></fieldset>
  </aside></div><section class="glass-panel wg-composer-panel"><h2>Source ledger</h2><p class="wg-composer-note">Follow each sound to its source and listening region.</p><ul class="wg-composer-layers" data-source-ledger></ul>
  <p class="wg-composer-note">Inspired by <a href="https://odio.app/blog/introducing-composer--create-your-own-spatial-soundscapes" target="_blank" rel="noreferrer">Odio Composer</a>.</p></section></section>`;
  const $=selector=>root.querySelector(selector);
  const stage=$('[data-soundstage]'),select=$('[data-layer-select]'),ledger=$('[data-source-ledger]');
  function error(message){if(!disposed)$('[data-composition-error]').textContent=String(message||'');}
  const declarations=$('[data-story-declarations]');
  declarations.hidden=!storyBinding;
  $('[data-story-declaration-status]').textContent='Pending · declare two independent voices and affinity.';
  if(storyBinding){
    try{
      const context=storyBinding.getContext()||{};
      for(const [index,selector] of ['[data-story-voice-one]','[data-story-voice-two]'].entries()){
        const voice=context.voices?.[index];
        if(typeof voice?.voice_id==='string'&&typeof voice.source_ref==='string'&&voice.source_ref)$(selector).value=voice.voice_id;
      }
      if(typeof context.affinity?.value==='number'&&Number.isFinite(context.affinity.value)&&context.affinity.value>=0&&context.affinity.value<=1&&context.affinity.source_ref)$('[data-story-affinity]').value=String(context.affinity.value);
      if($('[data-story-voice-one]').value&&$('[data-story-voice-two]').value&&$('[data-story-voice-one]').value!==$('[data-story-voice-two]').value&&$('[data-story-affinity]').value!=='')$('[data-story-declaration-status]').textContent='Source declarations loaded';
    }catch(failure){$('[data-story-declaration-status]').textContent='Pending · '+String(failure?.message||failure);}
  }
  function applyDeclarations(){
    if(!storyBinding)throw new Error('Story declaration bridge unavailable');
    const names=[$('[data-story-voice-one]').value.trim(),$('[data-story-voice-two]').value.trim()];
    const rawAffinity=$('[data-story-affinity]').value.trim();
    const value=Number(rawAffinity);
    if(names.some(name=>!name||name.length>160||/[\u0000-\u001f]/.test(name))||names[0]===names[1]){
      $('[data-story-declaration-status]').textContent='Pending · declare two different independent voices.';
      throw new Error('Two different source-declared voices are required');
    }
    if(!rawAffinity||!Number.isFinite(value)||value<0||value>1){
      $('[data-story-declaration-status]').textContent='Pending · declare affinity from 0 to 1.';
      throw new Error('A declared affinity from 0 to 1 is required');
    }
    const current=storyBinding.getContext()||{};
    const declarationRef='owner-declaration:composer-controls';
    const voices=names.map(voice_id=>({voice_id,source_ref:current.voices?.find(voice=>voice.voice_id===voice_id&&typeof voice.source_ref==='string'&&voice.source_ref)?.source_ref||declarationRef}));
    const affinity={value,source_ref:current.affinity?.value===value&&typeof current.affinity?.source_ref==='string'&&current.affinity.source_ref?current.affinity.source_ref:declarationRef};
    return Promise.resolve(storyBinding.setContext({voices,affinity})).then(()=>{
      if(!disposed)$('[data-story-declaration-status]').textContent='Declarations applied · WTL score updating';
    });
  }
  function update(snapshot=composition.snapshot()) {
    if(disposed)return;
    last=snapshot;
    const layers=Array.isArray(snapshot.layers)?snapshot.layers:[];
    if(!layers.some(layer=>layer.id===selected))selected=layers[0]?.id||null;
    const ids=new Set(layers.map(layer=>layer.id));
    for(const [id,entry] of nodes)if(!ids.has(id)){entry.point.remove();entry.option.remove();entry.row.remove();nodes.delete(id);}
    for(const layer of layers){
      let entry=nodes.get(layer.id);
      if(!entry){
        const point=document.createElement('button');point.type='button';point.className='wg-composer-object';point.dataset.soundLayer=layer.id;
        point.setAttribute('aria-describedby','wg-composer-help');
        const option=document.createElement('option');option.value=layer.id;
        const row=document.createElement('li');stage.append(point);select.append(option);ledger.append(row);
        entry={point,option,row};nodes.set(layer.id,entry);
      }
      const p=layer.position;
      entry.point.style.left=(50+clamp(p.x)*42)+'%';entry.point.style.top=(50+clamp(p.y)*42)+'%';
      entry.point.textContent=layer.label||layer.id;entry.option.textContent=layer.label||layer.id;
      entry.point.setAttribute('aria-pressed',String(layer.id===selected));entry.point.dataset.muted=String(layer.muted===true);
      entry.point.setAttribute('aria-label',(layer.label||layer.id)+' · '+(layer.region||'unlabelled region')+' · x '+fixed(p.x)+', y '+fixed(p.y)+(layer.muted?' · muted':''));
      entry.row.textContent=(layer.label||layer.id)+' · '+(layer.region||'unlabelled region')+' · '+(layer.source_ref||'source unavailable')+' · '+(layer.available===true?'configured locally':'unavailable')+(layer.active===false?' · outside current density':'');
    }
    select.value=selected||'';
    const layer=layers.find(item=>item.id===selected);
    $('[data-layer-source]').textContent=layer?(layer.region+' · '+layer.source_ref):'No sound object selected';
    $('[data-layer-gain]').disabled=!layer;$('[data-layer-muted]').disabled=!layer;
    if(layer){$('[data-layer-gain]').value=layer.gain;$('[data-layer-muted]').checked=layer.muted;$('[data-layer-position]').textContent='Position · x '+fixed(layer.position.x)+' · y '+fixed(layer.position.y);}
    $('[data-density]').value=snapshot.density;$('[data-rate]').value=snapshot.rate;$('[data-composition-mono]').checked=snapshot.mono===true;
    $('[data-mix-readout]').textContent='Density '+fixed(snapshot.density)+' · interval '+fixed(snapshot.rate)+' s';
    $('[data-composition-status]').textContent=(snapshot.feather_stopped?'Feather held':snapshot.generating?'Score evolving':'Score paused')+' · '+(snapshot.audio_enabled?'Sound enabled':'Sound off')+' · generation '+snapshot.sequence+' · '+snapshot.region+(snapshot.score_status?' · '+snapshot.score_status:'');
    $('[data-score-start]').disabled=snapshot.feather_stopped===true;
    $('[data-audio-enable]').disabled=snapshot.feather_stopped===true||Boolean(snapshot.score_status&&snapshot.score_status!=='source-score-ready');
    $('[data-composition-release]').disabled=snapshot.feather_stopped!==true;
    const bridge=snapshot.bridge||{status:'unavailable'};
    $('[data-composition-bridge]').textContent='Bridge · '+bridge.status+' · '+snapshot.source_ref;
    $('[data-bridge-propose]').disabled=typeof composition.proposeBridge!=='function'||snapshot.feather_stopped===true;
    error(snapshot.last_error||'');
  }
  function run(action){
    if(disposed)return;
    error('');
    try{
      Promise.resolve(action()).then(()=>{if(!disposed)update();},failure=>{if(!disposed){update();error(failure?.message||failure);}});
    }catch(failure){error(failure?.message||failure);}
  }
  function selectedLayer(){return last.layers.find(layer=>layer.id===selected);}
  function click(event){
    const node=event.target;
    const point=node.closest?.('[data-sound-layer]');
    if(point&&root.contains(point)){selected=point.dataset.soundLayer;update();return;}
    if(node.closest?.('[data-story-apply]'))run(()=>Promise.resolve().then(applyDeclarations).catch(failure=>{$('[data-story-declaration-status]').textContent='Pending · declaration could not apply · '+String(failure?.message||failure);throw failure;}));
    else if(node.closest?.('[data-score-start]'))run(()=>composition.startGeneration({confirmed:true}));
    else if(node.closest?.('[data-score-pause]'))run(()=>composition.pauseGeneration());
    else if(node.closest?.('[data-audio-enable]'))run(()=>composition.enableAudio({confirmed:true}));
    else if(node.closest?.('[data-audio-disable]'))run(()=>composition.disableAudio());
    else if(node.closest?.('[data-composition-feather]'))run(()=>soundscape?.feather?soundscape.feather():composition.feather());
    else if(node.closest?.('[data-composition-release]'))run(()=>soundscape?.releaseFeather?soundscape.releaseFeather({confirmed:true}):composition.releaseFeather({confirmed:true}));
    else if(node.closest?.('[data-bridge-propose]'))run(()=>{
      if(typeof composition.proposeBridge!=='function')throw new Error('A source-authorised bridge adapter is unavailable');
      if(composition.proposeBridge()!==true)throw new Error('Bridge adapter unavailable; local score preserved');
    });
    else if(node.closest?.('[data-composition-save]'))run(()=>{
      if(!returnStorage?.setItem)throw new Error('Private local return storage unavailable');
      returnStorage.setItem(returnKey,JSON.stringify(composition.checkpoint()));
      $('[data-return-status]').textContent='Composition saved in this browser';
    });
    else if(node.closest?.('[data-composition-recover]'))run(()=>{
      const raw=returnStorage?.getItem?.(returnKey);if(!raw)throw new Error('No saved composition in this browser');
      composition.restore(JSON.parse(raw));$('[data-return-status]').textContent='Composition recovered · score paused · sound off';
    });
  }
  function input(event){
    const node=event.target;
    if(node===select){selected=select.value;update();return;}
    if(node===$('[data-density]')&&Number(node.value)!==last.density)run(()=>composition.setMix({density:Number(node.value)}));
    else if(node===$('[data-rate]')&&Number(node.value)!==last.rate)run(()=>composition.setMix({rate:Number(node.value)}));
    else if(node===$('[data-composition-mono]')&&node.checked!==last.mono)run(()=>composition.setMix({mono:node.checked}));
    else if(node===$('[data-layer-gain]')&&selected&&Number(node.value)!==selectedLayer()?.gain)run(()=>composition.setLayer(selected,{gain:Number(node.value)}));
    else if(node===$('[data-layer-muted]')&&selected&&node.checked!==selectedLayer()?.muted)run(()=>composition.setLayer(selected,{muted:node.checked}));
  }
  function pointerdown(event){
    const point=event.target.closest?.('[data-sound-layer]');if(!point||!root.contains(point))return;
    selected=point.dataset.soundLayer;dragging={id:selected,pointerId:event.pointerId};point.setPointerCapture?.(event.pointerId);update();event.preventDefault();
  }
  function pointermove(event){
    if(!dragging||dragging.pointerId!==event.pointerId)return;
    const id=dragging.id;run(()=>composition.setLayer(id,{position:soundstagePosition(event,stage.getBoundingClientRect())}));
  }
  function pointerend(event){if(dragging?.pointerId===event.pointerId)dragging=null;}
  function keydown(event){
    const point=event.target.closest?.('[data-sound-layer]');if(!point||!root.contains(point))return;
    selected=point.dataset.soundLayer;const layer=selectedLayer();if(!layer)return;
    const position=moveSoundObject(layer.position,event.key,{fine:event.shiftKey});if(!position)return;
    event.preventDefault();run(()=>composition.setLayer(selected,{position}));
  }
  const handlers={click,input,change:input,pointerdown,pointermove,pointerup:pointerend,pointercancel:pointerend,lostpointercapture:pointerend,keydown};
  for(const [name,handler] of Object.entries(handlers))root.addEventListener(name,handler);
  const unsubscribe=composition.subscribe(update);update();
  return Object.freeze({destroy(){if(disposed)return;disposed=true;dragging=null;unsubscribe?.();for(const [name,handler] of Object.entries(handlers))root.removeEventListener(name,handler);}});
}
