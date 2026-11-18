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
