import './native-voice.css';
import {inviteWayglassVoice} from '../route-client.js';
import {animateWyrdruneTranslation} from '../wyrdrune-morph.js';
import {createWayglassImage,createWayglassSoundPlayer} from '../wyrdrune-response-media.js';
import {getSharedWayglassObserverInterior} from '../living-observer-self.js';

export function mountWayglassNativeVoice(root,{request=inviteWayglassVoice,
  soundPlayer=createWayglassSoundPlayer()}={}){
  root.innerHTML=[
    '<section class="wg-surface wg-native-voice" aria-label="Wayglass Wyrdrune Voice">',
    '<nav class="wg-deck-nav glass-panel" aria-label="Wayglass rooms">',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:living-observer">Living Observer</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="arcsweep:writing-room">Writing Room</button>',
    '<button type="button" class="glass-chip" data-wayglass-room="wayglass:spectral-field">Resonance Atlas</button><button type="button" class="glass-chip" data-wayglass-room="wayglass:mythience-instrument">Mythience</button>',
    '<button type="button" class="glass-chip active" aria-current="page">Wyrdrune Voice</button></nav>',
    '<header class="glass-panel wg-native-heading">',
    '<p class="eyebrow">Wayglass · The Crow · Wyrdrune Technomancy Language</p>',
    '<h1>Her Native Voice</h1>',
    '<p class="lede">First, Wayglass writes in Wyrdrune. Then her own words unfold into universal, basic British English.</p>',
    '<p class="tiny">Image and sound are her choices through Wyrdrune expression operations. The original source is preserved. Sound never plays automatically.</p>',
    '</header>',
    '<form class="glass-panel wg-native-invitation" data-native-form>',
    '<label for="wg-native-question">What shall Wayglass explore?</label>',
    '<textarea id="wg-native-question" rows="3" maxlength="1800" spellcheck="true" lang="en-GB" data-native-prompt>What if the same sound changed its meaning each time it crossed into a new world?</textarea>',
    '<div class="wg-native-options">',
    '<label><input type="checkbox" data-native-image checked> Invite an image response</label>',
    '<label><input type="checkbox" data-native-sound checked> Invite a sound response</label>',
    '</div>',
    '<div class="wg-native-actions">',
    '<button type="submit" class="send-jewel" data-native-send>Invite Wayglass</button>',
    '<button type="button" class="glass-chip" data-native-stop>🪽 Feather Stop</button>',
    '</div>',
    '<p role="status" aria-live="polite" data-native-status>Ready to invite her through the Crow route.</p>',
    '</form>',
    '<section class="glass-panel wg-native-response" aria-label="Wyrdrune and British English" hidden data-native-response>',
    '<div class="wg-native-stage-head"><h2>Wyrdrune ⋈ British English</h2>',
    '<button type="button" class="glass-chip" data-native-replay>Replay the translation</button>',
    '<button type="button" class="glass-chip" data-native-pin disabled>Show in ship helm</button></div>',
    '<pre class="wg-native-morph" aria-hidden="true" data-native-morph></pre>',
    '<p class="wg-native-reader" lang="en-GB" aria-live="polite" data-native-reader></p>',
    '<details class="wg-native-source"><summary>Read the complete Wyrdrune source</summary>',
    '<pre tabindex="0" data-native-source></pre></details>',
    '<p class="tiny" data-native-receipt></p></section>',
    '<section class="glass-panel wg-native-imagery" aria-label="Optional Wyrdrune images" hidden data-native-images>',
    '<h2>Image · her chosen shapes</h2>',
    '<div class="wg-native-visuals" data-native-visuals></div>',
    '<p class="tiny">Her own Wyrdrune numeric compositions rendered as inspectable vector images.</p></section>',
    '<section class="glass-panel wg-native-audio" aria-label="Optional Wyrdrune sound" hidden data-native-sounds>',
    '<h2>Sound · her chosen notes</h2>',
    '<div class="wg-native-sound-controls" data-native-sound-buttons></div>',
    '<button type="button" class="glass-chip" data-native-silence>Silence</button>',
    '<p class="tiny">Original, quiet, mono synthesis. Click to listen. No autoplay or physical infrasonic/ultrasonic output.</p></section>',
    '</section>',
  ].join('');
  const $=name=>root.querySelector('[data-native-'+name+']');
  const prompt=$('prompt'),form=$('form'),send=$('send'),status=$('status');
  const response=$('response'),morph=$('morph'),reader=$('reader');
  const source=$('source'),receipt=$('receipt'),replay=$('replay'),pin=$('pin');
  const imagePanel=$('images'),visuals=$('visuals'),soundPanel=$('sounds');
  const soundButtons=$('sound-buttons');
  const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
  let disposed=false,controller=null,cancelMorph=()=>{},last=null,pinned=false;
  function inscriptionEvent(detail){
    if(typeof globalThis.CustomEvent==='function')globalThis.dispatchEvent?.(
      new globalThis.CustomEvent('wayglass:wyrdrune-inscription',{detail}));
  }
  function clearPin(){
    if(!pinned)return;
    pinned=false;pin.textContent='Show in ship helm';
    inscriptionEvent({clear:true});
  }
  function stop(){
    pin.disabled=true;
    clearPin();
    controller?.abort();controller=null;
    cancelMorph();cancelMorph=()=>{};
    soundPlayer.stop();
    if(!disposed)status.textContent='Feather · paused. No sound is playing.';
  }
  function reveal(result){
    last=result;response.hidden=false;pin.disabled=false;
    // This is the owner's explicit invitation. Keep the actual WTL work and
    // her own English response in the one private Observer, not a JS paraphrase.
    let held=null;
    try{
      held=getSharedWayglassObserverInterior().holdNativeWyrdruneCreation(result,{owner_invited:true});
    }catch(error){
      status.textContent='Wayglass spoke; private return storage unavailable: '+error.message;
    }
    source.textContent=result.native.source;
    reader.textContent='';cancelMorph();
    cancelMorph=animateWyrdruneTranslation(morph,{
      source:result.native.source,translation:result.translation.text,
      reducedMotion:reduced,onComplete:()=>{
        if(disposed)return;
        reader.textContent=result.translation.text;
        status.textContent='Wayglass returned in Wyrdrune and British English.';
      },
    });
    const proposed=(Array.isArray(result.native.operators)?result.native.operators:[]);
    receipt.textContent='Wayglass / Crow · Wyrdrune '+result.native.sha256.slice(0,12)
      +' · '+result.receipt.model_calls+' model turns'
      +' · '+proposed.length+' native operator proposal(s)'
      +' · '+(held?.status==='held-in-private-interior'?'held in private Observer':'local view')
      +' · no automatic canon promotion';
    visuals.replaceChildren();
    const imgs=Array.isArray(result.expressions?.image)?result.expressions.image:[];
    imagePanel.hidden=imgs.length===0;
    for(const score of imgs)visuals.append(createWayglassImage(score,root.ownerDocument));
    soundButtons.replaceChildren();
    const sounds=Array.isArray(result.expressions?.sound)?result.expressions.sound:[];
    soundPanel.hidden=sounds.length===0;
    for(const [i,score] of sounds.entries()){
      const button=root.ownerDocument.createElement('button');
      button.type='button';button.className='glass-chip';
      const silence=Number(score.lead_silence_ms)||0;
      button.textContent='Play Wyrdrune sound '+(i+1)
        +(silence>0?' after '+(silence/1000).toFixed(2)+'s silence':'');
      button.addEventListener('click',async()=>{
        try{const played=await soundPlayer.play(score);
          if(!disposed)status.textContent='Playing Wayglass sound · '+played.duration_seconds+' seconds.';
        }catch(error){if(!disposed)status.textContent='Sound unavailable: '+error.message;}
      });
      soundButtons.append(button);
    }
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(disposed)return;
    stop();
    const running=new AbortController();
    controller=running;send.disabled=true;
    status.textContent='Inviting Wayglass to compose in native Wyrdrune…';
    try{
      const result=await request({prompt:prompt.value,
        channels:{image:$('image').checked,sound:$('sound').checked},
        signal:running.signal});
      if(disposed||running.signal.aborted)return;
      if(result?.schema!=='wayglass.native-wyrdrune-voice/v0.1'
        ||result.status!=='returned-from-crow'||result.route_id!=='wayglass:crow'
        ||result.native?.language!=='wyrdrune'||result.translation?.language!=='en-GB'
        ||typeof result.native.source!=='string'||typeof result.translation.text!=='string'
        ||!result.receipt?.phase_receipts?.length||result.receipt?.model_calls<2)
        throw new Error('Wayglass did not return both attributed language expressions.');
      reveal(result);
    }catch(error){
      if(error?.name!=='AbortError'&&!disposed)
        status.textContent='Wayglass could not complete this crossing: '+error.message;
    }finally{if(!disposed){send.disabled=false;if(controller===running)controller=null;}}
  });
  pin.addEventListener('click',()=>{
    if(disposed||!last)return;
    if(pinned){clearPin();return;}
    // Only an explicit owner action projects a private native response into the helm.
    inscriptionEvent({wyrdrune:last.native.source,english:last.translation.text,owner_presentation_consent:true});
    pinned=true;pin.textContent='Hide from ship helm';
    if(typeof globalThis.CustomEvent==='function')globalThis.dispatchEvent?.(
      new globalThis.CustomEvent('wayglass:faeberpunk-cue',{detail:{kind:'inscription'}}));
  });
  replay.addEventListener('click',()=>{
    if(!last)return;reader.textContent='';cancelMorph();
    cancelMorph=animateWyrdruneTranslation(morph,{
      source:last.native.source,translation:last.translation.text,
      reducedMotion:reduced,
      onComplete:()=>{if(!disposed)reader.textContent=last.translation.text;},
    });
  });
  $('stop').addEventListener('click',stop);
  $('silence').addEventListener('click',()=>{
    soundPlayer.stop();status.textContent='Sound is quiet.';
  });
  root.querySelectorAll('[data-wayglass-room]').forEach(button=>{
    button.addEventListener('click',()=>globalThis.__wayglassOS?.mount(button.dataset.wayglassRoom));
  });
  const feather=()=>stop();
  globalThis.addEventListener?.('wayglass:feather',feather);
  return Object.freeze({surface_id:'wayglass:native-voice',
    destroy(){disposed=true;stop();soundPlayer.dispose();
      globalThis.removeEventListener?.('wayglass:feather',feather);}});
}
