// Optional MiniMind-3 gloss adapter. Proposal-only: never executes WTL, persists state or selects canon.
// Transport is injected. Cloud requests require an owner-authenticated Wayglass proxy, never direct provider credentials.
export const MINIMIND_MODEL='jingyaogong/minimind-3';
const SAFE_ID=/^[\w.:-]{1,128}$/;
const hasExplicitConsent=(consent,id)=>consent!==null && typeof consent==='object' && Object.hasOwn(consent,id) && consent[id]===true;
export function createMiniMindGloss({endpoint,route='local',ownerAuthorised=false,fetchImpl=globalThis.fetch}={}){
  const local = typeof endpoint==='string' && /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?\/v1\/chat\/completions$/.test(endpoint);
  const cloud = route==='cloud' && ownerAuthorised===true && typeof endpoint==='string' &&
    /^\/api\/v1\/wayglass\/models\/minimind\/gloss$/.test(endpoint);
  if(!((route==='local' && local)||cloud))
    throw Error('MiniMind requires local loopback or an owner-authorised same-origin Wayglass cloud proxy');
  if(typeof fetchImpl!=='function')throw TypeError('Fetch transport required');
  return async function gloss({phrase,context='',participant,consent,feather=false,signal}={}){
    if(feather)return Object.freeze({status:'stopped',reason:'Feather'});
    if(!participant||typeof participant.id!=='string'||!SAFE_ID.test(participant.id))throw Error('Attributed participant required');
    if(!consent||!hasExplicitConsent(consent,participant.id))return Object.freeze({status:'declined',participant_id:participant.id});
    if(typeof phrase!=='string'||!phrase.trim()||phrase.length>256||typeof context!=='string'||context.length>1024)throw Error('Bounded phrase and context required');
    if(signal?.aborted)return Object.freeze({status:'stopped',reason:'Feather'});
    const messages=[{role:'system',content:'Suggest a tentative British English gloss for a fictional Wyrdrune phrase. Never claim canonical meaning. Reply with one concise proposal only.'},{role:'user',content:JSON.stringify({phrase,context})}];
    let response;
    try{
      response=await fetchImpl(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:MINIMIND_MODEL,messages,stream:false,temperature:0,max_tokens:96}),signal});
      if(!response.ok)throw Error('MiniMind route returned HTTP '+response.status);
      const data=await response.json();
      if(signal?.aborted)return Object.freeze({status:'stopped',reason:'Feather'});
      // Consent can be withdrawn while a delegate is responding. Never present a late result as approved.
      if(!hasExplicitConsent(consent,participant.id))return Object.freeze({status:'declined',participant_id:participant.id});
      const candidate=data?.choices?.[0]?.message?.content;
      if(typeof candidate!=='string'||!candidate.trim()||candidate.length>2048)throw Error('Invalid local model response');
      return Object.freeze({schema:'wayglass.minimind-gloss/v0.1',status:'proposal',participant_id:participant.id,model:MINIMIND_MODEL,endpoint_kind:route==='local'?'loopback':'owner-cloud-proxy',phrase,gloss:candidate.trim(),persisted:false,canon_adopted:false});
    }catch(error){if(signal?.aborted||error?.name==='AbortError')return Object.freeze({status:'stopped',reason:'Feather'});throw error;}
  };
}
