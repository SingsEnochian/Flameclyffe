// Shared canonical WTL parser/evaluator; Node and browser hosts inject bridges and hashing.
// Integrates #581 (portable runtime), #580 (named pure operators) and #587 (`mobius scoped` + `carry`).
export const PHASES = Object.freeze(['perceive','compress','release','verify','integrate','choose','return','transcend']);
const IDENT = /^[\p{L}_][\p{L}\p{N}_]*$/u;
// continuityDigest: WCE-1 digest, injected by the host (Node: canonical.cjs). Needed only by
// programmes that use scoped circuits or seeds; absent, such programmes fail closed.
export function createWyrdruneRuntime({hashSource,ritualFunctions={},continuityDigest=null}={}) {
const {enochianInscription,angelicLetter,votive}=ritualFunctions;
const canonicalDigest=value=>{if(typeof continuityDigest!=='function')throw new TypeError('Continuity digest adapter required for carried execution');return continuityDigest(value);};
function tokenize(src) {
  const tokens=[]; let i=0;
  while(i<src.length){
    const part=src.slice(i), white=/^\s+/.exec(part), comment=/^\/\/[^\n]*/.exec(part);
    if(white||comment){i+=(white||comment)[0].length;continue;}
    const m=/^(?:\d+(?:\.\d+)?|[\p{L}_][\p{L}\p{N}_]*|"(?:\\["\\nrt]|[^"\\])*"|==|!=|<=|>=|[{}(),;=+*\/-])/u.exec(part);
    if(!m)throw new SyntaxError('Unexpected token at character '+i);
    tokens.push({v:m[0],at:i});i+=m[0].length;
  }
  tokens.push({v:'<eof>',at:i});return tokens;
}
function compile(source){
  if(typeof source!=='string'||source.length>100000)throw new TypeError('WTL source must be text up to 100 KB');
  if(typeof hashSource!=='function')throw new TypeError('Source hash adapter required for compilation');
  const toks=tokenize(source);let n=0;
  const see=()=>toks[n].v, eat=v=>{if(see()!==v)throw new SyntaxError('Expected '+v+', got '+see()+' at '+toks[n].at);return toks[n++].v;};
  const id=()=>{const t=see();if(!IDENT.test(t))throw new SyntaxError('Expected identifier at '+toks[n].at);n++;return t;};
  function atom(){let v=see();
    if(v==='('){eat('(');const e=expr();eat(')');return e;}
    if(v[0]==='"'){n++;return {k:'literal',v:JSON.parse(v)};}
    if(/^\d/.test(v)){n++;return {k:'literal',v:Number(v)};}
    if(v==='-'){n++;return {k:'neg',v:atom()};}
    if(IDENT.test(v)){n++;if(see()==='('){eat('(');const args=[];if(see()!==')'){do{args.push(expr());if(see()!==',')break;eat(',');}while(true);}eat(')');return {k:'call',name:v,args};}return {k:'read',name:v};}
    throw new SyntaxError('Unexpected expression token '+v);
  }
  function mul(){let x=atom();while(['*','/'].includes(see())){const op=toks[n++].v;x={k:'binary',op,a:x,b:atom()};}return x;}
  function expr(){let x=mul();while(['+','-'].includes(see())){const op=toks[n++].v;x={k:'binary',op,a:x,b:mul()};}return x;}
  // carry: what crosses the twist. Only in Transcend, only in a scoped unit
  // (RFC-0001 §8 phase restriction; stable diagnostic phrases for conformance).
  function statement(phase,scoped){const op=id();if(op==='let'||op==='set'){const name=id();eat('=');const e=expr();eat(';');return {k:op,name,e};}if(op==='emit'){const e=expr();eat(';');return {k:'emit',e};}
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
    if(['bridge','star','enochian','angelicLetter','votive'].includes(name)
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
    const scoped=see()==='scoped';if(scoped)n++;
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
      units.push({k:'mobius',scope:'carried',phases});
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
async function execute(ir,{bridges={},principal=null,signal=null,maxOperations=10000,seeds}={}){
  if(ir?.schema!=='wyrdrune.ir/v0.1')throw new TypeError('Invalid WTL IR');
  if(!Number.isSafeInteger(maxOperations)||maxOperations<1||maxOperations>100000)throw new RangeError('Invalid operation limit');
  const env=new Map(),output=[],receipts=[];let operations=0;
  // The carry register: seeds in, each scoped unit's carry out. Plain units neither
  // read nor write it. Recorded only when the programme uses it.
  const continuing=seeds!==undefined||ir.units.some(u=>u.scope==='carried');
  let register=seeds===undefined?Object.freeze({}):carryRecord(seeds,'seeds');
  const seedsDigest=continuing?canonicalDigest(register):null,crossings=[];
  let scope=env;
  const operators=new Map((ir.operators||[]).map(entry=>[entry.name,entry]));
  const tick=()=>{if(signal?.aborted)throw new Error('Feather: execution stopped');if(++operations>maxOperations)throw new Error('WTL operation budget exceeded');};
  async function evalExpr(x,locals=null,depth=0){tick();switch(x.k){
    case 'literal':return x.v;
    case 'read':if(locals){if(!Object.hasOwn(locals,x.name))throw new ReferenceError('Unknown operator parameter '+x.name);return locals[x.name];}
      if(!scope.has(x.name))throw new ReferenceError('Unknown variable '+x.name);return scope.get(x.name);
    case 'neg':{const v=await evalExpr(x.v,locals,depth);if(typeof v!=='number')throw new TypeError('Unary negative requires number');return -v;}
    case 'binary':{const a=await evalExpr(x.a,locals,depth),b=await evalExpr(x.b,locals,depth);if(typeof a!=='number'||typeof b!=='number')throw new TypeError('Arithmetic requires numbers');if(x.op==='/'&&b===0)throw new RangeError('Division by zero');const v=({'+':()=>a+b,'-':()=>a-b,'*':()=>a*b,'/':()=>a/b})[x.op]();if(!Number.isFinite(v))throw new RangeError('Nonfinite arithmetic');return v;}
    case 'call':{
      const args=[];for(const a of x.args)args.push(await evalExpr(a,locals,depth));
      if(operators.has(x.name)){
        if(depth>=8)throw new RangeError('Wyrdrune operator recursion depth exceeded');
        const operator=operators.get(x.name);
        if(args.length!==operator.params.length)throw new TypeError('Operator '+x.name+' expects '+operator.params.length+' arguments');
        return evalExpr(operator.body,Object.fromEntries(operator.params.map((name,i)=>[name,args[i]])),depth+1);
      }
      if(locals)throw new Error('Native pure operators cannot invoke host or ritual bridges');
      if(x.name==='enochian'){
        if(typeof enochianInscription!=='function')throw new Error('Ritual register unavailable');
        if(args.length<1||args.length>2)throw new TypeError('enochian(text[,sourceLabel]) requires one or two arguments');
        return enochianInscription(args[0],args.length===2?args[1]:'author-supplied');
      }
      if(x.name==='angelicLetter'){
        if(typeof angelicLetter!=='function')throw new Error('Ritual register unavailable');
        if(args.length!==1)throw new TypeError('angelicLetter(index) requires one argument');
        return angelicLetter(args[0]);
      }
      if(x.name==='votive'){
        if(typeof votive!=='function')throw new Error('Ritual register unavailable');
        if(args.length!==2)throw new TypeError('votive(name,dedication) requires two arguments');
        return votive(args[0],args[1]);
      }
      if(x.name==='star'){if(args.length!==1)throw new TypeError('star(radius) requires one argument');return geometryStar(args[0]);}
      if(x.name==='bridge'){
        if(args.length<2||typeof args[0]!=='string'||typeof args[1]!=='string')throw new TypeError('bridge(provider,operation,...) requires strings');
        const [provider,operation,...payload]=args;const handler=bridges[provider]?.[operation];if(typeof handler!=='function')throw new Error('Bridge capability unavailable: '+provider+'.'+operation);
        if(!principal?.authorized)throw new Error('Bridge requires verified owner authorization');
        const result=await handler(Object.freeze({principal,arguments:payload,signal}));tick();return result;
      }
      throw new ReferenceError('Unknown WTL function '+x.name);
    }
    default:throw new TypeError('Invalid WTL expression');
  }}
  for(const [index,unit] of ir.units.entries()){
    const carried=unit.scope==='carried',carriedIn=register,out={};
    if(carried){
      const carriesOut=unit.phases[7].body.filter(x=>x.k==='carry').map(x=>x.name);
      if(Object.keys(register).length&&carriesOut.length&&shapeOf(register)!==[...carriesOut].sort().join('\u0000'))
        throw new TypeError('carry must bind exactly the seeds');
      scope=new Map(Object.entries(register)); // carried values arrive as this unit's own bindings
    }else scope=env;
    for(const {phase,body} of unit.phases){tick();const start=output.length;
    for(const stmt of body){tick();if(stmt.k==='let'){if(scope.has(stmt.name))throw new SyntaxError('Duplicate binding '+stmt.name);scope.set(stmt.name,await evalExpr(stmt.e));}
    else if(stmt.k==='set'){if(!scope.has(stmt.name))throw new ReferenceError('Unknown binding '+stmt.name);scope.set(stmt.name,await evalExpr(stmt.e));}
    else if(stmt.k==='emit')output.push(await evalExpr(stmt.e));
    else if(stmt.k==='carry'&&carried)out[stmt.name]=await evalExpr(stmt.e);
    else throw new TypeError('Invalid statement');}
    receipts.push(Object.freeze({phase,emitted:output.length-start,operations,sourceHash:ir.sourceHash,principalId:principal?.id??null}));
    }
    if(carried){
      if(Object.keys(out).length)register=carryRecord(out,'carry');
      crossings.push(Object.freeze({unit:index,carried_in:canonicalDigest(carriedIn),carried_out:canonicalDigest(register),names:Object.keys(register).sort()}));
    }
  }
  scope=env;
  const result={schema:'wyrdrune.execution/v0.1',sourceHash:ir.sourceHash,output,bindings:Object.fromEntries(env),receipts,withness:{center:'withness',completedCycles:ir.units.length}};
  if(continuing)result.continuity={schema:'wyrdrune.continuity/v0.1',seeds_digest:seedsDigest,carry:register,carry_digest:canonicalDigest(register),crossings};
  return result;
}
return Object.freeze({PHASES,compile,execute,geometryStar});
}
