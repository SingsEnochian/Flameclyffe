// Spatial ecology for WTL cells. Positions are local to this experimental tissue.
// No global clocks, network, model calls, or visual side effects.
import {createCellTissue} from './wtl-cell-tissue.js';

export function createCellEcology({maxCells=24,seed=7,radius=2.5}={}) {
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647) throw Error('Invalid seed');
  if(!Number.isFinite(radius)||radius<=0||radius>100) throw Error('Invalid radius');
  const tissue=createCellTissue({maxCells});
  const positions=new Map(),adaptation=new Map();
  let generation=0,randomState=seed;
  const random=()=>{randomState=(Math.imul(1664525,randomState)+1013904223)>>>0;return randomState/4294967296;};
  function plant(id,role='explorer',x=0,y=0) {
    if(!Number.isFinite(x)||!Number.isFinite(y)) throw Error('Invalid coordinates');
    tissue.spawn({id,role,twist:random()});
    positions.set(id,{x,y});
    adaptation.set(id,{sent:0,heard:0});
  }
  function neighbours(id) {
    const p=positions.get(id);
    if(!p) throw Error('Unknown cell');
    return [...positions].filter(([other,q])=>other!==id&&Math.hypot(p.x-q.x,p.y-q.y)<=radius)
      .map(([other])=>other).sort();
  }
  function step() {
    if(tissue.snapshot().paused) return {births:[],signals:0,paused:true};
    generation++;
    const before=tissue.snapshot().cells;
    let signals=0;
    for(const cell of before) {
      const nearby=neighbours(cell.id);
      if(!nearby.length)continue;
      const stats=adaptation.get(cell.id);
      // Deterministic behavioural variation from inherited twist, generation and neighbourhood.
      const target=nearby[Math.floor(cell.twist*nearby.length)%nearby.length];
      const dialect=cell.twist<0.33?'pulse':cell.twist<0.66?'spiral':'echo';
      try {
        tissue.signal(cell.id,target,dialect,{generation,twist:cell.twist});
        stats.sent++;
        adaptation.get(target).heard++;
        signals++;
      } catch(error) {
        if(!/Signal queue full/.test(error.message)) throw error;
      }
    }
    tissue.tick();
    const births=tissue.populate({steps:1,threshold:60}).births;
    for(const birth of births) {
      const parent=positions.get(birth.parent_id);
      const theta=2*Math.PI*random(),distance=0.25+random()*0.5;
      positions.set(birth.id,{x:parent.x+Math.cos(theta)*distance,y:parent.y+Math.sin(theta)*distance});
      adaptation.set(birth.id,{sent:0,heard:0});
    }
    return {generation,signals,births:births.map(b=>b.id),population:positions.size};
  }
  function snapshot(){
    const core=tissue.snapshot();
    return {...core,generation,positions:Object.fromEntries(positions),
      adaptation:Object.fromEntries(adaptation),
      neighbourhoods:Object.fromEntries([...positions.keys()].map(id=>[id,neighbours(id)]))};
  }
  return Object.freeze({plant,step,neighbours,snapshot,feather:tissue.feather,resume:tissue.resume});
}
