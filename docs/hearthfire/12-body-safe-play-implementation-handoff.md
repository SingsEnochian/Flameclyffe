# Body-Safe Play Implementation Handoff

**Status:** Handoff draft v0.1  
**Gate:** `targeted_receipt_allowed`  
**Depends on:** `10-somatic-engine-smoke-test-v0-1.md`, `11-body-safe-play-and-animation-spec.md`, `hearthfire/lib/play-presets.js`, `hearthfire/lib/animation-presets.js`  
**Primary implementer:** Boxfire or other local browser tester.

## Purpose

Wire the Body-Safe Play Layer into the already-smoke-tested Hearthfire workbench without weakening the body-safety rules.

This handoff exists because the local smoke-test commit with `output-drivers.js` and the tested workbench wiring may not be visible to all remote tooling yet.

Do not overwrite tested local workbench changes. Rebase or merge carefully.

## Files expected after reconciliation

The branch should contain:

- `hearthfire/lib/somatic-engine.js`
- `hearthfire/lib/deep-signal-adapter.js`
- `hearthfire/lib/receipt-bus.js`
- `hearthfire/lib/consent-gates.js`
- `hearthfire/lib/output-drivers.js`
- `hearthfire/lib/animation-presets.js`
- `hearthfire/lib/play-presets.js`
- `hearthfire/workbench.html`
- `docs/hearthfire/10-somatic-engine-smoke-test-v0-1.md`
- `docs/hearthfire/11-body-safe-play-and-animation-spec.md`

## Workbench buttons to add

Add a `Playground` or `Body-safe play` section to `hearthfire/workbench.html` with buttons for:

- Glow pulse
- Leyline sweep
- Null bloom
- Settle wave
- Tiny dragon receipt stamp
- Test soft tone
- Test gentle tap

## Import

Add this import to the workbench module script:

```js
import { createPlayPlan } from './lib/play-presets.js';
```

If `OutputDriverRegistry` is already imported from `output-drivers.js`, keep that import unchanged.

## Helper function

Add a helper similar to this, adjusted to the current workbench variable names:

```js
function runPlay(playId) {
  const state = engine.snapshot();
  const playPlan = createPlayPlan(playId, {
    consent: state.consent,
    accessibility: state.accessibility
  });

  const gatedPlan = engine.gates.apply(playPlan);

  const result = {
    result_state: playPlan.result_state,
    reason: playPlan.source_event,
    plain_language: playPlan.plain_language,
    boundary: playPlan.boundary,
    signal_strength: 0,
    instability: 0
  };

  const event = {
    type: playPlan.source_event,
    action: playPlan.play_preset_id || playPlan.source_event,
    timestamp: new Date().toISOString()
  };

  const receipts = engine.receipts.emitPlan({
    event,
    result,
    gatedPlan,
    state: engine.snapshot()
  });

  if (registry && typeof registry.execute === 'function') {
    registry.execute(gatedPlan, { state: engine.snapshot(), receipts });
  }

  render({
    event,
    state: engine.snapshot(),
    result,
    plan: playPlan,
    gatedPlan,
    receipts
  });
}
```

## Button wiring

Use whichever IDs fit the workbench style. Example:

```js
document.getElementById('playGlowPulse').addEventListener('click', () => runPlay('play.glow_pulse'));
document.getElementById('playLeylineSweep').addEventListener('click', () => runPlay('play.leyline_sweep'));
document.getElementById('playNullBloom').addEventListener('click', () => runPlay('play.null_bloom'));
document.getElementById('playSettleWave').addEventListener('click', () => runPlay('play.settle_wave'));
document.getElementById('playDragonStamp').addEventListener('click', () => runPlay('play.dragon_stamp'));
document.getElementById('playSoftTone').addEventListener('click', () => runPlay('play.test_soft_tone'));
document.getElementById('playGentleTap').addEventListener('click', () => runPlay('play.test_gentle_tap'));
```

## Output driver requirements

`OutputDriverRegistry` should execute only effects that remain allowed after `engine.gates.apply(plan)`.

Rules:

- visual play may emit by default in low-force form
- audio effects must do nothing unless `effect.emitted === true`
- haptic effects must do nothing unless `effect.emitted === true`
- audio driver must not autoplay before explicit sound consent
- haptic driver must not vibrate before explicit haptic consent
- quiet mode should dampen visuals and block or require renewed consent for body outputs
- reduced motion should replace travel with static cues
- no persistence or database writes

## Manual smoke test

Run all seven play actions.

Expected results:

### Glow pulse

- Emits visual effect.
- Receipt says no data claim was made.

### Leyline sweep

- Emits visual path cue.
- Reduced motion changes travel to a static cue.
- Receipt says it is not fate, command, or prediction.

### Null bloom

- Emits a gentle absence visual.
- Receipt says nothing clear is here yet.
- It should look intentional, not broken.

### Settle wave

- Lowers force and returns field to centre.
- Receipt says field is returning to centre.

### Tiny dragon receipt stamp

- Emits a small receipt-confirmation visual.
- Reduced motion uses static badge.
- Receipt says a receipt exists.

### Test soft tone

- With sound off: blocked, no audio, receipt says sound is off or not enabled.
- With sound on: one low-volume soft tone, no sudden attack, receipt says audio emitted.
- Quiet mode: audio blocked or requires explicit renewed consent.

### Test gentle tap

- With haptics off: blocked, no vibration, receipt says haptics are off or not enabled.
- With haptics on: one short gentle tap, no repeat buzz, receipt says haptic emitted.
- Quiet mode: haptics blocked or requires explicit renewed consent.

## Acceptance criteria

Body-Safe Play Layer v0.1 passes when:

- all seven buttons exist in the workbench
- every button emits a receipt
- blocked outputs are visible in receipts
- visual play works by default in low-force form
- sound test is blocked until sound consent
- haptic test is blocked until haptic consent
- quiet mode dampens or blocks body outputs
- reduced motion replaces travel with static cues
- null bloom is visibly intentional
- no autoplay occurs
- no default haptics occur
- no repeated drag buzz occurs
- no persistence or database writes occur

## Smoke-test receipt file

After local smoke test passes, add:

`docs/hearthfire/12-body-safe-play-smoke-test-v0-1.md`

Include:

- environment
- commit hash
- files touched
- acceptance table
- known oddities
- confirmation that branch remains unmerged

## Closing note

This layer exists to prove that Hearthfire can be playful without becoming hostile to the body.

The point is not less wonder.

The point is wonder with consent, receipts, and an exit door.
