import './mythience-instrument.css';
import source from '../../../../lib/wyrdrune/mythience-instrument.wtl?raw';
import {evaluateMythienceExpression} from '../mythience-expression.js';
import {emitMaterialSignal} from '../material-state.js';
import {wayglassSomaticSound} from '../somatic-sound.js';
import {emitSensoriumFrame} from '../sensorium-frame.js';

const LENSES=Object.freeze({
  wonder:{heading:'Wonder · What if?',text:'What if a single gesture could alter the shape of a room, the relationship of two voices and the questions carried into Return? These are possibilities, not observations.'},
  science:{heading:'Science · What can be tested?',text:'Three owner-controlled numbers enter the executable Wyrdrune programme. Its Eightfold trace yields bounded hue, light, pulse, audible frequencies, virtual gravity, refraction and tactile intensity. This is a deterministic local simulation, not a measurement of the world.'},
  mythience:{heading:'Mythience · What does it mean?',text:'The hand chooses an intention. The fold offers a correspondence. Two voices remain distinct as a digital terrain changes its gravity and refraction. The witness gives the encounter meaning without inventing measurements.'},
});
const clamp=n=>Math.max(0,Math.min(1,n));
const fixed=n=>Number(n).toFixed(2);
const phases=['Perceive','Compress','Release','Verify','Integrate','Choose','Return','Transcend'];

