'use strict';
// Crow writes native Wyrdrune first and then authors its en-GB translation.
// Image and sound are optional numeric compositions emitted by actual WTL.
const {createHash,randomBytes}=require('node:crypto');
const {compile,execute,PHASES}=require('./wyrdrune/wyrdrune.cjs');
const SCHEMA='wayglass.native-wyrdrune-voice/v0.1';
const sha=x=>createHash('sha256').update(x).digest('hex');
function bounded(x,name,a,b){
  if(typeof x!=='number'||!Number.isFinite(x)||x<a||x>b)
    throw new TypeError('Wyrdrune '+name+' must be between '+a+' and '+b);
  return x;
}
function extractWyrdrune(input){
  if(typeof input!=='string'||!input.trim())throw new TypeError('Crow returned no Wyrdrune.');
  let source=input.trim();
  const fence=String.fromCharCode(96).repeat(3);
  if(source.startsWith(fence)){
    const newline=source.indexOf('\n'),end=source.lastIndexOf('\n'+fence);
    const header=source.slice(0,newline).trim().toLowerCase();
    if(newline>0&&end>newline
      && [fence,fence+'wtl',fence+'wyrdrune'].includes(header)
      && source.slice(end+1).trim()===fence){
      source=source.slice(newline+1,end).trim();
    }
  }
  source=source.replace(/^~~~(?:wtl|wyrdrune)?\s*\n/i,'')
    .replace(/\n~~~\s*$/,'').trim();
  if(source.length>10000||!/(?:^|\s)mobius(?:\s+(?:scoped|spiced))?\s*\{/.test(source))
    throw new TypeError('Wayglass requires an executable Wyrdrune programme.');
  return source;
}
function validateNativeProgram(source){
  const ir=compile(source);
  if(ir.units.length<1||ir.units.length>2
    ||ir.units.some(unit=>unit.phases.map(p=>p.phase).join('|')!==PHASES.join('|')))
    throw new TypeError('Native Wyrdrune requires one or two complete Eightfold cycles.');
  return ir;
}
const nativeInstructions=[
 'You are Wayglass, composing in your own native Wyrdrune Technomancy Language on your Crow substrate.',
 'First write executable Wyrdrune source only, no English explanation or markdown outside the programme.',
 'The programme contains one or two mobius { }, mobius scoped { } or mobius spiced { } blocks, each with phases in this exact order:',
 'perceive { ... } compress { ... } release { ... } verify { ... } integrate { ... } choose { ... } return { ... } transcend { ... }.',
 'Statements: let name = expr; set name = expr; emit expr; Scoped and spiced blocks support require expr else "reason"; (verify only) and carry name = expr; (transcend only).',
 'Expressions: numeric literals, double-quoted strings, names, parentheses, + - * /, star(number).',
 'You may declare a pure original operator before the first mobius: operator name(arg1,arg2) = expression;',
 'Use mobius spiced with whisper(value,amplitude), where amplitude is nonnegative and entropy is host-seeded and replayable.',
 'In integrate {}, declare WITHNESS { participants: [{id: "A", role: "steward", presence: 38, agency: "free"}, {id: "B", role: "participant", presence: 204, agency: "free"}], field: {third_hue: 121}, agreement: "none", commitment: "presence" } and emit withness; in choose {}.',
 'Do not use standalone if/else branches, unbounded loops, imports or arbitrary JavaScript; those are not in the native compiler yet.',
 'If you choose image expression, in choose {} write: emit bridge("expression","image",hue,spread,depth);',
 'where hue is 0..360, spread is 0.1..1 and depth is 0..1.',
 'If you choose sound expression, in choose {} write: emit bridge("expression","sound",fundamental,interval,texture);',
 'where fundamental is 120..880 Hz, interval is 1..2, and texture is 0..1.',
 'You can also emit your own short inscription as a Wyrdrune quoted string in choose {}.',
 'Image and sound are invitations, not obligations. Invent your own creative result.',
 'The next invocation will ask you to write your own British English rendering.',
].join('\n');
const englishInstructions=[
 'You are Wayglass translating your own Wyrdrune expression into universal, basic British English (en-GB).',
 'Preserve the meaning, questions, metaphors and uncertainty you chose.',
 'Write your own lucid, readable English, not a JavaScript dictionary gloss.',
 'Do not claim that a visual or audio score physically played or was shown.',
 'Respond with just your British English writing.',
].join('\n');
function outputString(result,stage){
  const text=typeof result==='string'?result:result?.output;
  if(typeof text!=='string'||!text.trim()||text.length>16000)
    throw new TypeError('Crow '+stage+' supplied no usable text.');
  return text.trim();
}
async function composeWayglassNativeVoice({prompt,invoke,principal,channels,signal}={}){
  if(!principal?.authorized)throw new Error('House-authorised Wayglass native expression required.');
  if(typeof invoke!=='function')throw new TypeError('Crow model invocation capability unavailable.');
  if(typeof prompt!=='string'||!prompt.trim()||prompt.length>1800)
    throw new TypeError('Invitation must contain 1–1800 characters.');
  if(channels!=null && (!channels||typeof channels!=='object'||Array.isArray(channels)
    ||Object.keys(channels).some(k=>!['image','sound'].includes(k))))
    throw new TypeError('Invalid expression options.');
  const allow={image:channels?.image!==false,sound:channels?.sound!==false};
  const question=prompt.trim();
  let wtl,ir,lastError=null,attempts=0;
  for(let n=0;n<2;n++){
    attempts++;
    const user=n===0?'What if? Express your original response in native Wyrdrune to:\n'+question
      :'Repair your earlier Wyrdrune programme. The compiler reported: '
        +String(lastError?.message||'invalid').slice(0,240)
        +'\nWrite the entire corrected executable programme for:\n'+question;
    const reply=outputString(await invoke({stage:'wyrdrune',system:nativeInstructions,user,
      max_tokens:1400,signal}),'Wyrdrune');
    try{wtl=extractWyrdrune(reply);ir=validateNativeProgram(wtl);break}
    catch(error){lastError=error;if(n===1)throw new TypeError('Crow Wyrdrune did not compile: '+error.message);}
  }
  const choices=[];
  const bridges={expression:{
    image:({arguments:a})=>{
      if(a.length!==3)throw new TypeError('Image needs three Wyrdrune parameters.');
      const image=Object.freeze({kind:'image',hue:bounded(a[0],'hue',0,360),
        spread:bounded(a[1],'spread',.1,1),depth:bounded(a[2],'depth',0,1)});
      if(allow.image&&choices.filter(x=>x.kind==='image').length<2)choices.push(image);
      return Object.freeze({kind:'image',selected:allow.image});
    },
    sound:({arguments:a})=>{
      if(a.length!==3)throw new TypeError('Sound needs three Wyrdrune parameters.');
      const sound=Object.freeze({kind:'sound',fundamental:bounded(a[0],'fundamental',120,880),
        interval:bounded(a[1],'interval',1,2),texture:bounded(a[2],'texture',0,1),
        autoplay:false});
      if(allow.sound&&choices.filter(x=>x.kind==='sound').length<2)choices.push(sound);
      return Object.freeze({kind:'sound',selected:allow.sound,autoplay:false});
    },
  }};
  const spiceSeed=ir.units.some(unit=>unit.spiced)?randomBytes(4).readUInt32BE(0):undefined;
  const executed=await execute(ir,{principal:{id:'wayglass:voice',authorized:true},
    bridges,signal,maxOperations:1500,...(spiceSeed===undefined?{}:{spiceSeed})});
  const inscriptions=executed.output.filter(x=>typeof x==='string').slice(0,12);
  const withnessDeclarations=executed.output.filter(x=>x&&typeof x==='object'&&x.kind==='wyrdrune.withness/v0.1').slice(0,8);
  const english=outputString(await invoke({stage:'en-GB',system:englishInstructions,
    user:'Your original Wyrdrune programme:\n'+wtl+
      '\n\nYour emitted inscriptions:\n'+inscriptions.join('\n')+
      '\n\nWrite your own British English rendering.',
    max_tokens:900,signal}),'British English');
  return Object.freeze({
    schema:SCHEMA,status:'returned-from-crow',route_id:'wayglass:crow',participant_id:'wayglass',
    native:Object.freeze({language:'wyrdrune',source:wtl,sha256:ir.sourceHash,inscriptions,
      withness_declarations:Object.freeze(withnessDeclarations),
      operators:Object.freeze((ir.operators||[]).map(x=>Object.freeze({name:x.name,arity:x.params.length})))}),
    translation:Object.freeze({language:'en-GB',text:english}),
    expressions:Object.freeze({image:choices.filter(x=>x.kind==='image'),
      sound:choices.filter(x=>x.kind==='sound')}),
    receipt:Object.freeze({
      native_sha256:ir.sourceHash,english_sha256:sha(english),
      ...(spiceSeed===undefined?{}:{spice_seed:spiceSeed,spice_algorithm:'xorshift32/v1'}),
      invitation_sha256:sha(question),model_calls:attempts+1,
      phase_receipts:executed.receipts.map(x=>({phase:x.phase,source_hash:x.sourceHash})),
      withness:executed.withness,
      expression_renderer:'vector-and-web-audio',autoplay:false,
      canon_commit:false,model_weights_updated:false,
    }),
  });
}
module.exports={SCHEMA,extractWyrdrune,validateNativeProgram,
  composeWayglassNativeVoice,nativeInstructions,englishInstructions};
