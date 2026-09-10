import test from 'node:test';
import assert from 'node:assert/strict';
import { createEventBus } from '../src/os/kernel.js';
import { createCapabilityRegistry } from '../src/os/capabilities.js';
import { registerSidecarService } from '../src/os/sidecar-service.js';

test('sidecar scheduler is exposed as a read/operate OS service without arbitrary imports', async () => {
  const previousControl = globalThis.__arcsweepSidecarControl;
  const previousDiagnostics = globalThis.__arcsweepSidecarDiagnostics;
  const mounted = [];
  globalThis.__arcsweepSidecarDiagnostics = {
    schema: 'arcsweep.sidecar-scheduler/v1',
    loaded: [{ specifier: './os/bootstrap.js', pack: 'global', elapsedMs: 1 }],
    failures: [],
    packs: [],
  };
  globalThis.__arcsweepSidecarControl = {
    async mountPack(name) {
      mounted.push(name);
      globalThis.__arcsweepSidecarDiagnostics.packs.push({ name, completedAt: 'now' });
      return [{ specifier: './instrument-sidecars.js', pack: name, elapsedMs: 2 }];
    },
  };

  const bus = createEventBus();
  const registry = createCapabilityRegistry({ bus });
  registerSidecarService(registry);

  const status = await registry.invoke('sidecars.status', {}, { authority: 'read' });
  assert.equal(status.status, 'applied');
  assert.equal(status.output.schema, 'arcsweep.sidecar-scheduler/v1');
  assert.equal(status.output.failures.length, 0);

  const invalid = await registry.invoke('sidecars.mount-pack', { pack: 'totally-invented' }, { authority: 'operate' });
  assert.equal(invalid.status, 'rejected');
  assert.equal(invalid.reason, 'input-validation-failed');

  const mountedForge = await registry.invoke('sidecars.mount-pack', { pack: 'forge' }, { authority: 'operate' });
  assert.equal(mountedForge.status, 'applied');
  assert.deepEqual(mounted, ['forge']);
  assert.equal(mountedForge.output.pack, 'forge');
  assert.equal(mountedForge.output.failures.length, 0);

  if (previousControl === undefined) delete globalThis.__arcsweepSidecarControl;
  else globalThis.__arcsweepSidecarControl = previousControl;
  if (previousDiagnostics === undefined) delete globalThis.__arcsweepSidecarDiagnostics;
  else globalThis.__arcsweepSidecarDiagnostics = previousDiagnostics;
});
