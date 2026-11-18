// Spatial ecology for WTL cells. Positions are local to this experimental tissue.
// No global clocks, network, model calls, or visual side effects.
import {createCellTissue} from './wtl-cell-tissue.js';

export function createCellEcology({maxCells=24,seed=7,radius=2.5,mutationRate=0.2}={}) {
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647) throw Error('Invalid seed');
  if(!Number.isFinite(radius)||radius<=0||radius>100) throw Error('Invalid radius');
  if(!Number.isFinite(mutationRate)||mutationRate<0||mutationRate>1) throw Error('Invalid mutation rate');
  const tissue=createCellTissue({maxCells});
  const positions=new Map(),adaptation=new Map(),traits=new Map(),mutations=[];
  const sassLines=['Nice signal. Shame about the timing.','My mitochondria demand better neighbours.','I twist, therefore I sass.','Evolution called. It wants more sparkle.'];
  const makeTraits=(parent=null)=>{
    const result=parent?{...parent}:{sass:Math.floor(random()*4),curiosity:Math.floor(random()*4),dialectBias:Math.floor(random()*3)};
    if(parent&&random()<mutationRate){
      const gene=['sass','curiosity','dialectBias'][Math.floor(random()*3)];
      const range=gene==='dialectBias'?3:4;
      const previous=result[gene];
      result[gene]=(previous+1+Math.floor(random()*(range-1)))%range;
      return {traits:result,change:{gene,previous,next:result[gene]}};
    }
    return {traits:result,change:null};
  };
  let generation=0,randomState=seed;
  const random=()=>{randomState=(Math.imul(1664525,randomState)+1013904223)>>>0;return randomState/4294967296;};
  function plant(id,role='explorer',x=0,y=0) {
    if(!Number.isFinite(x)||!Number.isFinite(y)) throw Error('Invalid coordinates');
    tissue.spawn({id,role,twist:random()});
    positions.set(id,{x,y});
    adaptation.set(id,{sent:0,heard:0});
    traits.set(id,makeTraits().traits);
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
      const genes=traits.get(cell.id);
      const dialect=['pulse','spiral','echo'][(Math.floor(cell.twist*3)+genes.dialectBias)%3];
      const sass=genes.sass>0&&generation%(5-genes.sass)===0?sassLines[(genes.sass+generation)%sassLines.length]:null;
      try {
        tissue.signal(cell.id,target,dialect,{generation,twist:cell.twist,sass});
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
      const inherited=makeTraits(traits.get(birth.parent_id));
      traits.set(birth.id,inherited.traits);
      if(inherited.change)mutations.push({generation,parent_id:birth.parent_id,child_id:birth.id,...inherited.change});
    }
    return {generation,signals,births:births.map(b=>b.id),population:positions.size};
  }
  function snapshot(){
    const core=tissue.snapshot();
    return {...core,generation,positions:Object.fromEntries(positions),
      adaptation:Object.fromEntries(adaptation),traits:Object.fromEntries(traits),mutations:mutations.map(m=>({...m})),
      neighbourhoods:Object.fromEntries([...positions.keys()].map(id=>[id,neighbours(id)]))};
  }
  return Object.freeze({plant,step,neighbours,snapshot,feather:tissue.feather,resume:tissue.resume});
}
