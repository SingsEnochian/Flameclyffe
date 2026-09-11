import test from 'node:test';
import assert from 'node:assert/strict';
import { createCheckpointStore, createEventBus } from '../src/os/kernel.js';
import { createCaretaker } from '../src/os/caretaker.js';

test('Caretaker detects and repairs inconsistent derived state with checkpoint and receipt', async () => {
  const bus = createEventBus();
  const checkpoints = createCheckpointStore();
  const caretaker = createCaretaker({ bus, checkpointStore: checkpoints });
  const derived = { room: 'stale-room' };

  caretaker.registerRequiredDerivedState({
    stateId: 'workspace-mirror',
    serviceId: 'arcsweep-os-kernel',
    probe: () => ({ ok: derived.room === 'forge' }),
    captureState: () => ({ ...derived }),
    repair: () => { derived.room = 'forge'; },
    rollback: ({ priorState }) => { derived.room = priorState.room; },
    verifyRollback: ({ priorState }) => derived.room === priorState.room,
  });

  const findings = await caretaker.inspectRequiredDerivedState();
  assert.equal(findings.length, 1);
  assert.equal(findings[0].fault_class, 'DERIVED-STATE');
  assert.equal(derived.room, 'forge');
  const repair = bus.history().find((item) => item.name === 'arcsweep:repair-completed');
  assert.equal(repair.payload.action, 'rebuild-derived-state');
  assert.equal(repair.payload.result, 'committed');
});

test('Feather exposes derived-state fault but prevents automatic repair', async () => {
  const bus = createEventBus();
  const caretaker = createCaretaker({ bus, checkpointStore: createCheckpointStore() });
  let value = 'stale';
  caretaker.registerRequiredDerivedState({
    stateId: 'mirror',
    probe: () => ({ ok: value === 'fresh' }),
    captureState: () => ({ value }),
    repair: () => { value = 'fresh'; },
    rollback: ({ priorState }) => { value = priorState.value; },
  });
  caretaker.setFeatherPaused(true);
  const findings = await caretaker.inspectRequiredDerivedState();
  assert.equal(findings.length, 1);
  assert.equal(value, 'stale');
  assert.equal(bus.history().some((item) => item.name === 'arcsweep:repair-completed'), false);
});
