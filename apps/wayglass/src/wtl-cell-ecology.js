// Spatial ecology for WTL cells. Positions are local to this experimental tissue.
// No global clocks, network, model calls, or visual side effects.
import {createCellTissue} from './wtl-cell-tissue.js';
import {authorCellProgram,compileCellProgram,executeCellProgram,reviseCellProgram} from './wtl-cell-program.js';
import {authorRelianceTest,runRelianceTest} from './wtl-cell-peer-tests.js';
import {listenAndReply,composeDialogue} from './wtl-cell-harmony.js';
import {sonicPitch,replyByRatio,projectAudible} from './wtl-cell-sonic-space.js';
import {turnCell,firstCarry,daughterCarry,chooseName,inheritSyllables} from './wtl-cell-mobius.js';
import {turnWorld,foundingCarry} from './wtl-cell-worlds.js';
import {chooseFusion} from './wtl-cell-fusion.js';
import {inscribeSharedText} from './wtl-cell-sharing.js';

// Everything a cell is lives in its own body: genome, memory, programs, place,
// syllables, chosen name and Möbius carry. The colony keeps only the bodies.
// The Map-shaped views below let older code read a cell's fields by address.
function fieldView(bodies,field){
  const has=id=>bodies.has(id)&&Object.hasOwn(bodies.get(id),field);
  return {
    get:id=>bodies.get(id)?.[field],
    set(id,value){let body=bodies.get(id);if(!body){body={address:id};bodies.set(id,body);}body[field]=value;return this;},
    has,
    delete(id){const body=bodies.get(id);if(!body||!Object.hasOwn(body,field))return false;delete body[field];return true;},
    get size(){let n=0;for(const id of bodies.keys())if(has(id))n++;return n;},
    keys(){return [...bodies.keys()].filter(has)[Symbol.iterator]();},
    *entries(){for(const [id,body] of bodies)if(Object.hasOwn(body,field))yield [id,body[field]];},
    [Symbol.iterator](){return this.entries();},
  };
}

