import { createResearchDialogue, askRowan, respondToAgent, deriveResearchQuestions } from './walter-research-dialogue.js';
import { createResearchSocietyState, runResearchSociety, exportResearchSocietyCheckpoint } from './walter-research-society.js';
import { deliberateThirdLight } from './walter-agent-deliberation.js';
import { runThirdLightAgents } from './walter-agent-runtime.js';
import { runWalterAgentLenses } from './walter-agent-lenses.js';
const SOURCES = Object.freeze([
  {id:'walter:1933',name:'Young Walter',year:1933,place:'Britain',x:110,y:245,color:'#80a9c8'},
  {id:'walter:1950',name:'Old Man Walter',year:1950,place:'America',x:490,y:245,color:'#e2bd75'}
]);
const MODELS = {
  linear:{title:'Linear continuity',question:'Which attributes persist across a proposed continuous history?',points:[[110,245],[490,245]],links:[[0,1]]},
  branch:{title:'Branching histories',question:'Could separate histories share a common narrative origin?',points:[[110,245],[490,245],[300,70]],links:[[2,0],[2,1]]},
  fold:{title:'Narrative fold',question:'What changes if narrative distance differs from calendar distance?',points:[[110,245],[490,245],[300,110]],links:[[0,2],[2,1],[1,0]]},
  projection:{title:'Observer projection',question:'Does a shared visible name conceal two distinct source records?',points:[[110,245],[490,245],[300,85]],links:[[0,2],[1,2]]},
  third:{title:'Third-point inquiry',question:'Is the third point an observer, an event, or a transformation of perspective?',points:[[110,245],[490,245],[300,70]],links:[[0,1],[0,2],[1,2]]}
};
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createWalterReceipt(model='third',observer='The Observer') {
  if (!Object.hasOwn(MODELS,model)) throw new Error('Unknown model');
  return {schema:'wayglass.walter-hypothesis/v0.1',model,observer:String(observer).slice(0,80),sources:SOURCES.map(({id,name,year,place})=>({id,name,year,place})),calendar_gap_years:17,arithmetic_midpoint_year:1941.5,thaumetric:{mathematics:0.18,magic:0.82},claim_status:'hypothesis',physical_fold_verified:false,identity_merge_authorized:false,third_spacetime_coordinate:null,question:MODELS[model].question};
}
export function mountWalterThirdPointSurface(root) {
  root.innerHTML = `<section class="glass-panel" style="padding:22px;max-width:1100px;margin:24px auto;color:#e9e5d9"><p style="letter-spacing:.18em;color:#e3c88d">WAYGLASS · DREAM-VOYAGE · FOLD WITNESS</p><h1 style="font-family:Georgia,serif">Walter: The Third Point</h1><p>Two attributed histories remain distinct. Explore hypotheses without claiming physical time travel or merging identity.</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px"><div><svg data-walter-diagram viewBox="0 0 600 320" role="img" aria-label="Walter geometric relationship" style="width:100%;background:#081820;border:1px solid #8b7656;border-radius:16px"></svg><p>Blue: 1933 Britain · Gold: 1950 America · Green: hypothesis/observer</p></div><div><label for="walter-model">Transformation lens</label><select id="walter-model" style="display:block;width:100%;margin:8px 0 14px"><option value="linear">Linear continuity</option><option value="branch">Branching histories</option><option value="fold">Narrative fold</option><option value="projection">Observer projection</option><option value="third" selected>Third-point inquiry</option></select><label for="walter-observer">Observer label</label><input id="walter-observer" maxlength="80" value="The Observer" style="display:block;width:100%;margin:8px 0 14px"><p data-walter-question></p><p>17-year calendar gap · arithmetic midpoint 1941.5</p><p>Thaumetric bearing: 18% mathematics / 82% magic. Not evidentiary weights.</p><button type="button" data-walter-export>Export JSON receipt</button></div></div><h2>Research society · bounded autonomous inquiry</h2><div data-research-dialogue><h3>Research conversation · Rowan and the crew</h3><p>Agents may ask; you may answer, decline, or defer. No reply is assumed.</p><div data-dialogue-list></div></div><div style="margin:12px 0"><button type="button" data-society-run>Run next research cycle</button> <button type="button" data-society-save>Export society checkpoint</button><p data-society-status role="status">Five hypotheses queued. No autonomous cycles executed.</p><pre data-society-output style="white-space:pre-wrap;max-height:260px;overflow:auto"></pre></div><h2>Research crew · read-only agent lenses</h2><div style="margin:12px 0"><label for="walter-route">Wayglass model route</label><input id="walter-route" value="openai:gpt" style="margin:8px" aria-label="Model route ID"><button type="button" data-walter-run>Run five agents on selected hypothesis</button> <button type="button" data-walter-deliberate>Deliberate · Propose / Challenge / Revise</button><p data-walter-status role="status"></p><pre data-walter-model-output style="white-space:pre-wrap;max-height:300px;overflow:auto"></pre></div><div data-walter-agents aria-live="polite"></div><pre data-walter-receipt style="white-space:pre-wrap;overflow-wrap:anywhere;max-height:250px;overflow:auto;font-size:12px;margin-top:20px"></pre><small>Original photographed notes not independently ingested. This surface is a non-authoritative hypothesis explorer.</small></section>`;
  const model=root.querySelector('#walter-model'),observer=root.querySelector('#walter-observer'),svg=root.querySelector('[data-walter-diagram]'),pre=root.querySelector('[data-walter-receipt]');
  const render=()=>{
    const m=MODELS[model.value],pts=m.points;
    svg.innerHTML=`<circle cx="300" cy="160" r="130" fill="none" stroke="#bda474" stroke-opacity=".22"/>`+m.links.map(([a,b])=>`<line x1="${pts[a][0]}" y1="${pts[a][1]}" x2="${pts[b][0]}" y2="${pts[b][1]}" stroke="#bda474" stroke-width="2"/>`).join('')+pts.map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="11" fill="${i===0?'#80a9c8':i===1?'#e2bd75':'#9fcea8'}"/><text x="${x}" y="${y+27}" text-anchor="middle" font-size="13" fill="#e9e5d9">${i===0?'1933 Britain':i===1?'1950 America':esc(observer.value||'Observer')}</text>`).join('');
    root.querySelector('[data-walter-question]').textContent=m.question;
    const receipt=createWalterReceipt(model.value,observer.value);
    pre.textContent=JSON.stringify({...receipt,agent_lenses:runWalterAgentLenses(receipt)},null,2);
    const crew=root.querySelector('[data-walter-agents]');
    crew.replaceChildren(...runWalterAgentLenses(receipt).map(agent=>{const el=document.createElement('p');el.textContent=agent.agent_label+': '+agent.finding;return el;}));
  };
  model.addEventListener('change',render);observer.addEventListener('input',render);
  root.querySelector('[data-walter-export]').addEventListener('click',()=>{
    const blob=new Blob([pre.textContent],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='walter-third-point-receipt.json';a.click();URL.revokeObjectURL(url);
  });
  let disposed=false;
  const runButton=root.querySelector('[data-walter-run]');
  runButton.addEventListener('click',async()=>{
    runButton.disabled=true;
    const status=root.querySelector('[data-walter-status]'),out=root.querySelector('[data-walter-model-output]');
    status.textContent='Calling five scoped Wayglass model seats…';out.textContent='';
    try {
      const result=await runThirdLightAgents({routeId:root.querySelector('#walter-route').value.trim()||'openai:gpt',model:model.value,maxTasks:5,onProgress:item=>{if(!disposed){out.textContent+=item.agent_id+' ['+item.status+']\\n'+(item.output||item.error)+'\\n\\n';}}});
      if(!disposed)status.textContent='Attempted '+result.results.length+' agent calls. Outputs are unverified hypotheses.';
    } catch(error){if(!disposed)status.textContent='Runtime error: '+String(error.message||error);}
    finally{if(!disposed)runButton.disabled=false;}
  });
  const deliberateButton=root.querySelector('[data-walter-deliberate]');
  deliberateButton.addEventListener('click',async()=>{
    deliberateButton.disabled=true;
    const status=root.querySelector('[data-walter-status]'),out=root.querySelector('[data-walter-model-output]');
    status.textContent='Research crew deliberating (up to 15 sequential model requests)…';out.textContent='';
    try{
      const result=await deliberateThirdLight({routeId:root.querySelector('#walter-route').value.trim()||'openai:gpt',model:model.value,onProgress:item=>{if(!disposed)out.textContent+=item.stage+' · '+item.seat_id+' ['+item.status+']\\n'+JSON.stringify(item.result,null,2)+'\\n\\n';}});
      if(!disposed)status.textContent=result.validated_shape+' structurally valid candidate outputs; none source-verified. Owner review required.';
    }catch(error){if(!disposed)status.textContent='Deliberation error: '+String(error.message||error);}
    finally{if(!disposed)deliberateButton.disabled=false;}
  });
  let dialogue=createResearchDialogue();
  function renderDialogue(){
    const list=root.querySelector('[data-dialogue-list]');list.replaceChildren();
    for(const msg of dialogue.messages){
      const wrap=document.createElement('div');wrap.style.margin='12px 0';wrap.style.padding='12px';wrap.style.border='1px solid #8b7656';wrap.style.borderRadius='12px';
      const p=document.createElement('p');p.textContent=msg.agent_id+' asks: '+msg.text;wrap.append(p);
      if(msg.status==='pending'){
        const input=document.createElement('textarea');input.placeholder='Your response (optional)';input.rows=2;wrap.append(input);
        for(const action of ['answer','defer','decline']){const btn=document.createElement('button');btn.type='button';btn.textContent=action;btn.style.margin='4px';btn.addEventListener('click',()=>{try{dialogue=respondToAgent(dialogue,msg.id,{action,text:input.value});renderDialogue();}catch(e){input.placeholder=String(e.message||e);}});wrap.append(btn);}
      }else{const state=document.createElement('p');state.textContent='Rowan: '+msg.status+(msg.reply?' · '+msg.reply:'');wrap.append(state);}
      list.append(wrap);
    }
  }
  let society=createResearchSocietyState();
  const societyRun=root.querySelector('[data-society-run]'),societySave=root.querySelector('[data-society-save]');
  societyRun.addEventListener('click',async()=>{
    societyRun.disabled=true;
    const status=root.querySelector('[data-society-status]'),out=root.querySelector('[data-society-output]');
    status.textContent='Running bounded research cycle…';out.textContent='';
    try{society=await runResearchSociety({state:society,maxCycles:1,routeId:root.querySelector('#walter-route').value.trim()||'openai:gpt',onProgress:event=>{if(!disposed)out.textContent+=JSON.stringify(event)+'\\n';}});
      const latest=society.ledger.at(-1);
      if(latest){for(const question of deriveResearchQuestions(latest.dossier))dialogue=askRowan(dialogue,{...question,cycle:society.cycle});renderDialogue();}
      if(!disposed)status.textContent='Cycle '+society.cycle+' completed; '+society.agenda.filter(x=>x.status==='open').length+' hypotheses remain. No canon promotion.';
    }catch(error){if(!disposed)status.textContent='Research stopped: '+String(error.message||error);}
    finally{if(!disposed)societyRun.disabled=false;}
  });
  societySave.addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify(exportResearchSocietyCheckpoint(society),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='wayglass-third-light-checkpoint.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  render();
  return {destroy(){disposed=true;root.replaceChildren();}};
}
