import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createBifrostLibraryBridge,
} from '../src/arcsweep-canon/bifrost-library-bridge.js';
import {
  validateCanonLibraryManifest,
} from '../src/arcsweep-canon/library-contract.js';

function manifest() {
  const stream = (path) => ({ path, sha256: 'a'.repeat(64) });
  return {
    schema: 'hearthgate.canon-library-manifest/v1',
    package_id: 'wheel-of-time.full.v1',
    version: '1.0.0',
    house: {
      id: 'taaveren-vaen',
      foundation: 'wheel-of-time-canon',
      overlay: 'taaveren-vaen',
    },
    counts: {
      source_pages: 22969,
      entities: 5960,
      relationships: 229264,
      timeline_claims: 2605,
    },
    streams: {
      entities: stream('entities.ndjson'),
      relationships: stream('relationships.ndjson'),
      timeline: stream('timeline.ndjson'),
      categories: stream('categories.json'),
      redirects: stream('redirects.json'),
      verification: stream('verification.json'),
    },
    canon_law: {
      overwrite_source_canon: false,
      provenance_required: true,
      project_overlay_separate: true,
    },
  };
}

test('validates one reusable sovereign canon package contract', () => {
  const value = validateCanonLibraryManifest(manifest());
  assert.equal(value.house.foundation, 'wheel-of-time-canon');
  assert.equal(value.house.overlay, 'taaveren-vaen');
  assert.equal(value.canon_law.overwrite_source_canon, false);
});

test('rejects a package that permits source canon overwrite', () => {
  const value = manifest();
  value.canon_law.overwrite_source_canon = true;
  assert.throws(() => validateCanonLibraryManifest(value), /forbid source-canon overwrite/);
});

test('Bifröst remains loopback-only and requires approval for durable import', async () => {
  assert.throws(
    () => createBifrostLibraryBridge({ endpoint: 'https://example.com/api' }),
    /loopback-only/,
  );

  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ status: 'VERIFIED', import_id: 'import-1' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  const bridge = createBifrostLibraryBridge({ fetchImpl, token: 'paired-token' });
  await assert.rejects(() => bridge.importLibrary(manifest()), /explicit user approval/);
  const result = await bridge.importLibrary(manifest(), { userApproved: true });
  assert.equal(result.remote.import_id, 'import-1');
  assert.equal(result.receipt.direction, 'web-to-desktop');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.get('Authorization'), 'Bifröst paired-token');
});
