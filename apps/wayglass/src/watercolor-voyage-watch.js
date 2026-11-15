// Read-only voyage activity pulse. No model turn, no private message text,
// no impersonated agent process and no repeated unauthorised host requests.
// Existing House gateway is the sole authority for read access.
import {readVoyageMessages} from './route-client.js';
import {publishWatercolorActivity} from './watercolor-bridge.js';
import {wayglassSomaticSound} from './somatic-sound.js';

export const VOYAGE_WATCH_INTERVAL_MS=30000;
const identity=m=>[m?.voyage_ref||'',m?.participant_id||'',m?.created_at||'',m?.kind||''].join('|').slice(0,320);
export function createWatercolorVoyageWatcher({
  read=readVoyageMessages,publish=publishWatercolorActivity,
  scope=globalThis,intervalMs=VOYAGE_WATCH_INTERVAL_MS,
  feather=()=>wayglassSomaticSound.snapshot().feather_stopped,
}={}){
  if(typeof read!=='function'||typeof publish!=='function')throw new TypeError('Read and event projection functions required');
  let disposed=false,baseline=false,busy=false,failures=0;
  const known=new Set();
  async function poll(){
    if(disposed||busy||scope.document?.hidden||feather()||failures>=3)return false;
    busy=true;
    try{
      const response=await read();
      if(!response||!Array.isArray(response.messages))throw new TypeError('Voyage message array required');
      const incoming=response.messages.slice(-64);
      const next=new Set(incoming.map(identity).filter(Boolean));
      if(baseline){
        // Incoming messages, not historic records; no implied currently running agent.
        const unseen=incoming.filter(m=>!known.has(identity(m))).slice(-4);
        for(const m of unseen){
          if(disposed||feather())break;
          publish({kind:'voyage:arrived',actor:'wayglass:authenticated-voyage-message',
            intensity:.56});
        }
      }
      known.clear();for(const key of next)known.add(key);
      baseline=true;failures=0;return true;
    }catch{
      failures++;
      return false;
    }finally{busy=false;}
  }
  const timer=scope.setInterval?.(()=>{void poll();},Math.max(15000,intervalMs));
  const onVisible=()=>{if(!scope.document?.hidden)void poll();};
  scope.document?.addEventListener?.('visibilitychange',onVisible);
  // Initial check establishes the old-message baseline, not a new-work claim.
  void poll();
  return Object.freeze({
    poll,
    status:()=>Object.freeze({baseline,known:known.size,failures,active:!disposed&&failures<3}),
    stop(){
      disposed=true;
      if(timer!=null)scope.clearInterval?.(timer);
      scope.document?.removeEventListener?.('visibilitychange',onVisible);
    },
  });
}
