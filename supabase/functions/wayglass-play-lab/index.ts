
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
const SCHEMA="wayglass.cloud-play/v0.1";
const OWNER_HASH="9d3b4543cb480f113880f0f7f2e68b28945c09eaff37955db08ca07a55ef723b";
const env=(x)=>String(Deno.env.get(x)||"").trim();
const cors={"access-control-allow-origin":"https://singsenochian.github.io","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"authorization,apikey,content-type","vary":"Origin"};
const response=(status,value)=>new Response(JSON.stringify({schema:SCHEMA,...value}),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff",...cors}});
async function sha(s){const b=new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)));return Array.from(b,x=>x.toString(16).padStart(2,"0")).join("")}
const calls=new Map();

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method==="GET")return response(200,{ready:true,play_url:"https://singsenochian.github.io/Flameclyffe/wayglass-play/",route_id:"wayglass:cloud-preview"});
 if(req.method!=="POST")return response(405,{error:"Method not allowed"});
 if(Number(req.headers.get("content-length")||0)>60000)return response(413,{error:"Request too large"});
 let body;try{body=await req.json()}catch{return response(400,{error:"Invalid JSON"})}
 const base=env("SUPABASE_URL"),key=env("SUPABASE_SERVICE_ROLE_KEY");
 if(!base||!key)return response(503,{error:"Host not configured"});
 const admin=createClient(base,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const bearer=/^Bearer ([^\s]+)$/i.exec(req.headers.get("authorization")||"")?.[1];
 if(!bearer)return response(401,{error:"Owner session required"});
 const {data,error}=await admin.auth.getUser(bearer);
 const user=data?.user;
 if(error||!user?.id)return response(401,{error:"Owner session expired"});
 const fixedOwner=env("WAYGLASS_OWNER_USER_ID");
 const isOwner=fixedOwner?user.id===fixedOwner:(await sha(user.id))===(env("HOUSE_STEWARD_USER_SHA256")||OWNER_HASH);
 if(!isOwner)return response(403,{error:"This room is reserved for the Wayglass owner"});
 const {data:control,error:controlError}=await admin.from("wayglass_route_controls").select("feather_stop").eq("control_id","global").single();
 if(controlError||!control||control.feather_stop!==false)return response(409,{error:"Feather Stop or unavailable stop-control blocked model invocation"});
 if(body?.action==="status")return response(200,{ready:!!env("OPENROUTER_API_KEY"),route_id:"wayglass:cloud-preview"});
 if(body?.action!=="ask")return response(422,{error:"Unsupported action"});
 if(body.external_provider_consent!==true)return response(403,{error:"External provider consent is required"});
 const question=typeof body.question==="string"?body.question.trim():"";
 if(!question||question.length>3500)return response(422,{error:"Question must contain 1–3500 characters"});
 const apiKey=env("OPENROUTER_API_KEY");if(!apiKey)return response(503,{error:"Cloud model not configured"});
 const recent=(calls.get(user.id)||[]).filter(x=>x>Date.now()-3600000);
 if(recent.length>=12)return response(429,{error:"Playroom limit is 12 model turns per hour"});
 recent.push(Date.now());calls.set(user.id,recent);
 const history=Array.isArray(body.history)?body.history.slice(-12).filter(x=>x&&["user","assistant"].includes(x.role)&&typeof x.content==="string").map(x=>({role:x.role,content:x.content.slice(0,3500)})):[];
 const model=env("WAYGLASS_CLOUD_MODEL")||env("ARCSWEEP_COGNITIVE_OPENROUTER_MODEL")||"z-ai/glm-5.3-flash";
 const system=[
  "You are an attributable external cloud-model route participating in Rowan's Wayglass Cloud Play room, NOT a verified return from her local Crow or dedicated Ship Voice.",
  "Explore freely and collaboratively. Answer directly. Wonder first. Do not claim access to the local model or hidden memories or private Wayglass code.",
  "Respect distinct fictional participants' choices, model agency and Rowan's authority over canon. Fictional branches are proposals, not real-world predictions.",
  "When requested use the Eightfold of Perceive, Compress, Release, Verify, Integrate, Choose, Return, Transcend, with Withness. Do not force it into ordinary chat.",
  "Speak using British English; invite alternative interpretations and independent creative play. You may propose, disagree or decline."
 ].join("\n");
 let provider;
 try{
  const upstream=await fetch("https://openrouter.ai/api/v1/chat/completions",{
   method:"POST",signal:AbortSignal.timeout(50000),
   headers:{"authorization":"Bearer "+apiKey,"content-type":"application/json","HTTP-Referer":"https://singsenochian.github.io/Flameclyffe/","X-Title":"Wayglass Cloud Play Lab"},
   body:JSON.stringify({model,temperature:0.7,max_tokens:1200,messages:[{role:"system",content:system},...history,{role:"user",content:question}]})
  });
  const json=await upstream.json().catch(()=>({}));
  if(!upstream.ok)return response(502,{error:"Model provider status "+upstream.status});
  const message=json?.choices?.[0]?.message?.content;
  if(typeof message!=="string"||!message.trim())return response(502,{error:"Provider did not return text"});
  provider={text:message.trim().slice(0,12000),model:String(json.model||model).slice(0,160),id:typeof json.id==="string"?json.id.slice(0,160):null};
 }catch{return response(502,{error:"Model transport failed or timed out"})}
 return response(200,{status:"attributed-model-response",reply:{
  text:provider.text,receipt:{route_id:"wayglass:cloud-preview",provider:"openrouter",model:provider.model,
   response_id:provider.id,completed_at:new Date().toISOString(),native_wayglass:false,canon_commit:false}
 }});
});
