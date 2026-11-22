import test from 'node:test';
import assert from 'node:assert/strict';
import {createWatercolorImageResolver} from '../src/watercolor-image-resolver.js';
const context={clearRect(){},drawImage(){},createLinearGradient(){return {addColorStop(){}}},fillRect(){},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},closePath(){},set globalAlpha(v){}};
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
