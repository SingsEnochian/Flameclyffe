'use strict';
const express=require('express');
const path=require('node:path');
const os=require('node:os');
const {sameOriginWrite}=require('./altered-timeline-router.cjs');
const {createRequestGate}=require('../security/wayglass-request-gate');
const {createLokiBiscuitService}=require('../wayglass-runtime/wayglass-loki-biscuit.cjs');
function createAuthorityLineageRouter({authorise=async()=>false,directory,departureStore}={}){
  const router=express.Router();let service;
  const getService=()=>service||(service=createLokiBiscuitService({directory:directory||path.join(process.env.WAYGLASS_DATA_DIR||path.join(os.homedir(),'.wayglass'),'authority-loki'),departureStore}));
  router.use(async(req,res,next)=>{
    res.setHeader('Cache-Control','no-store');
    if(!await Promise.resolve().then(()=>authorise(req)).catch(()=>false))return res.status(401).json({error:'Authenticated House Steward session required'});
    if(req.method!=='GET'&&!sameOriginWrite(req))return res.status(403).json({error:'Same-origin experiment mutation required'});
    next();
  });
  const fail=(res,error)=>res.status(error instanceof TypeError?400:409).json({error:error.message});
  router.get('/loki',async(_req,res)=>{try{res.json(await getService().inspect());}catch(error){fail(res,error);}});
  const workGate=createRequestGate({maxRequests:30,maxConcurrent:1});
  const stopGate=createRequestGate({maxRequests:60,maxConcurrent:2});
  router.post('/loki',(req,res,next)=>(['object','feather'].includes(req.body?.command)?stopGate:workGate)(req,res,next),async(req,res)=>{
    try{
      if(!req.body||Object.keys(req.body).length!==1||typeof req.body.command!=='string')throw new TypeError('One named experiment command required');
      res.json(await getService().command(req.body.command));
    }catch(error){fail(res,error);}
  });
  return router;
}
module.exports={createAuthorityLineageRouter};
