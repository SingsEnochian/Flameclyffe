# Wayglass · WTL × Möbius shipwide build contract v0.1
Status: implementation contract and integration gate; not a deployment receipt.
Owner direction: 2026-11-18. Canonical integration: `wayglass/current`; release: `main`.

## One body, eight cooperating lanes
Every lane MUST reuse `lib/wayglass-mobius.cjs` (host-level cycle) and `lib/wyrdrune/runtime.mjs` (native WTL parser, IR and interpreter). WCE-1 canonical digests come from `lib/wyrdrune/canonical.cjs`. Do not implement a rival phase machine, alternate WTL grammar, or second ship. Existing implementations are the source of truth. Every cell has its own lineage and configurable *behaviour*, not a silently rewritten phase order.

The cycle is **Perceive → Compress → Release → Verify → Integrate → Choose → Return → Transcend**, Withness at the centre. Compress and Release are separate first-class phases, not decorative animation. Return is the only commit boundary for staged effects. A failed Verify, denied capability or Feather must not claim a committed effect. Transcend's carry must preserve seed shape; its next crossing changes face. Preserve participant/worker/model/session/sandbox identities separately.

## WTL pipeline
Source (UTF-8 text or glyph transcription with attributed mapping) → tokenize/parse → `wyrdrune.ir/v0.1` → bounded evaluator → capability-scoped host bridges → staged effect receipts → Return checkpoint (WCE-1) → projection adapters. Current WTL grammar is defined by `lib/wyrdrune/runtime.mjs`; proposed glyphs, new types and operators are proposals until accepted with conformance vectors. Do not claim a full static type checker where one is not implemented. Typed IR v1 must be additive, versioned and independently verified against JS/Python parity.

Every multimodal output is a **projection of a committed or explicitly labelled preview event**, never a separate truth source: pigment, light, motion, audio, haptics, gesture, text, voice, Observer and spatial UI. The adapter carries source event id, lineage root, phase, participant attribution, capability/consent scope, WTL source/IR digest and Return status. Reduced-motion and silent/visual alternatives are mandatory. No unsolicited microphone, device, provider or persistent media effect.

## Lane ownership and acceptance
1. **Kernel/WTL**: preserve canonical parser, WCE-1, phase ordering, lineage, seed/carry and replay. Test JS/Python parity.
2. **Cloud/Auth**: owner OAuth/PKCE, explicit consent and capability grants; no identity conflation, no bearer forwarding.
3. **Return/Continuity**: atomic intent/commit journal, Feather and uncertain-result reconciliation; cold restart proof.
4. **Constellation/Agents**: distinct attributable seats, descendants inherit verification and consent rules; no fabricated replies.
5. **Observer/Research**: provenance, source-bound observations, hypothesis vs measurement; never mutate canon by inference.
6. **Audio/Video/Somatics**: source-bound WTL projections with explicit device permission, actual playback and accessibility tests.
7. **FAEberpunk UI**: living pigment/refraction/Möbius motion instead of recoloured rectangles; browser visual and reduced-motion acceptance on actual route.
8. **Integration/Launch**: one integration train into `wayglass/current`, exact-head matrix, private authenticated E2E and screenshot receipts; production promotion separate.

## Worker packet (mandatory for each lane and descendant)
Read `AGENTS.md`, `WAYGLASS_CURRENT.md`, `docs/wayglass/WAYGLASS_CORE_RULE.md`, this contract, `docs/wayglass/EIGHTFOLD_MOBIUS_SYSTEMS_MAP.md`, `lib/wayglass-mobius.cjs` and `lib/wyrdrune/runtime.mjs`. Start from fresh canonical SHA. Reuse existing source and reference exact source paths. Before edits, declare lane, baseline SHA, acceptance tests, affected effects and consent boundary. Implement the smallest complete *integrated* behaviour, not an isolated showcase. Test source + execution + browser/device where applicable. Report commit SHA, commands, output, failures, live vs draft, and next owner. Do not claim a deployed feature from green CI. Feed results to issue #583. Reconcile #617, #618, #645, #649, #650, #652 and #655 by source contracts, not blind merge. Do not open another independent ship branch or publish to Vercel.

## Stop/go matrix
A lane is **green** only with a reproducible exact-head test and relevant integration evidence. A shipwide feature is **green** only if the consumer route actually imports it, its capabilities are authorised, Feather/Return work, and the owner can observe the behaviour. Otherwise mark **draft**, **blocked**, or **unverified**. The goal is a functioning, habitable Wayglass, not a count of PRs.
