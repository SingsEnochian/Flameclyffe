import { invokeWayglassRoute } from './route-client.js';
import { publishWatercolorActivity } from './watercolor-bridge.js';

export const WATERCOLOR_MODES=Object.freeze([
  {id:'dream', label:'Dream', color:'#a8a6df', intent:'Explore possible imagery, unrealized connections, and questions without claiming firsthand dreams.'},
  {id:'plan', label:'Plan', color:'#6fbcc5', intent:'Propose a grounded plan with dependencies, owners, tests, and the next verifiable step.'},
  {id:'stage', label:'Stage', color:'#c1a4d4', intent:'Arrange an explicit rehearsal or staged crossing without claiming it ran in production.'},
  {id:'suggest', label:'Suggest', color:'#f0b47f', intent:'Offer alternatives, questions and gentle changes while leaving choices open.'},
  {id:'play', label:'Play', color:'#d9a0b1', intent:'Explore collaborative play with clear authorship and consent boundaries.'},
  {id:'work', label:'Work', color:'#7dc9a6', intent:'Identify actual available tools, evidence and executable engineering work, never inventing execution.'},
  {id:'narrate', label:'Narrate', color:'#d7c99c', intent:'Describe observed changes with source and imagination clearly distinguished.'},
  {id:'grow', label:'Grow', color:'#a3cb88', intent:'Reflect on new evidence, revisions, gaps and what learning remains unverified.'},
].map(item=>Object.freeze(item)));
export const MODE_SCHEMA='wayglass.watercolor-modes/v1';

export function resolveWatercolorMode(mode){
  const selected=WATERCOLOR_MODES.find(item=>item.id===mode);
  if(!selected)throw new TypeError('Unknown Wayglass watercolor mode');
  return selected;
}

export function composeWatercolorPrompt({mode,authorText='',activity=[]}={}){
  const selected=resolveWatercolorMode(mode);
  const trimmed=String(authorText||'').trim().slice(0,3500);
  const observed=Array.isArray(activity)?activity.slice(-8).map(item=>({
    kind:String(item?.kind||'').slice(0,40),
    evidence:item?.evidence?.receipt_ref||null,
    evidence_state:item?.evidence_state||'unknown',
  })):[];
  const instructions=[
    'Wayglass Living Watercolor collaboration, requested mode: '+selected.label+'.',
    selected.intent,
    'Return your own attributed contribution as a model route response; do not imitate Rowan.',
    'Treat the visual field and rhythmic gestures as a semi-somatic interface, not a verified physiological measurement.',
    'PREMAQC P,C,R,E,M,A,Q is canonical. Q is firsthand context only; never derive subjective experience from pigment or telemetry.',
    'Preserve distinct participant identities, open choices, provenance, and Feather Stop.',
    'Do not claim a model response changes weights, commits canon, executes a tool, or stores durable memory.',
    'Recent locally observed activity references (not independently verified): '+JSON.stringify(observed),
    'Rowan contribution: '+(trimmed||'No additional text. Offer a relevant beginning, open question or next step.'),
  ];
  return Object.freeze({schema:MODE_SCHEMA,mode:selected.id,mode_label:selected.label,input:instructions.join('\n\n'),author_text:trimmed});
}

export async function inviteWatercolorMode({
  mode,authorText='',activity=[],routeId='openai:gpt',
  sessionId,fetchImpl=fetch,invoke=invokeWayglassRoute,
}={}){
  const prompt=composeWatercolorPrompt({mode,authorText,activity});
  if(typeof routeId!=='string'||!routeId.trim())throw new TypeError('A registered model route is required');
  publishWatercolorActivity({kind:'route:pending',actor:'wayglass:route-attempt'});
  try{
    const result=await invoke({
      routeId,input:prompt.input,
      sessionId,history:[],
      surfaceId:'wayglass:living-watercolor',
      interaction:{channel:'OOC',turn_owner:'Rowan',character_ownership:[]},
      fetchImpl,
    });
    if(typeof result?.output!=='string'||!result.output.trim())
      throw new Error('Model route did not return an attributable text response');
    const observation=result.receipt||null;
    const model=String(result.model||'model-unreported');
    const provider=String(result.provider||'provider-unreported');
    const response=Object.freeze({
      schema:'wayglass.watercolor-model-turn/v1',
      mode:prompt.mode,text:result.output.slice(0,12000),route_id:routeId,
      provider,model,receipt:observation,
      epistemic_register:'model-generated-collaboration',
      state:'returned-not-committed',
      experience_claimed:false,
      trained_weights_changed:false,
    });
    publishWatercolorActivity({kind:'route:responded',actor:'wayglass:delegated-route',receipt:observation});
    return response;
  }catch(error){
    publishWatercolorActivity({kind:'route:failed',actor:'wayglass:route-attempt'});
    throw error;
  }
}


// Only a constrained declarative palette can be proposed by a model.
// No executable JavaScript, canvas commands, runtime authority or memory writes.
export function extractWatercolorProgramProposal(text) {
  if(typeof text!=='string')return null;
  const match=text.match(/```wayglass-watercolor\s*([\s\S]{1,2500}?)```/i);
  if(!match)return null;
  try {
    const proposed=JSON.parse(match[1]);
    if(!proposed||typeof proposed!=='object'||Array.isArray(proposed))return null;
    const allowed=new Set(['colors','flow','granulation','bloom']);
    if(Object.keys(proposed).some(key=>!allowed.has(key)))return null;
    if(proposed.colors!=null){
      if(!proposed.colors||typeof proposed.colors!=='object'||Array.isArray(proposed.colors))return null;
      const kinds=new Set([
        'agent:active','route:pending','route:responded','route:failed',
        'waygate:return','learning:verified','touch:suggestion',
      ]);
      if(Object.entries(proposed.colors).some(([key,color])=>!kinds.has(key)
        ||typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color)))return null;
    }
    if(['flow','granulation','bloom'].some(key=>proposed[key]!=null &&
      (typeof proposed[key]!=='number'||!Number.isFinite(proposed[key])
       ||proposed[key]<0||proposed[key]>1)))return null;
    return Object.freeze({
      schema:'wayglass.watercolor-program-proposal/v1',
      rules:structuredClone(proposed),
      status:'unapplied-awaiting-approval',
      authority:'visualization-only',
    });
  }catch{
    return null;
  }
}
