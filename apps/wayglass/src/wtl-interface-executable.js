import {ATELIER_SCHEMA,validateWtlInterfaceProposal} from './wtl-interface-atelier.js';
// Bounded, deterministic Wyrdrune interface dialect. No eval, imports, loops or privileges.
// This is a deliberately small executable subset, not the full WTL compiler.
const material=new Set(['opaline','labradorite','amber','moss','clear']);
const kinds=new Set(['heading','text','panel','status']);
const actions=new Set(['feather','open-codex','open-writing']);
const literal=/^"(?:[^"\\]|\\["\\n])*"$/u;
function parseString(raw,line){
 if(!literal.test(raw))throw new SyntaxError('Line '+line+': quoted string required');
 const value=JSON.parse(raw);
 if(typeof value!=='string'||/[\u0000-\u001f\u007f]/u.test(value))throw new SyntaxError('Line '+line+': invalid text');
 return value;
}
export function compileWyrdruneInterface(source,{author='local-owner',provenance='local-explicit-execution'}={}){
 if(typeof source!=='string'||source.length>16000)throw new TypeError('WTL source budget exceeded');
 const lines=source.split(/\r?\n/u);if(lines.length>80)throw new SyntaxError('Too many statements');
 const ir=[];let started=false,ended=false;
 for(let i=0;i<lines.length;i++){
  const line=lines[i].trim();if(!line||line.startsWith('//'))continue;
  if(!started){if(line!=='interface {')throw new SyntaxError('Line '+(i+1)+': expected interface {');started=true;continue;}
  if(ended)throw new SyntaxError('Line '+(i+1)+': trailing statement');
  if(line==='}'){ended=true;continue;}
  const m=/^(title|material|heading|text|panel|status|action)\s+(.+)$/u.exec(line);
  if(!m)throw new SyntaxError('Line '+(i+1)+': unknown WTL statement');
  const [,op,arg]=m;
  if(op==='material'){if(!material.has(arg))throw new SyntaxError('Line '+(i+1)+': unknown material');ir.push(Object.freeze({op,value:arg}));}
  else if(op==='action'){const a=/^(feather|open-codex|open-writing)\s+("(?:[^"\\]|\\["\\n])*")$/u.exec(arg);if(!a||!actions.has(a[1]))throw new SyntaxError('Line '+(i+1)+': invalid action');ir.push(Object.freeze({op,action:a[1],value:parseString(a[2],i+1)}));}
  else {const value=parseString(arg,i+1);if(value.length>(op==='title'?100:500))throw new SyntaxError('Line '+(i+1)+': text budget exceeded');ir.push(Object.freeze({op,value}));}
 }
 if(!started||!ended)throw new SyntaxError('Unclosed interface');
 if(ir.length>36)throw new SyntaxError('Instruction budget exceeded');
 if(!ir.some(x=>x.op==='title')||!ir.some(x=>x.op==='material')||!ir.some(x=>kinds.has(x.op)||x.op==='action'))throw new SyntaxError('Title, material and node required');
 const proposal={schema:ATELIER_SCHEMA,title:'',material:'',author,provenance,wtl_source:source,nodes:[]};
 for(const x of ir){if(x.op==='title')proposal.title=x.value;else if(x.op==='material')proposal.material=x.value;else if(x.op==='action')proposal.nodes.push({kind:'action',text:x.value,action:x.action});else proposal.nodes.push({kind:x.op,text:x.value});}
 return Object.freeze({schema:'wayglass.wtl-interface-ir/v1',instructions:Object.freeze(ir),proposal:validateWtlInterfaceProposal(proposal),epistemic_register:'local-explicit-WTL-subset'});
}
