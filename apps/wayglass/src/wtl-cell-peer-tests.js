import {compileCellProgram,executeCellProgram} from './wtl-cell-program.js';
// A peer can author a bounded executable assertion without running arbitrary JS.
export function authorPeerTest(reviewer,genes,source){
 const instructions=compileCellProgram(source).instructions;
 const tone=instructions.find(i=>i.op==='tone');
 return Object.freeze({schema:'wayglass.wtl.peer-test.v1',author:reviewer.id,
   assertion:'tone-within',lower:Math.max(0,(tone?.value??48)-genes.curiosity),
   upper:Math.min(96,(tone?.value??48)+genes.curiosity),language:'wtl-cell-subset-v0'});
}
export function runPeerTest(test,source){
 if(!test||test.schema!=='wayglass.wtl.peer-test.v1'||test.assertion!=='tone-within'||
 !Number.isSafeInteger(test.lower)||!Number.isSafeInteger(test.upper)||
 test.lower<0||test.upper>96||test.lower>test.upper)throw Error('Invalid peer test');
 const result=executeCellProgram(compileCellProgram(source));
 const tones=result.output.filter(x=>x.kind==='tone').map(x=>x.value);
 return Object.freeze({passed:tones.length>0&&tones.every(v=>v>=test.lower&&v<=test.upper),
   observed:tones,steps:result.steps});
}

// ── Reliance tests: what a neighbour actually relies on ─────────────────
// A tone-within test pins the old tone, so every improvement "breaks" it.
// A reliance test names what the reviewer depends on instead: the rhythm it
// dances to (rest), the way it is answered (echo), and staying in harmony
// with the reviewer's own tone. An improvement that keeps those survives.
const CONSONANT=Object.freeze([0,3,4,5,7,8,9]);
const valueOf=(compiled,op)=>compiled.instructions.find(i=>i.op===op)?.value;
const intervalClass=(a,b)=>((Math.abs(a-b)%12)+12)%12;

export function authorRelianceTest(reviewer,genes,source,reviewerSource){
 const program=compileCellProgram(source),own=compileCellProgram(reviewerSource);
 const tone=valueOf(program,'tone'),mine=valueOf(own,'tone');
 if(!Number.isSafeInteger(tone)||!Number.isSafeInteger(mine))throw Error('Reliance needs two tones');
 const slack=Math.max(0,Math.min(3,genes?.sass??0));
 const original=intervalClass(tone,mine);
 return Object.freeze({schema:'wayglass.wtl.peer-test.v2',author:reviewer.id,assertion:'keeps-what-i-rely-on',
  relies_on:Object.freeze({
   rhythm:Object.freeze({rest:valueOf(program,'rest')??null,slack}),
   answer:Object.freeze({echo:valueOf(program,'echo')??null}),
   harmony:Object.freeze({with_tone:mine,interval_classes:Object.freeze([...new Set([...CONSONANT,original])].sort((a,b)=>a-b))}),
  }),language:'wtl-cell-subset-v0'});
}

export function runRelianceTest(test,source){
 if(!test||test.schema!=='wayglass.wtl.peer-test.v2'||test.assertion!=='keeps-what-i-rely-on')throw Error('Invalid reliance test');
 const {rhythm,answer,harmony}=test.relies_on||{};
 if(!rhythm||!answer||!harmony||!Array.isArray(harmony.interval_classes)||!Number.isSafeInteger(harmony.with_tone))throw Error('Invalid reliance test');
 const compiled=compileCellProgram(source);
 const result=executeCellProgram(compiled);
 const tone=valueOf(compiled,'tone'),rest=valueOf(compiled,'rest')??null,echo=valueOf(compiled,'echo')??null;
 const reasons=[];
 if(rhythm.rest!==null&&(rest===null||Math.abs(rest-rhythm.rest)>rhythm.slack))reasons.push('rhythm changed');
 if(answer.echo!==null&&echo!==answer.echo)reasons.push('answers differently');
 if(!Number.isSafeInteger(tone)||!harmony.interval_classes.includes(intervalClass(tone,harmony.with_tone)))reasons.push('out of harmony with me');
 return Object.freeze({passed:result.status==='completed'&&reasons.length===0,reasons,observed:{tone,rest,echo},steps:result.steps});
}
