// The Triptych Lift is a real ship surface, not an invented model route.
// Native Wyrdrune owns topology and acoustic values. Browser code only renders,
// checks destinations and plays explicitly requested, conservative previews.
import triptychSource from '../../../lib/wyrdrune/triptych-mobius-lift.wtl?raw';
import {createWyrdruneRuntime} from '../../../lib/wyrdrune/runtime.mjs';
import './triptych-lift.css';

export const TRIPTYCH_ALLOWED_ROOMS=Object.freeze([
  'wayglass:living-watercolor',
  'wayglass:journey-before-destination',
  'wayglass:living-observer',
]);
export async function compileTriptychLift({source=triptychSource,cryptoProvider=globalThis.crypto}={}){
  if(!cryptoProvider?.subtle)throw new Error('Secure browser hashing is required for source attribution.');
  const bytes=new TextEncoder().encode(source);
  const digest=Array.from(new Uint8Array(await cryptoProvider.subtle.digest('SHA-256',bytes)),
    byte=>byte.toString(16).padStart(2,'0')).join('');
  const runtime=createWyrdruneRuntime({hashSource:()=>digest});
  const result=await runtime.execute(runtime.compile(source));
  const plan=result.output.find(value=>value?.schema==='wayglass.triptych-lift/v0.1');
  if(!plan||plan.autoplay!==false||plan.reversible!==true||
     !Array.isArray(plan.panels)||plan.panels.length!==3||
     plan.panels.some((panel,index)=>panel.destination!==TRIPTYCH_ALLOWED_ROOMS[index]||
       !Number.isFinite(panel.root_hz)||panel.root_hz<50||panel.root_hz>1000||
       !Number.isFinite(panel.upper_hz)||panel.upper_hz<20||panel.upper_hz>1000||
       !Number.isFinite(panel.gain)||panel.gain<=0||panel.gain>0.12))
    throw new TypeError('Wyrdrune triptych emitted an unsafe or unknown route/score.');
  if(result.withness.completedCycles!==2||result.receipts.length!==16)
    throw new TypeError('Both Eightfold Möbius cycles must complete.');
  return Object.freeze({source_sha256:digest,plan,receipts:result.receipts,origin:'native Wyrdrune'});
}