export function mountWayglassMythienceInstrument(root,{
  evaluate=evaluateMythienceExpression,
  soundscape=wayglassSomaticSound,
  scope=globalThis,
}={}){
  let disposed=false,stopped=soundscape.snapshot().feather_stopped,sequence=0,last=null,lens='wonder',dragging=false,active=null;
  const doc=root.ownerDocument||scope.document;
  root.innerHTML=`
  <section class="wg-surface wg-mythience" aria-label="Mythience Wyrdrune instrument">
    <nav class="wg-deck-nav glass-panel" aria-label="Related Wayglass rooms">
      <button type="button" class="glass-chip" data-myth-room="wayglass:living-watercolor">Living Watercolor</button>
      <button type="button" class="glass-chip" data-myth-room="wayglass:sound-composition">Soundstage</button>
      <button type="button" class="glass-chip" data-myth-room="wayglass:native-voice">Wyrdrune Voice</button>
      <button type="button" class="glass-chip" data-myth-room="wayglass:quad-gestalt">Eightfold</button>
    </nav>
    <header class="glass-panel myth-head">
      <p class="eyebrow">Wayglass / Wyrdrune / Mythience</p>
      <h1>The Correspondence Engine</h1>
      <p class="lede">Touch the geometry. Shape the light. Give two voices a relationship. Wyrdrune computes the expression; you choose its meaning.</p>
      <p class="tiny">Local owner-controlled instrument. No model invocation, environmental measurement, canon change or external transmission. Sound and vibration are silent until independently enabled and deliberately played. Vibration depends on device support.</p>
    </header>
    <div class="myth-layout">
      <section class="glass-panel myth-field-panel" aria-label="Interactive Wyrdrune field">
        <div class="myth-field" data-myth-stage tabindex="0" role="group" aria-label="Interactive geometry: move horizontally to change the fold, vertically to change intention. Arrow keys also work." aria-describedby="myth-stage-help">
          <svg viewBox="0 0 480 380" role="img" aria-label="Eightfold star, two reciprocal rings and a central Withness point. The geometry responds to Wyrdrune outputs.">
            <defs>
              <radialGradient id="myth-opal"><stop offset="0" stop-color="#b4ffde" stop-opacity=".82"/><stop offset=".5" stop-color="#6c9d9e" stop-opacity=".3"/><stop offset="1" stop-color="#17232a" stop-opacity="0"/></radialGradient>
            </defs>
            <ellipse data-myth-halo cx="240" cy="190" rx="132" ry="132" fill="url(#myth-opal)" opacity=".5"/>
            <g data-myth-geometry stroke="currentColor" fill="none" stroke-linecap="round">
              <circle cx="240" cy="190" r="126" stroke-opacity=".18" stroke-dasharray="3 11"/>
              <ellipse data-myth-orbit-a cx="240" cy="190" rx="110" ry="65" stroke-opacity=".75" stroke-width="2.5"/>
              <ellipse data-myth-orbit-b cx="240" cy="190" rx="110" ry="65" stroke-opacity=".52" stroke-width="2" transform="rotate(90 240 190)"/>
              <path data-myth-star stroke-width="2.5" stroke-opacity=".92"/>
              <path data-myth-terrain stroke-width="1.5" stroke-opacity=".64" stroke-dasharray="6 5"/>
              <circle cx="240" cy="190" r="17" fill="#142c32" stroke="#f4d9a2" stroke-width="2"/>
              <circle cx="240" cy="190" r="4" fill="#f4d9a2" stroke="none"/>
            </g>
            <text x="240" y="357" text-anchor="middle" fill="#d7eae4" font-size="12" letter-spacing="3">WITHNESS / RETURN</text>
          </svg>
          <span class="myth-stage-label" aria-hidden="true">SKÝRUNOR · EIGHTFOLD</span>
        </div>
        <p class="tiny" id="myth-stage-help">Drag, touch or use arrow keys on the field. Left/right adjusts fold; up/down adjusts intention. Every change runs the same Wyrdrune programme. Reduced-motion mode keeps the geometry readable and still.</p>
        <div class="myth-controls">
          <label>Intention <input data-myth-input="intention" type="range" min="0" max="1" step=".01" value=".55"><output data-myth-out="intention">0.55</output></label>
          <label>Möbius fold <input data-myth-input="twist" type="range" min="0" max="1" step=".01" value=".50"><output data-myth-out="twist">0.50</output></label>
          <label>Declared affinity <input data-myth-input="affinity" type="range" min="0" max="1" step=".01" value=".50"><output data-myth-out="affinity">0.50</output></label>
        </div>
        <div class="myth-actions">
          <button type="button" class="glass-chip" data-myth-weave>Weave expression</button>
          <button type="button" class="glass-chip" data-myth-audio>Enable sound</button>
          <button type="button" class="glass-chip" data-myth-haptics aria-pressed="false">Enable vibration</button>
          <button type="button" class="glass-chip" data-myth-play>Experience Wyrdrune</button>
          <button type="button" class="glass-chip" data-myth-mono aria-pressed="true">Mono-safe</button>
          <button type="button" class="glass-chip" data-myth-silence>Silence</button>
          <button type="button" class="glass-chip" data-myth-feather>🪽 Feather Stop</button>
          <button type="button" class="glass-chip" data-myth-release>Release Feather</button>
        </div>
        <p role="status" aria-live="polite" data-myth-status>Ready. Choose a control to execute Wyrdrune.</p>
      </section>
      <aside class="glass-panel myth-console" aria-label="Mythience interpretation console">
        <h2>Three lenses, one expression</h2>
        <div class="myth-lenses" role="group" aria-label="Choose an interpretation lens">
          <button type="button" class="glass-chip" data-myth-lens="wonder" aria-pressed="true">Wonder</button>
          <button type="button" class="glass-chip" data-myth-lens="science" aria-pressed="false">Science</button>
          <button type="button" class="glass-chip" data-myth-lens="mythience" aria-pressed="false">Mythience</button>
        </div>
        <h3 data-myth-lens-title>Wonder · What if?</h3>
        <p data-myth-lens-copy>${LENSES.wonder.text}</p>
        <div class="myth-readings">
          <div><strong>Plain speech</strong><p data-myth-plain>Move the field to begin.</p></div>
          <div><strong>Formal / scientific</strong><p data-myth-formal>Awaiting a Wyrdrune execution trace.</p></div>
          <div><strong>Hearthweave / Mythience</strong><p data-myth-hearth>Meaning remains yours to declare.</p></div>
        </div>
        <h3>Eightfold execution</h3>
        <ol data-myth-trace class="myth-trace"></ol>
        <details class="myth-source"><summary>Inspect native Wyrdrune source</summary>
          <pre data-myth-source></pre></details>
        <p class="tiny">The source is executable WTL. The glyph field is its geometric projection, not a replacement parser. The displayed local hash is not an authenticated receipt.</p>
      </aside>
    </div>
  </section>`;
  const $=key=>root.querySelector('[data-myth-'+key+']');
  const status=$('status'),stage=$('stage'),star=$('star'),halo=$('halo'),orbitA=$('orbit-a'),orbitB=$('orbit-b'),terrain=$('terrain');
  const controls={intention:.55,twist:.5,affinity:.5};
  const inputs=Object.fromEntries(Object.keys(controls).map(key=>[key,root.querySelector('[data-myth-input="'+key+'"]')]));
  const outputs=Object.fromEntries(Object.keys(controls).map(key=>[key,root.querySelector('[data-myth-out="'+key+'"]')]));
  $('source').textContent=source;
  const setStatus=text=>{if(!disposed)status.textContent=text;};
  function starPath(radius){
    const cx=240,cy=190;
    const pts=Array.from({length:8},(_,i)=>{
      const angle=i*Math.PI/4-Math.PI/2;
      return [cx+radius*Math.cos(angle),cy+radius*Math.sin(angle)];
    });
    return pts.map(([x,y])=>'M '+cx+' '+cy+' L '+x.toFixed(2)+' '+y.toFixed(2)).join(' ');
  }
  function paint(frame){
    const twist=(frame.pan+1)/2;
    const radius=72+frame.light*62;
    star.setAttribute('d',starPath(radius));
    halo.setAttribute('opacity',fixed(frame.light));
    halo.setAttribute('rx',String(radius+24));halo.setAttribute('ry',String(radius+24));
    const warp=frame.simulated_refraction,gravity=frame.simulated_gravity;
    const squeeze=1-(gravity-.35)*.13,stretch=1+warp*.20;
    orbitA.setAttribute('transform','translate(240 190) rotate('+fixed(twist*180)+') scale('+fixed(stretch)+' '+fixed(squeeze)+') translate(-240 -190)');
    orbitB.setAttribute('transform','translate(240 190) rotate('+fixed(90+twist*180)+') scale('+fixed(squeeze)+' '+fixed(stretch)+') translate(-240 -190)');
    const lift=frame.terrain_fold*58,well=gravity*24;
    terrain.setAttribute('d','M 36 '+fixed(265-lift)+' Q 120 '+fixed(240+well)+' 190 '+fixed(265-lift/2)+' T 310 '+fixed(255+well)+' T 444 '+fixed(265-lift));
    stage.style.setProperty('--myth-hue',fixed(frame.hue));
    stage.style.setProperty('--myth-light',fixed(frame.light));
    stage.style.setProperty('--myth-pulse',fixed(frame.pulse));
    stage.style.setProperty('--myth-gravity',fixed(frame.simulated_gravity));
    stage.style.setProperty('--myth-refraction',fixed(frame.simulated_refraction));
    stage.style.setProperty('--myth-terrain',fixed(frame.terrain_fold));
    $('plain').textContent='The fold is '+Math.round(twist*100)+'% open. Digital gravity is '+fixed(frame.simulated_gravity)+'×, terrain folds '+Math.round(frame.terrain_fold*100)+'%, and two audible voices are '+fixed(frame.frequency_hz)+' Hz and '+fixed(frame.counterpart_hz)+' Hz.';
    $('formal').textContent='WTL '+frame.trace.length+'/8 phases · light '+fixed(frame.light)+' · hue '+fixed(frame.hue)+'° · pan '+fixed(frame.pan)+' · virtual below '+fixed(frame.virtual_below_hz)+' Hz / above '+Math.round(frame.virtual_above_hz)+' Hz (not emitted) · refraction '+fixed(frame.simulated_refraction)+' · tactile '+fixed(frame.tactile_intensity)+' · local simulation only.';
    $('hearth').textContent='The geometry carries an intention and two distinct voices. The return asks: '+frame.question;
    $('trace').replaceChildren(...frame.trace.map((item,i)=>{
      const li=doc.createElement('li');li.textContent=phases[i]+' · '+item.operations+' operations';return li;
    }));
  }
  async function weave(){
    if(disposed||stopped){setStatus('Feather holds the instrument. Release deliberately before weaving.');return;}
    active?.abort();
    const controller=new AbortController();
    active=controller;
    const ticket=++sequence;
    const input={...controls};
    try{
      const frame=await evaluate({source,controls:input,signal:controller.signal});
      if(disposed||stopped||controller.signal.aborted||ticket!==sequence)return;
      last=frame;paint(frame);
      emitSensoriumFrame(frame,{scope});
      emitMaterialSignal({mode:'inscription',strength:frame.light,intent:input.intention,ownership:input.twist,handoff_progress:input.affinity,channel:'OOC'});
      setStatus('Wyrdrune executed · eight phases · gravity, terrain, light and sound share one expression. Output channels remain your choice.');
    }catch(error){
      if(!disposed&&!stopped&&!controller.signal.aborted&&ticket===sequence){
        last=null;setStatus('Wyrdrune execution failed: '+error.message);
      }
    }finally{if(active===controller)active=null;}
  }
  function update(name,value){
    if(stopped)return;
    const next=Number(value);
    if(!Number.isFinite(next))return;
    controls[name]=clamp(next);inputs[name].value=String(controls[name]);outputs[name].textContent=fixed(controls[name]);
    void weave();
  }
  for(const [name,input] of Object.entries(inputs))input.addEventListener('input',()=>update(name,input.value));
  function position(event){
    const rect=stage.getBoundingClientRect();
    if(rect.width<=0||rect.height<=0)return;
    controls.twist=clamp((event.clientX-rect.left)/rect.width);
    controls.intention=clamp(1-(event.clientY-rect.top)/rect.height);
    for(const name of ['twist','intention']){inputs[name].value=String(controls[name]);outputs[name].textContent=fixed(controls[name]);}
    void weave();
  }
  function down(event){
    if(stopped||event.button!==undefined&&event.button!==0)return;
    dragging=true;stage.setPointerCapture?.(event.pointerId);position(event);
  }
  function move(event){if(dragging&&!stopped)position(event);}
  function up(event){dragging=false;if(stage.hasPointerCapture?.(event.pointerId))stage.releasePointerCapture(event.pointerId);}
  function keydown(event){
    if(stopped)return;
    const offsets={ArrowLeft:['twist',-.04],ArrowRight:['twist',.04],ArrowUp:['intention',.04],ArrowDown:['intention',-.04]};
    if(!offsets[event.key])return;
    event.preventDefault();const [name,delta]=offsets[event.key];update(name,controls[name]+delta);
  }
  stage.addEventListener('pointerdown',down);stage.addEventListener('pointermove',move);
  stage.addEventListener('pointerup',up);stage.addEventListener('pointercancel',up);stage.addEventListener('keydown',keydown);
  function onFeather(event){
    if(event.detail?.stopped===true){stopped=true;sequence++;active?.abort();active=null;dragging=false;last=null;setStatus('Feather Stop. Expression and sound held.');}
    else if(event.detail?.stopped===false&&event.detail.confirmed===true){stopped=false;setStatus('Feather released. Sound remains off; weave deliberately to resume.');}
  }
  scope.addEventListener?.('wayglass:feather',onFeather);
  const onClick=async event=>{
    const button=event.target.closest?.('button');
    if(!button||disposed)return;
    if(button.dataset.mythRoom){void scope.__wayglassOS?.mount(button.dataset.mythRoom);return;}
    if(button.dataset.mythLens){
      lens=button.dataset.mythLens;
      const info=LENSES[lens];$('lens-title').textContent=info.heading;$('lens-copy').textContent=info.text;
      for(const b of root.querySelectorAll('[data-myth-lens]'))b.setAttribute('aria-pressed',String(b.dataset.mythLens===lens));
      return;
    }
    if(button.hasAttribute('data-myth-feather')){soundscape.feather();return;}
    if(button.hasAttribute('data-myth-release')){soundscape.releaseFeather({confirmed:true});return;}
    if(stopped){setStatus('Feather holds the instrument.');return;}
    if(button.hasAttribute('data-myth-weave')){void weave();return;}
    if(button.hasAttribute('data-myth-mono')){
      const mono=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(mono));
      button.textContent=mono?'Mono-safe':'Stereo';soundscape.setMono(mono);return;
    }
    if(button.hasAttribute('data-myth-silence')){soundscape.stop();$('haptics').setAttribute('aria-pressed','false');setStatus('Sound and vibration silenced.');return;}
    if(button.hasAttribute('data-myth-haptics')){
      const next=button.getAttribute('aria-pressed')!=='true';
      const enabled=soundscape.setHaptics(next);
      button.setAttribute('aria-pressed',String(enabled));
      button.textContent=enabled?'Vibration enabled':'Enable vibration';
      setStatus(enabled?'Vibration armed. Press Experience Wyrdrune to feel a brief pulse.':next?'Vibration unavailable on this device. Visual and sound channels still work.':'Vibration off.');
      return;
    }
    if(button.hasAttribute('data-myth-audio')){
      const mono=$('mono').getAttribute('aria-pressed')==='true';
      const vibrationWasEnabled=$('haptics').getAttribute('aria-pressed')==='true';
      const state=await soundscape.enable({audio:true,mono});
      if(vibrationWasEnabled)soundscape.setHaptics(true);
      setStatus(state.audio_enabled?'Audio enabled. Press Experience Wyrdrune to listen.':'Audio unavailable: '+(state.last_error||state.status));return;
    }
    if(button.hasAttribute('data-myth-play')){
      if(!last){setStatus('Weave a Wyrdrune expression first.');return;}
      const heard=soundscape.playExpression(last);
      const felt=soundscape.feelExpression(last);
      setStatus(heard&&felt?'Sound and vibration expressing one Wyrdrune frame.':heard?'Playing two Wyrdrune voices.':felt?'Wyrdrune vibration expressed.':'Enable sound or supported vibration first, or release Feather.');
    }
  };
  root.addEventListener('click',onClick);
  return Object.freeze({
    surface_id:'wayglass:mythience-instrument',
    snapshot:()=>Object.freeze({stopped,controls:{...controls},lens,frame:last}),
    destroy(){
      if(disposed)return;disposed=true;sequence++;active?.abort();active=null;dragging=false;
      root.removeEventListener('click',onClick);
      stage.removeEventListener('pointerdown',down);stage.removeEventListener('pointermove',move);
      stage.removeEventListener('pointerup',up);stage.removeEventListener('pointercancel',up);stage.removeEventListener('keydown',keydown);
      scope.removeEventListener?.('wayglass:feather',onFeather);
    },
  });
}
