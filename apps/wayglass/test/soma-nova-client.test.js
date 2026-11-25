import test from 'node:test';
import assert from 'node:assert/strict';
import { previewSomaNovaMorphogenesis } from '../src/soma-nova-client.js';

const base = { identity_ref: 'rowan', form_id: 'base', domains: ['appearance'], return_anchor: 'base', capabilities: [] };
const target = { identity_ref: 'rowan', form_id: 'derived', parent_form_id: 'base', domains: ['appearance'], return_anchor: 'base', capabilities: [] };

function receipt() {
  const plan = { schema: 'soma-nova.morph-plan/v0.1', identity_ref: 'rowan', plan_id: 'plan-1' };
  const report = { schema: 'soma-nova.compatibility/v0.1', plan_id: 'plan-1' };
  return {
    schema: 'wayglass.soma-nova-morphogenesis-preview/v1',
    authority: 'authenticated-house-steward',
    plan, report,
    preview: { state: 'preview-only', persisted: false, externalEffects: 'none' },
    dispatch: 'none', external_effects: [], persistence: 'none',
  };
}

test('Soma Nova client sends only form inputs to the authenticated host and validates preview-only receipt', async () => {
  let request;
  const result = await previewSomaNovaMorphogenesis({
    base, target,
    fetchImpl: async (url, options) => {
      request = { url, options, body: JSON.parse(options.body) };
      return { ok: true, json: async () => receipt() };
    },
  });
  assert.equal(request.url, '/api/v1/wayglass/wyrdrune/morphogenesis/preview');
  assert.equal(request.options.credentials, 'same-origin');
  assert.deepEqual(Object.keys(request.body).sort(), ['accessibility_requirements','base','environment_requirements','target']);
  assert.equal(result.dispatch, 'none');
  assert.equal(result.preview.persisted, false);
});

test('Soma Nova client rejects a receipt that claims persistence or external effects', async () => {
  await assert.rejects(previewSomaNovaMorphogenesis({
    base, target,
    fetchImpl: async () => ({ ok: true, json: async () => ({
      ...receipt(), persistence: 'saved', dispatch: 'sent',
    }) }),
  }), /does not match/);
});

test('Soma Nova client rejects unauthenticated or malformed host responses', async () => {
  await assert.rejects(previewSomaNovaMorphogenesis({
    base, target,
    fetchImpl: async () => ({ ok: false, json: async () => ({ error: 'House Steward sign-in required' }) }),
  }), /House Steward sign-in required/);
});
