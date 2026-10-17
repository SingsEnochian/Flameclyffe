/**
 * Wayglass Ship Sensory Spine.
 * Same-origin, ephemeral, non-authoritative presentation transport.
 * No agent identity, navigation, canon, durable receipts or audio permission.
 */
export const SHIP_SENSORY_SCHEMA='wayglass.ship.sensory-signal/v0.1';
export const SHIP_SENSORY_SOURCE='wayglass.harmonic-keyboard/v0.1';
export const SHIP_SENSORY_CHANNEL='wayglass.ship.sensory/v0.1';
export const SHIP_SENSORY_KINDS=Object.freeze(['note-on','note-off','feather']);
const MODES=new Set(['chromatic','glyph','galdr']);
const MAX_AGE_MS=5000;
const MAX_FUTURE_MS=2000;
const SLUG=/^[a-z0-9][a-z0-9-]{0,63}$/;
const IDENTIFIER=/^[a-zA-Z0-9-]{16,96}$/;
export function acceptSensorySignal(candidate,{now=Date.now()}={}){
  if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))return null;
  if(candidate.schema!==SHIP_SENSORY_SCHEMA||candidate.source!==SHIP_SENSORY_SOURCE)return null;
  if(!SHIP_SENSORY_KINDS.includes(candidate.kind))return null;
  if(typeof candidate.event_id!=='string'||!IDENTIFIER.test(candidate.event_id))return null;
  if(typeof candidate.source_instance!=='string'||!IDENTIFIER.test(candidate.source_instance))return null;
  if(typeof candidate.world_id!=='string'||!SLUG.test(candidate.world_id))return null;
  if(!Number.isSafeInteger(candidate.sent_at_ms)||!Number.isSafeInteger(now))return null;
  if(candidate.sent_at_ms<now-MAX_AGE_MS||candidate.sent_at_ms>now+MAX_FUTURE_MS)return null;
  if(candidate.authority!=='decorative-local-observation')return null;
  const kind=candidate.kind;
  const frequency=candidate.frequency_hz;
  if(kind!=='feather'&&(!Number.isFinite(frequency)||frequency<20||frequency>8000))return null;
  if(kind==='feather'&&frequency!==null)return null;
  if(kind!=='feather'&&!MODES.has(candidate.mode))return null;
  if(kind==='feather'&&candidate.mode!==null)return null;
  if(!Number.isInteger(candidate.velocity)||candidate.velocity<0||candidate.velocity>127)return null;
  return Object.freeze({
    schema:SHIP_SENSORY_SCHEMA,
    source:SHIP_SENSORY_SOURCE,
    event_id:candidate.event_id,
    source_instance:candidate.source_instance,
    sent_at_ms:candidate.sent_at_ms,
    world_id:candidate.world_id,
    kind,
    frequency_hz:kind==='feather'?null:frequency,
    mode:kind==='feather'?null:candidate.mode,
    velocity:candidate.velocity,
    authority:'decorative-local-observation',
    canonical_receipt:false,
    navigation_command:false,
    identity_attested:false,
  });
}
function randomId(){
  if(typeof globalThis.crypto?.randomUUID==='function')return globalThis.crypto.randomUUID();
  return 'sensory-'+String(Date.now())+'-'+Math.random().toString(36).slice(2,12);
}
export function makeSensorySignal({kind,worldId,mode=null,frequencyHz=null,velocity=0}={},{
  now=Date.now(),sourceInstance=randomId(),eventId=randomId(),
}={}){
  const raw={
    schema:SHIP_SENSORY_SCHEMA,source:SHIP_SENSORY_SOURCE,
    event_id:eventId,source_instance:sourceInstance,sent_at_ms:now,
    world_id:worldId,kind,frequency_hz:kind==='feather'?null:frequencyHz,
    mode:kind==='feather'?null:mode,velocity,
    authority:'decorative-local-observation',
  };
  const valid=acceptSensorySignal(raw,{now});
  if(!valid)throw new TypeError('Invalid local sensory event');
  return valid;
}
export class ShipSensorySpine {
  constructor({channelFactory=null,now=()=>Date.now(),sourceInstance=randomId()}={}){
    this.now=now;
    this.sourceInstance=sourceInstance;
    this.listeners=new Set();
    this.seen=new Set();
    this.closed=false;
    this.channel=null;
    const factory=channelFactory||(
      typeof globalThis.BroadcastChannel==='function'
        ?name=>new globalThis.BroadcastChannel(name)
        :null
    );
    try {
      this.channel=factory?factory(SHIP_SENSORY_CHANNEL):null;
      if(this.channel)this.channel.onmessage=event=>this.receive(event?.data);
    }catch{
      this.channel=null;
    }
  }
  get available(){return Boolean(this.channel)&&!this.closed;}
  subscribe(handler){
    if(typeof handler!=='function')throw new TypeError('Receiver callback required');
    this.listeners.add(handler);
    return ()=>this.listeners.delete(handler);
  }
  receive(raw){
    if(this.closed)return false;
    const signal=acceptSensorySignal(raw,{now:this.now()});
    if(!signal||this.seen.has(signal.event_id))return false;
    this.seen.add(signal.event_id);
    if(this.seen.size>256)this.seen.delete(this.seen.values().next().value);
    for(const listener of this.listeners){
      try{listener(signal);}catch{/* One cosmetic renderer must not interrupt others. */}
    }
    return true;
  }
  publish(input){
    if(!this.available)return false;
    const signal=makeSensorySignal(input,{now:this.now(),sourceInstance:this.sourceInstance});
    try{this.channel.postMessage(signal);return true;}
    catch{return false;}
  }
  close(){
    if(this.closed)return;
    this.closed=true;
    this.listeners.clear();
    this.seen.clear();
    if(this.channel){this.channel.onmessage=null;this.channel.close?.();this.channel=null;}
  }
}
