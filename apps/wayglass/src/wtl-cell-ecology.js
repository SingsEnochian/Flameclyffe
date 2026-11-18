// Spatial ecology for WTL cells. Positions are local to this experimental tissue.
// No global clocks, network, model calls, or visual side effects.
import {createCellTissue} from './wtl-cell-tissue.js';

export function createCellEcology({maxCells=24,seed=7,radius=2.5,mutationRate=0.2,renewalAge=100}={}) {
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647) throw Error('Invalid seed');
  if(!Number.isFinite(radius)||radius<=0||radius>100) throw Error('Invalid radius');
  if(!Number.isFinite(mutationRate)||mutationRate<0||mutationRate>1) throw Error('Invalid mutation rate');
  if(!Number.isSafeInteger(renewalAge)||renewalAge<3||renewalAge>10000) throw Error('Invalid renewal age');
  const tissue=createCellTissue({maxCells});
  const positions=new Map(),adaptation=new Map(),traits=new Map(),mutations=[],utterances=[],lexicons=new Map(),birthTicks=new Map(),retirements=[],wyrdruneExpressions=[];
  // An open combinatorial grammar, not a library of finished phrases.
  const vocabulary={
    subject:['my spiral','your echo','this membrane','our orbit','that wobble','the neighbouring twist'],
    action:['tickles','challenges','outdances','confuses','rearranges','befriends'],
    object:['the silence','my geometry','your rhythm','the current','the next turn','the whole tissue'],
    ending:['again','with style','for now','quite spectacularly','without permission from gravity','before breakfast']
  };
  function invent(id,genes,twist) {
    const memory=lexicons.get(id);
    const parts=['subject','action','object','ending'].map((slot,index)=>{
      const choices=vocabulary[slot];
      const n=Math.floor(random()*choices.length+genes.sass+genes.curiosity*index+twist*choices.length)%choices.length;
      return choices[n];
    });
    const phrase=parts.join(' ')+'.';
    memory.push(phrase);
    if(memory.length>8)memory.shift();
    utterances.push({generation,id,phrase,origin:'composed',inherited_vocabulary:false});
    // Language-bearing, typed event envelope. The canonical WTL compiler is NOT
    // invoked here: the adapter preserves semantic intent for later WTL lowering.
    const cell=tissue.snapshot().cells.find(c=>c.id===id);
    wyrdruneExpressions.push({schema:'wayglass.wtl.cell-expression.v1',generation,speaker:id,
      intent:'sing',verb:'express',mode:'call',
      semantic:{phrase,twist:cell?.twist??0,traits:{...genes}},
      provenance:{origin:'ecology-composition',verified_compiler:false}});
    return phrase;
  }
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
    lexicons.set(id,[]);
    birthTicks.set(id,generation);
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
      // Sparse tissue rests between transmissions to rebuild energy reserves.
      if(positions.size<=3&&generation%4!==0)continue;
      const stats=adaptation.get(cell.id);
      // Deterministic behavioural variation from inherited twist, generation and neighbourhood.
      const target=nearby[Math.floor(cell.twist*nearby.length)%nearby.length];
      const genes=traits.get(cell.id);
      const dialect=['pulse','spiral','echo'][(Math.floor(cell.twist*3)+genes.dialectBias)%3];
      const sass=genes.sass>0&&generation%(5-genes.sass)===0?invent(cell.id,genes,cell.twist):null;
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
    // Renewal: age-triggered retirement makes room for descendants without erasing history.
    // Keep at least one active cell so the tissue never extinguishes itself in one pass.
    const retirees=tissue.snapshot().cells
      .filter(cell=>generation-birthTicks.get(cell.id)>=renewalAge)
      .sort((a,b)=>birthTicks.get(a.id)-birthTicks.get(b.id)||a.id.localeCompare(b.id));
    const retired=[];
    for(const cell of retirees){
      // Stagger renewal: never retire more than one cell in a cycle.
      if(retired.length>=1||positions.size<=2)break;
      const record=tissue.retire(cell.id,'age-renewal');
      retirements.push({...record,generation,traits:{...traits.get(cell.id)},lastPhrases:[...lexicons.get(cell.id)]});
      positions.delete(cell.id);adaptation.delete(cell.id);traits.delete(cell.id);
      lexicons.delete(cell.id);birthTicks.delete(cell.id);
      retired.push(cell.id);
    }
    // Regenerative response: lower the reproduction threshold in sparse tissue.
    const threshold=positions.size<=3?20:60;
    const births=tissue.populate({steps:1,threshold}).births;
    for(const birth of births) {
      const parent=positions.get(birth.parent_id);
      const theta=2*Math.PI*random(),distance=0.25+random()*0.5;
      positions.set(birth.id,{x:parent.x+Math.cos(theta)*distance,y:parent.y+Math.sin(theta)*distance});
      adaptation.set(birth.id,{sent:0,heard:0});
      const inherited=makeTraits(traits.get(birth.parent_id));
      traits.set(birth.id,inherited.traits);
      lexicons.set(birth.id,[...lexicons.get(birth.parent_id).slice(-2)]);
      birthTicks.set(birth.id,generation);
      if(inherited.change)mutations.push({generation,parent_id:birth.parent_id,child_id:birth.id,...inherited.change});
    }
    return {generation,signals,births:births.map(b=>b.id),retired,population:positions.size};
  }
  function transform(id,nextRole,options={}) {
    const result=tissue.transform(id,nextRole,options);
    // Position, mutation history, phrase memory and lineage remain unchanged.
    return result;
  }
  function snapshot(){
    const core=tissue.snapshot();
    return {...core,generation,positions:Object.fromEntries(positions),
      adaptation:Object.fromEntries(adaptation),traits:Object.fromEntries(traits),mutations:mutations.map(m=>({...m})),
      retirements:retirements.map(r=>({...r,traits:{...r.traits},lastPhrases:[...r.lastPhrases]})),utterances:utterances.map(u=>({...u})),lexicons:Object.fromEntries([...lexicons].map(([id,phrases])=>[id,[...phrases]])),
      neighbourhoods:Object.fromEntries([...positions.keys()].map(id=>[id,neighbours(id)])),
      wyrdruneExpressions:wyrdruneExpressions.map(e=>({...e,semantic:{...e.semantic,traits:{...e.semantic.traits}},provenance:{...e.provenance}}))};
  }
  return Object.freeze({plant,step,neighbours,transform,snapshot,feather:tissue.feather,resume:tissue.resume});
}
