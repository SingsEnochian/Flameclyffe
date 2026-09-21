import test from 'node:test';
import assert from 'node:assert/strict';

import { ANCESTRAL_PUBLIC_MANIFEST } from '../src/ancestral-corpus-seed.js';
import { buildNarrativeNodeAncestryPlan } from '../src/narrativenode-ancestry-adapter.js';

test('NarrativeNode ancestry plan begins and ends with explicit MCP permission boundaries', () => {
  const plan = buildNarrativeNodeAncestryPlan({ manifest: ANCESTRAL_PUBLIC_MANIFEST });
  assert.equal(plan.user_grant_required, true);
  assert.equal(plan.steps[0].tool, 'request_mcp_session');
  assert.equal(plan.steps.at(-1).tool, 'end_mcp_session');
  assert.equal(plan.external_source_code_incorporated, false);
});

test('NarrativeNode ancestry plan never transmits manuscript prose or private source refs', () => {
  const plan = buildNarrativeNodeAncestryPlan({ manifest: ANCESTRAL_PUBLIC_MANIFEST });
  const serialised = JSON.stringify(plan);
  assert.equal(plan.private_source_ref_transmitted, false);
  assert.equal(plan.manuscript_text_transmitted, false);
  assert.equal(plan.canon_promoted, false);
  assert.doesNotMatch(serialised, /docs\.google\.com|drive\.google\.com|private:\/\//i);
  assert.doesNotMatch(serialised, /source_ref/i);
});

test('NarrativeNode ancestry plan can scope roots without collapsing correspondences', () => {
  const plan = buildNarrativeNodeAncestryPlan({
    manifest: ANCESTRAL_PUBLIC_MANIFEST,
    rootIds: ['ancestral:kalladia-cycle'],
    correspondenceIds: ['correspondence:resonance-state'],
  });
  const rootSteps = plan.steps.filter((item) => item.phase === 'ancestral-root');
  const correspondenceSteps = plan.steps.filter((item) => item.phase === 'ancestral-correspondence');
  assert.equal(rootSteps.length, 1);
  assert.equal(rootSteps[0].source_root_id, 'ancestral:kalladia-cycle');
  assert.equal(correspondenceSteps.length, 1);
  assert.equal(correspondenceSteps[0].correspondence_id, 'correspondence:resonance-state');
});
