#!/usr/bin/env node
// Wayglass Rarity MCP bridge: stdio JSON-RPC MCP -> owner-configured Wayglass HTTPS.
// Credentials remain in environment variables. No arbitrary URL tools, shell, or filesystem access.
const endpoint=process.env.WAYGLASS_MCP_BASE_URL;
const token=process.env.WAYGLASS_MCP_TOKEN;
const allowInsecure=process.env.WAYGLASS_MCP_ALLOW_LOOPBACK==='1';
if(!endpoint||!token){console.error('WAYGLASS_MCP_BASE_URL and WAYGLASS_MCP_TOKEN are required');process.exit(1);}
const base=new URL(endpoint);
if(base.protocol!=='https:'&&!(allowInsecure&&base.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(base.hostname))){
 console.error('HTTPS required (loopback HTTP needs explicit opt-in)');process.exit(1);
}
const tools=[
 {name:'wayglass_routes',description:'Read configured Wayglass routes',inputSchema:{type:'object',properties:{},additionalProperties:false}},
 {name:'wayglass_respond',description:'Invoke a configured Wayglass route with a bounded prompt',inputSchema:{type:'object',properties:{route_id:{type:'string'},input:{type:'string'}},required:['route_id','input'],additionalProperties:false}},
 {name:'wayglass_status',description:'Check Wayglass host availability',inputSchema:{type:'object',properties:{},additionalProperties:false}}
];
let buffer=Buffer.alloc(0);
function send(value){const body=Buffer.from(JSON.stringify(value));process.stdout.write('Content-Length: '+body.length+'\r\n\r\n');process.stdout.write(body);}
async function callHost(path,body){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);
 try{
  const response=await fetch(new URL(path,base),{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:controller.signal,redirect:'error'});
  const raw=await response.text();
  if(!response.ok)throw Error('Wayglass HTTP '+response.status);
  return JSON.parse(raw);
 }finally{clearTimeout(timeout);}
}
async function dispatch(msg){
 if(msg.method==='notifications/initialized')return;
 if(msg.method==='initialize')return send({jsonrpc:'2.0',id:msg.id,result:{protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'wayglass-rarity-bridge',version:'0.1.0'}}});
 if(msg.method==='tools/list')return send({jsonrpc:'2.0',id:msg.id,result:{tools}});
 if(msg.method==='tools/call'){
  try{
   const name=msg.params?.name,args=msg.params?.arguments||{};
   let result;
   if(name==='wayglass_routes')result=await callHost('/api/v1/wayglass/routes');
   else if(name==='wayglass_status')result=await callHost('/api/v1/wayglass/routes');
   else if(name==='wayglass_respond'){
    if(typeof args.route_id!=='string'||!args.route_id||typeof args.input!=='string'||!args.input||args.input.length>12000)throw Error('Invalid route or prompt');
    result=await callHost('/api/v1/wayglass/respond',{route_id:args.route_id,input:args.input,surface_id:'wayglass:mcp-rarity',max_output_tokens:900});
   }else throw Error('Unknown tool');
   return send({jsonrpc:'2.0',id:msg.id,result:{content:[{type:'text',text:JSON.stringify(result)}]}});
  }catch(e){return send({jsonrpc:'2.0',id:msg.id,result:{isError:true,content:[{type:'text',text:String(e.message)}]}});}
 }
 if(msg.id!==undefined)send({jsonrpc:'2.0',id:msg.id,error:{code:-32601,message:'Method not found'}});
}
process.stdin.on('data',chunk=>{
 buffer=Buffer.concat([buffer,chunk]);
 while(true){
  const end=buffer.indexOf('\r\n\r\n');if(end<0)break;
  const header=buffer.subarray(0,end).toString(),match=/content-length:\s*(\d+)/i.exec(header);
  if(!match){buffer=Buffer.alloc(0);break;}
  const size=Number(match[1]);if(size>1048576){process.stderr.write('Oversize message\n');process.exit(1);}
  if(buffer.length<end+4+size)break;
  const body=buffer.subarray(end+4,end+4+size);buffer=buffer.subarray(end+4+size);
  try{void dispatch(JSON.parse(body.toString())).catch(e=>console.error(e.message));}catch(e){console.error(e.message);}
 }
});
