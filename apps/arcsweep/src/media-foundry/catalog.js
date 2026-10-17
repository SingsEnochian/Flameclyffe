/** Curated Wayglass media research candidates. Discovery is never transport authorisation. */
export const MEDIA_CATALOG_SCHEMA = 'wayglass.media-foundry.catalog/v1';
export const MEDIA_TRIAL_SCHEMA = 'wayglass.media-foundry.trial/v1';
export const SOURCE_CATEGORIES = Object.freeze(['speech','image','interface','reasoning','research']);
const candidate=(id,label,category,kind,url,license,summary,requirements,notes={})=>Object.freeze({
  id,label,category,kind,url,license,summary,requirements:Object.freeze(requirements),
  status:'research-candidate', ...notes,
});
export const MEDIA_SOURCES = Object.freeze([
  candidate('kokoro-82m','Kokoro 82M','speech','model','https://huggingface.co/hexgrad/Kokoro-82M','Apache-2.0',
    'Compact text-to-speech. Python KPipeline or browser/local Kokoro.js; downloadable weights and explicit voice selection.',
    ['Choose local Python or kokoro-js WASM/WebGPU runtime','Download model files with source and version recorded','Obtain voice and playback approval','Keep inference output out of the canon/identity store by default'],
    {runtime:'candidate-local',engine:'hexgrad/kokoro',adapter:'onnx-community/Kokoro-82M-v1.0-ONNX',sample_rate_hz:24000,voice_example:'af_heart',code_url:'https://github.com/hexgrad/kokoro'}),
  candidate('chatterbox','Chatterbox','speech','model','https://huggingface.co/ResembleAI/chatterbox','MIT',
    'Alternative multilingual TTS candidate. Voice-cloning capabilities require separate, explicit authorisation.',
    ['Confirm language and supported runtime','Use only owned or permissioned source voices','Evaluate inference cost and listening quality'],{runtime:'provider-or-local-candidate'}),
  candidate('neko-hollywood','Neko Hollywood Golden SDXL','image','lora','https://huggingface.co/Nekodeus/neko-hollywood-golden-sdxl-v1','Apache-2.0',
    'Cinematic style LoRA. This is a tuning adapter, not a standalone image generator.',
    ['Load a compatible SDXL base pipeline','Check its published trigger and LoRA scaling instructions','Record base-model and LoRA licences separately','Approve the resulting image before world publication'],
    {runtime:'requires-base',base_model_id:'stabilityai/stable-diffusion-xl-base-1.0'}),
  candidate('sdxl-base','Stable Diffusion XL Base 1.0','image','base-model','https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0','OpenRAIL++',
    'Diffusion base model suitable for evaluating compatible SDXL LoRAs; heavyweight for laptop inference.',
    ['Review model licence and compute footprint','Configure a trusted image endpoint or capable local runner','Require explicit generation and output review'],
    {runtime:'heavy-local-or-provider-candidate'}),
  candidate('shunya-uiux','Shunya 3B UIUX Master','interface','gguf','https://huggingface.co/vishu01a/shunya-3B-UIUX-master_v1.0','MIT',
    'Qwen2.5-Coder-3B-based GGUF specialist candidate for accessible interface proposals.',
    ['Verify GGUF quantisation and context length','Add only through an authorised Ollama/llama.cpp route','Run accessibility and regression tests on generated interface changes'],{runtime:'candidate-local'}),
  candidate('deepseek-v4-cyber','DeepSeek V4.1 Flash Abliterated Cybersecurity','reasoning','model','https://huggingface.co/drowzeys/DeepSeek-V4.1-Flash-Abliterated-Cybersecurity-Unleashed','MIT',
    'Gated cybersecurity model listing. A model card is not evidence of installed weights or an authorised host route.',
    ['Resolve gated access through the owner','Verify actual hardware and provider requirements','Restrict to consented defensive test environments','Do not infer endpoint credentials from a listing'],{runtime:'gated-research'}),
  candidate('media-engineering-1m','Audio/Video Engineering Agentic Tasks 1M','research','dataset','https://huggingface.co/datasets/yatin-superintelligence/Audio-Video-Engineering-Agentic-Tasks-1M','MIT',
    'Approximately 1.03M synthetic media engineering tasks, suitable for curriculum, tests and retrieval evaluation, not direct inference.',
    ['Sample and audit data quality and duplication','Separate synthetic assertions from authoritative DSP references','Check licence and provenance for any downstream training'],{runtime:'dataset-not-model'}),
]);
export const DISCOVERY_COLLECTIONS = Object.freeze([
  Object.freeze({id:'speech-trending',label:'Hugging Face · Text-to-Speech discovery',category:'speech',url:'https://huggingface.co/models?pipeline_tag=text-to-speech&inference_provider=all&sort=trending'}),
  Object.freeze({id:'image-trending',label:'Hugging Face · Text-to-Image discovery',category:'image',url:'https://huggingface.co/models?pipeline_tag=text-to-image&inference_provider=all&sort=trending'}),
]);
export const KNOWN_HOST_ROUTES = Object.freeze([
  Object.freeze({id:'local:ollama',label:'Ollama · local model host',kind:'text',availability:'host-discovery-required',authority:'Wayglass /api/v1/wayglass/routes'}),
  Object.freeze({id:'flame:bluebird:spicychat',label:'Bluebird · authorised SpicyChat session',kind:'text',availability:'per-opening-consent-required',authority:'Wayglass authorisation session'}),
]);
export const APPLET_DECKS = Object.freeze([
  Object.freeze({id:'harmonic-observatory',label:'Harmonic Observatory + SF2 Rack',group:'Sensorium',owner:'ArcSweep / SpessaSynth',availability:'implemented local instrument',description:'Independent harmonics, audible SF2 presets, PCM receipts and Feather Stop'}),
  Object.freeze({id:'glyph-lab',label:'Glyph Lab',group:'Atelier',owner:'STARWELL Glyph Studio',availability:'separate applet',description:'Existing glyph composer with authored artefacts'}),
  Object.freeze({id:'brush-foundry',label:'Brush Foundry',group:'Atelier',owner:'STARWELL Glyph Studio',availability:'separate applet',description:'Brush inspector, same canonical implementation as Glyph Lab'}),
  Object.freeze({id:'continuity-gate',label:'Continuity Gate',group:'Memory',owner:'STARWELL',availability:'separate applet',description:'Reviewed continuity transfers, not unverified canon promotion'}),
  Object.freeze({id:'wayglass-writing',label:'Wayglass Writing Room',group:'Crew',owner:'Wayglass OS PR #465',availability:'unmerged host lineage',description:'Authorised model routes and deliberate return markers; not this media catalogue'}),
]);
export function mediaSource(id){return MEDIA_SOURCES.find(entry=>entry.id===id)||null;}
export function filterMediaSources({category='all',query=''}={}){
  if(category!=='all'&&!SOURCE_CATEGORIES.includes(category)) throw new RangeError('Unknown foundry category');
  const q=String(query).toLowerCase().trim();
  return MEDIA_SOURCES.filter(item=>(category==='all'||item.category===category)&&(!q||[item.label,item.summary,item.id,item.kind].some(s=>s.toLowerCase().includes(q))));
}
export function makeTrialProposal(modelId,{sessionId='wayglass-media-trial',nextOwner='owner'}={}){
  const model=mediaSource(modelId);
  if(!model)throw new RangeError('Source not in reviewed catalogue');
  if(!/^[a-z0-9][a-z0-9_-]{0,63}$/i.test(sessionId)||typeof nextOwner!=='string'||nextOwner.length>96)throw new RangeError('Invalid trial context');
  return {
    schema:MEDIA_TRIAL_SCHEMA,session_id:sessionId,
    model_id:model.id,kind:model.kind,task: model.category,
    source_url:model.url,licence_as_listed:model.license,
    status:'proposal-only',provider_route_id:null,configured:false,authorised:false,live_invocation:false,
    prerequisites:[...model.requirements],
    observation:'No weights loaded; no model generation, provider call or device playback verified.',
    unresolved_wonder:['Which bounded task will discriminate this model from existing Wayglass capabilities?'],
    stop_point:'Review prerequisites and prove a single authorised local/provider test',next_owner:nextOwner,
  };
}
/** Normalise host metadata WITHOUT granting credentials or upgrading connection state. */
export function normaliseHostRoutes(payload){
  if(!payload||!Array.isArray(payload.routes))throw new TypeError('Route catalogue absent');
  return payload.routes.slice(0,100).filter(x=>x&&typeof x.route_id==='string'&&x.route_id.length<=180).map(x=>({
    id:x.route_id,label:String(x.label||x.route_id).slice(0,160),provider:String(x.provider||'unspecified').slice(0,80),
    configured:x.configured===true,connection_verified:x.connection_verified===true,
    callable_claim:x.configured===true&&x.connection_verified===true,
  }));
}