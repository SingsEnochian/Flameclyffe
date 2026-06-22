import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createYggdrasilAccount,
  createYggdrasilAuthPlan,
  createYggdrasilCustomization,
  validateYggdrasilAccount,
  validateYggdrasilAuthPlan,
  validateYggdrasilCustomization,
} from '../src/accounts/yggdrasilAccountSchema.js';
import { createYggdrasilLocalAccountAdapter } from '../src/accounts/yggdrasilLocalAccountAdapter.js';

test('Yggdrasil account defaults are local preview only', () => {
  const account = createYggdrasilAccount();

  assert.deepEqual(validateYggdrasilAccount(account), []);
  assert.equal(account.provider, 'mock');
  assert.equal(account.state, 'local-preview');
  assert.equal(account.security.serviceRoleKeyPresent, false);
  assert.equal(account.security.storesPassword, false);
  assert.equal(account.security.storesAccessToken, false);
  assert.equal(account.consent.storeCustomization, false);
});

test('Yggdrasil customization validates accessibility and sound limits', () => {
  const customization = createYggdrasilCustomization({
    displayName: 'Branchfriend',
    accessibility: { reducedMotion: true, plainPassDefault: true },
    sound: { allowFuturePlayback: false, maxGain: 0.06 },
  });

  assert.deepEqual(validateYggdrasilCustomization(customization), []);
  assert.equal(customization.accessibility.reducedMotion, true);
  assert.equal(customization.accessibility.plainPassDefault, true);
});

test('Yggdrasil account validation blocks client secrets and token storage', () => {
  const unsafe = createYggdrasilAccount({
    security: {
      serviceRoleKeyPresent: true,
      storesPassword: true,
      storesAccessToken: true,
    },
  });

  const errors = validateYggdrasilAccount(unsafe).join('\n');
  assert.match(errors, /Service role keys/);
  assert.match(errors, /passwords/);
  assert.match(errors, /access tokens/);
});

test('Yggdrasil auth plan remains contract-only in Portal Kernel v0.1', () => {
  const plan = createYggdrasilAuthPlan();

  assert.deepEqual(validateYggdrasilAuthPlan(plan), []);
  assert.equal(plan.provider, 'supabase');
  assert.equal(plan.enabledInPortalKernel, false);
  assert.equal(plan.accountCreation.enabled, false);
  assert.equal(plan.rlsRequired, true);
});

test('Yggdrasil local account adapter can create preview customizations', () => {
  const adapter = createYggdrasilLocalAccountAdapter({ displayName: 'First Seed' });
  const preview = adapter.createPreviewAccount({
    displayName: 'Starroot Guest',
    customization: { palette: 'sea-blues', branchStyle: 'silver-leaf' },
  });
  const updated = adapter.updateCustomization({ accessibility: { sensoryQuiet: true } });

  assert.equal(preview.profile.displayName, 'Starroot Guest');
  assert.equal(preview.customization.palette, 'sea-blues');
  assert.equal(updated.customization.accessibility.sensoryQuiet, true);
  assert.equal(updated.security.storesAccessToken, false);
});
