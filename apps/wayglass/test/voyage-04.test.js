import test from 'node:test';
import assert from 'node:assert/strict';
import { voyage04Departure, voyage04Return, voyage04Result } from '../src/voyage-04.js';

test('departure sends stop marker and provenance to existing kernel', async () => {
 let request;
 const receipt = { status: 'stopped', receipt_id: 'server-issued' };
 const fetchImpl = async (url, options) => { request = { url, body: JSON.parse(options.body) }; return { ok: true, json: async () => receipt }; };
 const actual = await voyage04Departure({ worldId: 'world', participantId: 'participant', stopPoint: 'engine room', nextOwner: 'Nikola', provenanceRefs: ['source-1'], unresolvedWonderQuestions: ['Does return preserve attribution?'], fetchImpl });
 assert.deepEqual(actual, receipt);
 assert.equal(request.url, '/api/v1/wayglass/kernel/leave');
 assert.equal(request.body.stop_point, 'engine room');
 assert.deepEqual(request.body.provenance_refs, ['source-1']);
});
test('return forwards the original receipt and preserves blocking 409', async () => {
 const stopReceipt = { receipt_id: 'server-issued' };
 let body;
 const fetchImpl = async (_url, options) => { body = JSON.parse(options.body); return { ok: false, status: 409, json: async () => ({ status: 'blocked', reason: 'revoked' }) }; };
 const result = await voyage04Return({ worldId: 'world', participantId: 'participant', stopReceipt, waygateManifest: { gate: 'test' }, fetchImpl });
 assert.equal(result.status, 'blocked');
 assert.deepEqual(body.stop_receipt, stopReceipt);
});
test('missing authority inputs cannot be silently invented', () => {
 assert.throws(() => voyage04Departure({ worldId: 'world' }), /requires/);
 assert.throws(() => voyage04Return({ worldId: 'world' }), /requires/);
 assert.equal(voyage04Result(null).status, 'unverified');
});
