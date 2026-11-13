'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const root=join(__dirname,'../..');
const source=path=>readFileSync(join(root,path),'utf8');
test('Mythience is installed in the shared ship, not isolated in documentation',()=>{
  const main=source('apps/wayglass/src/main.js');
  const nav=source('apps/wayglass/src/ship-deck-navigation.js');
  const organs=source('apps/wayglass/src/organ-donors.js');
  assert.match(main,/mountMythienceCrossing/);
  assert.match(main,/wayglass:mythience-crossing/);
  assert.match(nav,/wayglass:mythience-crossing/);
  assert.match(organs,/mythienceOrgan/);
});
test('Mythience is carried by authenticated server and staged native WTL',()=>{
  const router=source('apps/starwell-server/wayglass/router.js');
  const stage=source('apps/wayglass/server-stage.cjs');
  assert.match(router,/\/wyrdrune\/mythience-crossing/);
  assert.match(router,/griffStewardAuthorized/);
  assert.match(router,/proposeCrossing/);
  assert.match(stage,/mythience-crossing\.wtl/);
});
test('Mythience touches Watercolour, Toybox and shared return without fabricating canon',()=>{
  const bridge=source('apps/wayglass/src/watercolor-bridge.js');
  const client=source('apps/wayglass/src/mythience-client.js');
  const surface=source('apps/wayglass/src/surfaces/mythience-crossing.js');
  assert.match(bridge,/mythience:crossing/);
  assert.match(client,/publishWatercolorActivity/);
  assert.match(surface,/clearMythience/);
  assert.match(surface,/Feather/);
  assert.match(surface,/candidate-returned/);
  assert.match(surface,/history/);
  assert.match(surface,/canon/);
});
