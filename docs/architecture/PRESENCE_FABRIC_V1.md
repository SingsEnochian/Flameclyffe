# Presence Fabric V1

**Status:** IMPLEMENTED
**Owner:** `apps/arcsweep/src/model-presence-bus.js`
**Contract version:** Astra 6.1
**Date:** 2026-09-29

---

## What presence IS

A **presence** is a projection of an identity onto a surface and session at a moment in time. It answers the question: "where is this identity active right now, and in what mode?" It is a read-only observation object — a snapshot emitted by the system whenever a model's position changes.

Presence is the intersection of:
- an **identity** (who this voice is, stable across rebinds)
- a **surface** (where the identity is projected: web, discord, tui, etc.)
- a **session** (which conversation or context thread)
- a **participation mode** (how the identity is engaging: silent, addressed, active, etc.)
- a **state** (lifecycle phase: offline, waking, ready, thinking, speaking, degraded, error)

---

## What presence IS NOT

| Claim | Wrong | Correct |
|---|---|---|
| Presence is identity ownership | No | Identity is declared by the voice registry. Presence projects it. |
| Presence is model ownership | No | The model can rebind (provider/model fields change). Identity does not. |
| Presence grants canon authority | No | Canon authority is a separate contract. `participation_mode: 'active'` is not a privilege escalation. |
| Presence is memory ownership | No | Memory is held by the concordance and world context systems. |
| Presence grants production authority | No | No presence field confers write authority over any system. |
| Presence grants external-write authority | No | Presence is observation-only. No presence field opens an external channel. |

---

## The 5 Presence Fabric fields

| Field | Type | Description |
|---|---|---|
| `presence_id` | `string` (UUID or fallback) | Stable identifier for this presence projection. Auto-generated if not provided. Never null. |
| `identity_id` | `string` | Stable identity anchor. Defaults to `voice_id` if not provided. **Never changes** across provider/model/surface/state rebinds. |
| `surface` | `string \| null` | Where the identity is projected. Must be one of `PRESENCE_SURFACES` or `null`. Unknown values normalise to `'unknown'`. |
| `participation_mode` | `string \| null` | How the identity is engaging. Must be one of `PARTICIPATION_MODES` or `null`. Unknown values normalise to `null`. |
| `session_id` | `string \| null` | Which conversation or context thread. Plain string or null. |

### `PRESENCE_SURFACES`
`'web'`, `'discord'`, `'tui'`, `'mobile'`, `'ar'`, `'house-commons'`, `'api'`, `'unknown'`

### `PARTICIPATION_MODES`
`'silent'`, `'addressed'`, `'reply-only'`, `'ambient'`, `'active'`

---

## The 7 Invariants

1. **Complete fields.** Every object returned by `createModelPresence` includes `presence_id`, `identity_id`, `surface`, `participation_mode`, and `session_id`. None are missing.

2. **Identity defaults to voice.** When `identityId` is not provided, `identity_id` equals `voice_id`. Identity and voice start together; they may diverge only through explicit assignment.

3. **Identity survives rebind.** `publishModelPresence` carries `identity_id` forward on every update. A change to `provider`, `model`, `surface`, or `state` does not change `identity_id`. This is the critical invariant — identity is not model, and model is not identity.

4. **Unknown surface is explicit.** A surface string that is not in `PRESENCE_SURFACES` normalises to `'unknown'`, not to `null` and not to a silent best-guess. The caller knows it supplied an unrecognised surface.

5. **Unknown mode is null.** A participation mode string that is not in `PARTICIPATION_MODES` normalises to `null`. There is no default fallback mode; unknown is absent.

6. **presence_id is stable.** Once a presence ID is generated (on first publish), it is carried forward by every subsequent `publishModelPresence` call for that voice. The ID does not rotate on state changes.

7. **Active mode grants no privilege.** `participation_mode: 'active'` is a descriptive label. The presence object has no `authority`, `elevated`, or `privileges` field. No presence field escalates permission in any runtime system.

---

## The seam with `publishModelPresence`

`publishModelPresence` performs a carry-forward merge. When a previous presence exists for a voice, the following fields are preserved from it before the new input is applied:

```
identityId:        previous.identity_id   // MUST carry — never changes with rebind
presenceId:        previous.presence_id   // stable per presence
surface:           previous.surface
participationMode: previous.participation_mode
sessionId:         previous.session_id
```

After the spread of the previous fields and the new input, a final override applies:

```js
...(previous ? { identityId: previous.identity_id } : {})
```

This ensures even if a caller accidentally passes `identityId` in an update, the original identity anchor wins. The invariant is enforced at the bus level, not the caller level.

---

## Wire-up

Any component that already calls `publishModelPresence` or `createModelPresence` can use the new fields immediately — no changes to existing callers are required.

- Pass `surface`, `participationMode`, `sessionId`, or `identityId` to `createModelPresence` or `publishModelPresence` to set them on first publish.
- On subsequent publishes, `identity_id` and `presence_id` are automatically carried forward.
- Read `presence.surface`, `presence.participation_mode`, `presence.session_id`, `presence.identity_id`, `presence.presence_id` from any returned presence object.

Existing callers that do not pass any of the new fields will continue to work. They receive presence objects with `presence_id` auto-generated, `identity_id` defaulting to `voice_id`, and `surface`/`participation_mode`/`session_id` as `null`.

---

## Evidence

- TESTED: all 7 invariants are covered by named test cases in `apps/arcsweep/test/model-presence-bus.test.js`
- CONFIRMED: existing 3 tests pass unchanged
- CONFIRMED: `wonder:verify` and `spine:verify` pass unchanged
