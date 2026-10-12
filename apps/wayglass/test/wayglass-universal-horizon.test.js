import test from 'node:test';
import assert from 'node:assert/strict';
import {
  searchUniversalHorizon,
  createUniversalHorizonWonder,
  complexifyUniversalHorizonWonder,
} from '../src/route-client.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

test('Wayglass Horizon browser client preserves Wonder and Complexify payloads', async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url:String(url), options });
    if (String(url).includes('/search?')) return jsonResponse({ count:1, records:[{id:'UH-1'}] });
    if (String(url).includes('/complexify')) return jsonResponse({ complexification:{complexification_id:'uhc:test'} }, 201);
    return jsonResponse({ wonder_id:'uhw:test', stance:{could_be_false:true,promoted_to_fact:false} }, 201);
  };

  const search = await searchUniversalHorizon({ query:'phase rotation', fetchImpl });
  assert.equal(search.count, 1);
  assert.match(calls[0].url, /q=phase\+rotation/);

  const wonder = await createUniversalHorizonWonder({
    proposition:'The current frame may be too small.',
    predictions:['A new coordinate changes what can be expressed.'],
  }, fetchImpl);
  assert.equal(wonder.wonder_id, 'uhw:test');
  const wonderBody = JSON.parse(calls[1].options.body);
  assert.equal(wonderBody.proposition, 'The current frame may be too small.');

  const complex = await complexifyUniversalHorizonWonder({
    wonderId:'uhw:test',
    current_frame:'scalar-only',
    missing_dimensions:['phase'],
    rotations:['z = r * exp(i theta)'],
    invariants:['magnitude'],
    translated_consequences:['phase-sensitive behaviour'],
  }, fetchImpl);
  assert.equal(complex.complexification.complexification_id, 'uhc:test');
  assert.match(calls[2].url, /wonder\/uhw%3Atest\/complexify$/);
  const complexBody = JSON.parse(calls[2].options.body);
  assert.deepEqual(complexBody.missing_dimensions, ['phase']);
  assert.deepEqual(complexBody.invariants, ['magnitude']);
});
