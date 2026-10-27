/**
 * N-017 integrated bridge across every real Wayglass and ArcSweep room.
 * Telemetry is browser/application state, never AI interiority or canon.
 */
export const BRIDGE_CONSOLE_SCHEMA='wayglass.bridge-console/v1';
export function mountShipBridgeConsole(root,kernel,activeId,soundDesk=null){
 const surface=root?.querySelector('.wg-surface');
 if(!surface)return()=>{};
 let destroyed=false;
 const bar=document.createElement('section');
 bar.className='wg-bridge-console';
 bar.setAttribute('aria-label','Wayglass bridge status and systems control');
 bar.dataset.bridgeConsole='n017';
 bar.innerHTML=[
  '<div class="wg-bridge-brand" aria-hidden="true"><span class="wg-bridge-glyph">✧</span><span>WAYGLASS <small>BRIDGE · ARC OS</small></span></div>',
  '<div class="wg-bridge-telemetry" aria-live="polite">',
   '<span>DECK <b data-bridge-deck></b></span>',
   '<span>HOST <b data-bridge-host>UNCHECKED</b></span>',
   '<span>COMMS <b data-bridge-route>UNOBSERVED</b></span>',
   '<span>FRAME <b data-bridge-frame>SETTLED</b></span>',
  '</div>',
  '<div class="wg-bridge-actions">',
   '<label>Hull theme <select data-bridge-theme aria-label="Wayglass hull theme">',
     '<option value="bridge">Bridge</option><option value="labradorite">Labradorite</option>',
     '<option value="night">Night</option></select></label>',
   '<button type="button" data-bridge-health>Check systems</button>',
   '<label>Soundscape <select data-bridge-sound aria-label="Local ship soundscape">',
     '<option value="silence">Silent</option><option value="deep-space">Deep Space</option>',
     '<option value="rain">Rain</option><option value="starwell">Starwell</option></select></label>',
   '<button type="button" data-bridge-feather>Feather · Stop</button>',
   '<button type="button" data-bridge-recover>Recover deck</button>',
  '</div>',
  '<p data-bridge-note role="status">Registered systems are not proof of active participants or physical states.</p>'
 ].join('');
 const nav=surface.querySelector('.wg-ship-deck');
 if(nav)nav.after(bar);else surface.prepend(bar);
 const q=selector=>bar.querySelector(selector);
 const status=q('[data-bridge-note]');
 const unsubscribe=kernel.subscribe(s=>{
  if(destroyed)return;
  q('[data-bridge-deck]').textContent=(s.deck||activeId).split(':').at(-1).toUpperCase();
  q('[data-bridge-host]').textContent=s.host.toUpperCase();
  q('[data-bridge-route]').textContent=s.route_status.toUpperCase();
  q('[data-bridge-frame]').textContent=s.frame.toUpperCase();
  q('[data-bridge-theme]').value=s.theme;
  document.documentElement.dataset.wayglassTheme=s.theme;
  bar.dataset.frame=s.frame;bar.dataset.host=s.host;
  if(s.last_error)status.textContent='Ship boundary: '+s.last_error;
 });
 const theme=q('[data-bridge-theme]');
 const setTheme=()=>kernel.theme(theme.value);
 theme.addEventListener('change',setTheme);
 const check=q('[data-bridge-health]');
 const checkNow=async()=>{
  check.disabled=true;status.textContent='Checking Hearthgate and XR support without sending a model turn…';
  try{
   const s=await kernel.health();
   if(destroyed)return;
   status.textContent='Host '+s.host+'. XR AR '+(s.xr_ar?'supported':'not verified')+
    ' · VR '+(s.xr_vr?'supported':'not verified')+
    '. Provider credentials and live Crew replies were not checked.';
  }catch(error){if(!destroyed)status.textContent='Read-only check failed: '+String(error.message).slice(0,140)}
  finally{if(!destroyed)check.disabled=false}
 };
 check.addEventListener('click',checkNow);
 const sound=q('[data-bridge-sound]');
 if(soundDesk)sound.value=soundDesk.snapshot().mode;
 else sound.disabled=true;
 const setSound=()=>{
  if(!soundDesk)return;
  try{
   const info=soundDesk.start(sound.value);
   status.textContent=info.active?'Local mono-safe soundscape playing. No voice or external audio transfer.':'Soundscape stopped.';
  }catch(error){
   sound.value=soundDesk.snapshot().mode;
   status.textContent='Sound unavailable: '+String(error?.message||error).slice(0,130);
  }
 };
 sound.addEventListener('change',setSound);
 const feather=q('[data-bridge-feather]');
 const globalFeather=()=>{
  globalThis.dispatchEvent?.(new CustomEvent('wayglass:feather',{detail:{held:true}}));
  // A global stop does not grant permission to resume another room's audio.
  sound.value='silence';
  status.textContent='Feather held. Ambient sound and global glass motion stopped.';
 };
 feather.addEventListener('click',globalFeather);
 const recover=q('[data-bridge-recover]');
 const recoverNow=async()=>{
  if(recover.disabled)return;
  if(kernel.state.route_status==='started'){
   status.textContent='Recovery refused while a model turn is in progress.';return;
  }
  const editor=surface.querySelector('#wg-input');
  if(editor?.value?.trim()){
   status.textContent='An unsent draft exists. Copy or clear it before remounting the deck.';return;
  }
  recover.disabled=true;
  try{await kernel.navigate(activeId,{recovery:true})}
  catch(error){if(!destroyed)status.textContent='Recovery failed: '+String(error.message).slice(0,140)}
  finally{if(!destroyed)recover.disabled=false}
 };
 recover.addEventListener('click',recoverNow);
 return()=>{
  destroyed=true;unsubscribe();
  theme.removeEventListener('change',setTheme);
  check.removeEventListener('click',checkNow);
  sound.removeEventListener('change',setSound);
  feather.removeEventListener('click',globalFeather);
  recover.removeEventListener('click',recoverNow);
  bar.remove();
 };
}
