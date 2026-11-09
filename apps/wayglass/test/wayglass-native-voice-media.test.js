import test from 'node:test';
import assert from 'node:assert/strict';
import {morphFrame,animateWyrdruneTranslation} from '../src/wyrdrune-morph.js';
import {createWayglassImage,createWayglassSoundPlayer} from '../src/wyrdrune-response-media.js';

test('native Wyrdrune source is visible at the first frame and authored en-GB at the last',()=>{
 const source='mobius { perceive {} compress {} release {} verify {} integrate {} choose {emit "I return";} return {} transcend {} }';
 const english='I return.';
 assert.equal(morphFrame(source,english,0),source);
 assert.equal(morphFrame(source,english,1),english);
 assert.notEqual(morphFrame(source,english,.5),english);
});
test('morph animation is pure display, can be cancelled, and respects reduced motion',()=>{
 const node={textContent:'',attrs:{},setAttribute(k,v){this.attrs[k]=v}};
 const scheduled=new Map();let next=0;
 const scope={setTimeout(fn){const id=++next;scheduled.set(id,fn);return id},
   clearTimeout(id){scheduled.delete(id)}};
 let completed=0;
 const cancel=animateWyrdruneTranslation(node,{
  source:'operator spiral(x) = x * 2;',translation:'A spiral returns.',
  scope,lingerMs:100,frameMs:20,steps:4,onComplete:()=>completed++,
 });
 assert.equal(node.attrs.lang,'zxx');
 assert.equal(node.textContent,'operator spiral(x) = x * 2;');
 for(let i=0;i<4;i++){
   const [id,task]=scheduled.entries().next().value;
   scheduled.delete(id);task();
 }
 assert.equal(node.textContent,'A spiral returns.');
 assert.equal(node.attrs.lang,'en-GB');
 assert.equal(completed,1);
 cancel();
 const instant={textContent:'',setAttribute(){}};
 animateWyrdruneTranslation(instant,{
   source:'native',translation:'English',reducedMotion:true,scope,
 });
 assert.equal(instant.textContent,'English');
});
test('image returns only deterministic bounded SVG geometry, not model-provided SVG markup',()=>{
 const doc={createElementNS(_,tag){
   return {tag,attrs:{},children:[],
    setAttribute(key,value){this.attrs[key]=value;},
    append(child){this.children.push(child);}};
 }};
 const svg=createWayglassImage({kind:'image',hue:190,spread:.75,depth:.3},doc);
 assert.equal(svg.tag,'svg');
 assert.equal(svg.attrs.role,'img');
 assert.equal(svg.attrs.viewBox,'0 0 640 400');
 assert.ok(svg.children.some(x=>x.tag==='g'));
 assert.equal(svg.children.some(x=>x.tag==='script'),false);
 assert.throws(()=>createWayglassImage({kind:'sound'},doc),/image score/);
});
test('sound is original bounded mono synthesis and starts only from an explicit play call',async()=>{
 const traces={started:0,stopped:0,closed:0,oscillators:[]};
 const audio={
   currentTime:0,destination:{},resume:async()=>{},
   createGain(){return {gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){}},
     connect(){}};},
   createOscillator(){
     const osc={frequency:{value:0},type:'sine',connect(){},disconnect(){},
       start(){traces.started++},stop(){traces.stopped++}};
     traces.oscillators.push(osc);return osc;
   },
   close(){traces.closed++;},
 };
 const player=createWayglassSoundPlayer({scope:{AudioContext:class{constructor(){
     return audio;
   }}}});
 assert.equal(traces.started,0);
 await assert.rejects(player.play({kind:'sound',autoplay:true}),/user-invoked/);
 const result=await player.play({kind:'sound',fundamental:220,interval:1.5,texture:.5,autoplay:false});
 assert.equal(result.mono,true);
 assert.ok(result.max_gain<=.017);
 assert.equal(traces.started,2);
 assert.equal(traces.oscillators[1].frequency.value,330);
 player.stop();assert.ok(traces.closed>=1);
 player.dispose();
});
