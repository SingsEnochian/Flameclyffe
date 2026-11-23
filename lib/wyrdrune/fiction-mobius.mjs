// One Ship · Fiction -> actual canonical Wyrdrune Möbius execution.
// Fictional events are executable WTL data; real effects are NEVER inferred
// from prose, and cue/change records remain proposal-only.
import {sha256Hex} from './browser-canonical.mjs';

export const FICTION_SCHEMA='wayglass.fiction-mobius/v1';
export const FICTION_EVENT='wayglass.fiction-event/v1';
export const FICTION_RETURN='wayglass.fiction-return/v1';
export const FICTION_EXAMPLE=[
  '::scene The Green Lantern',
  'A green lantern glowed beside the doorway.',
  'Falka: "The gate remembers our names."',
  '::cue audio soft glass harmonics',
  '::change the fictional door opens',
  'Beyond the threshold, another room began.'
].join('\n');
const quote=x=>JSON.stringify(x);
const maxChars=12000,maxNodes=32;
function requireText(value,field,max=2000) {
  if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u0008\u000B\u000E-\u001F]/.test(value))
    throw new TypeError('Invalid '+field+' (text required; bounded, no control characters).');
  return value.trim();
}
export function parseFiction(text,{world='wayglass:fiction'}={}) {
  const original=requireText(text,'fiction',maxChars).replace(/\r\n?/g,'\n');
  const worldId=requireText(world,'fiction world',120);
  if(/[<>]/.test(worldId))throw new TypeError('Fiction world label cannot contain markup.');
  let scene='Untitled scene';
  const nodes=[];
  for(const [offset,raw] of original.split('\n').entries()) {
    const line=raw.trim();
    if(!line)continue;
    let kind='narration',speaker='',cue='',status='text-committed',passage=line;
    let match;
    if(line.startsWith('::')){
      if((match=/^::scene\s+(.+)$/u.exec(line))){
        kind='scene';scene=requireText(match[1],'scene',120);passage=scene;
      }else if((match=/^::cue\s+(audio|image|video)\s+(.+)$/u.exec(line))){
        kind='cue';cue=match[1];passage=requireText(match[2],'cue',1000);status='proposal-only';
      }else if((match=/^::change\s+(.+)$/u.exec(line))){
        kind='change';passage=requireText(match[1],'change',1000);status='proposal-only';
      }else throw new SyntaxError('Unsupported fiction directive at line '+(offset+1)+'. Use ::scene, ::cue audio|image|video, or ::change.');
    }else if((match=/^([\p{L}][\p{L}\p{N}_ '’.-]{0,59}):\s*(["“].+["”])$/u.exec(line))){
      kind='dialogue';speaker=requireText(match[1],'speaker',60);
      passage=requireText(match[2],'dialogue',2000);
    }else if(line.length>2000)throw new RangeError('Fiction line '+(offset+1)+' exceeds 2000 characters.');
    if(nodes.length>=maxNodes)throw new RangeError('Fiction exceeds '+maxNodes+' Möbius crossings; choose a shorter excerpt.');
    nodes.push(Object.freeze({
      index:nodes.length+1,source_line:offset+1,
      world:worldId,scene,kind,speaker,cue,passage,
      effect_status:status,observation_kind:'authored-fiction',
      physically_verified:false
    }));
  }
  if(!nodes.length)throw new SyntaxError('Fiction must contain at least one authored line.');
  return Object.freeze({
    schema:FICTION_SCHEMA,
    source_hash:sha256Hex(original),
    normalised_source:original,
    world:worldId,
    nodes:Object.freeze(nodes),
    executable_text:true,
    device_effects_supported:false,
    model_invoked:false
  });
}
function recordExpr(record){
  return '{'+Object.entries(record).map(([key,value])=>key+':'+(typeof value==='number'?String(value):value===true?'true':value===false?'false':quote(value))).join(',')+'}';
}
function wordRecord(node) {
  return {
    kind:FICTION_EVENT,world:node.world,scene:node.scene,index:node.index,
    source_line:node.source_line,classification:node.kind,
    passage:node.passage,speaker:node.speaker,cue:node.cue,
    effect_status:node.effect_status,observation_kind:node.observation_kind,
    physically_verified:false
  };
}
function returnRecord(node){
  return {kind:FICTION_RETURN,index:node.index,scene:node.scene,word:'Held',observation_kind:'authored-fiction'};
}
function renderWtl(ast){
  const lines=['// Whole Pizza · source-bound authored fiction, not a real-world effect.',
    '// No host bridges. Eightfold order, explicit Verify, one Return per crossing.'];
  for(const node of ast.nodes) {
    const previous=node.index-1;
    lines.push('mobius scoped {',
      '  perceive {',
      ...(node.index===1?['    let story_step = 0;']:[]),
      '    let authored_line = '+quote(node.passage)+';',
      '  }',
      '  compress { let next_step = story_step + 1; }',
      '  release {}',
      '  verify { require next_step == '+node.index+' else '+quote('Fiction crossing '+node.index+' continuity mismatch')+'; }',
      '  integrate {}',
      '  choose { emit '+recordExpr(wordRecord(node))+'; }',
      '  return { emit '+recordExpr(returnRecord(node))+'; }',
      '  transcend { carry story_step = next_step; }',
      '}');
  }
  return lines.join('\n')+'\n';
}
export function fictionToWtl(source,{world='wayglass:fiction',compile}={}) {
  const story=typeof source==='string'?parseFiction(source,{world}):source;
  if(story?.schema!==FICTION_SCHEMA||!Array.isArray(story.nodes))
    throw new TypeError('Expected the canonical authored fiction AST.');
  // Round-tripping an AST through external JSON may not grant extra powers.
  const original=story.normalised_source;
  const checked=parseFiction(original,{world:story.world});
  if(JSON.stringify(checked.nodes)!==JSON.stringify(story.nodes)||checked.source_hash!==story.source_hash)
    throw new TypeError('Fiction AST differs from its reviewed source; refusing compilation.');
  const wtl=renderWtl(checked);
  const ir=typeof compile==='function'?compile(wtl):null;
  if(wtl.length>50000)throw new RangeError('Generated WTL exceeds the host programme budget.');
  return Object.freeze({schema:'wayglass.fiction-compiled/v1',fiction:checked,wtl,ir,executed:false,
    needs_explicit_run:true,effect_status:'proposals-only-for-cues-and-changes'});
}
export function verifyFictionExecution(program,execution){
  if(program?.schema!=='wayglass.fiction-compiled/v1'||!program.ir)
    throw new TypeError('Reviewed, compiled fiction programme required.');
  if(execution?.status!=='committed')throw new Error('Fiction execution has not committed.');
  if(execution.sourceHash!==program.ir.sourceHash)throw new Error('Fiction execution source hash differs.');
  const expected=program.fiction.nodes.flatMap(node=>[wordRecord(node),returnRecord(node)]);
  if(JSON.stringify(expected)!==JSON.stringify(execution.output))
    throw new Error('Fiction execution events disagree with the authored text.');
  if(execution.withness?.completedCycles!==program.fiction.nodes.length||
      execution.continuity?.carry?.story_step!==program.fiction.nodes.length||
      execution.checkpoints?.length!==program.fiction.nodes.length)
    throw new Error('Fiction Möbius crossing/Return continuity not verified.');
  return Object.freeze({
    schema:'wayglass.fiction-receipt/v1',
    fiction_source_hash:program.fiction.source_hash,
    wtl_source_hash:program.ir.sourceHash,
    status:'committed',crossings:program.fiction.nodes.length,
    carry:execution.continuity.carry,
    events:Object.freeze(program.fiction.nodes.map(wordRecord)),
    proposed_effects:Object.freeze(program.fiction.nodes.filter(x=>x.effect_status==='proposal-only').map(wordRecord)),
    external_effects:Object.freeze([]),
    physically_verified:false,model_invoked:false,
    interpretation:'authored-text-and-explicit-directions-only',
  });
}
