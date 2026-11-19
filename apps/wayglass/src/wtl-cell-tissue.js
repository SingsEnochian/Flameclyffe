// Experimental WTL cell tissue: deterministic, bounded, no external side effects.
// Cells are computational instances, not participant identities.
export function createCellTissue({maxCells=8,energyCap=100}={}) {
  if(!Number.isSafeInteger(maxCells)||maxCells<1||maxCells>256) throw Error('Invalid cell limit');
  if(!Number.isSafeInteger(energyCap)||energyCap<10||energyCap>10000) throw Error('Invalid energy cap');
  const cells=new Map(),events=[]; let clock=0,paused=false,offspring=0;
  const clone=v=>JSON.parse(JSON.stringify(v));
  const idOK=id=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,63}$/.test(id);
  const receipt=(type,detail)=>{const entry={tick:clock,type,...clone(detail)};events.push(entry);return clone(entry);};
  function spawn({id,role,parent_id=null,energy=energyCap,twist=0}={}) {
    if(paused) throw Error('Feather: tissue paused');
    if(!idOK(id)||!idOK(role)||cells.has(id)) throw Error('Invalid or duplicate cell identity');
    if(cells.size>=maxCells) throw Error('Tissue capacity reached');
    if(!Number.isSafeInteger(energy)||energy<0||energy>energyCap) throw Error('Invalid energy');
    if(parent_id!==null&&!cells.has(parent_id)) throw Error('Unknown parent');
    if(!Number.isFinite(twist)||twist<0||twist>=1) throw Error('Invalid twist');
    cells.set(id,{id,role,parent_id,energy,twist,signals:[],state:'resting'});
    return receipt('birth',{id,role,parent_id,energy,twist});
  }
  function signal(from,to,type,payload=null) {
    if(paused) throw Error('Feather: tissue paused');
    if(!cells.has(from)||!cells.has(to)||!idOK(type)) throw Error('Invalid signal route');
    const target=cells.get(to);
    if(target.signals.length>=16) throw Error('Signal queue full');
    const serialized=JSON.stringify(payload);
    if(serialized===undefined||serialized.length>2048) throw Error('Signal payload too large');
    target.signals.push({from,type,payload:JSON.parse(serialized)});
    return receipt('signal',{from,to,signal_type:type});
  }
  function tick() {
    if(paused) return receipt('paused',{});
    clock++;
    for(const cell of cells.values()){
      if(cell.energy<2){cell.state='resting';cell.energy=Math.min(energyCap,cell.energy+1);continue;}
      const msg=cell.signals.shift();
      if(msg){cell.energy-=2;cell.state='active';receipt('perceive',{id:cell.id,from:msg.from,signal_type:msg.type});}
      else {cell.state='resting';cell.energy=Math.min(energyCap,cell.energy+1);}
    }
    return snapshot();
  }
  function divide(parent_id,child_id) {
    if(paused) throw Error('Feather: tissue paused');
    const parent=cells.get(parent_id);
    if(!parent||parent.energy<20) throw Error('Insufficient parent energy');
    if(!idOK(child_id)||cells.has(child_id)||cells.size>=maxCells) throw Error('Invalid daughter or capacity');
    parent.energy-=10;
    // Small deterministic variation: reproducible without global randomness.
    const variation=((offspring*37+clock*17+child_id.length*13)%101-50)/1000;
    const twist=(parent.twist+variation+1)%1;
    return spawn({id:child_id,role:parent.role,parent_id,energy:10,twist});
  }
  // Roles are open-ended labels; changing a role never changes the cell's identity.
  // Transformation has an explicit cost and a durable receipt.
  function transform(id,nextRole,{mode='transdifferentiate',cost=3}={}) {
    if(paused) throw Error('Feather: tissue paused');
    const cell=cells.get(id);
    if(!cell) throw Error('Unknown cell');
    if(!idOK(nextRole)) throw Error('Invalid role');
    if(!['differentiate','transdifferentiate','dedifferentiate'].includes(mode)) throw Error('Invalid transformation mode');
    if(!Number.isSafeInteger(cost)||cost<0||cost>energyCap||cell.energy<cost) throw Error('Insufficient transformation energy');
    const previousRole=cell.role;
    cell.energy-=cost;
    cell.role=nextRole;
    return receipt('transform',{id,parent_id:cell.parent_id,from:previousRole,to:nextRole,mode,cost,energy:cell.energy});
  }
  function retire(id,reason='renewal') {
    if(paused) throw Error('Feather: tissue paused');
    if(!cells.has(id)) throw Error('Unknown cell');
    if(typeof reason!=='string'||reason.length>64) throw Error('Invalid reason');
    const cell=cells.get(id);
    cells.delete(id);
    for(const survivor of cells.values())survivor.signals=survivor.signals.filter(s=>s.from!==id);
    return receipt('retire',{id,parent_id:cell.parent_id,role:cell.role,twist:cell.twist,reason});
  }
  function feather(){paused=true;for(const c of cells.values())c.signals=[];return receipt('feather',{});}
  function resume(){paused=false;return receipt('resume',{});}
  function populate({steps=1,threshold=60}={}) {
    if(!Number.isSafeInteger(steps)||steps<1||steps>1000) throw Error('Invalid step count');
    if(!Number.isSafeInteger(threshold)||threshold<20||threshold>energyCap) throw Error('Invalid threshold');
    const births=[];
    for(let i=0;i<steps;i++){
      if(paused) break;
      tick();
      const parents=[...cells.values()];
      for(const parent of parents){
        if(cells.size>=maxCells) break;
        if(parent.energy<threshold) continue;
        const child_id=`${parent.id}:m${++offspring}`;
        if(child_id.length>64) {receipt('division-skipped',{id:parent.id,reason:'id-length'});continue;}
        births.push(divide(parent.id,child_id));
      }
    }
    return clone({births,snapshot:snapshot()});
  }
  function snapshot(){return clone({schema:'wayglass.wtl-cell-tissue/v0.1',clock,paused,cells:[...cells.values()],events});}
  return Object.freeze({spawn,signal,tick,divide,transform,retire,populate,feather,resume,snapshot});
}
