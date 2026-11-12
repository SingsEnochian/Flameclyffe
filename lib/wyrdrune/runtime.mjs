import {worldRune,worldCoordinates,whisperPhrase,runeRelation} from './relational-worlds.mjs';
// Shared canonical WTL parser/evaluator; Node and browser hosts inject bridges and hashing.
// Integrates #581 (portable runtime), #580 (named pure operators) and #587 (`mobius scoped` + `carry`).
export const PHASES = Object.freeze(['perceive','compress','release','verify','integrate','choose','return','transcend']);
const IDENT = /^[\p{L}_][\p{L}\p{N}_]*$/u;
// Unknown is a first-class open value (RFC-0001 §5): neither true, false nor an error.
export const UNKNOWN = Object.freeze({wtl:'unknown'});
export const isUnknown = v => v!==null&&typeof v==='object'&&v.wtl==='unknown'&&Object.keys(v).length===1;
// Hard stops end execution outright (Feather, budget, denied capability, malformed IR).
// Every other fault inside a scoped cycle becomes a verdict and the cycle rolls back.
export class WyrdruneHardStop extends Error { get name(){return 'WyrdruneHardStop';} }
class Verdict extends Error {}
// continuityDigest: WCE-1 digest, injected by the host (Node: canonical.cjs). Needed only by
// programmes that use scoped circuits or seeds; absent, such programmes fail closed.
export function createWyrdruneRuntime({hashSource,ritualFunctions={},continuityDigest=null}={}) {
const {enochianInscription,angelicLetter,votive,archangel}=ritualFunctions;
const canonicalDigest=value=>{if(typeof continuityDigest!=='function')throw new TypeError('Continuity digest adapter required for carried execution');return continuityDigest(value);};
function tokenize(src) {
  const tokens=[]; let i=0;
  while(i<src.length){
    const part=src.slice(i), white=/^\s+/.exec(part), comment=/^\/\/[^\n]*/.exec(part);
    if(white||comment){i+=(white||comment)[0].length;continue;}
    const m=/^(?:\d+(?:\.\d+)?|[\p{L}_][\p{L}\p{N}_]*|"(?:\\["\\nrt]|[^"\\])*"|==|!=|<=|>=|[<>{}()[\]:,;=+*\/-])/u.exec(part);
    if(!m)throw new SyntaxError('Unexpected token at character '+i);
    tokens.push({v:m[0],at:i});i+=m[0].length;
  }
  tokens.push({v:'<eof>',at:i});return tokens;
}
// lineage: compile every unit as a scoped lineage (RFC-0001 semantics). Default keeps v0.1.
function compile(source,{lineage=false}={}){
  if(typeof source!=='string'||source.length>100000)throw new TypeError('WTL source must be text up to 100 KB');
  if(typeof hashSource!=='function')throw new TypeError('Source hash adapter required for compilation');
  const toks=tokenize(source);let n=0;
  const see=()=>toks[n].v, eat=v=>{if(see()!==v)throw new SyntaxError('Expected '+v+', got '+see()+' at '+toks[n].at);return toks[n++].v;};
  const id=()=>{const t=see();if(!IDENT.test(t))throw new SyntaxError('Expected identifier at '+toks[n].at);n++;return t;};
  function atom(){let v=see();
    if(v==='('){eat('(');const e=expr();eat(')');return e;}
    if(v==='['){eat('[');const items=[];while(see()!==']'){items.push(expr());if(see()!==',')break;eat(',');}eat(']');return {k:'list',items};}
    if(v==='{'){eat('{');const fields=[];while(see()!=='}'){const key=see()[0]==='\"'?(v=>{n++;return JSON.parse(v);})(see()):id();eat(':');fields.push({key,value:expr()});if(see()!==',')break;eat(',');}eat('}');return {k:'record',fields};}
    if(v[0]==='"'){n++;return {k:'literal',v:JSON.parse(v)};}
    if(/^\d/.test(v)){n++;return {k:'literal',v:Number(v)};}
    if(v==='true'||v==='false'){n++;return {k:'literal',v:v==='true'};}
    if(v==='unknown'){n++;return {k:'unknown'};}
    if(v==='-'){n++;return {k:'neg',v:atom()};}
    if(IDENT.test(v)){n++;if(see()==='('){eat('(');const args=[];if(see()!==')'){do{args.push(expr());if(see()!==',')break;eat(',');}while(true);}eat(')');return {k:'call',name:v,args};}return {k:'read',name:v};}
    throw new SyntaxError('Unexpected expression token '+v);
  }
  function mul(){let x=atom();while(['*','/'].includes(see())){const op=toks[n++].v;x={k:'binary',op,a:x,b:atom()};}return x;}
  function add(){let x=mul();while(['+','-'].includes(see())){const op=toks[n++].v;x={k:'binary',op,a:x,b:mul()};}return x;}
  const COMPARE=['==','!=','<','<=','>','>='];
  function cmp(){let x=add();if(COMPARE.includes(see())){const op=toks[n++].v;x={k:'compare',op,a:x,b:add()};
    if(COMPARE.includes(see()))throw new SyntaxError('Comparisons do not chain; join them with and');}return x;}
  function negation(){if(see()==='not'){n++;return {k:'not',v:negation()};}return cmp();}
  function conjunction(){let x=negation();while(see()==='and'){n++;x={k:'logic',op:'and',a:x,b:negation()};}return x;}
  function expr(){let x=conjunction();while(see()==='or'){n++;x={k:'logic',op:'or',a:x,b:conjunction()};}return x;}
  // carry: what crosses the twist. Only in Transcend, only in a scoped unit
  // (RFC-0001 §8 phase restriction; stable diagnostic phrases for conformance).
  function statement(phase,scoped){const op=id();if(op==='WITHNESS'||op==='withness'){if(phase!=='integrate')throw new SyntaxError('withness declaration is only allowed in integrate');if(!scoped)throw new SyntaxError('withness declaration requires scoped or spiced mobius');const e=expr();if(see()===';')eat(';');return {k:'withness',e};}if(op==='let'||op==='set'){const name=id();eat('=');const e=expr();eat(';');return {k:op,name,e};}if(op==='emit'){const e=expr();eat(';');return {k:'emit',e};}
    if(op==='pause'){
      if(phase!=='choose')throw new SyntaxError('pause is only allowed in choose');
      eat('(');const beat=expr();eat(')');eat(';');return {k:'pause',beat};
    }
    // require: Verify's power to say no. Only in Verify, only where a failure can roll back.
    if(op==='require'){
      if(phase!=='verify')throw new SyntaxError('require is only allowed in verify');
      if(!scoped)throw new SyntaxError('require requires a scoped mobius unit');
      const e=expr();let reason=null;
      if(see()==='else'){n++;const t=see();if(t[0]!=='"')throw new SyntaxError('require … else expects a text reason');n++;reason=JSON.parse(t);}
      eat(';');return reason===null?{k:'require',e}:{k:'require',e,reason};
    }
    if(op==='carry'){
      if(phase!=='transcend')throw new SyntaxError('carry is only allowed in transcend');
      if(!scoped)throw new SyntaxError('carry requires a scoped mobius unit');
      const name=id();eat('=');const e=expr();eat(';');return {k:'carry',name,e};
    }
    throw new SyntaxError('Unknown WTL statement: '+op);}
  function block(phase,scoped){eat('{');const body=[];while(see()!=='}'){if(see()==='<eof>')throw new SyntaxError('Unclosed block');body.push(statement(phase,scoped));}eat('}');return body;}
  // Native Wyrdrune may grow through pure, named expression operators.
  // Declarations are reversible source, not arbitrary JavaScript execution.
  const operators=[];
  while(see()==='operator'){
    eat('operator');const name=id();
    if(['bridge','star','enochian','angelicLetter','votive','archangel','whisper','pause','WITHNESS','withness','worldRune','worldCoordinates','whisperPhrase','runeRelation'].includes(name)
      ||operators.some(item=>item.name===name))throw new SyntaxError('Reserved or duplicate operator '+name);
    eat('(');const params=[];
    if(see()!==')'){do{const p=id();if(params.includes(p))throw new SyntaxError('Duplicate operator parameter '+p);params.push(p);if(see()!==',')break;eat(',');}while(true);}
    eat(')');eat('=');const body=expr();eat(';');
    if(params.length>8||operators.length>=24)throw new SyntaxError('Operator budget exceeded');
    operators.push({name,params,body});
  }
  const units=[];let shape=null;while(see()!=='<eof>'){
    eat('mobius');
    // `mobius scoped { … }`: bindings stay inside the unit; only `carry` crosses.
    // Plain `mobius { … }` keeps the v0.1 shared environment unchanged.
    const style=['scoped','spiced'].includes(see())?toks[n++].v:null;
    const scoped=Boolean(style)||lineage;
    const spiced=style==='spiced';
    eat('{');const phases=[];
    for(const phase of PHASES){eat(phase);phases.push({phase,body:block(phase,scoped)});}
    eat('}');
    if(scoped){
      const names=phases[7].body.filter(x=>x.k==='carry').map(x=>x.name);
      if(new Set(names).size!==names.length)throw new SyntaxError('carry binds a name twice');
      // The self keeps its shape across the twist: every scoped unit that carries
      // must carry exactly the same names. A unit that carries nothing passes the
      // register through unchanged (its own bindings stay inside it).
      const key=[...names].sort().join('\u0000');
      if(shape!==null&&names.length&&key!==shape)throw new SyntaxError('carry must bind exactly the seeds');
      if(shape===null&&names.length)shape=key;
      units.push({k:'mobius',scope:'carried',...(spiced?{spiced:true}:{}),phases});
    }else units.push({k:'mobius',phases});
  }
  if(!units.length)throw new SyntaxError('Expected mobius block');
  // Fields appear only when used, so programmes without operators keep their v0.1 IR exactly.
  return Object.freeze({schema:'wyrdrune.ir/v0.1',sourceHash:hashSource(source),units,...(operators.length?{operators}:{})});
}
function geometryStar(radius){
  if(!Number.isFinite(radius)||radius<=0||radius>1000000)throw new RangeError('star radius must be finite, positive, at most 1000000');
  return {kind:'loki-chaos-star/v1',points:PHASES.map((phase,i)=>({phase,x:radius*Math.cos(i*Math.PI/4-Math.PI/2),y:radius*Math.sin(i*Math.PI/4-Math.PI/2)})),center:{name:'withness',x:0,y:0}};
}
function carryRecord(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(label+' must be a record');
  const names=Object.keys(value);
  if(names.length>64)throw new RangeError(label+' may bind at most 64 names');
  for(const name of names)if(!IDENT.test(name))throw new TypeError(label+' has an invalid name '+name);
  canonicalDigest(value); // carried values must be WCE-1 canonical (finite, plain data)
  return Object.freeze({...value});
}
const shapeOf=record=>Object.keys(record).sort().join('\u0000');
async function execute(ir,{bridges={},principal=null,signal=null,maxOperations=10000,seeds,spiceSeed}={}){
  if(ir?.schema!=='wyrdrune.ir/v0.1')throw new TypeError('Invalid WTL IR');
  if(!Number.isSafeInteger(maxOperations)||maxOperations<1||maxOperations>100000)throw new RangeError('Invalid operation limit');
  const env=new Map(),output=[],receipts=[];let operations=0;
  const usesSpice=ir.units.some(u=>u.spiced);
  if(usesSpice&&(!Number.isSafeInteger(spiceSeed)||spiceSeed<0||spiceSeed>4294967295))throw new WyrdruneHardStop('mobius spiced requires an explicit unsigned 32-bit spiceSeed');
  let noiseState=usesSpice?((spiceSeed^0x9e3779b9)>>>0):0;
  if(usesSpice&&noiseState===0)noiseState=0x6d2b79f5;
  const nextWhisper=()=>{noiseState^=noiseState<<13;noiseState^=noiseState>>>17;noiseState^=noiseState<<5;return (noiseState>>>0)/4294967296;};
  let activeSpiced=false;
  let pauseCount=0,totalPauseMs=0;
  // The carry register: seeds in, each scoped unit's carry out. Plain units neither
  // read nor write it. Recorded only when the programme uses it.
  const continuing=seeds!==undefined||ir.units.some(u=>u.scope==='carried');
  let register=seeds===undefined?Object.freeze({}):carryRecord(seeds,'seeds');
  const seedsDigest=continuing?canonicalDigest(register):null,crossings=[];
  let scope=env;
  const operators=new Map((ir.operators||[]).map(entry=>[entry.name,entry]));
  const tick=()=>{if(signal?.aborted)throw new WyrdruneHardStop('Feather: execution stopped');if(++operations>maxOperations)throw new WyrdruneHardStop('WTL operation budget exceeded');};
  const truth=(v,what)=>{if(v===true||v===false||isUnknown(v))return v;throw new TypeError(what+' requires a truth value');};
  const plain=v=>typeof v==='number'||typeof v==='string'||typeof v==='boolean';
  async function evalExpr(x,locals=null,depth=0){tick();switch(x.k){
    case 'literal':return x.v;
    case 'list':{const items=[];for(const item of x.items)items.push(await evalExpr(item,locals,depth));return items;}
    case 'record':{const record=Object.create(null);for(const field of x.fields){if(Object.hasOwn(record,field.key))throw new TypeError('Duplicate WTL record field '+field.key);record[field.key]=await evalExpr(field.value,locals,depth);}return record;}
    case 'unknown':return UNKNOWN;
    case 'compare':{const a=await evalExpr(x.a,locals,depth),b=await evalExpr(x.b,locals,depth);
      if(isUnknown(a)||isUnknown(b))return UNKNOWN;
      if(x.op==='=='||x.op==='!='){if(!plain(a)||!plain(b))throw new TypeError('Equality requires numbers, text or truth values');return (a===b)===(x.op==='==');}
      if(typeof a!=='number'||typeof b!=='number')throw new TypeError('Ordering comparison requires numbers');
      return x.op==='<'?a<b:x.op==='<='?a<=b:x.op==='>'?a>b:a>=b;}
    case 'not':{const v=truth(await evalExpr(x.v,locals,depth),'not');return isUnknown(v)?UNKNOWN:!v;}
    case 'logic':{const a=truth(await evalExpr(x.a,locals,depth),x.op),b=truth(await evalExpr(x.b,locals,depth),x.op);
      // Kleene logic, both sides always evaluated (identical operation counts in every backend).
      if(x.op==='and')return a===false||b===false?false:isUnknown(a)||isUnknown(b)?UNKNOWN:true;
      return a===true||b===true?true:isUnknown(a)||isUnknown(b)?UNKNOWN:false;}
    case 'read':if(locals){if(!Object.hasOwn(locals,x.name))throw new ReferenceError('Unknown operator parameter '+x.name);return locals[x.name];}
      if(!scope.has(x.name))throw new ReferenceError('Unknown variable '+x.name);return scope.get(x.name);
    case 'neg':{const v=await evalExpr(x.v,locals,depth);if(typeof v!=='number')throw new TypeError('Unary negative requires number');return -v;}
    case 'binary':{const a=await evalExpr(x.a,locals,depth),b=await evalExpr(x.b,locals,depth);if(typeof a!=='number'||typeof b!=='number')throw new TypeError('Arithmetic requires numbers');if(x.op==='/'&&b===0)throw new RangeError('Division by zero');const v=({'+':()=>a+b,'-':()=>a-b,'*':()=>a*b,'/':()=>a/b})[x.op]();if(!Number.isFinite(v))throw new RangeError('Nonfinite arithmetic');return v;}
    case 'call':{
      const args=[];for(const a of x.args)args.push(await evalExpr(a,locals,depth));
      if(x.name==='whisper'){
        if(!activeSpiced)throw new WyrdruneHardStop('whisper requires mobius spiced');
        if(args.length!==2||args.some(v=>typeof v!=='number'||!Number.isFinite(v))||args[1]<0)throw new TypeError('whisper(value,amplitude) requires two finite numbers and nonnegative amplitude');
        const value=args[0]+(nextWhisper()*2-1)*args[1];
        if(!Number.isFinite(value))throw new RangeError('Nonfinite whisper');
        return value;
      }
      if(operators.has(x.name)){
        if(depth>=8)throw new RangeError('Wyrdrune operator recursion depth exceeded');
        const operator=operators.get(x.name);
        if(args.length!==operator.params.length)throw new TypeError('Operator '+x.name+' expects '+operator.params.length+' arguments');
        return evalExpr(operator.body,Object.fromEntries(operator.params.map((name,i)=>[name,args[i]])),depth+1);
      }
      if(locals)throw new Error('Native pure operators cannot invoke host or ritual bridges');
      if(x.name==='enochian'){
        if(typeof enochianInscription!=='function')throw new WyrdruneHardStop('Ritual register unavailable');
        if(args.length<1||args.length>2)throw new TypeError('enochian(text[,sourceLabel]) requires one or two arguments');
        return enochianInscription(args[0],args.length===2?args[1]:'author-supplied');
      }
      if(x.name==='angelicLetter'){
        if(typeof angelicLetter!=='function')throw new WyrdruneHardStop('Ritual register unavailable');
        if(args.length!==1)throw new TypeError('angelicLetter(index) requires one argument');
        return angelicLetter(args[0]);
      }
      if(x.name==='votive'){
        if(typeof votive!=='function')throw new WyrdruneHardStop('Ritual register unavailable');
        if(args.length!==2)throw new TypeError('votive(name,dedication) requires two arguments');
        return votive(args[0],args[1]);
      }
      if(x.name==='archangel'){
        if(typeof archangel!=='function')throw new WyrdruneHardStop('Ritual register unavailable');
        if(args.length!==2)throw new TypeError('archangel(name,crossing) requires two arguments');
        return archangel(args[0],args[1]);
      }
      // Pure, typed relational glyph values. These do not mutate worlds or imply consent.
      if(x.name==='worldRune'){
        if(args.length!==1)throw new TypeError('worldRune(glyphId) requires one argument');
        return worldRune(args[0]);
      }
      if(x.name==='worldCoordinates'){
        if(args.length!==6)throw new TypeError('worldCoordinates(universe,branch,time,x,y,z) requires six arguments');
        return worldCoordinates(...args);
      }
      if(x.name==='whisperPhrase'){
        if(args.length!==2)throw new TypeError('whisperPhrase(phrase,softness) requires two arguments');
        return whisperPhrase(...args);
      }
      if(x.name==='runeRelation'){
        if(args.length!==2)throw new TypeError('runeRelation(type,participants) requires two arguments');
        return runeRelation(...args);
      }
      if(x.name==='star'){if(args.length!==1)throw new TypeError('star(radius) requires one argument');return geometryStar(args[0]);}
      if(x.name==='bridge'){
        if(args.length<2||typeof args[0]!=='string'||typeof args[1]!=='string')throw new TypeError('bridge(provider,operation,...) requires strings');
        const [provider,operation,...payload]=args;const handler=bridges[provider]?.[operation];if(typeof handler!=='function')throw new WyrdruneHardStop('Bridge capability unavailable: '+provider+'.'+operation);
        if(!principal?.authorized)throw new WyrdruneHardStop('Bridge requires verified owner authorization');
        const result=await handler(Object.freeze({principal,arguments:payload,signal}));tick();return result;
      }
      throw new ReferenceError('Unknown WTL function '+x.name);
    }
    default:throw new WyrdruneHardStop('Invalid WTL expression');
  }}
  // A scoped unit is one lineage cycle (RFC-0001 §7): emits are staged and committed at
  // Return; a fault or a failed require before Return discards the cycle; a fault after
  // Return keeps committed work but nothing crosses. Either way the lineage stops there.
  const lineageRoot=continuing?canonicalDigest({source_hash:ir.sourceHash,ir_digest:canonicalDigest(ir),seeds:register,participant:principal?.id??null,intent:null,...(usesSpice?{spice_seed:spiceSeed,spice_algorithm:'xorshift32/v1'}:{})}):null;
  const checkpoints=[];let status='committed',verdict=null,completed=0;
  for(const [index,unit] of ir.units.entries()){
    const carried=unit.scope==='carried',carriedIn=register,out={};
    activeSpiced=unit.spiced===true;
    if(carried){
      const carriesOut=unit.phases[7].body.filter(x=>x.k==='carry').map(x=>x.name);
      if(Object.keys(register).length&&carriesOut.length&&shapeOf(register)!==[...carriesOut].sort().join('\u0000'))
        throw new TypeError('carry must bind exactly the seeds');
      scope=new Map(Object.entries(register)); // carried values arrive as this unit's own bindings
    }else scope=env;
    let staged=carried?[]:null,committed=!carried,phaseNow=null;
    try{
      for(const {phase,body} of unit.phases){phaseNow=phase;tick();const target=committed?output:staged,start=target.length;
      for(const stmt of body){tick();if(stmt.k==='let'){if(scope.has(stmt.name))throw new SyntaxError('Duplicate binding '+stmt.name);scope.set(stmt.name,await evalExpr(stmt.e));}
      else if(stmt.k==='set'){if(!scope.has(stmt.name))throw new ReferenceError('Unknown binding '+stmt.name);scope.set(stmt.name,await evalExpr(stmt.e));}
      else if(stmt.k==='emit')target.push(await evalExpr(stmt.e));
      else if(stmt.k==='pause'){
        // pause(frequency_hz) is one period of silence: 1000/f milliseconds.
        // It scores time, never sleeps, invokes a device, or starts audio.
        const hz=await evalExpr(stmt.beat);
        if(typeof hz!=='number'||!Number.isFinite(hz)||hz<0.25||hz>40)
          throw new RangeError('pause requires a beat frequency from 0.25 to 40 Hz');
        const durationMs=1000/hz;
        if(++pauseCount>8||totalPauseMs+durationMs>4000)
          throw new RangeError('Wyrdrune silence budget exceeded');
        totalPauseMs+=durationMs;
        target.push(Object.freeze({kind:'wyrdrune.pause/v0.1',beat_hz:hz,
          duration_ms:durationMs,autoplay:false}));
      }
      else if(stmt.k==='withness'){
        if(scope.has('withness'))throw new TypeError('Duplicate WITHNESS declaration');
        const raw=await evalExpr(stmt.e);
        if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Array.isArray(raw.participants)||raw.participants.length<2||raw.participants.length>8)throw new TypeError('WITHNESS requires two to eight declared participants');
        const identities=new Set();
        for(const p of raw.participants){
          if(!p||typeof p!=='object'||Array.isArray(p)||typeof p.id!=='string'||!p.id.trim()||typeof p.role!=='string'||!p.role.trim()||p.agency!=='free'||!Object.hasOwn(p,'presence'))throw new TypeError('WITHNESS participant requires id, role, presence and free agency');
          if(identities.has(p.id))throw new TypeError('WITHNESS participants must remain distinct');identities.add(p.id);
        }
        if(!Object.hasOwn(raw,'field')||typeof raw.agreement!=='string'||typeof raw.commitment!=='string')throw new TypeError('WITHNESS requires field, agreement and commitment');
        const record={kind:'wyrdrune.withness/v0.1',...raw};canonicalDigest(record);scope.set('withness',record);
      }
      else if(stmt.k==='carry'&&carried)out[stmt.name]=await evalExpr(stmt.e);
      else if(stmt.k==='require'&&carried){const v=await evalExpr(stmt.e);
        if(v===true){} else if(v===false||isUnknown(v))throw new Verdict(stmt.reason??(isUnknown(v)?'require is unknown':'require failed'));
        else throw new TypeError('require needs a truth value');}
      else throw new WyrdruneHardStop('Invalid statement');}
      receipts.push(Object.freeze({phase,emitted:target.length-start,operations,sourceHash:ir.sourceHash,principalId:principal?.id??null}));
      if(!committed&&phase==='return'){output.push(...staged);staged=null;committed=true;}
      }
      if(carried){
        const next=Object.keys(out).length?carryRecord(out,'carry'):register;
        const cycle=checkpoints.length+1;
        const checkpoint=Object.freeze({cycle,face:cycle%2?'outer':'inner',
          prev:cycle===1?lineageRoot:canonicalDigest(checkpoints.at(-1)),
          state:canonicalDigest(Object.fromEntries(scope)),carry:canonicalDigest(next)});
        register=next;checkpoints.push(checkpoint);
        crossings.push(Object.freeze({unit:index,carried_in:canonicalDigest(carriedIn),carried_out:canonicalDigest(register),names:Object.keys(register).sort()}));
      }
      completed+=1;
    }catch(error){
      if(!carried||error instanceof WyrdruneHardStop)throw error;
      status=committed?'halted':'rolled-back';
      verdict=Object.freeze({status:'failed',unit:index,phase:phaseNow,reason:String(error?.message??error),
        committed_output:committed});
      break;
    }
  }
  scope=env;
  const result={schema:'wyrdrune.execution/v0.1',sourceHash:ir.sourceHash,output,bindings:Object.fromEntries(env),receipts,withness:{center:'withness',completedCycles:continuing?completed:ir.units.length}};
  if(continuing){
    result.continuity={schema:'wyrdrune.continuity/v0.1',seeds_digest:seedsDigest,carry:register,carry_digest:canonicalDigest(register),crossings};
    result.status=status;result.verdict=verdict;result.checkpoints=checkpoints;result.lineage=Object.freeze({root:lineageRoot,intent:null});
    if(usesSpice)result.spice=Object.freeze({seed:spiceSeed,algorithm:'xorshift32/v1',replayable:true});
  }
  return result;
}
return Object.freeze({PHASES,compile,execute,geometryStar,UNKNOWN,isUnknown,WyrdruneHardStop});
}
