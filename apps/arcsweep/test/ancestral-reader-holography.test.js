import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Ancestral Reader exposes a Universal Codex holography stage and projection pane', () => {
  const html = readFileSync(new URL('../ancestry/index.html', import.meta.url), 'utf8');
  assert.match(html, /data-universal-codex-surface="ancestry"/);
  assert.match(html, /data-universal-codex-stage/);
  assert.match(html, /id="projection-pane"/);
  assert.match(html, /Ancestral Reader v0\.2/);
});

test('Ancestral Reader builds a public-safe NarrativeNode preview without executing it', () => {
  const source = readFileSync(new URL('../ancestry/ancestry.js', import.meta.url), 'utf8');
  assert.match(source, /buildNarrativeNodeAncestryPlan/);
  assert.match(source, /data-ancestry-plan-preview/);
  assert.match(source, /Plan only\. Not executed\./);
  assert.match(source, /executed: false/);
  assert.match(source, /private_source_ref_transmitted: false/);
  assert.match(source, /manuscript_text_transmitted: false/);
  assert.match(source, /canon_promoted: false/);
  assert.doesNotMatch(source, /request_mcp_session\s*\(/);
  assert.doesNotMatch(source, /create_knowledge\s*\(/);
});

test('Ancestral holography is presentation-only and falls back without WebGL', () => {
  const source = readFileSync(new URL('../src/ancestral-reader-holography-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /await import\('three'\)/);
  assert.match(source, /prefers-reduced-motion/);
  assert.match(source, /mode: 'fallback'/);
  assert.match(source, /arcsweep:ancestry-read/);
  assert.match(source, /arcsweep:ancestry-plan/);
  assert.doesNotMatch(source, /relation\.create/);
  assert.doesNotMatch(source, /relation\.apply-event/);
});

test('main ArcSweep loads Universal Codex holography through the ancestry sidecar without changing authority', () => {
  const source = readFileSync(new URL('../src/ancestry-sidecar.js', import.meta.url), 'utf8');
  assert.match(source, /import '\.\/universal-codex-animation-sidecar\.js'/);
  assert.match(source, /codex_holography_loaded: true/);
  assert.match(source, /relation_identity_law|narrativenode-plan|ancestry\.read/);
});
