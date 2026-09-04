import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ui = fs.readFileSync(new URL('../src/house-braid-receipt-ui.js', import.meta.url), 'utf8');
const bootstrap = fs.readFileSync(new URL('../src/sidecar-bootstrap.js', import.meta.url), 'utf8');

test('House messages expose verified and bounded not-observed Runtime Braid states', () => {
  assert.match(ui, /arcsweep\.house-braid-receipt-ui\/v2/);
  assert.match(ui, /braidGlyph/);
  assert.match(ui, /bounded recent Runtime Braid read/);
  assert.match(ui, /does not prove that no durable receipt exists/);
  assert.match(ui, /Runtime Braid verified/);
  assert.match(ui, /packet_fingerprint/);
  assert.match(ui, /event_sequence/);
});

test('House braid receipt UI joins Commons identity to durable runtime events', () => {
  assert.match(ui, /readHouseCommons/);
  assert.match(ui, /thread_id/);
  assert.match(ui, /turn_id/);
  assert.match(ui, /voice_id/);
  assert.match(ui, /event_type/);
  assert.match(ui, /model-reply-receipted|arcsweep-runtime-receipt/);
});

test('visible braid receipts are a real lazy House sidecar and Vite dependency', () => {
  assert.match(bootstrap, /'\.\/house-commons-chat-v5\.js','\.\/house-chat-runtime-roster-ui\.js','\.\/house-braid-receipt-ui\.js'/);
  assert.match(bootstrap, /import\.meta\.glob\([\s\S]*'\.\/house-braid-receipt-ui\.js'/);
});
