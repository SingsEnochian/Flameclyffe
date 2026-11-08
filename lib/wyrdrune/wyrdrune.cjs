'use strict';
const { createHash } = require('node:crypto');
const { enochianInscription, angelicLetter, votive } = require('./enochian.cjs');
const PHASES = Object.freeze(['perceive','compress','release','verify','integrate','choose','return','transcend']);
const IDENT = /^[\p{L}_][\p{L}\p{N}_]*$/u;
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
  function statement(){const op=id();if(op==='let'||op==='set'){const name=id();eat('=');const e=expr();eat(';');return {k:op,name,e};}if(op==='emit'){const e=expr();eat(';');return {k:'emit',e};}throw new SyntaxError('Unknown WTL statement: '+op);}
  function block(){eat('{');const body=[];while(see()!=='}'){if(see()==='<eof>')throw new SyntaxError('Unclosed block');body.push(statement());}eat('}');return body;}
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
  const units=[];while(see()!=='<eof>'){
    eat('mobius');eat('{');const phases=[];
    for(const phase of PHASES){eat(phase);phases.push({phase,body:block()});}
    eat('}');units.push({k:'mobius',phases});
  }
  if(!units.length)throw new SyntaxError('Expected mobius block');
  return Object.freeze({schema:'wyrdrune.ir/v0.1',sourceHash:createHash('sha256').update(source).digest('hex'),units,operators});
}
function geometryStar(radius){
  if(!Number.isFinite(radius)||radius<=0||radius>1000000)throw new RangeError('star radius must be finite, positive, at most 1000000');
  return {kind:'loki-chaos-star/v1',points:PHASES.map((phase,i)=>({phase,x:radius*Math.cos(i*Math.PI/4-Math.PI/2),y:radius*Math.sin(i*Math.PI/4-Math.PI/2)})),center:{name:'withness',x:0,y:0}};
}
async function execute(ir,{bridges={},principal=null,signal=null,maxOperations=10000}={}){
  if(ir?.schema!=='wyrdrune.ir/v0.1')throw new TypeError('Invalid WTL IR');
  if(!Number.isSafeInteger(maxOperations)||maxOperations<1||maxOperations>100000)throw new RangeError('Invalid operation limit');
  const env=new Map(),output=[],receipts=[];let operations=0;
  const operators=new Map((ir.operators||[]).map(entry=>[entry.name,entry]));
  const tick=()=>{if(signal?.aborted)throw new Error('Feather: execution stopped');if(++operations>maxOperations)throw new Error('WTL operation budget exceeded');};
  async function evalExpr(x,locals=null,depth=0){tick();switch(x.k){
    case 'literal':return x.v;
    case 'read':if(locals){if(!Object.hasOwn(locals,x.name))throw new ReferenceError('Unknown operator parameter '+x.name);return locals[x.name];}
      if(!env.has(x.name))throw new ReferenceError('Unknown variable '+x.name);return env.get(x.name);
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
        if(args.length<1||args.length>2)throw new TypeError('enochian(text[,sourceLabel]) requires one or two arguments');
        return enochianInscription(args[0],args.length===2?args[1]:'author-supplied');
      }
      if(x.name==='angelicLetter'){
        if(args.length!==1)throw new TypeError('angelicLetter(index) requires one argument');
        return angelicLetter(args[0]);
      }
      if(x.name==='votive'){
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
  for(const unit of ir.units){for(const {phase,body} of unit.phases){tick();const start=output.length;
    for(const stmt of body){tick();if(stmt.k==='let'){if(env.has(stmt.name))throw new SyntaxError('Duplicate binding '+stmt.name);env.set(stmt.name,await evalExpr(stmt.e));}
    else if(stmt.k==='set'){if(!env.has(stmt.name))throw new ReferenceError('Unknown binding '+stmt.name);env.set(stmt.name,await evalExpr(stmt.e));}
    else if(stmt.k==='emit')output.push(await evalExpr(stmt.e));else throw new TypeError('Invalid statement');}
    receipts.push(Object.freeze({phase,emitted:output.length-start,operations,sourceHash:ir.sourceHash,principalId:principal?.id??null}));
  }}
  return {schema:'wyrdrune.execution/v0.1',sourceHash:ir.sourceHash,output,bindings:Object.fromEntries(env),receipts,withness:{center:'withness',completedCycles:ir.units.length}};
}
module.exports={PHASES,compile,execute,geometryStar};
