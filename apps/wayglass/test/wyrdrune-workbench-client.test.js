import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { runWyrdruneProgram, listWyrdrunePrograms, saveWyrdruneProgram } from '../src/wyrdrune-workbench.js';

const source = 'mobius { perceive { let x = 2; } compress { let y = x * 3; } release { let z = y + 1; } verify { emit z; } integrate { emit z; } choose { emit z; } return { emit "held"; } transcend { emit "next"; } }';
const response = (status, data) => ({ ok: status >= 200 && status < 300, status, async json() { return data; } });
async function hash(value) {
  const bytes = await webcrypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map(v => v.toString(16).padStart(2, '0')).join('');
}

test('workbench verifies the exact Wyrdrune source hash returned by compilation', async () => {
  const sourceHash = await hash(source);
  const result = await runWyrdruneProgram(source, {
    mode: 'compile',
    cryptoImpl: webcrypto,
    fetchImpl: async (url, options) => {
      assert.equal(url, '/api/v1/wayglass/wyrdrune/workbench');
      assert.equal(options.credentials, 'same-origin');
      assert.equal(options.cache, 'no-store');
      assert.equal(JSON.parse(options.body).mode, 'compile');
      return response(200, {
        schema: 'wayglass.wyrdrune-workbench/v1',
        mode: 'compile',
        source_hash: sourceHash,
        ir: { schema: 'wyrdrune.ir/v0.1', sourceHash, units: [] },
        dispatch: 'none',
        external_effects: [],
      });
    },
  });
  assert.equal(result.source_verified, true);
  assert.equal(result.source_hash, sourceHash);
});

test('workbench verifies execution lineage and accepts a rolled-back scoped cycle as an execution result', async () => {
  const sourceHash = await hash(source);
  const result = await runWyrdruneProgram(source, {
    mode: 'execute',
    context: { system_count: 8, assembled_systems: 6 },
    cryptoImpl: webcrypto,
    fetchImpl: async (_url, options) => {
      assert.equal(JSON.parse(options.body).context.assembled_systems, 6);
      return response(200, {
        schema: 'wayglass.wyrdrune-workbench/v1',
        mode: 'execute',
        source_hash: sourceHash,
        ir: { schema: 'wyrdrune.ir/v0.1', sourceHash, units: [] },
        execution: { sourceHash, status: 'rolled-back', output: [] },
        dispatch: 'none',
        external_effects: [],
      });
    },
  });
  assert.equal(result.execution.status, 'rolled-back');
  assert.equal(result.source_verified, true);
});

test('workbench rejects a receipt for different source or unexpected host effects', async () => {
  const sourceHash = await hash(source);
  await assert.rejects(runWyrdruneProgram(source, {
    mode: 'compile',
    cryptoImpl: webcrypto,
    fetchImpl: async () => response(200, {
      schema: 'wayglass.wyrdrune-workbench/v1',
      mode: 'compile',
      source_hash: '0'.repeat(64),
      ir: { schema: 'wyrdrune.ir/v0.1', sourceHash: '0'.repeat(64), units: [] },
      dispatch: 'none',
      external_effects: [],
    }),
  }), /source hash/);
  await assert.rejects(runWyrdruneProgram(source, {
    mode: 'compile',
    cryptoImpl: webcrypto,
    fetchImpl: async () => response(200, {
      schema: 'wayglass.wyrdrune-workbench/v1',
      mode: 'compile',
      source_hash: sourceHash,
      ir: { schema: 'wyrdrune.ir/v0.1', sourceHash, units: [] },
      dispatch: 'none',
      external_effects: ['network'],
    }),
  }), /contract/);
});

test('workbench loads the durable owner programme library', async () => {
  const programs = await listWyrdrunePrograms({
    fetchImpl: async url => {
      assert.equal(url, '/api/v1/wayglass/wyrdrune/programs');
      return response(200, { schema: 'wayglass.program-library/v1', programs: [{ slug: 'vessel', title: 'Vessel' }] });
    },
  });
  assert.equal(programs[0].slug, 'vessel');
});

test('workbench saves an immutable source revision and verifies its source hash', async () => {
  const sourceHash = await hash(source);
  const saved = await saveWyrdruneProgram({
    slug: 'vessel-plan',
    title: 'Vessel Plan',
    source,
    cryptoImpl: webcrypto,
    fetchImpl: async (url, options) => {
      assert.equal(url, '/api/v1/wayglass/wyrdrune/programs');
      assert.equal(options.method, 'POST');
      const body = JSON.parse(options.body);
      assert.equal(body.slug, 'vessel-plan');
      assert.equal(body.metadata.native, true);
      return response(201, {
        schema: 'wayglass.program-save/v1',
        program: { slug: 'vessel-plan', source_hash: sourceHash, version: 1 },
        revision: { source_hash: sourceHash, version: 1 },
      });
    },
  });
  assert.equal(saved.program.version, 1);
});
