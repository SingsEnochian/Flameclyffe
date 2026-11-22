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
