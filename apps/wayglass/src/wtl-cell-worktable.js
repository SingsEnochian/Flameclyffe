import {compileCellProgram,executeCellProgram} from './wtl-cell-program.js';
import {createWyrdruneRuntime} from './wtl-cell-runtime.js';
import {digestWce1Sync} from './wtl-cell-digest.js';

const runtime=createWyrdruneRuntime({hashSource:text=>digestWce1Sync({wtl_source:text}),continuityDigest:digestWce1Sync});
const keys=Array.from({length:73},(_,i)=>24+i);
const frequencies=keys.map(note=>Number((110*2**((note-45)/12)).toFixed(4)));

function worktableSource({tone,rest,echo}){
  return `mobius scoped {
  perceive {
    let invitation = offered;
    let reply = is_cell;
  }
  compress {
    let motif = (${tone} + last_note) / 2;
  }
  release {
    let shifted = motif + invitation + voice * 13 + ${echo};
  }
  verify {
    require invitation >= 24 and invitation <= 96 else "offer a note within reach";
    require voice >= 0 and voice <= 1 else "carry a voice within reach";
  }
  integrate {
    let next_hue = (hue + shifted * ${echo+1}) % 360;
  }
  choose {
    let joins = when reply then willingness >= 0.25 else true;
    let note = pick(${JSON.stringify(keys)}, shifted);
    let pulse = pick(${JSON.stringify(frequencies)}, shifted);
    let beat = 0.12 + ${rest} * 0.06;
  }
  return {
    emit {joins: joins, note: note, hue: next_hue, pitch: pulse, beat: beat};
  }
  transcend {
    carry last_note = when joins then note else last_note;
    carry hue = when joins then next_hue else hue;
    carry offered = 0;
    carry voice = 0;
    carry willingness = 0;
    carry is_cell = false;
  }
}`;
}

export function createCellWorktables(){
  const programs=new Map();
  const session=crypto.randomUUID?.()??crypto.getRandomValues(new Uint32Array(4)).join('-');

  function publish({id,author,score,reviewers}){
    const instructions=executeCellProgram(compileCellProgram(score)).output;
    const motif=Object.fromEntries(instructions.map(instruction=>[instruction.kind,instruction.value]));
    const source=worktableSource(motif);
    programs.set(id,{
      id,author,score,reviewers,source,
      carry:{last_note:motif.tone,hue:motif.tone*5%360},
      revision:0,turns:[],busy:false,ir:null,
    });
  }

  async function contribute(program,actor,{note,voice=0,willingness=1,carry,signal}){
    const ir=program.ir??=runtime.compile(program.source);
    const run=await runtime.execute(ir,{seeds:{...carry,offered:note,voice,willingness,is_cell:actor.kind==='cell'},signal,maxOperations:800});
    if(run.status!=='committed')throw new Error(run.verdict?.reason||'The program could not complete its turn.');
    const output=run.output.at(-1);
    const {last_note,hue}=run.continuity.carry;
    const next={last_note,hue};
    return {actor,offered:note,joined:output.joins,output:output.joins?output:null,
      carry:next,source_hash:ir.sourceHash,carry_digest:digestWce1Sync(next)};
  }

  async function play({id,note,visitorId,expectedSession,expectedRevision,generation,peers,signal}){
    if(signal.aborted)return {status:'feather-stopped'};
    const program=programs.get(id);
    if(!program)return {status:'missing'};
    if(expectedSession!==session||program.busy||program.revision!==expectedRevision)return {status:'changed'};
    if(!Number.isSafeInteger(note)||note<24||note>96||typeof visitorId!=='string'||!/^[A-Za-z0-9-]{1,64}$/.test(visitorId)){
      return {status:'invalid'};
    }
    program.busy=true;
    try{
      const offered=await contribute(program,{kind:'visitor',id:visitorId},{note,carry:program.carry,signal});
      if(signal.aborted)return {status:'feather-stopped'};
      const actions=[offered];
      const living=peers();
      const eligible=living.filter(cell=>cell.name&&(cell.id===program.author.id||program.reviewers.includes(cell.id)));
      const audience=eligible.length?eligible:living.filter(cell=>cell.name);
      const peer=audience[program.revision%audience.length];
      if(peer){
        actions.push(await contribute(program,{kind:'cell',id:peer.id,name:peer.name},{
          note:offered.output.note,voice:peer.voice,willingness:peer.willingness,carry:offered.carry,signal,
        }));
      }
      if(signal.aborted)return {status:'feather-stopped'};
      program.carry=actions.at(-1).carry;
      const turn={program:id,revision:++program.revision,generation,actions};
      program.turns.push(turn);
      if(program.turns.length>32)program.turns.shift();
      return {status:'committed',turn:structuredClone(turn)};
    }catch(error){
      if(signal.aborted)return {status:'feather-stopped'};
      throw error;
    }finally{
      program.busy=false;
    }
  }

  function snapshot(){
    return structuredClone([...programs.values()].map(({id,author,score,source,carry,revision,turns})=>({
      id,session,author,score,source,carry,revision,turns,
    })));
  }

  return {publish,play,snapshot};
}
