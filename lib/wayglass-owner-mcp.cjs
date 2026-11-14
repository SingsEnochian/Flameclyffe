'use strict';
// Wayglass owner-mediated MCP adapter. Local stdio only: no listener, tokens or bypass.
const { createInterface } = require('node:readline');
const { createWaygateManifest, inspectWaygateManifest } = require('./wayglass-waygate.cjs');
const { inspectWayglassCognitionPreflight } = require('./wayglass-kernel.cjs');
const { inspectContinuationPacket } = require('./wayglass-continuation-packet.cjs');

const VERSION = '2025-03-26';
const tools = [
  { name: 'wayglass_inspect_gate', description: 'Inspect a proposed Wayglass world-passage manifest; grants no authority.', inputSchema: {type:'object',properties:{waygate_id:{type:'string'},world_id:{type:'string'},body_class:{type:'string'}},required:['waygate_id','world_id'],additionalProperties:false} },
  { name: 'wayglass_inspect_continuation', description: 'Validate a supplied continuation packet for review without committing canon or identity.', inputSchema: {type:'object',properties:{packet:{type:'object'},expected_world_id:{type:'string'},expected_participant_id:{type:'string'}},required:['packet'],additionalProperties:false} },
  { name: 'wayglass_inspect_route', description: 'Inspect registered cognitive route readiness; not a live model connection.', inputSchema: {type:'object',properties:{route_id:{type:'string'},world_id:{type:'string'},participant_id:{type:'string'}},required:['route_id'],additionalProperties:false} }
];
function respond(request) {
  const {id,method,params={}} = request;
  if (method === 'notifications/initialized') return null;
  if (method === 'initialize') return {jsonrpc:'2.0',id,result:{protocolVersion:VERSION,capabilities:{tools:{listChanged:false}},serverInfo:{name:'wayglass-owner-waygate',version:'0.1.0'}}};
  if (method === 'ping') return {jsonrpc:'2.0',id,result:{}};
  if (method === 'tools/list') return {jsonrpc:'2.0',id,result:{tools}};
  if (method === 'tools/call') {
    const args=params.arguments || {};
    try {
      let result;
      switch(params.name) {
        case 'wayglass_inspect_gate': {
          const manifest=createWaygateManifest({waygate_id:args.waygate_id,world_id:args.world_id,allowed_body_classes:args.body_class?[args.body_class]:[],provenance_refs:['local:owner-mediated-mcp']});
          result=inspectWaygateManifest(manifest,{expected_world_id:args.world_id,body_class:args.body_class});
          break;
        }
        case 'wayglass_inspect_continuation':
          result=inspectContinuationPacket(args.packet,{expected_world_id:args.expected_world_id,expected_participant_id:args.expected_participant_id});break;
        case 'wayglass_inspect_route':
          result=inspectWayglassCognitionPreflight({route_id:args.route_id,world_id:args.world_id,participant_id:args.participant_id});break;
        default: throw new Error('Unknown or unauthorised Wayglass tool');
      }
      return {jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(result)}]}};
    } catch(error) {return {jsonrpc:'2.0',id,result:{isError:true,content:[{type:'text',text:error.message}]}};}
  }
  if (id===undefined) return null;
  return {jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}};
}
function main(){
  // MCP stdio framing: Content-Length bytes, no stdout logging.
  let buffer=Buffer.alloc(0);
  process.stdin.on('data',chunk=>{
    buffer=Buffer.concat([buffer,chunk]);
    while(true){
      const boundary=buffer.indexOf('\r\n\r\n');
      if(boundary<0)break;
      const header=buffer.subarray(0,boundary).toString('ascii');
      const match=/content-length:\s*(\d+)/i.exec(header);
      if(!match){buffer=buffer.subarray(boundary+4);continue;}
      const size=Number(match[1]);
      if(!Number.isSafeInteger(size)||size>1024*1024){process.stderr.write('Invalid MCP message length\n');process.exitCode=1;process.stdin.pause();return;}
      if(buffer.length<boundary+4+size)break;
      const body=buffer.subarray(boundary+4,boundary+4+size);
      buffer=buffer.subarray(boundary+4+size);
      try{
        const response=respond(JSON.parse(body.toString('utf8')));
        if(response){const payload=Buffer.from(JSON.stringify(response));process.stdout.write('Content-Length: '+payload.length+'\r\n\r\n');process.stdout.write(payload);}
      }catch(error){process.stderr.write('Invalid MCP request: '+error.message+'\n');}
    }
  });
}
if(require.main===module)main();
module.exports={respond,tools};
