# N-006 · Nikola Invariant Spiral: whole-system design

**Status:** stacked research-organ branch, no live sensor or Crow reply, no claim that the formal PREMAQC compression model measures physical reality.

## Purpose and boundary
Within Wayglass, Nikola compares explanations for a real mathematical observation without conflating probability formalism, source testimony, observed physics, or model prose. The ship remains the only participant boundary. The canonical STARWELL Math Spine remains the owner of PREMAQC/world-fold state, compression/release transitions, tone authority and packet replay.

N-006 has two complementary instruments:
1. **Oscillator invariant solver** (owned by `apps/starwell/src/math-spine/nikola-upward-spiral.js`), an independent analytic calculation for a specified *synthetic* observation. It owns no persistent state, no participant identities and no route permissions.
2. **Canonical Math Spine witness** in the same module, which can only read and independently replay a supplied authentic canonical packet; it cannot ingest, create, approve or mutate a PREMAQC reading or world. This witness is an independent read-only source reference for Nikola, not a translation of PREMAQC axis weights into physical evidence.

## Actors and ownership
- Rowan/Steward: selects the synthetic baseline, frequency ratio and independent measurement; invokes each turn.
- Nikola research organ: freezes calculations, derives mathematical alternatives and asks which observation can discriminate.
- STARWELL Math Spine: exclusively owns canonical packet production, world compression/release and replay.
- Wayglass host/LLM: may present or interpret frozen summaries only under separately reviewed authorisation; N-006 never sends model requests or stores private data.

## Physics model and assumptions
For an ideal small-displacement mass-spring oscillator:
```
f = (1 / (2π)) sqrt(k/m)
q = (f_new/f_old)²
k_new/m_new = q × (k_old/m_old)
```
This constraint alone does not identify k_new or m_new separately. The returned basis includes stiffness-only, mass-only and continuously mixed alternatives. A subsequent independent k measurement implies m_new = k_measured / (q*k_old/m_old); an independent m measurement implies k_new = m_measured*q*k_old/m_old. These formulas express *ideal model assumptions*, not observed causal proof. All inputs require explicit units, positive finite values, bounded ranges and source ID/family.

## Compression -> release -> renewed compression
- **Compression** freezes the inferred ratio and two candidate endpoints, with SHA-256 of the original question/input.
- **Release** enumerates compatible physical states and the discriminating independent measurement. Release explicitly cannot collapse a continuum into two mutually exclusive truths.
- **Next compression** takes one independently sourced measurement. Shared-origin duplicates are held, not multiplied into additional corroboration. Stale evidence is never silently admitted; no memory or canon changes.
- **Receipt** hashes source, assumptions, state input, derivation and previous head fingerprint; replay verifies that the same inputs regenerate the same chain. The program deliberately does not perform unbounded recursion.
- **Math Spine witness** accepts only `hearthgate.math-spine-packet/v1`, calls canonical `replayMathSpinePacket` and requires `matched === true` and replay fingerprint equal to expected fingerprint. It returns a *read-only* summary with distinct claims for the physical experiment and the PREMAQC computational formalism.

## API/domain objects
`deriveOscillatorInvariant(baseline,frequencyRatio)`: calculation and units; pure.
`createNikolaSpiral({baseline,frequencyRatio,source})`: creates immutable state and hash-linked round zero.
`advanceNikolaSpiral(state,{measurement,source})`: returns a new state and receipt; no in-place mutation.
`replayNikolaSpiral(state)`: reconstructs all rounds and refuses tampering.
`witnessMathSpine(packet)`: canonical Math Spine replay witness (no appropriation of its state).

## Data / authority / failure
No network, database, persistent localStorage, acoustic output, provider inference, model weights, automatic world mutation or cross-constellation transfer. Every unsupported unit, absent source, zero/NaN/infinite input, mismatched fingerprint, unsupported PREMAQC schema or replay disagreement fails closed. Sources are caller-declared and not cryptographically authenticated; a hash proves integrity of this computation, not physical observation authenticity. Maximum 12 explicit cycles, no auto-running agent.

## Integration and verification
1. Existing STARWELL Math Spine packet and compression-release tests remain unchanged.
2. New tests verify exact ratios, units, continuum, inferred missing parameter, duplicate-family hold, hash/replay consistency, corrupt-state rejection, no source promotion, and actual canonical packet witness.
3. The Nikola Wayglass research surface may import the deterministic solver to inspect sample results, but only the existing host and scientific consent boundary own model inference. Browser signoff is separate.
4. Existing Wayglass/ArcSweep tests and packaging CI must still pass. Installer audit is a separate observed failure until the previously reviewed dependency lockfile repair is integrated.

**Research note:** 'upward' means accumulating discriminating evidence and preserved open questions, not a guaranteed increasing probability of truth, physical fold, or qualitative state.
