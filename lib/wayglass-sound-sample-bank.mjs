// Owner-imported audio stays in this browser. No fetch, network catalogue or upload.
const MAX_FILE_BYTES=32*1024*1024,MAX_DECODED_BYTES=64*1024*1024;
export function createSoundSampleBank({indexedDB=globalThis.indexedDB,crypto=globalThis.crypto}={}){
 const metadata=new Map(),volatile=new Map(),decoded=new WeakMap(),listeners=new Set();let dbPromise=null;
 const snapshot=()=>[...metadata.values()].map(x=>({...x}));
 const notify=()=>{for(const fn of listeners)try{fn(snapshot());}catch{}};
 const open=()=>dbPromise||=(new Promise((resolve,reject)=>{
  if(!indexedDB)return reject(Error('Browser sound storage unavailable'));
  const request=indexedDB.open('wayglass.sound-library',1);
  request.onupgradeneeded=()=>{for(const store of ['metadata','audio'])if(!request.result.objectStoreNames.contains(store))request.result.createObjectStore(store,{keyPath:'id'});};
  request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Sound library is open in an older tab'));
 }));
 async function transaction(stores,mode,work){const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(stores,mode);let result;work(tx,value=>{result=value;});tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Sound storage interrupted'));});}
 async function load(){try{const rows=await transaction(['metadata'],'readonly',(tx,set)=>{const r=tx.objectStore('metadata').getAll();r.onsuccess=()=>set(r.result);});for(const row of rows||[])metadata.set(row.id,row);notify();return {loaded:true,count:metadata.size};}catch(error){return {loaded:false,reason:error.message,count:metadata.size};}}
 async function importFile(file,{rootMidi=60,sourceNote=''}={}){
  if(!file||typeof file.arrayBuffer!=='function'||!Number.isFinite(file.size)||file.size<=0||file.size>MAX_FILE_BYTES||!Number.isInteger(rootMidi)||rootMidi<0||rootMidi>127)throw new TypeError('Audio file up to 32 MiB and MIDI root 0–127 required');
  const bytes=await file.arrayBuffer();if(bytes.byteLength!==file.size)throw Error('Audio file size changed');
  const digest=await crypto.subtle.digest('SHA-256',bytes),id=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
  const row={id,name:String(file.name||'Imported sound').slice(0,160),bytes:bytes.byteLength,type:String(file.type||'').slice(0,80),root_midi:rootMidi,source_note:String(sourceNote).slice(0,500),source_ref:'owner-import:sha256:'+id,imported_at:new Date().toISOString(),decode_status:'not-yet-decoded'};
  volatile.set(id,bytes);let persisted=false,reason=null;
  try{await transaction(['metadata','audio'],'readwrite',tx=>{tx.objectStore('metadata').put(row);tx.objectStore('audio').put({id,bytes});});persisted=true;volatile.delete(id);}catch(error){reason=error.message;}
  metadata.set(id,row);notify();return {...row,persisted,reason};
 }
 async function decode(context,id){
  if(!metadata.has(id))throw Error('Imported sound is unavailable in this browser');
  let cache=decoded.get(context);if(!cache){cache=new Map();decoded.set(context,cache);}if(cache.has(id))return cache.get(id);
  const pending=(async()=>{
   try{
    let bytes=volatile.get(id);if(!bytes){const row=await transaction(['audio'],'readonly',(tx,set)=>{const r=tx.objectStore('audio').get(id);r.onsuccess=()=>set(r.result);});bytes=row?.bytes;}
    if(!(bytes instanceof ArrayBuffer))throw Error('Original imported audio is missing');
    const buffer=await context.decodeAudioData(bytes.slice(0));
    if(!buffer||!Number.isFinite(buffer.duration)||buffer.duration<=0||buffer.duration>180||buffer.length*buffer.numberOfChannels*4>MAX_DECODED_BYTES)throw Error('Choose a sample up to three minutes within the decoded-memory budget');
    // Bounded decoded cache. Original files remain in IndexedDB for later use.
    if(cache.size>8)for(const key of [...cache.keys()].slice(0,cache.size-8))cache.delete(key);
    Object.assign(metadata.get(id),{decode_status:'ready',duration:buffer.duration});notify();return buffer;
   }catch(error){cache.delete(id);Object.assign(metadata.get(id),{decode_status:'failed',decode_error:error.message});notify();throw error;}
  })();cache.set(id,pending);return pending;
 }
 return Object.freeze({snapshot,load,importFile,decode,metadata:id=>metadata.has(id)?{...metadata.get(id)}:null,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);}});
}
export const soundSampleBank=createSoundSampleBank();
