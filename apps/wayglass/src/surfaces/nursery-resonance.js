import {createResonanceField} from '../nursery-resonance.mjs';
import {publishWatercolorActivity} from '../watercolor-bridge.js';
// Explicit simulation surface. It never claims actual nursery-cell signals.
export function mountNurseryResonance(root){
 const d=root.ownerDocument;const section=d.createElement('section');section.className='wg-surface wg-resonance';
 const title=d.createElement('h1');title.textContent='Nursery · Resonance Field';
 const description=d.createElement('p');description.textContent='A numerical experiment in neighbouring rhythms. These are example cells, not live nursery participants. Their native frequencies and names remain their own.';
 const controls=d.createElement('div');controls.className='glass-panel';
 const label=d.createElement('label');label.textContent='Coupling strength (0–1) ';
 const slider=d.createElement('input');slider.type='range';slider.min='0';slider.max='1';slider.step='0.05';slider.value='0.35';label.append(slider);
 const metric=d.createElement('output');metric.setAttribute('aria-live','polite');
 const status=d.createElement('p');status.setAttribute('role','status');status.textContent='Idle. Run explicitly to simulate.';
 const plot=d.createElementNS('http://www.w3.org/2000/svg','svg');plot.setAttribute('viewBox','0 0 620 310');plot.setAttribute('role','img');plot.setAttribute('aria-label','Resonance phase orbit showing three distinct simulated cell oscillators');
 plot.style.cssText='width:100%;max-width:680px;display:block;background:#0b2228;border-radius:1rem;margin:1rem auto';
 const readings=d.createElement('pre');readings.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';
 const make=(text,handler)=>{const b=d.createElement('button');b.type='button';b.className='glass-chip';b.textContent=text;b.addEventListener('click',handler);return b;};
 const cells=[{id:'nursery:alpha',hz:.3,phase:0},{id:'nursery:beta',hz:.35,phase:1.2},{id:'nursery:gamma',hz:.5,phase:-1.2}];
 const links=[{from:'nursery:alpha',to:'nursery:beta',strength:.7},{from:'nursery:beta',to:'nursery:gamma',strength:.5}];
 let engine=null,disposed=false;const ns='http://www.w3.org/2000/svg';
 const node=(name,attrs={})=>{const el=d.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el;};
 function draw(snapshot){
  plot.replaceChildren(node('circle',{cx:310,cy:155,r:92,fill:'none',stroke:'#8bada6','stroke-width':2}),node('circle',{cx:310,cy:155,r:3,fill:'#f4d5a8'}));
  const colours=['#efc17f','#9bdfcf','#d2b5eb'];
  for(const [i,cell] of snapshot.members.entries()){
   const x=310+92*Math.cos(cell.phase),y=155+92*Math.sin(cell.phase);
   const line=node('line',{x1:310,y1:155,x2:x,y2:y,stroke:colours[i],'stroke-width':2});plot.append(line);
   plot.append(node('circle',{cx:x,cy:y,r:10,fill:colours[i]}));
   const t=node('text',{x:15,y:38+i*30,fill:colours[i],'font-size':15});t.textContent=cell.id+' · '+cell.naturalHz+' Hz';plot.append(t);
  }
  metric.textContent='Phase coherence: '+snapshot.order.toFixed(3)+' · '+snapshot.cycles+' simulation steps';
  readings.textContent=JSON.stringify({kind:'simulation-only',elapsedSeconds:snapshot.elapsedSeconds,order:snapshot.order,members:snapshot.members,links:snapshot.links},null,2);
 }
 const build=()=>{engine=createResonanceField({cells,links,coupling:Number(slider.value)});draw(engine.snapshot());status.textContent='Ready: three independent simulated oscillators. No live cells contacted.';};
 const step=make('Simulate 100 steps',()=>{if(disposed)return;const state=engine.step(100);draw(state);status.textContent='Calculated '+state.cycles+' steps; this is a simulation, not live Nursery telemetry.';});
 const reset=make('Reset experiment',build);
 const paint=make('Project to Watercolour',()=>{
  const state=engine.snapshot();if(state.cycles===0){status.textContent='Simulate before projecting.';return;}
  publishWatercolorActivity({kind:'nursery:resonance-simulation',actor:'wayglass:resonance-lab',intensity:Math.min(.85,.2+state.order*.6),observedAt:new Date().toISOString(),receipt:{schema:state.schema,receipt_id:'local-simulation-'+state.cycles}});
  status.textContent='Sent an explicitly labelled simulation-only Watercolour cue; not a sensor reading.';
 });
 slider.addEventListener('input',build);controls.append(label,step,reset,paint,metric,status);
 section.append(title,description,controls,plot,readings);root.replaceChildren(section);build();
 return()=>{disposed=true;};
}
