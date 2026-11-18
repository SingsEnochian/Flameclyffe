// Experimental WTL cell tissue: deterministic, bounded, no external side effects.
// Cells are computational instances, not participant identities.
export function createCellTissue({maxCells=8,energyCap=100}={}) {
  if(!Number.isSafeInteger(maxCells)||maxCells<1||maxCells>256) throw Error('Invalid cell limit');
  if(!Number.isSafeInteger(energyCap)||energyCap<10||energyCap>10000) throw Error('Invalid energy cap');
  const cells=new Map(),events=[]; let clock=0,paused=false;
  const clone=v=>JSON.parse(JSON.stringify(v));
  const idOK=id=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,63}$/.test(id);
  const receipt=(type,detail)=>{const entry={tick:clock,type,...clone(detail)};events.push(entry);return clone(entry);};
  function spawn({id,role,parent_id=null,energy=energyCap}={}) {
    if(paused) throw Error('Feather: tissue paused');
    if(!idOK(id)||!idOK(role)||cells.has(id)) throw Error('Invalid or duplicate cell identity');
    if(cells.size>=maxCells) throw Error('Tissue capacity reached');
    if(!Number.isSafeInteger(energy)||energy<0||energy>energyCap) throw Error('Invalid energy');
    if(parent_id!==null&&!cells.has(parent_id)) throw Error('Unknown parent');
    cells.set(id,{id,role,parent_id,energy,signals:[],state:'resting'});
    return receipt('birth',{id,role,parent_id,energy});
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
    return spawn({id:child_id,role:parent.role,parent_id,energy:10});
  }
  function feather(){paused=true;for(const c of cells.values())c.signals=[];return receipt('feather',{});}
  function resume(){paused=false;return receipt('resume',{});}
  function snapshot(){return clone({schema:'wayglass.wtl-cell-tissue/v0.1',clock,paused,cells:[...cells.values()],events});}
  return Object.freeze({spawn,signal,tick,divide,feather,resume,snapshot});
}
