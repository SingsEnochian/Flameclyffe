// Ambient WATERCOLOUR movement is a visual engine, not fake agent activity.
// Operational pigments arrive ONLY through sourced watercolor-bridge events.
export const WATERCOLOR_AMBIENT_SCHEMA='wayglass.watercolor-ambient/v1';
export const AMBIENT_INTERVAL_MS=1650;
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
export function ambientWatercolorStroke(tick=0){
  const cycle=Math.max(0,Math.trunc(Number(tick)||0));
  const theta=cycle*.29;
  return Object.freeze({
    kind:'ambient-only',evidence:null,actor:null,
    x:clamp(.5+.28*Math.cos(theta)),
    y:clamp(.5+.23*Math.sin(theta*1.37)),
    color:cycle%2===0?'#7ab5a6':'#9b97bd',
    amount:.17,radius:.16,
    dx:.07*Math.sin(theta+.4),dy:.08*Math.cos(theta*.79),
    claimed_agent_activity:false,
  });
}
export function watercolorLiveness(snapshot,now=Date.now()){
  const events=Array.isArray(snapshot?.events)?snapshot.events:[];
  const recent=events.at(-1);
  if(!recent)return Object.freeze({
    state:'ambient',label:'Ambient current · listening for real work',
    detail:'No observed agent or route activity yet. The pigment is moving locally.',
    count:0,evidence:'none',
  });
  const timestamp=Date.parse(recent.observed_at);
  const age=Number.isFinite(timestamp)?Math.max(0,now-timestamp):Infinity;
  const active=age<60000;
  const name=String(recent.kind).replaceAll(':',' · ');
  const source=recent.evidence?.receipt_ref||recent.actor||'local event';
  return Object.freeze({
    state:active?'observed':'quiet',
    label:active?'Observed · '+name:'Listening · last '+name,
    detail:(active?'Recent source: ':'Last source: ')+String(source).slice(0,80),
    count:events.length,
    evidence:recent.evidence?'receipt-referenced':'event-only',
  });
}
