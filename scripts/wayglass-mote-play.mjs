#!/usr/bin/env node
// Wayglass development toy, not an authenticated remote House session.
// npm run wayglass:play:motes
import readline from 'node:readline/promises';
import {stdin as input,stdout as output} from 'node:process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {playTurn}=require('../lib/wayglass-mote-play.cjs');
const {DEFAULT_SEEDS}=require('../lib/wayglass-wyrdrune-motes.cjs');
const principal={id:'local:developer-playground',authorized:true};
let state=DEFAULT_SEEDS,turn=0;
const demo=process.argv.includes('--demo');
const format=n=>Number(n).toFixed(3);
function show(result){
  const s=result.state;
  output.write('\nTurn '+result.turn+' · '+result.kind.toUpperCase()
    +' · Wyrdrune Eightfold '+result.work.evidence.phase_receipts+'/8\n');
  output.write('  Spiral '+format(s.phase)+'  ascent '+format(s.elevation)
    +'  spin '+format(s.velocity)+'\n');
  output.write('  Wonder '+format(s.wonder)+'  Possibility '+format(s.possibility)
    +'  Harmony '+format(s.harmony)+'  Chaos '+format(s.chaos)
    +'  Magic '+format(s.magic)+'\n');
  output.write('  Work receipt '+result.work.evidence.input_hash.slice(0,16)
    +' · candidate only · no server write\n');
}
async function act(kind){
  const result=await playTurn({kind,turn:++turn,seeds:state,principal});
  state=result.state;show(result);
}
output.write('Wayglass · Build → Play → Work → Play → Ascend\n');
output.write('Local development play; no network, model call or durable persistence.\n');
if(demo){
  for(const kind of ['wonder','touch','shape','listen'])await act(kind);
}else{
  const rl=readline.createInterface({input,output});
  try{
    while(true){
      const answer=(await rl.question('\nChoose wonder / touch / shape / listen / feather / quit: ')).trim().toLowerCase();
      if(answer==='quit'||answer==='exit'||answer==='feather')break;
      if(!['wonder','touch','shape','listen'].includes(answer)){
        output.write('Try wonder, touch, shape, listen, or Feather to stop.\n');continue;
      }
      await act(answer);
    }
  }finally{rl.close();}
}
output.write('Withness · the next turn remains possible.\n');
