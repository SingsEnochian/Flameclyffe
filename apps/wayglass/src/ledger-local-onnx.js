/** An optional, provider-injected Transformers.js/ONNX browser adapter.
 * Does NOT download modules, contact HF, or change package dependencies.
 * Caller must separately install and attest a same-origin module/model pipeline.
 */
export const APPROVED_ONNX_MODELS = Object.freeze([
  { id:'Xenova/all-MiniLM-L6-v2',license:'apache-2.0',purpose:'small first local-only trial',gated:false },
  { id:'onnx-community/Qwen3-Embedding-0.6B-ONNX',license:'see upstream source',purpose:'larger candidate; verify local fit',gated:false },
]);
export function createLocalOnnxEmbedder({pipelineFactory,modelId='Xenova/all-MiniLM-L6-v2',quantization='q8'}={}) {
  if(typeof pipelineFactory!=='function')throw new TypeError('A trusted local Transformers.js pipeline factory must be installed first.');
  if(!APPROVED_ONNX_MODELS.some(model=>model.id===modelId))throw new RangeError('unreviewed model id');
  if(!['q8','fp32'].includes(quantization))throw new RangeError('unreviewed quantization');
  let enginePromise=null;
  const load=()=>{enginePromise ||= Promise.resolve().then(()=>pipelineFactory('feature-extraction',modelId,{device:'wasm',dtype:quantization,local_files_only:true})).catch(err=>{enginePromise=null;throw err;});return enginePromise;};
  async function embed(texts){
    if(!Array.isArray(texts)||texts.length<2||texts.length>33||texts.some(s=>typeof s!=='string'||s.length>2000))throw new RangeError('bounded texts required');
    const pipeline=await load();
    const tensor=await pipeline(texts,{pooling:'mean',normalize:true});
    if(typeof tensor?.tolist!=='function')throw new TypeError('pipeline returned no tensor data');
    const vectors=await tensor.tolist();
    if(!Array.isArray(vectors)||vectors.length!==texts.length)throw new TypeError('pipeline returned wrong vector count');
    return vectors;
  }
  return Object.freeze({model:Object.freeze({id:modelId,local:true,quantization}),load,embed});
}