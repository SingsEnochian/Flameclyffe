import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const fixture = (path) => new URL(path, import.meta.url);

const loadSpecimen = async () => JSON.parse(
  await readFile(fixture('../skills/sources/hollow-vale/caelwyn-provenance-specimen.v0.1.json'), 'utf8'),
);

test('Caelwyn provenance specimen remains external reference only', async () => {
  const specimen = await loadSpecimen();

  assert.equal(specimen.status, 'reference-only');
  assert.equal(specimen.boundary.external_reference_only, true);
  assert.equal(specimen.boundary.donor_lore_transfer, false);
  assert.equal(specimen.boundary.automatic_canon_write, false);
  assert.equal(specimen.boundary.automatic_identity_linkage, false);
  assert.equal(specimen.boundary.automatic_causal_inference, false);
});

test('Caelwyn specimen does not fabricate source publication chronology', async () => {
  const specimen = await loadSpecimen();

  assert.equal(specimen.source.publication_date, null);
  assert.equal(specimen.source.publication_date_status, 'not-verified-in-this-specimen');

  const precedence = specimen.initial_claims.find((row) => row.claim_id === 'caelwyn-publication-precedence');
  assert.ok(precedence);
  assert.equal(precedence.support_status, 'not-tested');
  assert.match(precedence.scope, /verified publication or archive date/i);
});

test('Caelwyn specimen separates chronology, comparison, and causation', async () => {
  const specimen = await loadSpecimen();

  assert.equal(specimen.comparison_rules.separate_temporal_precedence_from_causal_influence, true);
  assert.equal(specimen.comparison_rules.separate_conceptual_resonance_from_identity, true);
  assert.equal(specimen.comparison_rules.separate_possible_exposure_from_established_exposure, true);
  assert.equal(specimen.comparison_rules.unresolved_is_state_not_veto, true);
  assert.equal(specimen.comparison_rules.status_does_not_leak_sideways, true);

  const influence = specimen.initial_claims.find((row) => row.claim_id === 'caelwyn-later-influence-route');
  assert.ok(influence);
  assert.equal(influence.support_status, 'unresolved');
  assert.equal(influence.causal_status, 'unestablished');
});

test('Caelwyn specimen is documentation-safe and does not mirror copyrighted source prose', async () => {
  const specimen = await loadSpecimen();

  assert.equal(specimen.copyright_policy.persist_raw_html, false);
  assert.equal(specimen.copyright_policy.persist_page_text, false);
  assert.equal(specimen.copyright_policy.persist_source_excerpts, false);
  assert.equal(specimen.copyright_policy.mirror_images, false);
});
