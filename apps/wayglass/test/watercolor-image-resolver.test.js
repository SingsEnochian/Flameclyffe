import test from 'node:test';
import assert from 'node:assert/strict';
import {createWatercolorImageResolver} from '../src/watercolor-image-resolver.js';
const context={clearRect(){},drawImage(){},createLinearGradient(){return {addColorStop(){}}},fillRect(){},beginPath(){},arc(){},ellipse(){},clip(){},save(){},restore(){},fill(){},moveTo(){},lineTo(){},closePath(){},set globalAlpha(v){}};
const canvas=()=>({width:0,height:0,getContext:()=>context});
const scope={document:{createElement:()=>canvas()}};
test('emergent image resolves, dissolves reversibly, and keeps source',()=>{
 const resolver=createWatercolorImageResolver(canvas(),{scope});
 assert.equal(resolver.emerge(42).kind,'emergent');
 resolver.render(320,200,400);
 assert.equal(resolver.snapshot().opacity,1);
 resolver.dissolve();resolver.render(320,200,400);
 assert.equal(resolver.snapshot().opacity,0);
 assert.equal(resolver.snapshot().sourceRetained,true);
 resolver.dispose();
});
test('Feather freezes image transitions and forbids replacement',()=>{
 const resolver=createWatercolorImageResolver(canvas(),{scope});
 resolver.emerge(1);resolver.render(320,200,100);
 const before=resolver.snapshot().opacity;
 resolver.feather(true);resolver.render(320,200,400);
 assert.equal(resolver.snapshot().opacity,before);
 assert.throws(()=>resolver.emerge(2),/Feather/);
 resolver.feather(false);resolver.render(320,200,400);
 assert.equal(resolver.snapshot().opacity,1);
 resolver.dispose();
});

test('both emergent and reference resolution share the reversible pigment aperture',async()=>{
 const resolver=createWatercolorImageResolver(canvas(),{scope:{...scope,
  URL:{createObjectURL:()=> 'blob:local',revokeObjectURL(){}},
  Image:class {naturalWidth=200;naturalHeight=100;async decode(){}},
 }});
 await resolver.resolveFile({type:'image/png',size:1024});
 assert.equal(resolver.snapshot().kind,'reference');
 resolver.render(320,200,200);
 assert.ok(resolver.snapshot().opacity>0);
 resolver.dissolve();resolver.render(320,200,400);
 assert.equal(resolver.snapshot().opacity,0);
 assert.equal(resolver.snapshot().sourceRetained,true);
 resolver.dispose();
});

test('live pigment chroma masks both image sources without mutating the sample',()=>{
 let masks=0;
 const maskContext={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){masks++;}};
 const surface={width:0,height:0,getContext:()=>({...context,globalCompositeOperation:'source-over'})};
 const resolver=createWatercolorImageResolver(surface,{scope:{document:{createElement:()=>({width:0,height:0,getContext:()=>maskContext})}}});
 const rgba=new Uint8ClampedArray([220,60,20,255,40,40,40,255]);
 const before=[...rgba];
 resolver.setPigmentPixels(rgba,2,1);
 resolver.render(200,100,16);
 assert.deepEqual([...rgba],before);
 resolver.feather(true);
 resolver.setPigmentPixels(new Uint8ClampedArray(8),2,1);
 assert.equal(resolver.snapshot().stopped,true);
 resolver.dispose();
 assert.equal(masks,0); // no image has been selected, so no compositing yet
});
