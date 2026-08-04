'use strict';
(function(){
  const DEEP='starwell-deep-observer', GROUND='starwell-groundwire';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number(v)||0));
  const feed={deep:null,groundwire:null};
  const root=()=>document.querySelector('[data-mobius-lab]');
  const status=t=>{const s=document.querySelector('#mobius-status'); if(s)s.textContent=t;};
  const parse=v=>{try{return v?JSON.parse(v):null}catch(e){return null}};
  function normDeep(packet){
    const p=packet?.packet||packet?.detail||packet; if(!p||typeof p!=='object')return null;
    const d=p.deep||p.DEEP||p.field||p.state||{};
    return {raw:p,glyphId:p.glyphId||p.id||'DEEP-live',source:p.source||'deep-observer',
      P:clamp(d.P??.55),C:clamp(d.C??.50),R:clamp(d.R??.45),E:clamp(d.E??.38),M:clamp(d.M??.30),A:clamp(d.A??.65),H:clamp(d.H??.50),charge:clamp(d.charge??.20),kp:clamp(d.kp??1,0,9),bz:clamp(d.bz??0,-20,20),moonIllum:clamp(d.moonIllum??50,0,100)};
  }
  function normGround(snapshot){
    const s=snapshot?.snapshot||snapshot?.detail||snapshot; if(!s||typeof s!=='object')return null;
    return {raw:s,location:s.location||{status:'unknown'},network:s.network||{status:'unknown'},microphone:s.microphone||{status:'stopped'},battery:s.battery||{status:'unknown'}};
  }
  function setDeep(packet){const d=normDeep(packet); if(!d)return; feed.deep=d; try{sessionStorage.setItem('starwell.deepObserver.v0.1.packet',JSON.stringify(d.raw))}catch(e){} render();}
  function setGround(snapshot){const g=normGround(snapshot); if(!g)return; feed.groundwire=g; render();}
  function summary(){const d=feed.deep,g=feed.groundwire;return{deep:d?{glyphId:d.glyphId,source:d.source,P:d.P,C:d.C,R:d.R,E:d.E,M:d.M,A:d.A,H:d.H,charge:d.charge,kp:d.kp,bz:d.bz,moonIllum:d.moonIllum}:{status:'waiting'},groundwire:g?{location:g.location.status||'unknown',network:g.network.status||'unknown',effectiveType:g.network.effectiveType||null,mic:g.microphone.status||'stopped',micRms:g.microphone.rms||0,battery:g.battery.status||'unknown',batteryLevel:g.battery.levelPercent??null}:{status:'waiting'},boundary:'DEEP model packet plus Groundwire browser/device readings feed a conservative Mobius audio mapping only after you run it.'}}
  function inject(){const r=root(),grid=r?.querySelector('.grid');if(!grid||r.querySelector('[data-deep-groundwire-card]'))return;const card=document.createElement('article');card.className='card';card.dataset.deepGroundwireCard='true';card.innerHTML='<h2>DEEP + Groundwire feed</h2><p>Reads the live DEEP packet and Groundwire snapshot when present, then maps them into a conservative Mobius twist without changing the DEEP values.</p><div class="controls"><button data-action="run" data-mode="deep-groundwire-twist" type="button">Run DEEP + Groundwire twist</button><button data-feed-refresh type="button">Refresh feed view</button></div><pre id="deep-groundwire-feed-state">{}</pre><p class="tiny">Boundary: audio translation only. Location and microphone stay permission-gated in Groundwire.</p>';const live=[...grid.querySelectorAll('.card h2')].find(h=>h.textContent.trim()==='Live state')?.closest('.card'); if(live)grid.insertBefore(card,live);else grid.appendChild(card);card.addEventListener('click',e=>{if(e.target.closest('[data-feed-refresh]')){render();status('DEEP + Groundwire feed view refreshed.')}});render();}
  function render(){const out=document.getElementById('deep-groundwire-feed-state'); if(out)out.textContent=JSON.stringify(summary(),null,2); window.StarwellMobiusIngress={version:'0.1.0',getFeed:()=>({...feed}),summary};}
  function tone(bus,o,held){return held?bus.heldTone(o):bus.tone(o)}
  function split(bus,o,held){return held?bus.heldSplitTone(o):bus.splitTone(o)}
  function mapped(bus,held=false){const d=feed.deep,g=feed.groundwire;if(typeof bus.runLayeredFullTwist==='function')bus.runLayeredFullTwist({held,includeSelectedTwistTones:true});else tone(bus,{frequency:108,route:'centre',gain:held?.012:.016},held);if(!d&&!g){bus.emitState?.('deep-groundwire-twist:no-feed');status('Base twist ran; waiting for DEEP/Groundwire packets.');return true;}const P=d?.P??.55,C=d?.C??.5,R=d?.R??.45,E=d?.E??.38,M=d?.M??.3,A=d?.A??.65,H=d?.H??.5,charge=d?.charge??.2,bz=d?.bz??0,kp=d?.kp??1;const mic=g?.microphone||{},micRms=mic.status==='active'?clamp(mic.rms||0,0,.25):0;const battery=g?.battery?.levelPercent,scale=(typeof battery==='number'&&battery<20?.62:1)*.82;const centre=Math.round(174+P*222+C*111),left=Math.round(369+R*34+kp*1.5),right=Math.round(363.5+A*28+Math.max(0,bz)*.6),ret=Math.round(369+H*18+Math.max(0,-bz)*.8),filter=Math.round(420+E*860+micRms*1800),q=.35+C*.9;tone(bus,{frequency:centre,route:'centre',gain:(.003+A*.003+charge*.0015)*scale,type:'sine'},held);tone(bus,{frequency:left,route:'left',gain:(.0025+R*.003)*scale,type:'sine'},held);tone(bus,{frequency:right,route:'right',gain:(.0025+C*.003)*scale,type:'sine'},held);split(bus,{frequency:ret,primary:'left',secondary:'return',primaryGain:(.002+P*.0025)*scale,secondaryGain:(.002+H*.0025+M*.001)*scale,type:'sine'},held);bus.noise({route:'centre',gain:(.001+E*.002+micRms*.010)*scale,filter,q,loop:held});if(micRms>0)tone(bus,{frequency:440+Math.round(micRms*64),route:'return',gain:(.0012+micRms*.004)*scale,type:'triangle'},held);if(g?.location?.status==='verified')tone(bus,{frequency:415,route:'centre',gain:.0016*scale,type:'sine'},held);bus.emitState?.('deep-groundwire-twist');status('Running DEEP + Groundwire mapped twist. Feather remains the stop key.');return true;}
  function install(M){if(!M||M.prototype.__deepGroundwireV01)return;const p=M.prototype,one=p.runOneShotMode,held=p.runHeldMode;p.runDeepGroundwireTwist=function(o={}){return mapped(this,!!o.held)};p.runOneShotMode=function(mode){if(mode==='deep-groundwire-twist')return this.runDeepGroundwireTwist({held:false});return one.call(this,mode)};p.runHeldMode=function(mode){if(mode==='deep-groundwire-twist')return this.runDeepGroundwireTwist({held:true});return held.call(this,mode)};p.__deepGroundwireV01=true;}
  function listen(){try{const c=new BroadcastChannel(DEEP);c.addEventListener('message',e=>{if(e.data?.type==='deep-observer:packet')setDeep(e.data.packet||e.data)})}catch(e){}try{const c=new BroadcastChannel(GROUND);c.addEventListener('message',e=>{if(e.data?.type==='groundwire:snapshot')setGround(e.data.snapshot||e.data)})}catch(e){}window.addEventListener('starwell:deep-observer:packet',e=>setDeep(e.detail));window.addEventListener('starwell:groundwire:snapshot',e=>setGround(e.detail));setDeep(parse(sessionStorage.getItem('starwell.deepObserver.v0.1.packet')));setGround(parse(sessionStorage.getItem('starwell.groundwire.v0.1.sessionSnapshot')));}
  function boot(){install(window.MobiusAudioBus);listen();inject();setInterval(render,2000)}
  window.MobiusDeepGroundwireAdapter={install,getFeed:()=>({...feed}),summary};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

(function loadElaraCodexBootstrap(){
  const here=document.currentScript?.src;
  if(!here||document.querySelector('script[data-elara-codex-bootstrap-loader]'))return;
  const script=document.createElement('script');
  script.src=new URL('elara-codex-bootstrap.js?v=0.5.0',here).href;
  script.async=false;
  script.dataset.elaraCodexBootstrapLoader='true';
  document.head.appendChild(script);
})();