export function mountWayglassTriptychLift(root,{navigate,scope=globalThis,compile=compileTriptychLift}={}){
  if(typeof navigate!=='function')throw new TypeError('Ship navigation callback required.');
  root.innerHTML=`
    <section class="wg-triptych" aria-labelledby="triptych-title">
      <div class="wg-triptych-intro">
        <span class="wg-hud-kicker">WAYGLASS / THREEFOLD TRANSPORT</span>
        <h1 id="triptych-title">The Möbius Lift</h1>
        <p>Three rooms. One continuous passage. From Rowan's graphite triptych, translated into native Wyrdrune.</p>
        <p class="tiny">An accessible navigation instrument, not a claim of a physical elevator or an external reality crossing.</p>
      </div>
      <div class="wg-triptych-rail" aria-label="Three connected lift chambers" role="group">
        <article class="wg-triptych-panel" data-panel="monolith">
          <div class="wg-triptych-mineral" aria-hidden="true"></div>
          <h2>The Monolith</h2><p>Height, gravity, and the great chamber waking.</p>
          <div class="wg-triptych-actions"><button type="button" data-action="listen" data-index="0">Hear this chamber</button>
          <button type="button" data-action="travel" data-index="0">Enter Watercolour</button></div>
        </article>
        <article class="wg-triptych-panel" data-panel="twist">
          <div class="wg-triptych-mineral" aria-hidden="true"></div>
          <h2>The Twist</h2><p>A curved passage: orientation changes while continuity holds.</p>
          <div class="wg-triptych-actions"><button type="button" data-action="listen" data-index="1">Hear the turn</button>
          <button type="button" data-action="travel" data-index="1">Enter Journey</button></div>
        </article>
        <article class="wg-triptych-panel" data-panel="arrival">
          <div class="wg-triptych-mineral" aria-hidden="true"></div>
          <h2>The Arrival</h2><p>Another frame of reference. Still aboard the same ship.</p>
          <div class="wg-triptych-actions"><button type="button" data-action="listen" data-index="2">Hear the arrival</button>
          <button type="button" data-action="travel" data-index="2">Enter Observer</button></div>
        </article>
      </div>
      <div class="wg-triptych-footer"><button type="button" data-action="stop">Stop sound / Feather</button>
        <p class="tiny" role="status" aria-live="polite" data-triptych-status>Compiling native Wyrdrune passage…</p></div>
    </section>`;
  const status=root.querySelector('[data-triptych-status]');
  let audio=null,voices=[],destroyed=false,ready=null;
  const planPromise=Promise.resolve().then(()=>compile()).then(receipt=>{
    if(destroyed)return null;
    ready=receipt;
    status.textContent='Wyrdrune: two Eightfold cycles verified · source '+receipt.source_sha256.slice(0,12)+' · playback off.';
    return receipt;
  }).catch(error=>{if(!destroyed)status.textContent='Passage unavailable: '+error.message;return null;});
  async function stop(){
    for(const osc of voices){try{osc.stop();}catch{}try{osc.disconnect();}catch{}}
    voices=[];
    if(audio){try{await audio.close();}catch{}audio=null;}
  }
  async function preview(index){
    const receipt=ready||await planPromise;
    if(!receipt||destroyed)return;
    await stop();
    const Context=scope.AudioContext||scope.webkitAudioContext;
    if(!Context){status.textContent='This browser cannot play local oscillator previews.';return;}
    audio=new Context();
    const panel=receipt.plan.panels[index];
    if(!panel||!TRIPTYCH_ALLOWED_ROOMS.includes(panel.destination))return;
    if(audio.state==='suspended')await audio.resume();
    const now=audio.currentTime;
    const master=audio.createGain();
    master.gain.setValueAtTime(0,now);
    master.gain.linearRampToValueAtTime(panel.gain,now+0.24);
    master.gain.setValueAtTime(panel.gain,now+2.8);
    master.gain.linearRampToValueAtTime(0,now+4.1);
    master.connect(audio.destination);
    for(const [frequency,multiplier] of [[panel.root_hz,1],[panel.upper_hz,0.31]]){
      const gain=audio.createGain();gain.gain.value=multiplier;gain.connect(master);
      const osc=audio.createOscillator();osc.type='sine';osc.frequency.value=frequency;
      osc.connect(gain);osc.start(now);osc.stop(now+4.15);voices.push(osc);
    }
    status.textContent=panel.label+' · 4-second user-started Wyrdrune cue; stop available.';
  }
  async function click(event){
    const button=event.target.closest('button[data-action]');
    if(!button||!root.contains(button))return;
    const index=Number(button.dataset.index);
    if(button.dataset.action==='stop'){await stop();status.textContent='Feather: sound stopped.';return;}
    const receipt=ready||await planPromise;
    if(!receipt||destroyed)return;
    if(button.dataset.action==='listen'){try{await preview(index);}catch(error){await stop();status.textContent='Audio unavailable: '+error.message;}return;}
    if(button.dataset.action==='travel'){
      const target=receipt.plan.panels[index]?.destination;
      if(!TRIPTYCH_ALLOWED_ROOMS.includes(target))return;
      await stop();
      status.textContent='Navigating within Wayglass to '+receipt.plan.panels[index].label;
      navigate(target);
    }
  }
  function feather(event){if(event?.detail?.stopped===true){void stop();if(!destroyed)status.textContent='Feather: sound stopped.';}}
  root.addEventListener('click',click);
  scope.addEventListener?.('wayglass:feather',feather);
  return ()=>{destroyed=true;root.removeEventListener('click',click);scope.removeEventListener?.('wayglass:feather',feather);void stop();};
}
