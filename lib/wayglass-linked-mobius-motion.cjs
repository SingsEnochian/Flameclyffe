'use strict';
// Linked moving Möbius coordinates for the existing two-quad Eightfold engine.
// A full 2π traversal reverses orientation; 4π restores it.
const {QUADS,LANES}=require('./wayglass-quad-eightfold.cjs');
const {createHash}=require('node:crypto');
const SCHEMA='wayglass.linked-mobius-motion/v1';
const TAU=2*Math.PI;
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function finite(x,name){if(!Number.isFinite(x))throw Error(name+' must be finite');return x}
function point(theta,u,radius=2,width=.5){
 const a=theta/2,radial=radius+u*width*Math.cos(a);
 return Object.freeze({x:radial*Math.cos(theta),y:radial*Math.sin(theta),z:u*width*Math.sin(a)});
}
function linkedMobius({step=0,phase=0,speed=.125,twist=1,sourceSha,previous=null,feather=false}={}){
 if(!/^[0-9a-f]{40}$/.test(sourceSha||''))throw Error('Source revision required');
 for(const [k,v] of Object.entries({step,phase,speed,twist}))finite(v,k);
 if(!Number.isSafeInteger(step)||step<0||speed<0||speed>1||twist!==1)throw Error('Invalid motion');
 if(previous){
  const {motion_hash,...body}=previous;
  if(previous.schema!==SCHEMA||hash(body)!==motion_hash||previous.source_sha!==sourceSha
   ||step!==previous.step+1)throw Error('Invalid linked Möbius ancestry');
 }
 if(feather&&previous)throw Error('Feather stops motion advancement');
 const theta=phase+step*speed;
 const engines=Object.entries(QUADS).map(([name,lanes],engineIndex)=>Object.freeze({
  name,orientation:Math.floor(theta/TAU)%2===0?1:-1,
  lanes:lanes.map((lane,index)=>{
   const local=theta+engineIndex*Math.PI+index*TAU/lanes.length;
   const surface=point(local,engineIndex===0?.5:-.5);
   return Object.freeze({lane,coordinate:surface,phase:local});
  })
 }));
 const core={schema:SCHEMA,source_sha:sourceSha,step,theta,
  parent_hash:previous?.motion_hash||null,engines,
  link:{type:'reciprocal-twist',shared_center:'withness',crossings:['inquiry→becoming','becoming→inquiry']},
  paused:feather,coordinates_only:true,model_invoked:false,source_changed:false};
 return Object.freeze({...core,motion_hash:hash(core)});
}
module.exports={SCHEMA,linkedMobius,point};
