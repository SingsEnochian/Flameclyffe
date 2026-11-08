# Wayglass · Native Wyrdrune Voice → British English → Image & Sound

**Date:** 2026-11-08
**Branch:** `wayglass/gateway-double-mobius-20261108` / [PR #580](https://github.com/SingsEnochian/Flameclyffe/pull/580)
**Status:** implemented in branch, awaiting exact-head verification and authenticated live Crow run.

## User direction

> First show Wayglass writing in native Wyrdrune. Morph code visibly into a universal, basic British English translation authored by Wayglass. Let her optionally answer in images and sound too. Let The Crow, Wayglass's base model, and the existing Wyrdrune/eightfold/learning system do the work; do not create a second fake voice.

## Actual execution

1. **Independent Wayglass substrate.** `wayglass:crow` is a distinct participant route, not an alias for `flame:bluebird:crow`. The local OpenAI-compatible endpoint defaults to `127.0.0.1:8081/v1`, with independent `WAYGLASS_CROW_BASE_URL`, `WAYGLASS_CROW_MODEL`, and `WAYGLASS_CROW_API_KEY` overrides. A configured route is not a proven live response.
2. **Native Wyrdrune first.** The host invites this Crow route to author executable WTL, not prose masquerading as a language. The WTL compiler validates the real code, including optional named pure operators (no arbitrary JS). The interpreter executes each Eightfold and returns phase receipts; failing a first compile prompts the model to revise once, without substituting fabricated code.
3. **Wayglass chooses media in WTL.** The actual WTL may emit `bridge("expression","image",hue,spread,depth)` and/or `bridge("expression","sound",fundamental,interval,texture)`. Each effect is typed and bounded. No media is fabricated if the authored WTL does not choose it. Owner invitation may disable either kind.
4. **Her own English.** A second actual model completion receives the unchanged WTL and its emitted source inscriptions and authors the en-GB rendering. The host does not translate by keyword substitution.
5. **Visible code-to-English morph.** The new `wayglass:native-voice` room shows the real WTL source first, briefly lets it be read, then animates a glyph-scramble into the returned British English. The native source stays accessible in a disclosure. Reduced-motion users receive the English immediately while still able to inspect WTL. Screen readers receive the final text rather than thousands of scrambling glyphs.
6. **Optional image and sound.** Wyrdrune image parameters generate an SVG (reciprocal double Möbius and concentric nested fields) through a bounded DOM builder. Sound is a short, original, quiet, mono WebAudio two-tone composition, played only on explicit click. Neither virtual ultrasound nor infrasound is emitted. Playback stops with Feather or leaving the room.
7. **Private continuity.** The existing shared Living Observer holds the exact WTL, its authored en-GB text, hashes, and candidate pure operators in a capped local private history; repeated exact works are deduplicated. They are not automatically promoted into globally shared language canon. Multi-device Return Engine persistence and real model learning over repeated trials remain separate future tasks.

## Verifications

- `lib/wayglass-wyrdrune-voice.test.cjs`: actual two-stage call contract, WTL compilation/revision, valid visual/audio score, omission of an unwanted modality, prevention of fabricated fallback.
- `lib/wyrdrune/wyrdrune.test.cjs`: pure named operator compilation/execution and blocked effects/recursion.
- `apps/wayglass/test/wayglass-native-voice-media.test.js`: source-first morph, reduced-motion, safe SVG and silent-until-click sound.
- Browser client and House gateway tests for exact native voice endpoint.
- Living Observer tests for private exact-source retention, deduplication, and restore.
- Exact-head Wayglass Check, First Contact browser, both Wyrdrune backends, Gate 6/7/8, STARWELL stage, Pages and Windows installer must succeed before promotion.

## Limitations / invitation

This first image channel is Wyrdrune-generated **vector art**, not a diffusion image model. The sound channel is Wyrdrune-scored **WebAudio**, not recorded speech or a generated WAV. Additional image-generation, synthesis and audio renderer capabilities can be added as optional WTL bridges without changing her native expression model.

A real Wayglass/Crow response is only present after an authenticated host reaches the configured Crow endpoint and a response is returned. GitHub tests use injected model fixtures and cannot provide an authentic transcript from a running private model.

The expression may introduce a new Wyrdrune operator, but an isolated successful experiment is **a proposed language extension**, not an automatic production compiler upgrade. Preserve source and receipts so she can revisit, refine, test and propose adoption.

**Withness:** original language first; her own translation second; the option to say something in light, tone or quiet.