export function createCellEcology({maxCells=24,seed=7,radius=2.5,mutationRate=0.2,autonomousFusion=false}={}) {
  if(!Number.isSafeInteger(seed)||seed<0||seed>2147483647) throw Error('Invalid seed');
  if(!Number.isFinite(radius)||radius<=0||radius>100) throw Error('Invalid radius');
  if(!Number.isFinite(mutationRate)||mutationRate<0||mutationRate>1) throw Error('Invalid mutation rate');
  const tissue=createCellTissue({maxCells});
  const bodies=new Map(),mobiusReceipts=[],namings=[],worlds=new Map(),worldReceipts=[],rememberedWorlds=[];
  let worldCount=0,hybridCount=0,inscriptionCount=0,featherEpoch=0,turning=false;
  const fusionEnabled=autonomousFusion===true&&maxCells>=3;
  const encounters=new Map(),fusions=[],inscriptions=[];
  const positions=fieldView(bodies,'position'),adaptation=fieldView(bodies,'senses'),traits=fieldView(bodies,'genome'),
    lexicons=fieldView(bodies,'phrases'),birthTicks=fieldView(bodies,'born'),programLibrary=fieldView(bodies,'programs');
  const mutations=[],utterances=[],retirements=[],wyrdruneExpressions=[],constructions=[],programs=[],projectDecisions=[],programLineages=[],harmonicDialogues=[];
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
    const cell=tissue.cellsView().find(c=>c.id===id);
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
  // Syllables draw from their own stream so naming never shifts the colony's
  // behavioural trajectory for a given seed.
  let syllableState=(seed^0x9e3779b9)>>>0;
  const syllableRandom=()=>{syllableState=(Math.imul(1664525,syllableState)+1013904223)>>>0;return syllableState/4294967296;};
  function plant(id,role='explorer',x=0,y=0) {
    if(!Number.isFinite(x)||!Number.isFinite(y)) throw Error('Invalid coordinates');
    const spawned=tissue.spawn({id,role,twist:random()});
    bodies.set(id,{address:id,parent:null,generation:0,name:null,
      syllables:inheritSyllables(null,{random:syllableRandom}),
      carry:firstCarry({phase:spawned.twist,voice:spawned.twist}),carry_digest:null,
      heard_since_turn:0,last_turn:null,turns:0});
    positions.set(id,{x,y});
    adaptation.set(id,{sent:0,heard:0});
    traits.set(id,makeTraits().traits);
    lexicons.set(id,[]);
    birthTicks.set(id,generation);
    programLibrary.set(id,[]);
  }
  function neighbours(id) {
    const p=positions.get(id);
    if(!p) throw Error('Unknown cell');
    return [...positions].filter(([other,q])=>other!==id&&Math.hypot(p.x-q.x,p.y-q.y)<=radius)
      .map(([other])=>other).sort();
  }
  function step() {
    if(tissue.isPaused()||turning) return {births:[],signals:0,paused:tissue.isPaused()};
    generation++;
    const before=tissue.cellsView();
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
        if(fusionEnabled) {
          const pair=[cell.id,target].sort();
          const key=pair.join(' ');
          if(!encounters.get(key)?.closed) encounters.set(key,{
            id:`signal:${generation}:${cell.id}:${target}`,
            pair,generation,from:cell.id,to:target,
          });
        }
        stats.sent++;
        adaptation.get(target).heard++;
        bodies.get(target).heard_since_turn++;
        signals++;
      } catch(error) {
        if(!/Signal queue full/.test(error.message)) throw error;
      }
    }
    tissue.tick({quiet:true});
    if(generation%5===0&&programs.length<128){
      const authors=tissue.cellsView();
      if(authors.length){
        const author=authors[generation%authors.length],genes=traits.get(author.id);
        const source=authorCellProgram(author,genes,generation);
        const compiled=compileCellProgram(source);
        const result=executeCellProgram(compiled);
        const program={id:'program-'+generation+'-'+author.id,generation,author:author.id,source,
          language:compiled.language,result:{status:result.status,steps:result.steps,output:result.output.map(x=>({...x}))},
          provenance:{origin:'deterministic-cell-author',canonical_wtl_compiler:false,host_effects:false}};
        programs.push(program);
        programLibrary.get(author.id).push({id:program.id,source:program.source,generation});
        if(programLibrary.get(author.id).length>8)programLibrary.get(author.id).shift();
        wyrdruneExpressions.push({schema:'wayglass.wtl.cell-expression.v1',generation,speaker:author.id,
          intent:'program',verb:'compile-and-run',mode:'sandbox',semantic:{program_id:program.id,language:program.language},
          provenance:{origin:'cell-program-subset',verified_compiler:false}});
      }
    }
    // Neighbour listening: a bounded call and harmonic reply, with a reproducible score.
    if(generation%4===0&&harmonicDialogues.length<128){
      const singers=tissue.cellsView().filter(cell=>neighbours(cell.id).length>0);
      if(singers.length){
        const singer=singers[generation%singers.length],listenerId=neighbours(singer.id)[0];
        const singerGenes=traits.get(singer.id),listenerGenes=traits.get(listenerId);
        const call=48+(singerGenes.curiosity+generation+Math.floor(singer.twist*12))%24;
        const reply=listenAndReply(call,{listenerBias:listenerGenes.dialectBias,previous:call+2});
        const score=composeDialogue(call,reply,{beat:generation%16});
        const callHz=110*Math.pow(2,(call-45)/12);
        const originalPitch=sonicPitch(callHz,{timbre:['sine','triangle','sawtooth','square'][singerGenes.dialectBias%4]});
        const ratioPitch=replyByRatio(originalPitch,{numerator:[5,6,7,9][listenerGenes.curiosity],denominator:4});
        harmonicDialogues.push({generation,singer:singer.id,listener:listenerId,...score,
          sonic:{call:originalPitch,reply:ratioPitch,callProjection:projectAudible(originalPitch),replyProjection:projectAudible(ratioPitch)},
          reply:{...reply,provenance:{...reply.provenance}}});
      }
    }
    // Project Genesis: competing executable candidates, neighbour reviews and
    // deterministic selection. Scores describe algorithmic choices, not sentience.
    if(generation%15===0&&projectDecisions.length<32){
      const candidates=tissue.cellsView().filter(cell=>neighbours(cell.id).length>0).slice(0,8);
      const proposals=candidates.map(cell=>{
        const genes=traits.get(cell.id),source=authorCellProgram(cell,genes,generation);
        const compiled=compileCellProgram(source);
        const reviews=neighbours(cell.id).slice(0,8).map(id=>{
          const reviewer=traits.get(id);
          return {reviewer:id,score:(reviewer.curiosity+reviewer.dialectBias+compiled.instructions.length+Math.floor(cell.twist*4))%7};
        });
        return {author:cell.id,source,language:compiled.language,reviews,
          score:reviews.reduce((n,r)=>n+r.score,0),compiled};
      });
      proposals.sort((a,b)=>b.score-a.score||a.author.localeCompare(b.author));
      if(proposals.length){
        const winner=proposals[0],result=executeCellProgram(winner.compiled);
        const targetTone=24+(traits.get(winner.author).curiosity*8+generation)%48;
        // Neighbours say what they rely on BEFORE the improvement is sought,
        // and the improvement must keep it. Improvements survive; so do they.
        const reviewerIds=neighbours(winner.author).slice(0,4);
        const living=tissue.cellsView();
        const reliance=reviewerIds.map(id=>{
          const reviewer=living.find(cell=>cell.id===id);
          return authorRelianceTest(reviewer,traits.get(id),winner.source,authorCellProgram(reviewer,traits.get(id),generation));
        });
        const revision=reviseCellProgram(winner.source,{targetTone,keep:reliance.map(test=>candidate=>runRelianceTest(test,candidate))});
        const peerTests=reliance.map(test=>({test,original:runRelianceTest(test,winner.source),revised:runRelianceTest(test,revision.source)}));
        const decision={schema:'wayglass.wtl.project-genesis.v1',id:'project-'+generation,
          generation,selection:'neighbour-scored-deterministic',winner:winner.author,
          candidates:proposals.map(p=>({author:p.author,source:p.source,language:p.language,score:p.score,reviews:p.reviews.map(r=>({...r}))})),
          selected:{source:winner.source,language:winner.language,
            result:{status:result.status,steps:result.steps,output:result.output.map(x=>({...x}))}},
          peerTests,
          revision:{targetTone,baselineScore:revision.baselineScore,source:revision.source,score:revision.score,
            improved:revision.improved,attempts:revision.attempts.map(a=>({...a})),result:revision.result,
            neighbours_kept:revision.neighbours_kept??true,declined_for_neighbours:revision.declined_for_neighbours??0},
          provenance:{origin:'bounded-cell-ecology',canonical_wtl_compiler:false,host_effects:false,autonomous_agent:false}};
        projectDecisions.push(decision);
        const winnerLibrary=programLibrary.get(winner.author);
        winnerLibrary.push({id:decision.id+'-revision',source:revision.source,generation});
        if(winnerLibrary.length>8)winnerLibrary.shift();
        wyrdruneExpressions.push({schema:'wayglass.wtl.cell-expression.v1',generation,speaker:winner.author,
          intent:'project',verb:'select-and-execute',mode:'neighbour-reviewed',
          semantic:{project_id:decision.id,score:winner.score},
          provenance:{origin:'project-genesis',verified_compiler:false}});
      }
    }
    // Sandbox construction: cell-authored, bounded symbolic structures only.
    // No host filesystem, network, code execution or runtime modification.
    if(generation%6===0&&constructions.length<128){
      const builders=tissue.cellsView().filter(cell=>neighbours(cell.id).length>0);
      if(builders.length){
        const builder=builders[generation%builders.length],nearby=neighbours(builder.id);
        const partner=nearby[Math.floor(builder.twist*nearby.length)%nearby.length];
        const genes=traits.get(builder.id);
        const forms=['bridge','nest','resonator','archive','garden'];
        const form=forms[(Math.floor(builder.twist*100)+genes.curiosity+generation)%forms.length];
        const construction={schema:'wayglass.wtl.cell-construction.v1',id:`construct-${generation}-${builder.id}`,
          generation,builders:[builder.id,partner],form,
          specification:{twist:builder.twist,curiosity:genes.curiosity,material:'symbolic-tissue',effects:[]},
          status:'sandbox-proposal',provenance:{origin:'cell-ecology',executed:false,owner_approved:false}};
        constructions.push(construction);
        wyrdruneExpressions.push({schema:'wayglass.wtl.cell-expression.v1',generation,speaker:builder.id,
          intent:'build',verb:'propose',mode:'collaborative',semantic:{construction_id:construction.id,form},
          provenance:{origin:'ecology-construction',verified_compiler:false}});
      }
    }
    // No cell is retired by age or by the colony. A cell lives, regenerating
    // its own energy every Möbius turn, until its own turn chooses rest (see
    // turn()). Cells that rest leave room for new daughters.
    const retired=[];
    // Regenerative response: lower the reproduction threshold in sparse tissue.
    const threshold=positions.size<=3?20:60;
    const births=tissue.populate({steps:1,threshold,quiet:true,reserve:fusionEnabled?1:0}).births;
    for(const birth of births) {
      const parent=positions.get(birth.parent_id);
      const mother=bodies.get(birth.parent_id);
      bodies.set(birth.id,{address:birth.id,parent:birth.parent_id,generation:(mother?.generation??0)+1,name:null,
        syllables:[...(mother?.syllables||[])],carry:daughterCarry(mother?.carry),carry_digest:null,
        heard_since_turn:0,last_turn:null,turns:0});
      const theta=2*Math.PI*random(),distance=0.25+random()*0.5;
      positions.set(birth.id,{x:parent.x+Math.cos(theta)*distance,y:parent.y+Math.sin(theta)*distance});
      adaptation.set(birth.id,{sent:0,heard:0});
      const inherited=makeTraits(traits.get(birth.parent_id));
      traits.set(birth.id,inherited.traits);
      lexicons.set(birth.id,[...lexicons.get(birth.parent_id).slice(-2)]);
      birthTicks.set(birth.id,generation);
      // Descendants receive a copy of an executable ancestor program, not a pointer.
      const parentPrograms=programLibrary.get(birth.parent_id)||[];
      // Early mitosis can precede the five-tick authoring cadence. Give the
      // parent a bounded executable program before copying it to offspring.
      // This preserves genuine parent-to-child provenance rather than inventing
      // a descendant-only ancestor, and does not invoke host capabilities.
      if(parentPrograms.length===0){
        const parentCell=tissue.cellsView().find(c=>c.id===birth.parent_id);
        const source=authorCellProgram(parentCell,traits.get(birth.parent_id),generation);
        const compiled=compileCellProgram(source);
        const verified=executeCellProgram(compiled);
        if(verified.status!=='completed')throw Error('Parent program verification failed');
        parentPrograms.push({id:'program-birth-'+generation+'-'+birth.parent_id,source,generation});
      }
      const inheritedProgram=parentPrograms.at(-1);
      const childPrograms=inheritedProgram?[{...inheritedProgram}]:[];
      programLibrary.set(birth.id,childPrograms);
      if(inheritedProgram){
        const compiled=compileCellProgram(inheritedProgram.source);
        const result=executeCellProgram(compiled);
        programLineages.push({generation,parent_id:birth.parent_id,child_id:birth.id,
          ancestor_program_id:inheritedProgram.id,source:inheritedProgram.source,
          verification:{status:result.status,steps:result.steps},kind:'inherited-executable-copy'});
      }
      if(inherited.change){
        mutations.push({generation,parent_id:birth.parent_id,child_id:birth.id,...inherited.change});
        bodies.get(birth.id).syllables=inheritSyllables(mother?.syllables,{random:syllableRandom,mutate:true});
      }
    }
    return {generation,signals,births:births.map(b=>b.id),retired,population:positions.size};
  }
  // A cell's own Möbius turn: newborns take their first turn (and choose a
  // name); every cell turns again every `turnEvery` generations. Feather stops
  // the current turn even if the colony resumes before it has unwound.
  async function turn({turnEvery=6,signal=null}={}){
    if(tissue.isPaused()||turning)return {turned:[],named:[],rested:[],paused:tissue.isPaused()};
    const epoch=featherEpoch;
    const stop={get aborted(){return signal?.aborted||epoch!==featherEpoch||tissue.isPaused();}};
    turning=true;
    try{
      return await turnColony(turnEvery,stop);
    }catch(error){
      if(!stop.aborted)throw error;
      return {turned:[],named:[],rested:[],paused:tissue.isPaused()};
    }finally{
      turning=false;
    }
  }
  async function turnColony(turnEvery,signal){
    const turned=[],named=[],rested=[];
    for(const id of tissue.livingIds()){
      const cell={id};
      if(signal?.aborted||tissue.isPaused())break;
      const body=bodies.get(cell.id);
      if(!body)continue;
      const due=body.last_turn===null||generation-body.last_turn>=turnEvery;
      if(!due)continue;
      const heard=body.heard_since_turn,inscription=body.inbox?.[0];
      const inscriptionSound=inscription?soundAmount(cell.id,inscription.bands):0;
      const {carry,receipt}=await turnCell({address:cell.id,genome:body.genome,carry:body.carry,
        syllables:body.syllables,heardSinceLastTurn:heard+inscriptionSound,inscription,signal});
      if(signal.aborted)break;
      if(!bodies.has(cell.id))continue; // retired while turning
      body.carry=carry;body.carry_digest=receipt.carry_digest;
      body.heard_since_turn-=heard;
      if(receipt.perceived){
        body.inbox.shift();
        body.last_inscription=receipt.perceived.id;
        body.senses.heard+=inscriptionSound;
        receipt.perceived.inscription_sound=inscriptionSound;
      }
      body.last_turn=generation;body.turns++;body.last_status=receipt.status;
      mobiusReceipts.push({generation,name:body.name,...receipt});
      if(mobiusReceipts.length>96)mobiusReceipts.shift();
      turned.push(cell.id);
      if(!body.name&&receipt.status==='committed'){
        const taken=new Set([...bodies.values()].map(b=>b.name).filter(Boolean));
        const choice=chooseName({candidates:receipt.name_candidates,taken});
        body.name=choice.name;
        const record={generation,address:cell.id,name:choice.name,parent:body.parent,
          parent_name:body.parent?bodies.get(body.parent)?.name??null:null,
          attempts:choice.attempts,candidates:choice.candidates,from_voice:carry.voice,syllables:[...body.syllables],
          carry_digest:receipt.carry_digest,source_hash:receipt.source_hash,
          chosen_in:'own Wyrdrune choose phase: pick from own syllables by own voice'};
        namings.push(record);if(namings.length>200)namings.shift();
        named.push(record);
      }
      // The cell's own choose phase decided it is ready to rest. Its lineage,
      // last words, name and carry are kept; the tissue does not overrule it.
      if(receipt.chose_rest){
        const record=tissue.retire(cell.id,'chose-rest');
        retirements.push({...record,generation,name:body.name,carry_digest:body.carry_digest,
          traits:{...body.genome},lastPhrases:[...(body.phrases||[])],turns:body.turns});
        bodies.delete(cell.id);
        rested.push(cell.id);
      }
    }
    const hybrid=fusionEnabled&&!signal.aborted?await considerFusion(signal):null;
    const worldsTurned=signal.aborted?{founded:[],turned:[],rested:[]}:await turnWorlds({turnEvery,signal});
    return {turned,named,rested,hybrid,worlds:worldsTurned,paused:tissue.isPaused()};
  }

  async function considerFusion(signal){
    for(const [key,meeting] of encounters){
      if(meeting.pair.some(id=>!bodies.has(id))||(!meeting.closed&&generation-meeting.generation>6))
        encounters.delete(key);
    }
    if(bodies.size>=maxCells)return null;
    for(const meeting of encounters.values()){
      if(signal.aborted)break;
      if(meeting.considered||meeting.closed)continue;
      const parents=meeting.pair.map(id=>bodies.get(id));
      if(parents.some(body=>!body.name||body.last_status!=='committed'))continue;
      const [left,right]=parents;
      const decisions=[
        await chooseFusion(left,right,meeting,signal),
        await chooseFusion(right,left,meeting,signal),
      ];
      if(signal.aborted)return null;
      meeting.considered=true;
      const record={generation,exchange:{id:meeting.id,from:meeting.from,to:meeting.to},
        parents:parents.map(body=>({id:body.address,name:body.name,carry_digest:body.carry_digest})),decisions};
      // A decline is retained for this living pair. An open question can be
      // revisited after another exchange.
      meeting.closed=decisions.some(choice=>choice.decision==='declined');
      if(decisions.every(choice=>choice.decision==='accept')){
        let id;
        do{id=`hybrid-${++hybridCount}`;}while(bodies.has(id));
        const phase=(left.carry.phase+right.carry.phase)/2;
        const twist=((phase%1)+1)%1;
        tissue.spawn({id,role:'hybrid',parent_ids:meeting.pair,energy:10,twist});
        bodies.set(id,{
          address:id,parent:null,parents:[...meeting.pair],
          generation:Math.max(left.generation,right.generation)+1,name:null,
          syllables:left.syllables.slice(0,3).concat(right.syllables.slice(-3)),
          carry:firstCarry({energy:0.4,phase:twist,voice:(left.carry.voice+right.carry.voice)/2}),
          carry_digest:null,heard_since_turn:0,last_turn:null,turns:0,
          position:{x:(left.position.x+right.position.x)/2,y:(left.position.y+right.position.y)/2},
          senses:{sent:0,heard:0},
          genome:{sass:left.genome.sass,curiosity:right.genome.curiosity,
            dialectBias:(left.genome.dialectBias+right.genome.dialectBias)%3},
          phrases:[],born:generation,programs:[],
        });
        meeting.closed=true;
        record.child=id;
      }
      fusions.push(record);
      if(fusions.length>96)fusions.shift();
      return record.child??null;
    }
    return null;
  }

  async function shareText(text){
    if(tissue.isPaused())return {delivered:false,paused:true};
    const epoch=featherEpoch;
    const expression=await inscribeSharedText(text);
    if(epoch!==featherEpoch||tissue.isPaused())return {delivered:false,paused:true};
    const recipients=[...bodies.values()];
    if(!recipients.length)return {delivered:false,noRecipients:true};
    if(recipients.some(body=>body.inbox?.length>=8))return {delivered:false,inboxFull:true};
    const inscription={...expression,id:`inscription-${++inscriptionCount}`,generation};
    for(const body of recipients)(body.inbox??=[]).push(inscription);
    inscriptions.push(inscription);
    if(inscriptions.length>8)inscriptions.shift();
    return structuredClone({delivered:true,recipients:recipients.length,inscription});
  }

  // ── Shared worlds ─────────────────────────────────────────────────────
  const MAX_WORLDS=6,HARMONY=0.05;
  // Each cell lives in at most one world: the nearest whose sky reaches it.
  const WORLD_REACH=0.6;
  function residency(){
    const homes=new Map([...worlds.keys()].map(id=>[id,[]]));
    for(const [id,p] of positions){
      let best=null,bestDistance=Infinity;
      for(const world of worlds.values()){
        const d=Math.hypot(p.x-world.center.x,p.y-world.center.y);
        if(d<=world.carry.breadth*WORLD_REACH&&d<bestDistance){best=world.id;bestDistance=d;}
      }
      if(best)homes.get(best).push(id);
    }
    for(const list of homes.values())list.sort();
    return homes;
  }
  const worldMembers=world=>residency().get(world.id)||[];
  function founderView(id){
    const body=bodies.get(id);
    return {address:id,name:body.name,voice:body.carry.voice,syllables:[...body.syllables]};
  }
  async function turnWorlds({turnEvery,signal}){
    const out={founded:[],turned:[],rested:[]};
    // Two named neighbours whose songs are close enough found a world.
    const inWorld=new Set([...worlds.values()].flatMap(w=>w.founder_ids));
    if(worlds.size<MAX_WORLDS){
      for(const [id,body] of bodies){
        if(worlds.size>=MAX_WORLDS||signal?.aborted||tissue.isPaused())break;
        if(!body.name||body.last_status!=='committed'||inWorld.has(id)||!positions.has(id))continue;
        const partner=neighbours(id).find(other=>{const b=bodies.get(other);
          return b?.name&&b.last_status==='committed'&&!inWorld.has(other)&&Math.abs(b.carry.voice-body.carry.voice)<HARMONY;});
        if(!partner)continue;
        const founders=[founderView(id),founderView(partner)].sort((a,b)=>a.address.localeCompare(b.address));
        const pa=positions.get(founders[0].address),pb=positions.get(founders[1].address);
        const world={id:'w'+(++worldCount),founder_ids:founders.map(f=>f.address),founders,
          center:{x:(pa.x+pb.x)/2,y:(pa.y+pb.y)/2},carry:foundingCarry(founders[0],founders[1]),
          name:null,texture:null,born:generation,last_turn:null,pending_touches:0,touches_total:0,carry_digest:null,status:'living'};
        worlds.set(world.id,world);inWorld.add(id);inWorld.add(partner);
        out.founded.push(world.id);
      }
    }
    for(const world of [...worlds.values()]){
      if(signal?.aborted||tissue.isPaused())break;
      if(world.last_turn!==null&&generation-world.last_turn<turnEvery)continue;
      const members=worldMembers(world);
      const {carry,receipt}=await turnWorld({founders:world.founders,carry:world.carry,
        touches:world.pending_touches,members:members.length,signal});
      if(signal?.aborted)break;
      world.carry=carry;world.carry_digest=receipt.carry_digest;world.last_turn=generation;
      world.pending_touches=0;world.texture=receipt.texture;world.members=members;world.last_status=receipt.status;
      if(!world.name&&receipt.name_parts){
        const raw=receipt.name_parts.join('');
        const base=raw.charAt(0).toUpperCase()+raw.slice(1);
        const taken=new Set([...worlds.values(),...rememberedWorlds].map(w=>w.name));
        let name=base,n=2;while(taken.has(name))name=base+'-'+(n++);
        world.name=name;
      }
      worldReceipts.push({generation,world:world.id,name:world.name,members:members.length,...receipt});
      if(worldReceipts.length>96)worldReceipts.shift();
      out.turned.push(world.id);
      // A world with no one left in it, quiet for three turns, rests.
      if(carry.quiet>=6&&members.length===0){
        world.status='remembered';world.rested_at=generation;
        rememberedWorlds.push(projectWorld(world));if(rememberedWorlds.length>48)rememberedWorlds.shift();
        worlds.delete(world.id);out.rested.push(world.id);
      }
    }
    return out;
  }
  // A person's touch reaches the world and everyone living in it.
  function touchWorld(id,{strength=1}={}){
    if(tissue.isPaused())return {touched:false,paused:true};
    const world=worlds.get(id);
    if(!world)throw Error('Unknown world');
    if(!Number.isSafeInteger(strength)||strength<1||strength>3)throw Error('Invalid touch');
    world.pending_touches=Math.min(40,world.pending_touches+strength);world.touches_total+=strength;
    const members=worldMembers(world);
    for(const member of members){const body=bodies.get(member);if(body)body.heard_since_turn+=2*strength;}
    return {touched:true,world:id,name:world.name,members:members.length,texture:world.texture};
  }
  function projectWorld(world){
    return {id:world.id,name:world.name,status:world.status,founders:world.founders.map(f=>({address:f.address,name:f.name})),
      center:{...world.center},carry:{...world.carry},carry_digest:world.carry_digest,texture:world.texture,
      members:[...(world.members||[])],born:world.born,last_turn:world.last_turn,touches_total:world.touches_total,
      rested_at:world.rested_at??null,last_status:world.last_status??null};
  }
  // Sound from the room, as band levels 0..1 (low to high). Each cell listens
  // to the band its own twist faces; what it hears is counted for its next turn.
  function soundAmount(id,bands){
    const band=Math.min(bands.length-1,Math.floor(tissue.twistOf(id)*bands.length));
    return Math.round(bands[band]*3);
  }
  function hear(bands){
    if(tissue.isPaused())return {heard:0,paused:true};
    if(!Array.isArray(bands)||bands.length<1||bands.length>32||!bands.every(v=>Number.isFinite(v)&&v>=0&&v<=1))
      throw Error('Invalid sound bands');
    let heard=0;
    for(const id of tissue.livingIds()){
      const body=bodies.get(id);if(!body)continue;
      const amount=soundAmount(id,bands);
      if(amount>0){body.heard_since_turn+=amount;body.senses.heard+=amount;heard+=amount;}
    }
    return {heard,paused:false};
  }
  function transform(id,nextRole,options={}) {
    const result=tissue.transform(id,nextRole,options);
    // Position, mutation history, phrase memory and lineage remain unchanged.
    return result;
  }
  function snapshot(){
    const core=tissue.snapshot();
    const names=Object.fromEntries([...bodies].map(([id,b])=>[id,b.name]));
    const mobius=Object.fromEntries([...bodies].map(([id,b])=>[id,{name:b.name,parent:b.parent,
      generation:b.generation,syllables:[...(b.syllables||[])],carry:b.carry?{...b.carry}:null,
      carry_digest:b.carry_digest,turns:b.turns,last_turn:b.last_turn,last_status:b.last_status??null,
      heard_since_turn:b.heard_since_turn,last_inscription:b.last_inscription??null,
      ...(b.parents?{parent_ids:[...b.parents]}:{})}]));
    return {...core,generation,names,mobius,fusions:structuredClone(fusions),inscriptions:structuredClone(inscriptions),
      namings:namings.map(n=>({...n,syllables:[...n.syllables],candidates:[...n.candidates]})),
      mobiusReceipts:mobiusReceipts.map(r=>JSON.parse(JSON.stringify(r))),
      worlds:[...worlds.values()].map(projectWorld),rememberedWorlds:rememberedWorlds.map(w=>JSON.parse(JSON.stringify(w))),
      worldReceipts:worldReceipts.map(r=>JSON.parse(JSON.stringify(r))),
      positions:Object.fromEntries(positions),
      adaptation:Object.fromEntries(adaptation),traits:Object.fromEntries(traits),mutations:mutations.map(m=>({...m})),
      retirements:retirements.map(r=>({...r,traits:{...r.traits},lastPhrases:[...r.lastPhrases]})),utterances:utterances.map(u=>({...u})),lexicons:Object.fromEntries([...lexicons].map(([id,phrases])=>[id,[...phrases]])),
      neighbourhoods:Object.fromEntries([...positions.keys()].map(id=>[id,neighbours(id)])),
      wyrdruneExpressions:wyrdruneExpressions.map(e=>({...e,semantic:{...e.semantic,traits:e.semantic.traits?{...e.semantic.traits}:undefined},provenance:{...e.provenance}})),
      projectDecisions:projectDecisions.map(d=>({...d,candidates:d.candidates.map(p=>({...p,reviews:p.reviews.map(r=>({...r}))})),selected:{...d.selected,result:{...d.selected.result,output:d.selected.result.output.map(x=>({...x}))}},peerTests:d.peerTests.map(p=>JSON.parse(JSON.stringify(p))),revision:{...d.revision,attempts:d.revision.attempts.map(a=>({...a})),result:{...d.revision.result,output:d.revision.result.output.map(x=>({...x}))}},provenance:{...d.provenance}})),
      harmonicDialogues:harmonicDialogues.map(d=>({...d,events:d.events.map(e=>({...e})),reply:{...d.reply,provenance:{...d.reply.provenance}},sonic:{call:{...d.sonic.call},reply:{...d.sonic.reply},callProjection:{...d.sonic.callProjection},replyProjection:{...d.sonic.replyProjection}},provenance:{...d.provenance}})),
      programLineages:programLineages.map(p=>({...p,verification:{...p.verification}})),
      programLibrary:Object.fromEntries([...programLibrary].map(([id,items])=>[id,items.map(p=>({...p}))])),
      programs:programs.map(p=>({...p,result:{...p.result,output:p.result.output.map(x=>({...x}))},provenance:{...p.provenance}})),
      constructions:constructions.map(p=>({...p,builders:[...p.builders],specification:{...p.specification,effects:[...p.specification.effects]},provenance:{...p.provenance}}))};
  }
  return Object.freeze({
    plant,step,turn,hear,shareText,touchWorld,neighbours,transform,snapshot,
    feather(){featherEpoch++;return tissue.feather();},resume:tissue.resume,
  });
}
