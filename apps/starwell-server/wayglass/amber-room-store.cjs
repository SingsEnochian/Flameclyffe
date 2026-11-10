'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const SCHEMA='wayglass.amber-room-session/v1';
const MAX_MESSAGES=240;
const MAX_LENGTH=12000;
const defaultFile=path.join(__dirname,'..','data','wayglass-amber-primary.local.json');

function clean(messages){
  if(!Array.isArray(messages)||messages.length>MAX_MESSAGES)throw TypeError('Amber messages must be an array of at most 240 turns.');
  return messages.map((m,i)=>{
    if(!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||!m.content.trim()||m.content.length>MAX_LENGTH)
      throw TypeError('Invalid Amber message at position '+i);
    return Object.freeze({
      role:m.role,content:m.content,
      ...(m.role==='assistant'&&typeof m.model==='string'?{model:m.model.slice(0,240)}:{}),
      ...(m.role==='assistant'&&typeof m.provider==='string'?{provider:m.provider.slice(0,80)}:{}),
      ...(m.role==='assistant'&&typeof m.route_id==='string'?{route_id:m.route_id.slice(0,180)}:{}),
    });
  });
}
function empty(){
  return {schema:SCHEMA,participant_id:'wayglass',speaking_place_id:'amber',
    session_id:'wayglass:amber:primary',revision:0,saved_at:null,messages:[]};
}
function createAmberRoomStore({file=defaultFile}={}){
  let chain=Promise.resolve();
  async function read(){
    try{
      const raw=JSON.parse(await fs.readFile(file,'utf8'));
      if(raw.schema!==SCHEMA||raw.participant_id!=='wayglass'||raw.speaking_place_id!=='amber'
        ||!Number.isSafeInteger(raw.revision)||raw.revision<0)throw Error('Invalid saved Wayglass room identity');
      return {...empty(),revision:raw.revision,saved_at:raw.saved_at||null,messages:clean(raw.messages)};
    }catch(error){
      if(error.code==='ENOENT')return empty();
      throw error;
    }
  }
  async function save({revision,messages}={}){
    const task=chain.then(async()=>{
      if(!Number.isSafeInteger(revision)||revision<0)throw TypeError('Expected room revision required');
      const verified=clean(messages);
      const current=await read();
      if(current.revision!==revision){
        const error=new Error('Another device has saved a newer Wayglass Amber conversation. Reload it before writing.');
        error.status=409;throw error;
      }
      const next={...empty(),revision:revision+1,saved_at:new Date().toISOString(),messages:verified};
      await fs.mkdir(path.dirname(file),{recursive:true,mode:0o700});
      const temp=file+'.'+randomUUID()+'.tmp';
      try{
        await fs.writeFile(temp,JSON.stringify(next),{encoding:'utf8',mode:0o600,flag:'wx'});
        await fs.rename(temp,file);
      }catch(error){await fs.rm(temp,{force:true}).catch(()=>{});throw error;}
      return next;
    });
    chain=task.catch(()=>{});
    return task;
  }
  return Object.freeze({read,save,SCHEMA});
}
module.exports={createAmberRoomStore,SCHEMA};
