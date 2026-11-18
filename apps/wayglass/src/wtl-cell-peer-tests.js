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
