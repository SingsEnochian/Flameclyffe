// Synchronised recording bundle. References only, never raw media/transcript text.
// Each track's asset is content-addressed and belongs to one explicitly consented Dream.
const HASH=/^[a-f0-9]{64}$/i;
const kinds=['video','audio','transcription'];
const finiteTime=(n)=>Number.isSafeInteger(n)&&n>=0;
export function createDreamMediaBundle({dream_id,tracks,permission}={}){
 if(permission!==true)throw new Error('Explicit recording permission required');
 if(typeof dream_id!=='string'||!/^[a-zA-Z0-9._:-]{1,128}$/.test(dream_id))throw new TypeError('Invalid dream_id');
 if(!Array.isArray(tracks)||tracks.length!==3)throw new TypeError('Video, audio and transcription tracks required');
 const seen=new Set();
 const result=tracks.map(track=>{
  if(!track||!kinds.includes(track.kind)||seen.has(track.kind))throw new TypeError('Duplicate or unsupported track');
  seen.add(track.kind);
  if(typeof track.asset_id!=='string'||!/^[a-zA-Z0-9._:-]{1,128}$/.test(track.asset_id))throw new TypeError('Invalid asset_id');
  if(typeof track.sha256!=='string'||!HASH.test(track.sha256))throw new TypeError('Content hash required');
  if(!finiteTime(track.start_ms)||!finiteTime(track.end_ms)||track.end_ms<track.start_ms)throw new TypeError('Invalid track times');
  return Object.freeze({kind:track.kind,asset_id:track.asset_id,sha256:track.sha256.toLowerCase(),start_ms:track.start_ms,end_ms:track.end_ms});
 });
 if(seen.size!==3)throw new TypeError('All three tracks required');
 const starts=result.map(t=>t.start_ms),ends=result.map(t=>t.end_ms);
 return Object.freeze({schema:'wayglass.dream-media-bundle/v1',dream_id,
  clock:'dream-monotonic-ms',tracks:Object.freeze(result),
  bounds:Object.freeze({start_ms:Math.min(...starts),end_ms:Math.max(...ends)}),
  disposition:'dream-local-only'});
}
