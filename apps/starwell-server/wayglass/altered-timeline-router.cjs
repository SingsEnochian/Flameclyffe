'use strict';
const express=require('express');
const {createAlteredTimelineStore}=require('../../../lib/wayglass-altered-timeline-store.cjs');
const {createRequestGate}=require('../security/wayglass-request-gate');

function sameOriginWrite(req){
  const site=req.get('sec-fetch-site');
  if(site && !['same-origin','none'].includes(site))return false;
  const origin=req.get('origin');
  if(!origin)return true; // signed bearer API clients need not send Origin
  try{
    const parsed=new URL(origin);
    return ['https:','http:'].includes(parsed.protocol)&&parsed.host===req.get('host')&&
      !parsed.username&&!parsed.password;
  }catch{return false;}
}

function createAlteredTimelineRouter({
  authorise=async()=>false,store=null,loadService=()=>import('./altered-timeline-service.mjs'),
}={}){
  const router=express.Router();
  let storage=store;
  const getStore=()=>storage||(storage=createAlteredTimelineStore());
  router.use(async(req,res,next)=>{
    res.setHeader('Cache-Control','no-store');
    if(!(await authorise(req).catch(()=>false)))
      return res.status(401).json({error:'Authenticated House Steward session required'});
    if(req.method!=='GET'&&!sameOriginWrite(req))
      return res.status(403).json({error:'Same-origin checkpoint mutation required'});
    next();
  });
  function fail(res,error){
    const code=error?.code;
    const status=code==='CONFLICT'?409:code==='NOT_FOUND'||error?.code==='ENOENT'?404:
      code==='NOT_CONFIGURED'?503:code==='INTEGRITY'?409:
      code==='BAD_REQUEST'||error instanceof TypeError||error instanceof RangeError?400:500;
    return res.status(status).json({error:error?.message||'Altered Timeline request rejected',
      ...(code==='CONFLICT'&&error.current_head?{current_head:error.current_head}:{})});
  }
  router.get('/checkpoints',createRequestGate({maxRequests:40,maxConcurrent:6}),(_req,res)=>{
    try{return res.json({schema:'wayglass.altered-timeline-catalogue/v1',
      checkpoints:getStore().list(),scope:'authenticated-house-steward'});}
    catch(error){return fail(res,error);}
  });
  const read=async(storageId,res)=>{
    try{
      const stored=getStore().read(storageId);
      const svc=await loadService();
      const verified=await svc.validateAlteredTimelineCheckpoint(stored.checkpoint.snapshot);
      return res.json({schema:'wayglass.altered-timeline-return/v1',
        receipt:{storage_id:stored.storage_id,branch_id:stored.checkpoint.branch_id,
          revision:stored.checkpoint.revision,
          previous_storage_id:stored.checkpoint.previous_storage_id,
          durability:stored.durability,return_scope:stored.return_scope,
          stopped_at:stored.checkpoint.stopped_at,verified:true},
        snapshot:verified.snapshot,comparison:verified.comparison,
        status:'restored-from-verified-host-checkpoint',
        canon_commit:false,physical_timeline_changed:false});
    }catch(error){return fail(res,error);}
  };
  router.get('/checkpoints/:storageId',createRequestGate({maxRequests:40,maxConcurrent:6}),
    (req,res)=>read(req.params.storageId,res));
  router.get('/latest/:branchId',createRequestGate({maxRequests:40,maxConcurrent:6}),async(req,res)=>{
    try{
      const item=getStore().latest(req.params.branchId);
      return read(item.storage_id,res);
    }catch(error){return fail(res,error);}
  });
  router.post('/checkpoints',createRequestGate({maxRequests:16,maxConcurrent:2}),async(req,res)=>{
    try{
      const raw=JSON.stringify(req.body||{});
      if(raw.length>190000)throw new RangeError('Checkpoint request too large');
      const body=req.body||{},keys=Object.keys(body).sort();
      if(keys.some(key=>!['snapshot','expected_storage_id'].includes(key)))
        throw new TypeError('Unexpected checkpoint request fields');
      const expected=body.expected_storage_id??null;
      if(expected!==null&&!/^[a-f0-9]{64}$/.test(expected))
        throw new TypeError('Invalid expected checkpoint revision');
      const {validateAlteredTimelineCheckpoint}=await loadService();
      const validated=await validateAlteredTimelineCheckpoint(body.snapshot);
      const receipt=getStore().save({
        branch_id:validated.snapshot.branchId,
        parent_world_id:validated.snapshot.original.world.id,
        snapshot:validated.snapshot,expected_storage_id:expected,
      });
      return res.status(201).json({
        schema:'wayglass.altered-timeline-host-save/v1',receipt,
        comparison:validated.comparison,
        status:'verified-persistent-host-checkpoint',
        actual_model_route:false,canon_commit:false,physical_timeline_changed:false,
      });
    }catch(error){return fail(res,error);}
  });
  return router;
}
module.exports={createAlteredTimelineRouter,sameOriginWrite};
