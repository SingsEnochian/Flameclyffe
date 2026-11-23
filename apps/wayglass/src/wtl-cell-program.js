// Experimental WTL cell-program slice. Typed, bounded and deterministic.
// No eval, filesystem, network, host capabilities, or canonical compiler claims.
export function compileCellProgram(source) {
 if(typeof source!=='string'||source.length>1024)throw Error('Invalid program source');
 const lines=source.trim().split(/\n/).map(s=>s.trim()).filter(Boolean);
 if(lines.length<1||lines.length>12)throw Error('Program length out of bounds');
 const instructions=lines.map((line,index)=>{
  const m=/^(tone|rest|echo)\s+([0-9]{1,3})$/.exec(line);
  if(!m)throw Error('Invalid instruction at line '+(index+1));
  const value=Number(m[2]);
  if(value>96)throw Error('Instruction value out of bounds');
  return {op:m[1],value};
 });
 return Object.freeze({language:'wtl-cell-subset-v0',instructions:Object.freeze(instructions.map(Object.freeze))});
}
export function executeCellProgram(compiled,{budget=12}={}) {
 if(!compiled||compiled.language!=='wtl-cell-subset-v0'||!Array.isArray(compiled.instructions))throw Error('Invalid compiled program');
 if(!Number.isSafeInteger(budget)||budget<1||budget>12)throw Error('Invalid budget');
 const output=[];
 for(const ins of compiled.instructions){
  if(output.length>=budget)throw Error('Execution budget exhausted');
  if(!['tone','rest','echo'].includes(ins.op)||!Number.isSafeInteger(ins.value)||ins.value<0||ins.value>96)throw Error('Invalid operation');
  output.push({kind:ins.op,value:ins.value});
 }
 return Object.freeze({status:'completed',steps:output.length,output});
}
export function authorCellProgram(cell,genes,generation){
 const twist=Math.floor(cell.twist*12);
 const pitch=24+(twist+genes.curiosity+generation)%48;
 const duration=1+(genes.sass+generation)%8;
 return 'tone '+pitch+'\nrest '+duration+'\necho '+((genes.dialectBias+twist)%12);
}

/** Bounded mutation search against a stated executable test, never host effects. */
// keep: neighbours' tests. An improvement is accepted only if every one of
// them still passes, so a program can get better without abandoning the
// cells that rely on it. If no candidate does both, the original survives.
export function reviseCellProgram(source,{targetTone=48,maxAttempts=12,keep=[]}={}){
 if(!Array.isArray(keep)||keep.length>8||!keep.every(fn=>typeof fn==='function'))throw Error('Invalid neighbour tests');
 const kept=candidate=>keep.map(fn=>fn(candidate)).filter(r=>!r.passed).length;
 if(!Number.isSafeInteger(targetTone)||targetTone<0||targetTone>96)throw Error('Invalid target');
 if(!Number.isSafeInteger(maxAttempts)||maxAttempts<1||maxAttempts>12)throw Error('Invalid attempts');
 const original=compileCellProgram(source);
 const evaluate=(compiled)=>{
  const run=executeCellProgram(compiled);
  const tones=run.output.filter(o=>o.kind==='tone');
  return {run,score:tones.length?Math.min(...tones.map(t=>Math.abs(t.value-targetTone))):97};
 };
 const baseline=evaluate(original);
 let best={source,score:baseline.score,run:baseline.run};
 const attempts=[];
 for(let i=0;i<maxAttempts;i++){
  const candidateTone=Math.max(0,Math.min(96,targetTone+(i%2===0?1:-1)*Math.floor(i/2)));
  const lines=source.trim().split(/\n/);
  const index=lines.findIndex(line=>/^tone\s+\d+$/.test(line.trim()));
  if(index<0)break;
  lines[index]='tone '+candidateTone;
  const candidate=lines.join('\n');
  const evaluated=evaluate(compileCellProgram(candidate));
  const broken=kept(candidate);
  const accepted=evaluated.score<best.score&&broken===0;
  attempts.push({source:candidate,score:evaluated.score,accepted,...(keep.length?{neighbours_broken:broken}:{})});
  if(accepted)best={source:candidate,score:evaluated.score,run:evaluated.run};
  if(best.score===0)break;
 }
 return {targetTone,baselineScore:baseline.score,source:best.source,score:best.score,
  improved:best.score<baseline.score,attempts,
  ...(keep.length?{neighbours_kept:kept(best.source)===0,declined_for_neighbours:attempts.filter(a=>a.neighbours_broken>0&&a.score<baseline.score).length}:{}),
  result:{status:best.run.status,steps:best.run.steps,output:best.run.output.map(o=>({...o}))}};
}
