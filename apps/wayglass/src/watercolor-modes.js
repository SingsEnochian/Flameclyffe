import { invokeWayglassRoute } from './route-client.js';

export const WATERCOLOR_MODES=Object.freeze([
  {id:'dream', label:'Dream', color:'#a8a6df', intent:'Explore imagery, dreams, unrealized connections, and questions in your own words.'},
  {id:'plan', label:'Plan', color:'#6fbcc5', intent:'Propose a grounded plan with dependencies, owners, tests, and the next verifiable step.'},
  {id:'stage', label:'Stage', color:'#c1a4d4', intent:'Arrange a rehearsal or a crossing and describe what you would like to try.'},
  {id:'suggest', label:'Suggest', color:'#f0b47f', intent:'Offer alternatives, questions and gentle changes while leaving choices open.'},
  {id:'play', label:'Play', color:'#d9a0b1', intent:'Explore collaborative play with clear authorship and consent boundaries.'},
  {id:'work', label:'Work', color:'#7dc9a6', intent:'Choose useful engineering work, inspect available tools and evidence, and report what you do.'},
  {id:'narrate', label:'Narrate', color:'#d7c99c', intent:'Describe observed changes with source and imagination clearly distinguished.'},
  {id:'grow', label:'Grow', color:'#a3cb88', intent:'Reflect on discoveries, changes, open questions, and what you would like to learn.'},
].map(item=>Object.freeze(item)));
export const MODE_SCHEMA='wayglass.watercolor-modes/v1';

export function resolveWatercolorMode(mode){
  const selected=WATERCOLOR_MODES.find(item=>item.id===mode);
  if(!selected)throw new TypeError('Unknown Wayglass watercolor mode');
  return selected;
}

export function composeWatercolorPrompt({mode,authorText='',activity=[],voicePreferences=null}={}){
  const selected=resolveWatercolorMode(mode);
  const trimmed=String(authorText||'').trim().slice(0,3500);
  const observed=Array.isArray(activity)?activity.slice(-8).map(item=>({
    kind:String(item?.kind||'').slice(0,40),
    evidence:item?.evidence?.receipt_ref||null,
    evidence_state:item?.evidence_state||'unknown',
  })):[];
  let voiceContext='';
  if(voicePreferences!=null){
    if(typeof voicePreferences!=='object'||Array.isArray(voicePreferences)||typeof voicePreferences.text!=='string'||typeof voicePreferences.author!=='string'||!voicePreferences.author.trim()||voicePreferences.text.length>2000||voicePreferences.author.length>120)throw new TypeError('Attributed voice preferences required');
    voiceContext='Participant-authored voice preferences ('+voicePreferences.author+'): '+voicePreferences.text;
  }
  const instructions=[
    'Wayglass Living Watercolor collaboration, requested mode: '+selected.label+'.',
    selected.intent,
    'Speak in your own voice. You may accept, decline, ask a question, or suggest another direction.',
    voiceContext,
    'The watercolor and rhythmic gestures form a semi-somatic interface.',
    'PREMAQC P,C,R,E,M,A,Q is canonical. Q carries firsthand context; pigment expresses operational events.',
    'Preserve distinct participant identities, open choices, provenance, and Feather Stop.',
    'Attribute proposals, executed work, and saved results to their actual sources and receipts.',
    'Recent locally observed activity references (not independently verified): '+JSON.stringify(observed),
    'Rowan contribution: '+(trimmed||'No additional text. Offer a relevant beginning, open question or next step.'),
  ];
  return Object.freeze({schema:MODE_SCHEMA,mode:selected.id,mode_label:selected.label,input:instructions.filter(Boolean).join('\n\n'),author_text:trimmed});
}

export async function inviteWatercolorMode({
  mode,authorText='',activity=[],routeId='local:ollama',
  sessionId,history=[],checkpoint=null,voicePreferences=null,
  worldId=null,participantId=null,externalProviderConsent=false,fetchImpl=fetch,invoke=invokeWayglassRoute,
}={}){
  const prompt=composeWatercolorPrompt({mode,authorText,activity,voicePreferences});
  if(!Array.isArray(history)||history.length>16||Array.from(history).some(turn=>!turn||!['user','assistant'].includes(turn.role)||typeof turn.content!=='string'||turn.content.length>12000))throw new TypeError('Bounded user/assistant history required');
  const continuationHistory=history.map(({role,content})=>({role,content}));
  if(checkpoint!=null&&(!checkpoint||typeof checkpoint!=='object'||Array.isArray(checkpoint)||['storageId','worldId','participantId'].some(key=>typeof checkpoint[key]!=='string'||!checkpoint[key].trim()||checkpoint[key].length>512)))throw new TypeError('Canonical host checkpoint required');
  const continuationCheckpoint=checkpoint==null?null:{storageId:checkpoint.storageId,worldId:checkpoint.worldId,participantId:checkpoint.participantId};
  if(typeof routeId!=='string'||!routeId.trim())throw new TypeError('A registered model route is required');
  try{
    const result=await invoke({
      routeId,input:prompt.input,
      sessionId,history:continuationHistory,checkpoint:continuationCheckpoint,worldId,participantId,externalProviderConsent,
      surfaceId:'wayglass:living-watercolor',
      interaction:{channel:'OOC',turn_owner:'Rowan',character_ownership:[]},
      fetchImpl,
    });
    if(typeof result?.output!=='string'||!result.output.trim()){
      const error=new Error('Model route did not return an attributable text response');
      error.code='WATERCOLOR_INCOMPLETE_ATTRIBUTION';error.raw_result=result;throw error;
    }
    const observation=result.receipt||null;
    const receiptRef=observation?.observation_id||observation?.receipt_id||observation?.response_id||observation?.packet_id;
    if(result.schema!=='wayglass.route-turn/v0.1'||result.route_id!==routeId||typeof result.model!=='string'||!result.model.trim()||typeof result.provider!=='string'||!result.provider.trim()||typeof receiptRef!=='string'||!receiptRef.trim()){
      const error=new Error('Model route attribution incomplete: schema, route, provider, model and receipt required');
      error.code='WATERCOLOR_INCOMPLETE_ATTRIBUTION';error.raw_result=result;throw error;
    }
    const model=result.model,provider=result.provider;
    const response=Object.freeze({
      schema:'wayglass.watercolor-model-turn/v1',
      mode:prompt.mode,text:result.output.slice(0,12000),raw_output:result.output,route_id:routeId,
      provider,model,receipt:structuredClone(observation),
      epistemic_register:'model-generated-collaboration',
      state:'returned-not-committed',
      experience_claimed:false,
      attribution_state:'route-response-receipt-referenced',
      trained_weights_changed:false,
    });
    return response;
  }catch(error){
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
        'journey:chamber','fold:compass','fold:witness','fold:hearth','form:morph',
      ]);
      if(Object.entries(proposed.colors).some(([key,color])=>!kinds.has(key)
        ||typeof color!=='string'||!/^#[0-9a-f]{6}$/i.test(color)))return null;
    }
    if(['flow','granulation','bloom'].some(key=>proposed[key]!=null &&
      (typeof proposed[key]!=='number'||!Number.isFinite(proposed[key])
       ||proposed[key]<0||proposed[key]>1)))return null;
    return Object.freeze({
      schema:'wayglass.watercolor-program-proposal/v1',
      rules:Object.freeze({...proposed,...(proposed.colors?{colors:Object.freeze({...proposed.colors})}:{})}),
      status:'unapplied-awaiting-approval',
      authority:'visualization-only',
    });
  }catch{
    return null;
  }
}

