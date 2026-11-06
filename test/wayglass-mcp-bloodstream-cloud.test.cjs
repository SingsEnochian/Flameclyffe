'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const source = readFileSync('supabase/functions/wayglass-authorized-crossing/index.ts','utf8');

function checkpointRegexFromDeployedSource() {
  const line = source.split('\n').find(x => x.includes('const found=text.match('));
  assert.ok(line, 'cloud route must contain a source-bound checkpoint parser');
  const literal = line.match(/const found=text\.match\((\/.*\/)\);/);
  assert.ok(literal, 'checkpoint parser must be a literal regex');
  return Function('"use strict";return '+literal[1])();
}
const MARKER = '<!-- wayglass-mobius-checkpoint:v1 -->';
test('cloud reader accepts actual bloodstream Cycle line preceding JSON', () => {
  const checkpoint = {schema:'wayglass.mobius/v0.1',cycle:1,face:'outer',root:'r',carry:{cycles:1}};
  const comment = MARKER+'\nCycle 1 · outer face · committed\n```json\n'
    +JSON.stringify(checkpoint)+'\n```';
  const matched = comment.match(checkpointRegexFromDeployedSource());
  assert.ok(matched, 'real marker with intervening Cycle line must not be invisible');
  assert.deepEqual(JSON.parse(matched[1]),checkpoint);
});
test('cloud reader fails closed on invalid marker or absent fenced JSON', () => {
  const re=checkpointRegexFromDeployedSource();
  assert.equal(('not-a-checkpoint\n```json\n{"cycle":1}\n```').match(re),null);
  assert.equal((MARKER+'\nCycle 1 · outer face · committed').match(re),null);
});
test('bloodstream exposure remains scoped, read-only, and explicitly unverified', () => {
  for(const s of [
    'wayglass:bloodstream:read',
    'resource==="bloodstream"',
    'authorized(db,token,"wayglass:bloodstream:read")',
    'chain_verified:false',
    'live_pulse_verified:false',
    'read-only; host-gated effects remain separate',
  ]) assert.ok(source.includes(s),'missing guard '+s);
  assert.doesNotMatch(source,/fetch\([^\n]*(?:\/merge|\/dispatches)/);
});
