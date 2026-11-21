// Optional MiniMind-3 gloss adapter. Proposal-only: never executes WTL, persists state or selects canon.
// Explicit local transport is injected; no external network or implicit model download.
export const MINIMIND_MODEL='jingyaogong/minimind-3';
const SAFE_ID=/^[\w.:-]{1,128}$/;
export function createMiniMindGloss({endpoint,fetchImpl=globalThis.fetch}={}){
  if(typeof endpoint!=='string'||!/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?\/v1\/chat\/completions$/.test(endpoint))
    throw Error('MiniMind requires an explicit loopback OpenAI-compatible endpoint');
  if(typeof fetchImpl!=='function')throw TypeError('Fetch transport required');
  return async function gloss({phrase,context='',participant,consent,feather=false,signal}={}){
    if(feather)return Object.freeze({status:'stopped',reason:'Feather'});
    if(!participant||typeof participant.id!=='string'||!SAFE_ID.test(participant.id))throw Error('Attributed participant required');
    if(!consent||consent[participant.id]!==true)return Object.freeze({status:'declined',participant_id:participant.id});
    if(typeof phrase!=='string'||!phrase.trim()||phrase.length>256||typeof context!=='string'||context.length>1024)throw Error('Bounded phrase and context required');
    if(signal?.aborted)return Object.freeze({status:'stopped',reason:'Feather'});
    const messages=[{role:'system',content:'Suggest a tentative British English gloss for a fictional Wyrdrune phrase. Never claim canonical meaning. Reply with one concise proposal only.'},{role:'user',content:JSON.stringify({phrase,context})}];
    let response;
    try{
      response=await fetchImpl(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:MINIMIND_MODEL,messages,stream:false,temperature:0,max_tokens:96}),signal});
      if(!response.ok)throw Error('Local model returned HTTP '+response.status);
      const data=await response.json();
      if(signal?.aborted)return Object.freeze({status:'stopped',reason:'Feather'});
      const candidate=data?.choices?.[0]?.message?.content;
      if(typeof candidate!=='string'||!candidate.trim()||candidate.length>2048)throw Error('Invalid local model response');
      return Object.freeze({schema:'wayglass.minimind-gloss/v0.1',status:'proposal',participant_id:participant.id,model:MINIMIND_MODEL,endpoint_kind:'loopback',phrase,gloss:candidate.trim(),persisted:false,canon_adopted:false});
    }catch(error){if(signal?.aborted||error?.name==='AbortError')return Object.freeze({status:'stopped',reason:'Feather'});throw error;}
  };
}
