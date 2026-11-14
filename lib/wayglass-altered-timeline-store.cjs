'use strict';
// House Steward custody of Altered Timeline checkpoints. The source history
// stays in every immutable revision; an index only points to the latest head.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {createHash,createHmac,randomUUID,timingSafeEqual}=require('node:crypto');

const CHECKPOINT_SCHEMA='wayglass.altered-timeline-checkpoint/v1';
const INDEX_SCHEMA='wayglass.altered-timeline-index/v1';
const digest=raw=>createHash('sha256').update(raw).digest('hex');
const branchName=value=>typeof value==='string'&&/^[a-z0-9][a-z0-9-]{0,119}$/.test(value);
function createAlteredTimelineStore({
  directory=path.join(process.env.WAYGLASS_DATA_DIR||path.join(os.homedir(),'.wayglass','departures'),'altered-timelines'),
  secret=process.env.HOUSE_SESSION_SECRET||process.env.ARCSWEEP_RUNTIME_TOKEN,
  now=()=>new Date().toISOString(),
}={}){
  if(typeof secret!=='string'||secret.length<20)
    throw Object.assign(new Error('House checkpoint signing is not configured'),{code:'NOT_CONFIGURED'});
  const hmac=raw=>createHmac('sha256',secret).update(raw).digest('hex');
  const safeEq=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&
    timingSafeEqual(Buffer.from(a),Buffer.from(b));
  const location=id=>path.join(directory,id+'.json');
  function fsyncDirectory(){try{const fd=fs.openSync(directory,'r');try{fs.fsyncSync(fd);}finally{fs.closeSync(fd);}}catch{}}
  function atomic(filename,raw){
    fs.mkdirSync(directory,{recursive:true,mode:0o700});
    const tmp=path.join(directory,'.'+randomUUID()+'.tmp');
    const fd=fs.openSync(tmp,'wx',0o600);
    try{fs.writeFileSync(fd,raw);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
    try{fs.renameSync(tmp,filename);fsyncDirectory();}finally{try{fs.unlinkSync(tmp);}catch{}}
  }
  function indexRead(){
    const filename=path.join(directory,'index.json');
    if(!fs.existsSync(filename))return {schema:INDEX_SCHEMA,heads:{}};
    const data=JSON.parse(fs.readFileSync(filename,'utf8'));
    if(data?.schema!==INDEX_SCHEMA||!data.heads||typeof data.heads!=='object'||
       !safeEq(data.mac,hmac(JSON.stringify({schema:INDEX_SCHEMA,heads:data.heads}))))
      throw Object.assign(new Error('Altered Timeline index integrity failed'),{code:'INTEGRITY'});
    return {schema:INDEX_SCHEMA,heads:data.heads};
  }
  function indexWrite(index){
    const payload={schema:INDEX_SCHEMA,heads:index.heads};
    atomic(path.join(directory,'index.json'),JSON.stringify({...payload,mac:hmac(JSON.stringify(payload))}));
  }
  function inspect(storageId){
    if(typeof storageId!=='string'||!/^[a-f0-9]{64}$/.test(storageId))
      throw Object.assign(new TypeError('Invalid checkpoint receipt ID'),{code:'BAD_REQUEST'});
    const raw=fs.readFileSync(location(storageId),'utf8');
    if(digest(raw)!==storageId)throw Object.assign(new Error('Checkpoint content checksum failed'),{code:'INTEGRITY'});
    const record=JSON.parse(raw);
    const {mac,...payload}=record;
    if(payload.schema!==CHECKPOINT_SCHEMA||!branchName(payload.branch_id)||
       !safeEq(mac,hmac(JSON.stringify(payload))))
      throw Object.assign(new Error('Checkpoint authenticity failed'),{code:'INTEGRITY'});
    return record;
  }
  function list(){
    const {heads}=indexRead();
    return Object.keys(heads).sort().map(id=>{
      const head=heads[id],item=inspect(head.storage_id);
      if(item.branch_id!==id||item.revision!==head.revision)
        throw Object.assign(new Error('Index binding mismatch'),{code:'INTEGRITY'});
      return {branch_id:id,storage_id:head.storage_id,revision:head.revision,updated_at:item.stopped_at,
        parent_world_id:item.parent_world_id};
    });
  }
  function read(storageId){
    const record=inspect(storageId);
    const {mac,...payload}=record;
    return {checkpoint:payload,storage_id:storageId,verified:true,
      durability:'host-file-fsync',return_scope:'same persistent House host'};
  }
  function save({branch_id,parent_world_id,snapshot,expected_storage_id=null}={}){
    if(!branchName(branch_id))throw Object.assign(new TypeError('Valid branch ID required'),{code:'BAD_REQUEST'});
    if(typeof parent_world_id!=='string'||!parent_world_id||parent_world_id.length>120)
      throw Object.assign(new TypeError('Parent world ID required'),{code:'BAD_REQUEST'});
    const rawSnapshot=JSON.stringify(snapshot);
    if(!rawSnapshot||rawSnapshot.length>180000)
      throw Object.assign(new RangeError('Checkpoint exceeds bounded size'),{code:'BAD_REQUEST'});
    if(snapshot?.branchId!==branch_id||snapshot?.original?.world?.id!==parent_world_id)
      throw Object.assign(new TypeError('Checkpoint binding mismatch'),{code:'BAD_REQUEST'});
    const index=indexRead(),head=index.heads[branch_id]||null;
    if((head?.storage_id||null)!==(expected_storage_id||null))
      throw Object.assign(new Error('This timeline has changed on the House host; recover the current head before saving'),{code:'CONFLICT',current_head:head||null});
    const payload={schema:CHECKPOINT_SCHEMA,branch_id,parent_world_id,
      revision:(head?.revision||0)+1,previous_storage_id:head?.storage_id||null,
      stopped_at:now(),snapshot,owner_scope:'authenticated-house-steward',
      physical_timeline_changed:false,canon_commit:false,
      next_owner:'wayglass:altered-timeline',stop_point:'Altered Timeline authored branch',
    };
    const raw=JSON.stringify({...payload,mac:hmac(JSON.stringify(payload))});
    const id=digest(raw);
    fs.mkdirSync(directory,{recursive:true,mode:0o700});
    // Immutable receipt files. A crash before index commit leaves a harmless
    // orphan, rather than a falsely advanced timeline.
    const file=location(id);
    if(!fs.existsSync(file)){
      const tmp=path.join(directory,'.'+randomUUID()+'.tmp');
      const fd=fs.openSync(tmp,'wx',0o600);
      try{fs.writeFileSync(fd,raw);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
      try{try{fs.linkSync(tmp,file);}catch(e){if(e.code!=='EEXIST')throw e;}fsyncDirectory();}
      finally{fs.unlinkSync(tmp);}
    }
    inspect(id);
    index.heads[branch_id]={storage_id:id,revision:payload.revision};
    indexWrite(index);
    const reloaded=read(id);
    if(reloaded.checkpoint.snapshot.branchId!==branch_id)
      throw Object.assign(new Error('Cold-read verification failed'),{code:'INTEGRITY'});
    return {schema:'wayglass.altered-timeline-storage-receipt/v1',
      storage_id:id,revision:payload.revision,previous_storage_id:payload.previous_storage_id,
      branch_id,parent_world_id,stopped_at:payload.stopped_at,persisted:true,verified:true,
      durability:'host-file-fsync',return_scope:'same persistent House host',
      canon_commit:false,physical_timeline_changed:false};
  }
  function latest(branchId){
    if(!branchName(branchId))throw Object.assign(new TypeError('Valid branch ID required'),{code:'BAD_REQUEST'});
    const head=indexRead().heads[branchId];
    if(!head)throw Object.assign(new Error('No saved Altered Timeline branch found'),{code:'NOT_FOUND'});
    return read(head.storage_id);
  }
  return Object.freeze({save,read,latest,list});
}
module.exports={createAlteredTimelineStore,CHECKPOINT_SCHEMA,INDEX_SCHEMA};
