'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {arcSweepFramePolicy}=require('../security/arcsweep-frame');
test('only staged public ArcSweep paths allow same-origin frames',()=>{
 for(const p of ['/arcsweep','/arcsweep/','/arcsweep/assets/main.js'])assert.equal(arcSweepFramePolicy(p),'SAMEORIGIN');
 for(const p of ['/api/v1/wayglass','/wayglass/','/arcsweep-other','/arcsweep/../api','/arcsweep/%2e%2e/api','/arcsweep\\api',null])assert.equal(arcSweepFramePolicy(p),'DENY');
});
test('ArcSweep host staging uses external same-origin context with legacy alias',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../../arcsweep/server-stage.cjs'),'utf8');
 assert.ok(source.includes('<script src="./wayglass-host.js"></script>'));
 assert.ok(source.includes('window.__hearthgateHost=window.__wayglassHost'));
 assert.equal(source.includes('<script>window.'),false);
});
