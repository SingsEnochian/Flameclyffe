import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canonicalizeUrl,
  classifySource,
  parseRobots,
  parseVersion,
  proposeLineage,
  robotsAllows,
  titleStem,
} from '../scripts/bseng-rse-ingest.mjs';

test('BSENG ingest canonicalizes source URLs without tracking noise', () => {
  assert.equal(
    canonicalizeUrl('https://bseng.com/2025/05/19/example/?utm_source=x&b=2&a=1#section', 'https://bseng.com/', ['utm_source']),
    'https://bseng.com/2025/05/19/example/?a=1&b=2',
  );
});

test('BSENG ingest extracts document versions and stable title stems', () => {
  assert.equal(parseVersion('Relational Structural Experience v6.0'), '6.0');
  assert.equal(parseVersion('Version 1.1'), '1.1');
  assert.equal(titleStem('Identity and Ontic Minimalism v1.0'), 'identity and ontic minimalism');
});

test('BSENG ingest treats blank Disallow as no restriction and honours longest robots paths', () => {
  const openRules = parseRobots('User-agent: *\nDisallow:\n', 'HearthfireSourceIngest/0.1');
  assert.equal(robotsAllows('https://bseng.com/start-here/', openRules), true);

  const rules = parseRobots(`
User-agent: *
Disallow: /private/
Allow: /private/public/
Disallow: /wp-admin/
`, 'HearthfireSourceIngest/0.1');
  assert.equal(robotsAllows('https://bseng.com/private/notes/', rules), false);
  assert.equal(robotsAllows('https://bseng.com/private/public/paper/', rules), true);
  assert.equal(robotsAllows('https://bseng.com/start-here/', rules), true);
});

test('BSENG ingest distinguishes formal documents, precursor conversations and methodology pages', () => {
  assert.equal(
    classifySource('https://bseng.com/wp-content/uploads/2026/05/Identity-and-ontic-minimalism-v1.0.pdf'),
    'primary-document',
  );
  assert.equal(
    classifySource('https://bseng.com/start-here/sauna-epistemology/'),
    'conversation-precursor',
  );
  assert.equal(
    classifySource('https://bseng.com/what-this-is-not/'),
    'methodology-boundary',
  );
});

test('BSENG ingest proposes lineage rather than deleting earlier versions', () => {
  const proposals = proposeLineage([
    { source_id: 'old', title: 'Projection Residual Geometry v1.0', version: '1.0' },
    { source_id: 'new', title: 'Projection Residual Geometry v1.1', version: '1.1' },
  ]);
  assert.deepEqual(proposals, [{
    relation: 'supersedes',
    confidence: 'candidate',
    reason: 'same-title-stem-higher-version',
    title_stem: 'projection residual geometry',
    older_source_id: 'old',
    newer_source_id: 'new',
  }]);
});
